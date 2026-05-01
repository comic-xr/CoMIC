// src/ui/react/components/panels/LeftPanel/tabs/InstanceToolsTab/InstanceToolsTab.jsx
// Instance Tools tab content for the unified left panel
//
// FIXED:
// - Properly gets VIEW name from ViewConfigurationManager (not dataset filename)
// - Gets DATASET name separately
// - Listens for name change events to update display
// - Shows both view name (primary) and dataset name (secondary)
// - Uses InstanceCard for consistent styling and position-based coloring

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Import subtab components
import { ToolsList } from './subtabs/ToolsSubtab';
import { LayersSubtab } from './subtabs/LayersSubtab';
import { AnnotationsSubtab } from './subtabs/AnnotationsSubtab';
import { LinksSubtab } from './subtabs/LinksSubtab';

// Import InstanceCard for view header display
import { InstanceCard } from '@UI/react/components/organisms/InstanceCard';

// Import managers
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';

// Import color utilities for position-based coloring
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { normalizeInstanceToolsResult } from '@UI/react/utils/instanceTools.js';

import './InstanceToolsTab.scss';

// =============================================================================
// SUBTAB CONFIGURATION - Matches DatasetsTab pattern
// =============================================================================

const SUBTABS = [
    { id: 'tools', label: 'Tools', icon: 'activity', color: 'amber' },
    { id: 'layers', label: 'Layers', icon: 'layers', color: 'purple' },
    { id: 'annotations', label: 'Annotations', icon: 'mapPin', color: 'pink' },
    { id: 'links', label: 'Links', icon: 'link', color: 'teal' },
];

// =============================================================================
// TOOLS SUBTAB WRAPPER - Gets tools from workspaceManager
// =============================================================================

function ToolsSubtab({ activeInstance }) {
    const [expandedMenus, setExpandedMenus] = useState({});
    const [tools, setTools] = useState([]);
    const [toolSections, setToolSections] = useState([]);

    // Get tools from workspaceManager - same method as InstanceViewport uses
    useEffect(() => {
        if (!activeInstance?.instanceId) {
            setTools([]);
            return;
        }

        const loadTools = () => {
            try {
                // Use the same method as InstanceViewport for consistency
                const toolsList = workspaceManager.getInstanceTools(activeInstance.instanceId);
                const normalized = normalizeInstanceToolsResult(toolsList);
                setTools(normalized.tools || []);
                setToolSections(normalized.sections || []);
            } catch (err) {
                console.warn('Failed to load tools:', err);
                setTools([]);
                setToolSections([]);
            }
        };

        loadTools();

        // Listen for tool updates (same event as InstanceViewport)
        const handleToolsUpdate = (event) => {
            if (event.detail?.instanceId === activeInstance.instanceId) {
                loadTools();
            }
        };

        window.addEventListener('cia:tools-updated', handleToolsUpdate);
        return () => window.removeEventListener('cia:tools-updated', handleToolsUpdate);
    }, [activeInstance?.instanceId]);

    const handleToggleMenu = useCallback((menuId) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    }, []);

    return (
        <ToolsList
            tools={tools}
            toolSections={toolSections}
            expandedMenus={expandedMenus}
            onToggleMenu={handleToggleMenu}
        />
    );
}

// =============================================================================
// NO INSTANCE PLACEHOLDER
// =============================================================================

function NoInstancePlaceholder() {
    return (
        <div className="instance-tools-tab__no-instance">
            <Icon name="monitor" size={32} />
            <h3>No Instance Selected</h3>
            <p>Click on an instance viewport to select it and view its tools.</p>
            <span className="instance-tools-tab__no-instance-hint">
                Tip: The mini toolbar appears on hover in each viewport
            </span>
        </div>
    );
}

// =============================================================================
// HELPER: Get instance display info from ViewConfigurationManager
// =============================================================================

/**
 * Extract proper display info for an instance.
 * Gets VIEW name from ViewConfigurationManager (not dataset filename).
 * Gets DATASET name separately.
 * Uses position-based coloring to match canvas cells.
 */
function getInstanceDisplayInfo(instance) {
    if (!instance) return null;

    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();
    const viewId = instance.viewConfigId || instance.viewId;

    // Get the ViewConfiguration for the real view name
    const viewConfig = viewManager?.getView?.(viewId);

    // Get the dataset for the dataset name
    const datasetId = viewConfig?.datasetId || instance.instanceData?.dataset?.id;
    const dataset = datasetId ? datasetManager?.getDataset?.(datasetId) : null;

    // Try to get position from canvas for position-based coloring
    let position = null;
    let colorHex = '#60a5fa'; // Default blue

    try {
        const activeCanvasId = canvasManager?.getActiveCanvasId?.();
        if (activeCanvasId) {
            const canvas = canvasManager?.getCanvas?.(activeCanvasId);
            if (canvas?.placements) {
                const placement = canvas.placements.find(
                    p => p.content?.viewConfigurationId === viewId
                );
                if (placement) {
                    position = { row: placement.row, col: placement.col };
                    colorHex = getCellColorHex(placement.row, placement.col);
                }
            }
        }
    } catch (e) {
        // Fall back to default color
    }

    // Build display info
    return {
        // View ID for InstanceCard
        viewId,

        // Primary: View name from ViewConfiguration
        name: viewConfig?.name ||
            instance.name ||
            `Instance ${(instance.instanceId || instance.id)?.slice(0, 8) || 'Unknown'}`,

        // Secondary: Dataset name (separate from view name)
        dataset: dataset?.name ||
            instance.instanceData?.dataset?.name ||
            instance.instanceData?.dataset?.filename ||
            instance.instanceData?.dataset?.fileName ||
            'No data loaded',

        // Handler type
        type: instance.type || viewConfig?.handlerType || 'vtk',

        // Position-based color
        color: colorHex,
        position,
    };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * InstanceToolsPanelContent - Tools panel for the active instance
 * 
 * Shows tools, layers, and annotations for the currently focused instance.
 * Updates automatically when user clicks on different instances or renames views.
 */
export function InstanceToolsPanelContent({ workspaceId }) {
    const [activeTab, setActiveTab] = useState('tools');
    const [activeInstance, setActiveInstance] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Subscribe to active instance changes
    useEffect(() => {
        const updateActiveInstance = () => {
            const instance = workspaceManager?.getActiveInstance?.();
            setActiveInstance(instance || null);
        };

        // Initial check
        updateActiveInstance();

        // Listen for instance focus changes
        const handleInstanceFocus = () => {
            updateActiveInstance();
        };

        // Listen for view closure/deletion - clear active instance if it was deleted
        const handleViewClosed = () => {
            // Small delay to allow workspaceManager to update
            setTimeout(updateActiveInstance, 50);
        };

        // Listen for name changes - force re-render to show new name
        const handleNameChange = () => {
            setRefreshKey(k => k + 1);
        };

        window.addEventListener('cia:instance-focused', handleInstanceFocus);
        window.addEventListener('cia:active-instance-changed', handleInstanceFocus);
        window.addEventListener('cia:close-view', handleViewClosed);

        // Also listen to viewConfigurationManager events
        const viewManager = getViewConfigurationManager();
        if (viewManager?.on) {
            viewManager.on('viewTrashed', handleViewClosed);
            viewManager.on('viewDeleted', handleViewClosed);
            viewManager.on('viewDeactivated', handleViewClosed);
            // Listen for name changes
            viewManager.on('viewUpdated', handleNameChange);
            viewManager.on('viewRenamed', handleNameChange);
        }

        return () => {
            window.removeEventListener('cia:instance-focused', handleInstanceFocus);
            window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
            window.removeEventListener('cia:close-view', handleViewClosed);

            if (viewManager?.off) {
                viewManager.off('viewTrashed', handleViewClosed);
                viewManager.off('viewDeleted', handleViewClosed);
                viewManager.off('viewDeactivated', handleViewClosed);
                viewManager.off('viewUpdated', handleNameChange);
                viewManager.off('viewRenamed', handleNameChange);
            }
        };
    }, []);

    // Extract instance info for display - recalculate when refreshKey changes
    const instanceInfo = useMemo(() => {
        return getInstanceDisplayInfo(activeInstance);
    }, [activeInstance, refreshKey]);

    // Render content based on active subtab
    const renderContent = () => {
        if (!activeInstance) return null;

        switch (activeTab) {
            case 'tools':
                return <ToolsSubtab activeInstance={activeInstance} />;
            case 'layers':
                return <LayersSubtab activeInstance={activeInstance} />;
            case 'annotations':
                return <AnnotationsSubtab activeInstance={activeInstance} />;
            case 'links':
                return <LinksSubtab activeInstance={activeInstance} />;
            default:
                return null;
        }
    };

    return (
        <div className="instance-tools-tab">
            {/* ============================================================
                PANEL HEADER - Matches Files and Datasets tabs
                ============================================================ */}
            <div className="panel-header panel-header--amber">
                <Icon name="wrench" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Instance Tools</span>
                {activeInstance && (
                    <span className="panel-header__count">1 active</span>
                )}
            </div>

            {/* If no active instance, show placeholder */}
            {!activeInstance ? (
                <NoInstancePlaceholder />
            ) : (
                <>
                    {/* ========================================================
                        FOCUSED INSTANCE HEADER
                        Uses InstanceCard for consistent styling & position-based color
                        ======================================================== */}
                    <InstanceCard
                        viewId={instanceInfo?.viewId}
                        color={instanceInfo?.color}
                        position={instanceInfo?.position}
                        variant="header"
                        colorPosition="right"
                        showSettings={false}
                        className="instance-tools-tab__instance-card"
                    />

                    {/* ========================================================
                        SUBTAB BAR - Tools / Layers / Annotations
                        Matches DatasetsTab styling pattern
                        ======================================================== */}
                    <div className="instance-tools-tab__tabs">
                        {SUBTABS.map((tab) => {
                            const iconName = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    className={`instance-tools-tab__tab ${isActive ? 'instance-tools-tab__tab--active' : ''}`}
                                    data-color={tab.color}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <Icon name={iconName} size={12} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ========================================================
                        CONTENT AREA
                        ======================================================== */}
                    <div className="instance-tools-tab__content">
                        {renderContent()}
                    </div>
                </>
            )}
        </div>
    );
}

export default InstanceToolsPanelContent;
