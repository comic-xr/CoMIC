// src/ui/react/components/panels/LeftPanel/tabs/AnnotationsTab/AnnotationsTab.jsx
// Annotations tab - Central command center for all annotation management
//
// Per spec: Single source of truth for workspace, instance, and dataset annotations
//
// Features:
// - Context selector (Workspace Canvas vs Instance)
// - Context-specific annotation tools
// - Status states (Open, Resolved, Archived)
// - Replies & threads support
// - View-specific snapshots

import React, { useState, useCallback, useMemo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { Section } from '@UI/react/components/molecules/Section';
import { LabeledButton } from '@UI/react/components/molecules';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/organisms/ResizableSections';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useAnnotations } from '@UI/react/hooks/useAnnotations.js';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import './AnnotationsTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Context types per spec
const ANNOTATION_CONTEXTS = {
    WORKSPACE: 'workspace',  // Canvas grid coordinates, arrows between views
    INSTANCE: 'instance',    // View-specific, temporary markers
};

// Annotation scope hierarchy per spec
const ANNOTATION_SCOPES = {
    WORKSPACE: { id: 'workspace', label: 'Workspace', icon: 'layoutGrid', color: 'amber', description: 'Canvas annotations' },
    INSTANCE: { id: 'instance', label: 'Instance', icon: 'box', color: 'blue', description: 'View-specific' },
    DATASET: { id: 'dataset', label: 'Dataset', icon: 'database', color: 'green', description: 'Data-anchored' },
};

// Ownership filters
const OWNERSHIP_FILTERS = [
    { id: 'all', label: 'All', color: 'blue' },
    { id: 'mine', label: 'Mine', color: 'teal' },
    { id: 'shared', label: 'Shared', color: 'amber' },
];

// Status states per spec
const ANNOTATION_STATUS = {
    OPEN: { id: 'open', icon: 'circle', label: 'Open', color: 'blue', description: 'Active, needs attention' },
    RESOLVED: { id: 'resolved', icon: 'checkCircle', label: 'Resolved', color: 'green', description: 'Addressed, still visible' },
    ARCHIVED: { id: 'archived', icon: 'archive', label: 'Archived', color: 'gray', description: 'Completed, hidden by default' },
};

// Instance context tools per spec
const INSTANCE_TOOLS = [
    { id: 'select', icon: 'mousePointer', label: 'Select', color: 'blue' },
    { id: 'point', icon: 'mapPin', label: 'Point', color: 'pink' },
    { id: 'ruler', icon: 'ruler', label: 'Ruler', color: 'amber' },
    { id: 'angle', icon: 'arrowUpRight', label: 'Angle', color: 'purple' },
    { id: 'region', icon: 'box', label: 'Region', color: 'green' },
    { id: 'text', icon: 'type', label: 'Text', color: 'teal' },
    { id: 'draw', icon: 'penTool', label: 'Draw', color: 'pink' },
    { id: 'highlight', icon: 'ink_highlighter', label: 'Highlight', color: 'amber' },
];

// Workspace context tools per spec
const WORKSPACE_TOOLS = [
    { id: 'select', icon: 'mousePointer', label: 'Select', color: 'blue' },
    { id: 'freehand', icon: 'penTool', label: 'Freehand', color: 'pink' },
    { id: 'arrow', icon: 'arrowUpRight', label: 'Arrow', color: 'amber' },
    { id: 'rectangle', icon: 'square', label: 'Rectangle', color: 'purple' },
    { id: 'ellipse', icon: 'circle', label: 'Ellipse', color: 'green' },
    { id: 'text', icon: 'type', label: 'Text', color: 'teal' },
    { id: 'sticky', icon: 'stickyNote', label: 'Sticky Note', color: 'amber' },
];

// Annotation types with icons
const ANNOTATION_TYPES = {
    point: { icon: 'mapPin', label: 'Point', color: 'pink' },
    region: { icon: 'box', label: 'Region', color: 'green' },
    measurement: { icon: 'ruler', label: 'Measure', color: 'amber' },
    angle: { icon: 'arrowUpRight', label: 'Angle', color: 'purple' },
    text: { icon: 'type', label: 'Text', color: 'teal' },
    draw: { icon: 'penTool', label: 'Drawing', color: 'pink' },
    arrow: { icon: 'arrowUpRight', label: 'Arrow', color: 'amber' },
    sticky: { icon: 'stickyNote', label: 'Note', color: 'amber' },
};

const DEFAULT_SECTION_STATES = {
    dataset: { expanded: true, flexGrow: 2 },
    instance: { expanded: true, flexGrow: 1 },
    workspace: { expanded: true, flexGrow: 1 },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Context Selector - Toggle between Workspace Canvas and Instance context
 */
function ContextSelector({ context, onChange, instances, selectedInstance, onInstanceChange }) {
    return (
        <div className="context-selector">
            <div className="context-selector__toggle">
                <button
                    className={`context-selector__btn ${context === ANNOTATION_CONTEXTS.WORKSPACE ? 'context-selector__btn--active' : ''}`}
                    onClick={() => onChange(ANNOTATION_CONTEXTS.WORKSPACE)}
                    data-color="amber"
                >
                    <Icon name="layoutGrid" size={14} />
                    <span>Workspace</span>
                </button>
                <button
                    className={`context-selector__btn ${context === ANNOTATION_CONTEXTS.INSTANCE ? 'context-selector__btn--active' : ''}`}
                    onClick={() => onChange(ANNOTATION_CONTEXTS.INSTANCE)}
                    data-color="blue"
                >
                    <Icon name="box" size={14} />
                    <span>Instance</span>
                </button>
            </div>

            {/* Instance dropdown when in Instance context */}
            {context === ANNOTATION_CONTEXTS.INSTANCE && instances?.length > 0 && (
                <div className="context-selector__instance-picker">
                    <Icon name="chevronRight" size={10} />
                    <select
                        value={selectedInstance || ''}
                        onChange={(e) => onInstanceChange?.(e.target.value)}
                        className="context-selector__select"
                    >
                        <option value="">Select instance...</option>
                        {instances.map(inst => (
                            <option key={inst.instanceId} value={inst.instanceId}>
                                {inst.name || inst.instanceId} ({inst.position || 'A1'})
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

/**
 * Annotation Tools - Context-specific tool palette
 */
function AnnotationTools({ context, activeTool, onToolChange }) {
    const tools = context === ANNOTATION_CONTEXTS.WORKSPACE ? WORKSPACE_TOOLS : INSTANCE_TOOLS;

    return (
        <div className="annotation-tools">
            <div className="annotation-tools__label">
                <Icon name="penTool" size={10} />
                <span>Tools</span>
            </div>
            <div className="annotation-tools__grid">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        className={`annotation-tools__btn ${activeTool === tool.id ? 'annotation-tools__btn--active' : ''}`}
                        onClick={() => onToolChange?.(tool.id)}
                        title={tool.label}
                        data-color={tool.color}
                    >
                        <Icon name={tool.icon} size={14} />
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Status Filter - Filter by annotation status
 */
function StatusFilter({ activeStatuses, onToggle, showArchived, onToggleArchived }) {
    return (
        <div className="status-filter">
            <div className="status-filter__buttons">
                {Object.values(ANNOTATION_STATUS).filter(s => s.id !== 'archived').map(status => (
                    <button
                        key={status.id}
                        className={`status-filter__btn ${activeStatuses.includes(status.id) ? 'status-filter__btn--active' : ''}`}
                        onClick={() => onToggle(status.id)}
                        title={status.description}
                        data-color={status.color}
                    >
                        <Icon name={status.icon} size={12} />
                        <span>{status.label}</span>
                    </button>
                ))}
            </div>
            <label className="status-filter__archived">
                <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => onToggleArchived(e.target.checked)}
                />
                <span>Show archived</span>
            </label>
        </div>
    );
}

/**
 * Ownership Chip - Filter by ownership
 */
function OwnershipChip({ filter, active, onClick }) {
    return (
        <button
            className={`ownership-chip ${active ? 'ownership-chip--active' : ''}`}
            onClick={onClick}
            data-color={filter.color}
        >
            {filter.label}
        </button>
    );
}

/**
 * Type Filter Toggle
 */
function TypeFilterToggle({ type, config, active, onClick }) {
    return (
        <IconButton
            icon={config.icon}
            onClick={onClick}
            active={active}
            tooltip={config.label}
            size="xs"
            variant="ghost"
            color={active ? config.color : undefined}
            className="type-filter-toggle"
        />
    );
}

/**
 * Enhanced Annotation Item with status, replies, and view snapshots
 */
function AnnotationItem({ annotation, onToggleVisibility, onStatusChange, onReply, onRestoreView, onExpand }) {
    const [expanded, setExpanded] = useState(false);
    const typeConfig = ANNOTATION_TYPES[annotation.type] || ANNOTATION_TYPES.point;
    const statusConfig = ANNOTATION_STATUS[annotation.status?.toUpperCase()] || ANNOTATION_STATUS.OPEN;
    const isVisible = annotation.visible !== false;
    const replyCount = annotation.replies?.length || 0;
    const hasSnapshot = annotation.viewSnapshot != null;

    const handleExpand = () => {
        const newExpanded = !expanded;
        setExpanded(newExpanded);
        onExpand?.(annotation, newExpanded);
    };

    return (
        <div className={`annotation-item ${expanded ? 'annotation-item--expanded' : ''}`}>
            {/* Main row */}
            <div className="annotation-item__main" onClick={handleExpand}>
                {/* Status indicator */}
                <div className={`annotation-item__status icon-${statusConfig.color}`} title={statusConfig.description}>
                    <Icon name={statusConfig.icon} size={10} />
                </div>

                {/* Type badge */}
                <div className={`annotation-item__type-badge type-badge--${typeConfig.color}`}>
                    <Icon name={typeConfig.icon} size={12} />
                </div>

                {/* Content */}
                <div className="annotation-item__content">
                    <span className="annotation-item__text">
                        {annotation.label || annotation.text || `${typeConfig.label} annotation`}
                    </span>
                    <div className="annotation-item__meta">
                        <span>{annotation.author || 'You'}</span>
                        <span>·</span>
                        <span>{annotation.createdAt ? new Date(annotation.createdAt).toLocaleDateString() : 'Today'}</span>
                        {replyCount > 0 && (
                            <>
                                <span>·</span>
                                <span className="annotation-item__reply-count">
                                    <Icon name="messageSquare" size={10} />
                                    {replyCount}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Visibility toggle */}
                <IconButton
                    icon={isVisible ? 'eye' : 'eyeOff'}
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(annotation); }}
                    tooltip={isVisible ? 'Hide' : 'Show'}
                    size="xs"
                    variant="ghost"
                    className="annotation-item__visibility"
                />

                {/* Expand indicator */}
                <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={12} className="annotation-item__chevron" />
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="annotation-item__expanded">
                    {/* Replies section */}
                    {replyCount > 0 && (
                        <div className="annotation-item__replies">
                            <div className="annotation-item__replies-header">
                                <Icon name="messageSquare" size={10} />
                                <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                            </div>
                            <div className="annotation-item__replies-list">
                                {annotation.replies?.slice(0, 3).map((reply, idx) => (
                                    <div key={idx} className="annotation-item__reply">
                                        <span className="annotation-item__reply-author">{reply.author || 'User'}</span>
                                        <span className="annotation-item__reply-text">{reply.text}</span>
                                    </div>
                                ))}
                                {replyCount > 3 && (
                                    <button className="annotation-item__show-more">
                                        Show {replyCount - 3} more...
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* View snapshot */}
                    {hasSnapshot && (
                        <button
                            className="annotation-item__restore-view"
                            onClick={() => onRestoreView?.(annotation)}
                        >
                            <Icon name="camera" size={12} />
                            <span>Restore View Context</span>
                        </button>
                    )}

                    {/* Actions */}
                    <div className="annotation-item__actions">
                        <button
                            className="annotation-item__action-btn"
                            onClick={() => onReply?.(annotation)}
                            data-color="blue"
                        >
                            <Icon name="messageSquare" size={12} />
                            <span>Reply</span>
                        </button>
                        <button
                            className="annotation-item__action-btn"
                            onClick={() => onStatusChange?.(annotation, 'resolved')}
                            data-color="green"
                        >
                            <Icon name="checkCircle" size={12} />
                            <span>Resolve</span>
                        </button>
                        <button
                            className="annotation-item__action-btn"
                            onClick={() => onStatusChange?.(annotation, 'archived')}
                            data-color="gray"
                        >
                            <Icon name="archive" size={12} />
                            <span>Archive</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DatasetGroup({ dataset, annotations, onToggleVisibility }) {
    const [expanded, setExpanded] = useState(true);

    if (!annotations || annotations.length === 0) return null;

    return (
        <div className="dataset-group">
            <div
                className="dataset-group__header"
                onClick={() => setExpanded(!expanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
            >
                <IconButton
                    icon={expanded ? 'chevronDown' : 'chevronRight'}
                    size="xs"
                    variant="ghost"
                />
                <Icon name="database" size={12} className="dataset-group__icon" />
                <span className="dataset-group__name">{dataset?.name || 'Unknown Dataset'}</span>
                <span className="dataset-group__count">{annotations.length}</span>
            </div>
            {expanded && (
                <div className="dataset-group__list">
                    {annotations.map(ann => (
                        <AnnotationItem
                            key={ann.id}
                            annotation={ann}
                            onToggleVisibility={onToggleVisibility}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnnotationsPanelContent({ workspaceId }) {
    // Context and tool state
    const [context, setContext] = useState(ANNOTATION_CONTEXTS.INSTANCE);
    const [selectedInstance, setSelectedInstance] = useState(null);
    const [activeTool, setActiveTool] = useState('select');

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilters, setTypeFilters] = useState(Object.keys(ANNOTATION_TYPES));
    const [ownershipFilter, setOwnershipFilter] = useState('all');
    const [statusFilters, setStatusFilters] = useState(['open', 'resolved']);
    const [showArchived, setShowArchived] = useState(false);

    // Section states for resizable sections
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates(DEFAULT_SECTION_STATES);

    // Get real annotations from hook
    const {
        annotations,
        annotationsByDataset,
        stats,
        isLoading,
        error,
        activeScope,
        setActiveScope,
        updateAnnotation,
    } = useAnnotations({ workspaceId });

    // Get instances for context selector
    const instances = useMemo(() => {
        return workspaceManager?.getInstances?.() || [];
    }, []);

    // Get datasets for name lookup
    const datasets = useDatasets();
    const datasetMap = useMemo(() => {
        const map = {};
        datasets.forEach(ds => { map[ds.id] = ds; });
        return map;
    }, [datasets]);

    // Toggle type filter
    const toggleTypeFilter = useCallback((type) => {
        setTypeFilters(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    }, []);

    // Toggle status filter
    const toggleStatusFilter = useCallback((status) => {
        setStatusFilters(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    }, []);

    // Toggle annotation visibility
    const handleToggleVisibility = useCallback((annotation) => {
        updateAnnotation({
            id: annotation.id,
            targetDatasetId: annotation.datasetId,
            updates: { visible: annotation.visible === false }
        });
    }, [updateAnnotation]);

    // Update annotation status
    const handleStatusChange = useCallback((annotation, newStatus) => {
        updateAnnotation({
            id: annotation.id,
            targetDatasetId: annotation.datasetId,
            updates: { status: newStatus }
        });
    }, [updateAnnotation]);

    // Reply to annotation
    const handleReply = useCallback((annotation) => {
        // TODO: Open reply dialog
        console.log('Reply to annotation:', annotation.id);
    }, []);

    // Restore view context from snapshot
    const handleRestoreView = useCallback((annotation) => {
        if (annotation.viewSnapshot) {
            window.dispatchEvent(new CustomEvent('cia:restore-view-snapshot', {
                detail: { snapshot: annotation.viewSnapshot, annotationId: annotation.id }
            }));
        }
    }, []);

    // Handle tool change
    const handleToolChange = useCallback((toolId) => {
        setActiveTool(toolId);
        window.dispatchEvent(new CustomEvent('cia:annotation-tool-changed', {
            detail: { tool: toolId, context }
        }));
    }, [context]);

    // Filter annotations by type, status, and search
    const filteredAnnotations = useMemo(() => {
        return annotations.filter(ann => {
            // Type filter
            if (!typeFilters.includes(ann.type)) return false;

            // Status filter
            const annStatus = ann.status || 'open';
            if (annStatus === 'archived' && !showArchived) return false;
            if (annStatus !== 'archived' && !statusFilters.includes(annStatus)) return false;

            // Ownership filter
            if (ownershipFilter !== 'all') {
                const isMine = ann.author === 'You' || ann.authorId === 'current-user';
                if (ownershipFilter === 'mine' && !isMine) return false;
                if (ownershipFilter === 'shared' && isMine) return false;
            }

            // Instance filter (when in instance context)
            if (context === ANNOTATION_CONTEXTS.INSTANCE && selectedInstance) {
                if (ann.instanceId && ann.instanceId !== selectedInstance) return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const text = (ann.label || ann.text || '').toLowerCase();
                if (!text.includes(query)) return false;
            }

            return true;
        });
    }, [annotations, typeFilters, statusFilters, showArchived, ownershipFilter, context, selectedInstance, searchQuery]);

    // Group filtered annotations by dataset
    const filteredByDataset = useMemo(() => {
        const grouped = {};
        filteredAnnotations.forEach(ann => {
            const dsId = ann.datasetId || 'unknown';
            if (!grouped[dsId]) grouped[dsId] = [];
            grouped[dsId].push(ann);
        });
        return grouped;
    }, [filteredAnnotations]);

    // Separate workspace and instance annotations
    const workspaceAnnotations = useMemo(() =>
        filteredAnnotations.filter(ann => ann.scope === 'workspace'),
        [filteredAnnotations]
    );

    const instanceAnnotations = useMemo(() =>
        filteredAnnotations.filter(ann => ann.scope === 'instance' || !ann.scope),
        [filteredAnnotations]
    );

    // Count dataset annotations
    const datasetAnnotationCount = Object.values(filteredByDataset)
        .reduce((sum, arr) => sum + arr.length, 0);

    return (
        <div className="annotations-tab">
            {/* Header */}
            <div className="panel-header panel-header--pink">
                <Icon name="mapPin" size={16} className="panel-header__icon" />
                <span className="panel-header__title">Annotations</span>
                <span className="panel-header__count">{stats.total}</span>
            </div>

            {/* Scrollable Content */}
            <div className="annotations-tab__content">
                {/* Context Selector */}
                <ContextSelector
                    context={context}
                    onChange={setContext}
                    instances={instances}
                    selectedInstance={selectedInstance}
                    onInstanceChange={setSelectedInstance}
                />

                {/* Annotation Tools */}
                <AnnotationTools
                    context={context}
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                />

                {/* Ownership Filter */}
                <div className="ownership-chips-wrapper">
                    <div className="ownership-chips">
                        {OWNERSHIP_FILTERS.map(f => (
                            <OwnershipChip
                                key={f.id}
                                filter={f}
                                active={ownershipFilter === f.id}
                                onClick={() => setOwnershipFilter(f.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Search */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search annotations..."
                />

                {/* Status Filter */}
                <StatusFilter
                    activeStatuses={statusFilters}
                    onToggle={toggleStatusFilter}
                    showArchived={showArchived}
                    onToggleArchived={setShowArchived}
                />

                {/* Type filters */}
                <div className="type-filter-wrapper">
                    <div className="type-filter-group">
                        {Object.entries(ANNOTATION_TYPES).map(([type, config]) => (
                            <TypeFilterToggle
                                key={type}
                                type={type}
                                config={config}
                                active={typeFilters.includes(type)}
                                onClick={() => toggleTypeFilter(type)}
                            />
                        ))}
                    </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="annotations-tab__loading">
                        <Icon name="loader" size={16} className="spin" />
                        <span>Loading annotations...</span>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="annotations-tab__error">
                        <span>Failed to load annotations</span>
                    </div>
                )}

                {/* Content - Resizable Sections */}
                {!isLoading && !error && (
                    <ResizableSectionsContainer
                        sectionStates={sectionStates}
                        onSectionToggle={toggleSection}
                        onSectionResize={resizeSection}
                    >
                        {/* Dataset Annotations */}
                        <ResizableSection
                            id="dataset"
                            icon="database"
                            iconColorClass="icon-green"
                            label="Dataset Annotations"
                            count={datasetAnnotationCount}
                        >
                            <div className="annotations-tab__section-content">
                                {Object.keys(filteredByDataset).length === 0 ? (
                                    <EmptyState icon="mapPin" title="No dataset annotations" size="sm" />
                                ) : (
                                    Object.entries(filteredByDataset).map(([dsId, anns]) => (
                                        <DatasetGroup
                                            key={dsId}
                                            dataset={datasetMap[dsId]}
                                            annotations={anns}
                                            onToggleVisibility={handleToggleVisibility}
                                            onStatusChange={handleStatusChange}
                                            onReply={handleReply}
                                            onRestoreView={handleRestoreView}
                                        />
                                    ))
                                )}
                            </div>
                        </ResizableSection>

                        {/* Instance Annotations */}
                        <ResizableSection
                            id="instance"
                            icon="box"
                            iconColorClass="icon-blue"
                            label="Instance Annotations"
                            count={instanceAnnotations.length}
                        >
                            <div className="annotations-tab__section-content">
                                {instanceAnnotations.length === 0 ? (
                                    <EmptyState icon="mapPin" title="No instance annotations" size="sm" />
                                ) : (
                                    instanceAnnotations.map(ann => (
                                        <AnnotationItem
                                            key={ann.id}
                                            annotation={ann}
                                            onToggleVisibility={handleToggleVisibility}
                                            onStatusChange={handleStatusChange}
                                            onReply={handleReply}
                                            onRestoreView={handleRestoreView}
                                        />
                                    ))
                                )}
                            </div>
                        </ResizableSection>

                        {/* Workspace Annotations */}
                        <ResizableSection
                            id="workspace"
                            icon="layoutGrid"
                            iconColorClass="icon-amber"
                            label="Workspace Annotations"
                            count={workspaceAnnotations.length}
                        >
                            <div className="annotations-tab__section-content">
                                {workspaceAnnotations.length === 0 ? (
                                    <EmptyState icon="mapPin" title="No workspace annotations" size="sm" />
                                ) : (
                                    workspaceAnnotations.map(ann => (
                                        <AnnotationItem
                                            key={ann.id}
                                            annotation={ann}
                                            onToggleVisibility={handleToggleVisibility}
                                            onStatusChange={handleStatusChange}
                                            onReply={handleReply}
                                            onRestoreView={handleRestoreView}
                                        />
                                    ))
                                )}
                            </div>
                        </ResizableSection>
                    </ResizableSectionsContainer>
                )}
            </div>

            {/* Footer - fixed at bottom */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={() => handleToolChange('point')}
                >
                    <Icon name="plus" size={11} />
                    <span>New Annotation</span>
                </button>
                <button
                    className="panel-footer__btn panel-footer__btn--icon"
                    title="Open full annotations panel"
                >
                    <Icon name="externalLink" size={11} />
                </button>
            </div>
        </div>
    );
}

export default AnnotationsPanelContent;