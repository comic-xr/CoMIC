// src/ui/react/components/panels/LayoutPanel/LayoutPanel.jsx
// Layout Panel Component
//
// IMPORTANT: Import DOCK_POSITIONS from LayoutPanelContext, NOT from
// LayoutPanel.logic.js to ensure consistent comparisons with FloatingCanvasNavigator.

import React, { memo, useContext } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useLayoutPanel } from './LayoutPanel.logic';
import LayoutPanelContext, { DOCK_POSITIONS } from './LayoutPanelContext';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';
import { CanvasSubtab } from './subtabs/CanvasSubtab';
import { ViewsSubtab } from './subtabs/ViewsSubtab';
import './LayoutPanel.scss';

// Subtab configuration
const SUBTABS = [
    { id: 'canvas', label: 'Canvas', icon: 'map', color: 'amber' },
    { id: 'views', label: 'Views', icon: 'layers', color: 'purple' },
];

/**
 * LayoutPanel - Main panel component for canvas navigation and view management
 *
 * RENDER LOGIC:
 * - Only renders docked CanvasNavigator when dockPosition === 'left-panel'
 * - FloatingCanvasNavigator (in CIAWebApp.jsx) handles all other positions
 *
 * @param {Object} props
 * @param {string} [props.canvasId] - Target canvas ID
 * @param {string} [props.className] - Additional CSS classes
 */
export const LayoutPanel = memo(function LayoutPanel({
    canvasId,
    className = '',
}) {
    // ==========================================================================
    // CONTEXT & LOGIC
    // ==========================================================================

    // Check if we're inside a LayoutPanelProvider
    const context = useContext(LayoutPanelContext);

    // Create standalone logic only if no context available
    // When context exists, use context.logic which has dockPosition
    const standaloneLogic = useLayoutPanel(context ? { __existing: true } : { canvasId });
    const logic = context?.logic || standaloneLogic;

    // ==========================================================================
    // DESTRUCTURE LOGIC
    // ==========================================================================

    const {
        panelSubtab,
        setPanelSubtab,
        cells,
        loading,
        error,
        isConnected,
        // Get dockPosition from logic (which comes from LayoutPanelContext)
        dockPosition,
    } = logic;

    // ==========================================================================
    // RENDER DECISION FOR DOCKED NAVIGATOR
    // ==========================================================================

    // Only render docked navigator when dockPosition is explicitly 'left-panel'
    // FloatingCanvasNavigator handles all other positions
    const shouldRenderDockedNavigator = dockPosition === DOCK_POSITIONS.LEFT_PANEL;

    // DEBUG: Log render decision
    console.log('[LayoutPanel] dockPosition:', dockPosition,
        '| shouldRenderDockedNavigator:', shouldRenderDockedNavigator);

    // ==========================================================================
    // RENDER - LOADING STATE
    // ==========================================================================

    if (loading) {
        return (
            <div className={`layout-panel layout-panel--loading ${className}`}>
                <div className="panel-header panel-header--indigo">
                    <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Layout</span>
                </div>
                <div className="layout-panel__loading">
                    <Loader2 className="layout-panel__spinner" size={24} />
                    <span>Loading canvas...</span>
                </div>
            </div>
        );
    }

    // ==========================================================================
    // RENDER - ERROR STATE
    // ==========================================================================

    if (error) {
        return (
            <div className={`layout-panel layout-panel--error ${className}`}>
                <div className="panel-header panel-header--indigo">
                    <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Layout</span>
                </div>
                <div className="layout-panel__error">
                    <AlertCircle size={24} />
                    <span>Failed to load canvas</span>
                    <span className="layout-panel__error-detail">{error.message || 'Unknown error'}</span>
                </div>
            </div>
        );
    }

    // ==========================================================================
    // RENDER - MAIN CONTENT
    // ==========================================================================

    return (
        <div className={`layout-panel ${className}`}>
            {/* Header */}
            <div className="panel-header panel-header--indigo">
                <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Layout</span>

                {/* Connection indicator */}
                {!isConnected && (
                    <div className="panel-header__offline" title="Offline - changes will sync when reconnected">
                        <WifiOff size={12} />
                    </div>
                )}
            </div>

            {/* Subtab navigation */}
            <div className="layout-panel__tabs">
                {SUBTABS.map(({ id, label, icon: Icon, color }) => (
                    <button
                        key={id}
                        className={`layout-panel__tab ${panelSubtab === id ? 'layout-panel__tab--active' : ''}`}
                        onClick={() => setPanelSubtab(id)}
                        data-color={color}
                    >
                        <Icon size={12} />
                        <span>{label}</span>
                        {id === 'views' && cells.length > 0 && (
                            <span className="layout-panel__tab-badge">{cells.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Subtab content */}
            <div className="layout-panel__content">
                {panelSubtab === 'canvas' ? (
                    <CanvasSubtab logic={logic} />
                ) : (
                    <ViewsSubtab logic={logic} />
                )}
            </div>

            {/* Docked Navigator - ONLY when dockPosition is 'left-panel' */}
            {shouldRenderDockedNavigator && (
                <div className="layout-panel__navigator">
                    <CanvasNavigator
                        isDocked={true}
                        logic={logic}
                    />
                </div>
            )}
        </div>
    );
});

export default LayoutPanel;