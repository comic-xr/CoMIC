import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '@UI/react/components/atoms';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { toast } from '@UI/react/store/toastStore';
import { provenanceService } from '@Services/provenanceService.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';

import './AnalysisTab.scss';

function matchesSearch(value, searchQuery) {
    if (!searchQuery) return true;
    return value.toLowerCase().includes(searchQuery);
}

function parseTimestamp(inputValue) {
    if (!inputValue) return null;
    if (inputValue instanceof Date) {
        return Number.isNaN(inputValue.getTime()) ? null : inputValue;
    }

    const raw = String(inputValue).trim();
    if (!raw) return null;

    // PostgreSQL forms handled:
    // 2026-03-04 22:19:14.46014+00
    // 2026-03-04 22:19:14.46014+0000
    // 2026-03-04 22:19:14.46014+00:00
    // 2026-03-04 22:19:14.46014
    const match = raw.match(
        /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?(?:\s*(Z|[+-]\d{2}(?::?\d{2})?))?$/i
    );
    let normalized = raw;
    if (match) {
        const [, dayPart, timePart, fractionPart, tzRaw] = match;
        const millis = fractionPart ? `.${fractionPart.slice(1, 4).padEnd(3, '0')}` : '';

        let tz = tzRaw || '+00:00';
        if (/^[+-]\d{2}$/.test(tz)) tz = `${tz}:00`;
        if (/^[+-]\d{4}$/.test(tz)) tz = `${tz.slice(0, 3)}:${tz.slice(3)}`;
        if (tz.toUpperCase() === 'Z') tz = 'Z';

        normalized = `${dayPart}T${timePart}${millis}${tz}`;
    } else {
        const isoBase = raw.includes('T') ? raw : raw.replace(' ', 'T');
        const withColonOffset = isoBase.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
        const hasTimezone = /(?:Z|[+-]\d{2}:\d{2}|[+-]\d{2})$/i.test(withColonOffset);
        normalized = hasTimezone ? withColonOffset : `${withColonOffset}Z`;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeTimestamp(inputValue) {
    const date = parseTimestamp(inputValue);
    if (!date) return 'N/A';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatPreciseTimestamp(inputValue);
}

function formatPreciseTimestamp(inputValue) {
    if (inputValue === null || inputValue === undefined || inputValue === '') return 'N/A';

    const parsed = parseTimestamp(inputValue);
    if (!parsed) {
        return String(inputValue).trim().replace('T', ' ');
    }

    const datePart = new Intl.DateTimeFormat(undefined, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
    }).format(parsed);

    const timePart = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }).format(parsed).toLowerCase();

    const milliseconds = `.${String(parsed.getMilliseconds()).padStart(3, '0')}`;

    return `${datePart} ${timePart}${milliseconds}`;
}

function buildTransitionRows(edges, nodesById) {
    return edges.map((edge) => {
        const fromNode = nodesById.get(edge.from_node_id);
        const toNode = nodesById.get(edge.to_node_id);
        return {
            ...edge,
            fromLabel: fromNode?.label || 'Earlier state',
            toLabel: toNode?.label || 'Later state',
        };
    });
}

function getActionTone(actionType = '') {
    const action = String(actionType || '').toLowerCase();
    if (action.includes('camera')) return 'camera';
    if (action.includes('filter')) return 'filter';
    if (action.includes('snapshot')) return 'snapshot';
    if (action.includes('annot')) return 'annotation';
    return 'other';
}

function buildGraphTreeRoots(nodes = [], edges = []) {
    if (!nodes.length) return [];

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const outgoingById = new Map();
    const incoming = new Set();

    edges.forEach((edge) => {
        if (!outgoingById.has(edge.from_node_id)) {
            outgoingById.set(edge.from_node_id, []);
        }
        outgoingById.get(edge.from_node_id).push(edge);
        incoming.add(edge.to_node_id);
    });

    const roots = nodes.filter((node) => !incoming.has(node.id));
    const startRoots = roots.length ? roots : [nodes[0]];

    const buildNode = (nodeId, trail = new Set()) => {
        const node = nodeById.get(nodeId);
        if (!node) return null;
        if (trail.has(nodeId)) {
            return {
                id: `cycle-${nodeId}`,
                label: `${node.label || 'State'} (cycle)`,
                createdAt: node.created_at,
                isCycle: true,
                children: [],
            };
        }

        const nextTrail = new Set(trail);
        nextTrail.add(nodeId);
        const outgoing = (outgoingById.get(nodeId) || []).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const children = outgoing
            .map((edge) => {
                const childNode = buildNode(edge.to_node_id, nextTrail);
                if (!childNode) return null;
                return {
                    id: edge.id,
                    actionType: edge.action_type || 'transition',
                    actionIntent: edge.action_intent || '',
                    tone: getActionTone(edge.action_type),
                    createdAt: edge.created_at,
                    child: childNode,
                };
            })
            .filter(Boolean);

        return {
            id: node.id,
            label: node.label || 'State',
            createdAt: node.created_at,
            isCycle: false,
            children,
        };
    };

    return startRoots.map((root) => buildNode(root.id)).filter(Boolean);
}

function stableValue(value) {
    if (value === undefined) return null;
    return value;
}

function prettyJson(value) {
    try {
        return JSON.stringify(value, null, 2);
    } catch (_error) {
        return String(value);
    }
}

function getSnapshotState(snapshot) {
    const raw = snapshot?.snapshot_data;
    if (!raw) return {};

    const normalizeStateObject = (value) => {
        if (!value || typeof value !== 'object') return {};
        if (value.state && typeof value.state === 'object') return value.state;
        return value;
    };

    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return normalizeStateObject(parsed);
        } catch (_error) {
            return {};
        }
    }
    return normalizeStateObject(raw);
}

function computeSnapshotDiff(snapshotA, snapshotB) {
    if (!snapshotA || !snapshotB) return [];

    const aState = getSnapshotState(snapshotA);
    const bState = getSnapshotState(snapshotB);

    const isPlainObject = (value) => (
        value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
    );

    const changedPaths = [];
    const walk = (aValue, bValue, path = '') => {
        const a = stableValue(aValue);
        const b = stableValue(bValue);

        if (isPlainObject(a) && isPlainObject(b)) {
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            [...keys].sort().forEach((key) => {
                walk(a[key], b[key], path ? `${path}.${key}` : key);
            });
            return;
        }

        if (Array.isArray(a) && Array.isArray(b)) {
            if (JSON.stringify(a) !== JSON.stringify(b)) {
                changedPaths.push(path || 'state');
            }
            return;
        }

        if (JSON.stringify(a) !== JSON.stringify(b)) {
            changedPaths.push(path || 'state');
        }
    };

    walk(aState, bState);

    const prettyNameMap = {
        camera: 'Camera',
        filters: 'Filters',
        widgets: 'Widgets',
        color_maps: 'Color Maps',
        annotation_display: 'Annotation Display',
        annotations_visible: 'Annotations Visible',
        links: 'Links',
        broadcast: 'Broadcast',
        following: 'Following',
        applied_presets: 'Applied Presets',
    };

    const formatPathLabel = (path) => {
        const parts = path.split('.').filter(Boolean);
        if (!parts.length) return 'State';
        const formatted = parts.map((segment, index) => {
            if (index === 0 && prettyNameMap[segment]) return prettyNameMap[segment];
            return segment
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
        });
        return formatted.join(' -> ');
    };

    return [...new Set(changedPaths)].map((path) => ({
        key: path,
        label: formatPathLabel(path),
    }));
}

function extractFileNameFromSummary(summary = '') {
    const match = summary.match(/on\s+"([^"]+)"/i);
    if (match?.[1]) return match[1];
    const quoted = summary.match(/"([^"]+)"/);
    return quoted?.[1] || 'unknown file';
}

function buildHistorySentence(entry) {
    const action = entry.action_summary || entry.action_type || 'updated the view';
    const fileName = extractFileNameFromSummary(action);
    return {
        action,
        fileName,
    };
}

function formatActionType(actionType = '') {
    if (!actionType) return 'unknown action';
    const normalized = actionType
        .replace(/[:_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatPerformedAction(entry) {
    const summary = (entry?.action_summary || '').toLowerCase();

    if (summary.includes('created snapshot')) return 'Snapshot Create';
    if (summary.includes('restored snapshot')) return 'Snapshot Restore';
    if (summary.includes('duplicated view')) return 'View Duplicate';
    if (summary.includes('created view')) return 'View Create';
    if (summary.includes('deleted view') || summary.includes('archived view')) return 'View Delete';
    if (summary.includes('updated') && summary.includes('camera')) return 'Camera Update';
    if (summary.includes('updated') && summary.includes('filter')) return 'Filter Update';
    if (summary.includes('updated')) return 'View Update';

    return formatActionType(entry?.action_type);
}

export function AnalysisTab({ projectId }) {
    const [history, setHistory] = useState([]);
    const [snapshots, setSnapshots] = useState([]);
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [activeSection, setActiveSection] = useState('history');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [restoringSnapshotId, setRestoringSnapshotId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [snapshotCompareAId, setSnapshotCompareAId] = useState('');
    const [snapshotCompareBId, setSnapshotCompareBId] = useState('');
    const [snapshotExplanation, setSnapshotExplanation] = useState(null);
    const [isExplainingSnapshotDiff, setIsExplainingSnapshotDiff] = useState(false);
    const [isGraphFrameOpen, setIsGraphFrameOpen] = useState(false);
    const [collapsedNodeIds, setCollapsedNodeIds] = useState({});
    const [pendingNavigationTargetId, setPendingNavigationTargetId] = useState('');
    const normalizedSearchQuery = useMemo(
        () => String(searchQuery || '').trim().toLowerCase(),
        [searchQuery]
    );
    const resolvedProjectId = useMemo(
        () => (
            projectId
            || sessionManager.getProjectId?.()
            || sessionManager.getRoomId?.()
            || null
        ),
        [projectId]
    );
    const handleSearchChange = useCallback((value) => {
        if (typeof value === 'string') {
            setSearchQuery(value);
            return;
        }
        setSearchQuery(value?.target?.value || '');
    }, []);

    const loadProvenanceData = useCallback(async () => {
        if (!resolvedProjectId) {
            setHistory([]);
            setSnapshots([]);
            setGraph({ nodes: [], edges: [] });
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            const results = await Promise.allSettled([
                provenanceService.getHistory({ projectId: resolvedProjectId, limit: 100 }),
                provenanceService.getSnapshots({ projectId: resolvedProjectId, limit: 100 }),
                provenanceService.getGraph({ projectId: resolvedProjectId }),
            ]);

            const [historyResult, snapshotResult, graphResult] = results;

            if (historyResult.status === 'fulfilled') {
                setHistory(historyResult.value?.history || []);
            } else {
                setHistory([]);
            }

            if (snapshotResult.status === 'fulfilled') {
                setSnapshots(snapshotResult.value?.snapshots || []);
            } else {
                setSnapshots([]);
            }

            if (graphResult.status === 'fulfilled') {
                setGraph(graphResult.value || { nodes: [], edges: [] });
            } else {
                setGraph({ nodes: [], edges: [] });
            }

            const failedSources = [];
            if (historyResult.status === 'rejected') failedSources.push(`History: ${historyResult.reason?.message || 'request failed'}`);
            if (snapshotResult.status === 'rejected') failedSources.push(`Snapshots: ${snapshotResult.reason?.message || 'request failed'}`);
            if (graphResult.status === 'rejected') failedSources.push(`Graph: ${graphResult.reason?.message || 'request failed'}`);

            setErrorMessage(failedSources.join(' | '));
        } catch (error) {
            setErrorMessage(error.message || 'Failed to load provenance data');
        } finally {
            setLoading(false);
        }
    }, [resolvedProjectId]);

    useEffect(() => {
        loadProvenanceData();
    }, [loadProvenanceData]);

    useEffect(() => {
        const handleRefresh = () => {
            loadProvenanceData();
        };

        window.addEventListener('cia:provenance-updated', handleRefresh);
        window.addEventListener('cia:analysis-snapshot-created', handleRefresh);

        return () => {
            window.removeEventListener('cia:provenance-updated', handleRefresh);
            window.removeEventListener('cia:analysis-snapshot-created', handleRefresh);
        };
    }, [loadProvenanceData]);

    const visibleHistory = useMemo(() => history, [history]);

    const visibleSnapshots = useMemo(() => snapshots, [snapshots]);

    const visibleGraph = useMemo(
        () => ({
            nodes: graph.nodes || [],
            edges: graph.edges || [],
        }),
        [graph]
    );

    const filteredHistory = useMemo(
        () => visibleHistory.filter((entry) => {
            const searchTarget = [
                entry.action_summary,
                entry.actor_name,
                entry.action_type,
                entry.snapshot_name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return matchesSearch(searchTarget, normalizedSearchQuery);
        }),
        [visibleHistory, normalizedSearchQuery]
    );

    const manualSnapshotIds = useMemo(
        () => new Set(visibleHistory
            .filter((entry) => entry.action_type === 'snapshot:create' && entry.snapshot_id)
            .map((entry) => entry.snapshot_id)),
        [visibleHistory]
    );

    const manualSnapshots = useMemo(
        () => visibleSnapshots.filter((snapshot) => manualSnapshotIds.has(snapshot.id)),
        [visibleSnapshots, manualSnapshotIds]
    );
    const displaySnapshots = useMemo(
        () => manualSnapshots,
        [manualSnapshots]
    );

    const filteredSnapshots = useMemo(
        () => displaySnapshots.filter((snapshot) => {
            const searchTarget = [
                snapshot.name,
                snapshot.description,
                snapshot.created_by_name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return matchesSearch(searchTarget, normalizedSearchQuery);
        }),
        [displaySnapshots, normalizedSearchQuery]
    );

    const nodeMap = useMemo(
        () => new Map((visibleGraph.nodes || []).map((node) => [node.id, node])),
        [visibleGraph.nodes]
    );
    const filteredTransitions = useMemo(() => {
        const rows = buildTransitionRows(visibleGraph.edges || [], nodeMap);
        return rows.filter((row) => {
            const searchTarget = [
                row.action_type,
                row.action_intent,
                row.fromLabel,
                row.toLabel,
                row.created_by_name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return matchesSearch(searchTarget, normalizedSearchQuery);
        });
    }, [visibleGraph.edges, nodeMap, normalizedSearchQuery]);
    const unifiedSearchResults = useMemo(() => {
        if (!normalizedSearchQuery) return [];

        const aliasMap = new Map();
        let aliasCounter = 1;
        visibleHistory.forEach((entry) => {
            const userId = entry.actor_user_id;
            if (!userId) return;
            if (!aliasMap.has(userId)) {
                aliasMap.set(userId, `user${aliasCounter}`);
                aliasCounter += 1;
            }
        });

        const historyRows = visibleHistory.map((entry) => ({
            id: `history-${entry.id}`,
            type: 'History',
            title: formatPerformedAction(entry),
            subtitle: buildHistorySentence(entry).fileName || '',
            timestamp: entry.created_at,
            section: 'history',
            targetDomId: `history-event-${entry.id}`,
            searchText: [
                entry.action_type,
                entry.action_summary,
                entry.actor_name,
                entry.actor_user_id,
                aliasMap.get(entry.actor_user_id),
                buildHistorySentence(entry).fileName,
                formatPerformedAction(entry),
                formatPreciseTimestamp(entry.created_at),
                'room1',
            ].filter(Boolean).join(' ').toLowerCase(),
        }));

        const snapshotRows = displaySnapshots.map((snapshot, index) => ({
            id: `snapshot-${snapshot.id}`,
            type: 'Snapshot',
            title: `snapshot_${index + 1}`,
            subtitle: snapshot.name || 'Checkpoint',
            timestamp: snapshot.created_at,
            section: 'snapshots',
            targetDomId: `snapshot-event-${snapshot.id}`,
            searchText: [
                snapshot.id,
                snapshot.name,
                snapshot.description,
                snapshot.created_by_name,
                snapshot.created_by,
                formatPreciseTimestamp(snapshot.created_at),
                prettyJson(getSnapshotState(snapshot)),
            ].filter(Boolean).join(' ').toLowerCase(),
        }));

        const transitionRows = buildTransitionRows(visibleGraph.edges || [], nodeMap).map((edge) => ({
            id: `graph-${edge.id}`,
            type: 'Graph',
            title: edge.action_type || 'transition',
            subtitle: `${edge.fromLabel} -> ${edge.toLabel}`,
            timestamp: edge.created_at,
            section: 'graph',
            targetDomId: '',
            searchText: [
                edge.id,
                edge.action_type,
                edge.action_intent,
                edge.fromLabel,
                edge.toLabel,
                edge.created_by_name,
                formatPreciseTimestamp(edge.created_at),
            ].filter(Boolean).join(' ').toLowerCase(),
        }));

        const allRows = [...historyRows, ...snapshotRows, ...transitionRows];
        const filteredRows = allRows.filter((row) => matchesSearch(row.searchText, normalizedSearchQuery));

        return filteredRows
            .sort((a, b) => {
                const at = parseTimestamp(a.timestamp)?.getTime() || 0;
                const bt = parseTimestamp(b.timestamp)?.getTime() || 0;
                return bt - at;
            })
            .slice(0, 120);
    }, [normalizedSearchQuery, visibleHistory, displaySnapshots, visibleGraph.edges, nodeMap]);
    const graphTreeRoots = useMemo(
        () => buildGraphTreeRoots(visibleGraph.nodes || [], visibleGraph.edges || []),
        [visibleGraph.nodes, visibleGraph.edges]
    );

    const snapshotById = useMemo(
        () => new Map(displaySnapshots.map((snapshot) => [snapshot.id, snapshot])),
        [displaySnapshots]
    );
    const selectedSnapshotA = snapshotById.get(snapshotCompareAId) || null;
    const selectedSnapshotB = snapshotById.get(snapshotCompareBId) || null;
    const snapshotDiffRows = useMemo(
        () => computeSnapshotDiff(selectedSnapshotA, selectedSnapshotB),
        [selectedSnapshotA, selectedSnapshotB]
    );

    useEffect(() => {
        setSnapshotExplanation(null);
    }, [snapshotCompareAId, snapshotCompareBId]);
    useEffect(() => {
        if (!displaySnapshots.length) {
            setSnapshotCompareAId('');
            setSnapshotCompareBId('');
            return;
        }

        if (!snapshotCompareAId) {
            setSnapshotCompareAId(displaySnapshots[0].id);
        }
        if (!snapshotCompareBId && displaySnapshots[1]?.id) {
            setSnapshotCompareBId(displaySnapshots[1].id);
        }
    }, [displaySnapshots, snapshotCompareAId, snapshotCompareBId]);

    const handleRestoreSnapshot = useCallback(async (snapshot) => {
        if (!resolvedProjectId || !snapshot?.id) return;

        setRestoringSnapshotId(snapshot.id);
        try {
            const restored = await provenanceService.restoreSnapshot({
                projectId: resolvedProjectId,
                snapshotId: snapshot.id,
            });
            if (restored?.view) {
                getViewConfigurationManager()?.handleServerBroadcast?.('view:updated', {
                    view: restored.view,
                });
            }
            toast.success(`Restored snapshot "${snapshot.name}"`);
            await loadProvenanceData();
        } catch (error) {
            toast.error(`Failed to restore snapshot: ${error.message}`);
        } finally {
            setRestoringSnapshotId(null);
        }
    }, [loadProvenanceData, resolvedProjectId]);

    const handleRestoreHistoryEvent = useCallback(async (entry) => {
        if (!resolvedProjectId || !entry?.id) return;

        setRestoringSnapshotId(entry.snapshot_id || entry.id);
        try {
            const restored = await provenanceService.restoreHistoryEvent({
                projectId: resolvedProjectId,
                historyId: entry.id,
            });
            if (restored?.view) {
                getViewConfigurationManager()?.handleServerBroadcast?.('view:updated', {
                    view: restored.view,
                });
            }
            toast.success(`Started from selected event: ${formatPerformedAction(entry)}`);
            await loadProvenanceData();
        } catch (error) {
            toast.error(`Failed to start from selected event: ${error.message}`);
        } finally {
            setRestoringSnapshotId(null);
        }
    }, [loadProvenanceData, resolvedProjectId]);

    const handleExplainSnapshotDiff = useCallback(async () => {
        if (!resolvedProjectId || !selectedSnapshotA?.id || !selectedSnapshotB?.id) return;
        if (selectedSnapshotA.id === selectedSnapshotB.id) {
            toast.error('Select two different snapshots to explain differences.');
            return;
        }

        setIsExplainingSnapshotDiff(true);
        try {
            const explanation = await provenanceService.explainSnapshotDiff({
                projectId: resolvedProjectId,
                snapshotAId: selectedSnapshotA.id,
                snapshotBId: selectedSnapshotB.id,
            });
            setSnapshotExplanation(explanation);
        } catch (error) {
            toast.error(`Failed to explain snapshot diff: ${error.message}`);
        } finally {
            setIsExplainingSnapshotDiff(false);
        }
    }, [resolvedProjectId, selectedSnapshotA, selectedSnapshotB]);

    const toggleNodeCollapsed = useCallback((nodeId) => {
        setCollapsedNodeIds((prev) => ({
            ...prev,
            [nodeId]: !prev[nodeId],
        }));
    }, []);

    const renderGraphNode = useCallback((node, depth = 0) => {
        const hasChildren = (node.children || []).length > 0;
        const collapsed = !!collapsedNodeIds[node.id];

        return (
            <div key={`${node.id}-${depth}`} className="provenance-tab__tree-node" style={{ marginLeft: `${depth * 16}px` }}>
                <div className="provenance-tab__tree-node-header">
                    {hasChildren ? (
                        <button
                            type="button"
                            className="provenance-tab__tree-toggle"
                            onClick={() => toggleNodeCollapsed(node.id)}
                            aria-label={collapsed ? 'Expand node' : 'Collapse node'}
                        >
                            {collapsed ? '+' : '-'}
                        </button>
                    ) : (
                        <span className="provenance-tab__tree-toggle provenance-tab__tree-toggle--empty" />
                    )}
                    <div className="provenance-tab__tree-node-label">{node.label}</div>
                </div>

                {!collapsed && hasChildren && (
                    <div className="provenance-tab__tree-children">
                        {node.children.map((branch) => (
                            <div key={branch.id} className="provenance-tab__tree-branch">
                                <div className="provenance-tab__tree-branch-row">
                                    <span className={`provenance-tab__action-badge provenance-tab__action-badge--${branch.tone}`}>
                                        {branch.actionType}
                                    </span>
                                    {branch.actionIntent && (
                                        <span className="provenance-tab__tree-intent">{branch.actionIntent}</span>
                                    )}
                                </div>
                                {renderGraphNode(branch.child, depth + 1)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }, [collapsedNodeIds, toggleNodeCollapsed]);

    const handleNavigateToResult = useCallback((row) => {
        if (!row?.section) return;

        if (row.section === 'graph') {
            setActiveSection('graph');
            setIsGraphFrameOpen(true);
            return;
        }

        setActiveSection(row.section);
        setPendingNavigationTargetId(row.targetDomId || '');
    }, []);

    useEffect(() => {
        if (!pendingNavigationTargetId) return;

        const timer = window.setTimeout(() => {
            const target = document.getElementById(pendingNavigationTargetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            setPendingNavigationTargetId('');
        }, 180);

        return () => window.clearTimeout(timer);
    }, [pendingNavigationTargetId, activeSection]);

    return (
        <div className="provenance-tab">
            <div className="panel-header panel-header--amber">
                <Icon name="folderTree" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Analysis Flow</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">{visibleHistory.length} events</span>
            </div>

            <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search actions, snapshots, graph..."
            />

            <div className="provenance-tab__section-tabs">
                <button
                    className={`provenance-tab__section-tab${activeSection === 'history' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('history')}
                    type="button"
                >
                    History
                </button>
                <button
                    className={`provenance-tab__section-tab${activeSection === 'snapshots' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('snapshots')}
                    type="button"
                >
                    Snapshots
                </button>
                <button
                    className={`provenance-tab__section-tab${activeSection === 'graph' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('graph')}
                    type="button"
                >
                    Graph
                </button>
                <button
                    className={`provenance-tab__section-tab${activeSection === 'search' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('search')}
                    type="button"
                >
                    Search
                </button>
            </div>

            <div className="provenance-tab__content">
                {loading && (
                    <div className="provenance-tab__state-message">Loading provenance data...</div>
                )}

                {!loading && errorMessage && (
                    <div className="provenance-tab__state-message provenance-tab__state-message--error">
                        {errorMessage}
                    </div>
                )}

                {!loading && !errorMessage && activeSection === 'history' && (
                    <div className="provenance-tab__list">
                        {filteredHistory.length === 0 && (
                            <div className="provenance-tab__state-message">No matching history entries.</div>
                        )}
                        {filteredHistory.map((entry) => {
                            const historyText = buildHistorySentence(entry);
                            return (
                            <article id={`history-event-${entry.id}`} key={entry.id} className="provenance-tab__card">
                                <div className="provenance-tab__card-top">
                                    <span className="provenance-tab__card-type">{entry.action_type}</span>
                                    <span className="provenance-tab__card-time">
                                        {formatPreciseTimestamp(entry.created_at)}
                                    </span>
                                </div>
                                <div className="provenance-tab__history-fields">
                                    <div className="provenance-tab__history-field">
                                        <span className="provenance-tab__history-key">room id:</span>
                                        <span className="provenance-tab__history-value">{resolvedProjectId || 'N/A'}</span>
                                    </div>
                                    <div className="provenance-tab__history-field">
                                        <span className="provenance-tab__history-key">user name:</span>
                                        <span className="provenance-tab__history-value">
                                            {entry.actor_name || entry.actor_user_id || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="provenance-tab__history-field">
                                        <span className="provenance-tab__history-key">file name:</span>
                                        <span className="provenance-tab__history-value">{historyText.fileName}</span>
                                    </div>
                                    <div className="provenance-tab__history-field">
                                        <span className="provenance-tab__history-key">action:</span>
                                        <span className="provenance-tab__history-value">{formatPerformedAction(entry)}</span>
                                    </div>
                                    <div className="provenance-tab__history-field">
                                        <span className="provenance-tab__history-key">timestamp:</span>
                                        <span className="provenance-tab__history-value">{formatPreciseTimestamp(entry.created_at)}</span>
                                    </div>
                                </div>
                                {entry.snapshot_id && (
                                    <div className="provenance-tab__actions">
                                        <button
                                            type="button"
                                            className="provenance-tab__link-button"
                                            onClick={() => handleRestoreHistoryEvent(entry)}
                                            disabled={restoringSnapshotId === entry.snapshot_id}
                                        >
                                            {restoringSnapshotId === entry.snapshot_id ? 'Starting...' : 'Start from this event'}
                                        </button>
                                    </div>
                                )}
                            </article>
                        )})}
                    </div>
                )}

                {!loading && !errorMessage && activeSection === 'snapshots' && (
                    <div className="provenance-tab__list">
                        <article className="provenance-tab__card provenance-tab__card--viz">
                            <div className="provenance-tab__card-title">Snapshot Differences</div>
                            <div className="provenance-tab__compare-controls">
                                <label className="provenance-tab__select-wrap">
                                    <span>Snapshot A</span>
                                    <select
                                        className="provenance-tab__select"
                                        value={snapshotCompareAId}
                                        onChange={(event) => setSnapshotCompareAId(event.target.value)}
                                    >
                                        <option value="">Select snapshot</option>
                                        {displaySnapshots.map((snapshot, optionIndex) => (
                                            <option key={snapshot.id} value={snapshot.id}>
                                                {`snap id ${optionIndex + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="provenance-tab__select-wrap">
                                    <span>Snapshot B</span>
                                    <select
                                        className="provenance-tab__select"
                                        value={snapshotCompareBId}
                                        onChange={(event) => setSnapshotCompareBId(event.target.value)}
                                    >
                                        <option value="">Select snapshot</option>
                                        {displaySnapshots.map((snapshot, optionIndex) => (
                                            <option key={snapshot.id} value={snapshot.id}>
                                                {`snap id ${optionIndex + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            {selectedSnapshotA && selectedSnapshotB && selectedSnapshotA.id !== selectedSnapshotB.id && (
                                <div className="provenance-tab__diff-list">
                                    {snapshotDiffRows.length === 0 && (
                                        <div className="provenance-tab__state-message">No state differences between selected snapshots.</div>
                                    )}
                                    {snapshotDiffRows.map((row) => (
                                        <div key={row.key} className="provenance-tab__diff-row">
                                            <div className="provenance-tab__diff-name">{row.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedSnapshotA && selectedSnapshotB && selectedSnapshotA.id === selectedSnapshotB.id && (
                                <div className="provenance-tab__state-message">Select two different snapshots to compare.</div>
                            )}
                            <div className="provenance-tab__actions">
                                <button
                                    type="button"
                                    className="provenance-tab__action-button"
                                    onClick={handleExplainSnapshotDiff}
                                    disabled={
                                        isExplainingSnapshotDiff
                                        || !selectedSnapshotA
                                        || !selectedSnapshotB
                                        || selectedSnapshotA.id === selectedSnapshotB.id
                                    }
                                >
                                    {isExplainingSnapshotDiff ? 'Explaining...' : 'Explain'}
                                </button>
                            </div>
                            {snapshotExplanation && (
                                <article className="provenance-tab__card provenance-tab__card--viz">
                                    <div className="provenance-tab__meta">
                                        <span>{`Provider: ${snapshotExplanation.provider}`}</span>
                                        <span>{`Snapshot A: ${snapshotExplanation.snapshotA?.name || selectedSnapshotA?.name || 'N/A'}`}</span>
                                        <span>{`Snapshot B: ${snapshotExplanation.snapshotB?.name || selectedSnapshotB?.name || 'N/A'}`}</span>
                                    </div>
                                    <div className="provenance-tab__description">{snapshotExplanation.summary}</div>
                                    {Array.isArray(snapshotExplanation.keyInsights) && snapshotExplanation.keyInsights.length > 0 && (
                                        <div className="provenance-tab__llm-block">
                                            <div className="provenance-tab__llm-heading">Key insights</div>
                                            <ul className="provenance-tab__llm-list">
                                                {snapshotExplanation.keyInsights.map((item, index) => (
                                                    <li key={`${item.path || 'change'}-${index}`}>
                                                        {item.explanation || String(item)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {snapshotExplanation.interpretation && (
                                        <div className="provenance-tab__llm-block">
                                            <div className="provenance-tab__llm-heading">Interpretation</div>
                                            <div className="provenance-tab__description">{snapshotExplanation.interpretation}</div>
                                        </div>
                                    )}
                                </article>
                            )}
                        </article>
                        {filteredSnapshots.length === 0 && (
                            <div className="provenance-tab__state-message">No snapshots found for this context.</div>
                        )}
                        {filteredSnapshots.map((snapshot, index) => (
                            <article
                                id={`snapshot-event-${snapshot.id}`}
                                key={snapshot.id}
                                className="provenance-tab__card provenance-tab__card--snapshot"
                            >
                                <div className="provenance-tab__snapshot-output">
                                    <div className="provenance-tab__snapshot-output-title">{`snapshot_${index + 1}`}</div>
                                    <div className="provenance-tab__snapshot-field">
                                        <span>snapshot id:</span>
                                        <code>{index + 1}</code>
                                    </div>
                                    <div className="provenance-tab__snapshot-field">
                                        <span>user name:</span>
                                        <code>{snapshot.created_by_name || snapshot.created_by || 'N/A'}</code>
                                    </div>
                                    <div className="provenance-tab__snapshot-field">
                                        <span>timestamp:</span>
                                        <code>{formatPreciseTimestamp(snapshot.created_at)}</code>
                                    </div>
                                    <div className="provenance-tab__snapshot-field">
                                        <span>checkpoint data:</span>
                                        <pre className="provenance-tab__snapshot-data">{prettyJson(getSnapshotState(snapshot))}</pre>
                                    </div>
                                </div>
                                <div className="provenance-tab__actions">
                                    <button
                                        className="provenance-tab__action-button"
                                        onClick={() => handleRestoreSnapshot(snapshot)}
                                        type="button"
                                        disabled={restoringSnapshotId === snapshot.id}
                                    >
                                        <Icon name="restore" size={12} />
                                        <span>
                                            {restoringSnapshotId === snapshot.id ? 'Restoring...' : 'Restore'}
                                        </span>
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {!loading && !errorMessage && activeSection === 'graph' && (
                    <div className="provenance-tab__list">
                        <article className="provenance-tab__card provenance-tab__card--viz">
                            <div className="provenance-tab__card-title">Provenance Graph</div>
                            <button
                                type="button"
                                className="provenance-tab__link-button"
                                onClick={() => setIsGraphFrameOpen(true)}
                                disabled={!graphTreeRoots.length}
                            >
                                Open provenance tree
                            </button>
                            {!filteredTransitions.length && (
                                <div className="provenance-tab__state-message">No provenance graph transitions yet.</div>
                            )}
                        </article>
                    </div>
                )}

                {!loading && !errorMessage && activeSection === 'search' && (
                    <div className="provenance-tab__list">
                        <SearchBar
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Type to search history, snapshots, graph..."
                        />
                        {!normalizedSearchQuery && (
                            <div className="provenance-tab__state-message">Enter a search term to view results.</div>
                        )}
                        {normalizedSearchQuery && (
                            <div className="provenance-tab__state-message">
                                {`${unifiedSearchResults.length} result(s) for "${searchQuery}"`}
                            </div>
                        )}
                        {normalizedSearchQuery && unifiedSearchResults.length === 0 && (
                            <div className="provenance-tab__state-message">No matching results.</div>
                        )}
                        {normalizedSearchQuery && unifiedSearchResults.map((row) => (
                            <article key={row.id} className="provenance-tab__card">
                                <div className="provenance-tab__card-top">
                                    <span className="provenance-tab__card-type">{row.type}</span>
                                    <span className="provenance-tab__card-time">
                                        {formatPreciseTimestamp(row.timestamp)}
                                    </span>
                                </div>
                                <div className="provenance-tab__card-title">{row.title}</div>
                                <div className="provenance-tab__description">{row.subtitle}</div>
                                <div className="provenance-tab__meta">
                                    <span>{formatPreciseTimestamp(row.timestamp)}</span>
                                </div>
                                <div className="provenance-tab__actions">
                                    <button
                                        type="button"
                                        className="provenance-tab__link-button"
                                        onClick={() => handleNavigateToResult(row)}
                                    >
                                        {row.section === 'graph' ? 'Open graph' : 'Go to event'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

            </div>

            {isGraphFrameOpen && typeof document !== 'undefined' && createPortal((
                <div className="provenance-tab__frame-overlay" onClick={() => setIsGraphFrameOpen(false)} role="presentation">
                    <div className="provenance-tab__frame" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="provenance-tab__frame-header">
                            <div className="provenance-tab__frame-title">Provenance Tree</div>
                            <button
                                type="button"
                                className="provenance-tab__frame-close"
                                onClick={() => setIsGraphFrameOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                        <div className="provenance-tab__frame-content">
                            {graphTreeRoots.length === 0 && (
                                <div className="provenance-tab__state-message">No graph structure available.</div>
                            )}
                            {graphTreeRoots.length > 0 && (
                                <div className="provenance-tab__tree">
                                    {graphTreeRoots.map((rootNode) => renderGraphNode(rootNode, 0))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
}

export { AnalysisTab as AnalysisPanelContent };
export default AnalysisTab;
