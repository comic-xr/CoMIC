/**
 * @file TabbedCanvasView.jsx
 * @description Display single workspace full-size in tabs mode
 *
 * Features:
 * - Full canvas header with workspace info
 * - Breakout controls (join/leave)
 * - View controls (grid, viewgroups, fullscreen)
 * - Empty state when no workspace selected
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { FullCanvasHeader } from './FullCanvasHeader';
import './TabbedCanvasView.scss';

/**
 * Workspace type icon mapping
 */
const WORKSPACE_TYPE_ICONS = {
    workspace: 'layoutGrid',
    subset: 'filter',
    scratch: 'pencil',
};

/**
 * TabbedCanvasView - Single workspace full-size display
 */
const TabbedCanvasView = memo(function TabbedCanvasView({
    workspace,
    onClose,
    currentBreakoutId,
    onJoinBreakout,
    onLeaveBreakout,
    onToggleGrid,
    onToggleViewGroups,
    onFullscreen,
    renderCanvas,
}) {
    // Empty state
    if (!workspace) {
        return (
            <div className="tabbed-canvas-view tabbed-canvas-view--empty">
                <div className="tabbed-canvas-view__empty-state">
                    <Icon
                        name="layoutGrid"
                        size={48}
                        className="tabbed-canvas-view__empty-icon"
                    />
                    <span className="tabbed-canvas-view__empty-text">
                        No workspace selected
                    </span>
                </div>
            </div>
        );
    }

    const typeIcon = WORKSPACE_TYPE_ICONS[workspace.type] || WORKSPACE_TYPE_ICONS.workspace;

    return (
        <div className="tabbed-canvas-view">
            <FullCanvasHeader
                workspace={workspace}
                onClose={onClose}
                currentBreakoutId={currentBreakoutId}
                onJoinBreakout={onJoinBreakout}
                onLeaveBreakout={onLeaveBreakout}
                onToggleGrid={onToggleGrid}
                onToggleViewGroups={onToggleViewGroups}
                onFullscreen={onFullscreen}
            />

            <div className="tabbed-canvas-view__content">
                {renderCanvas ? (
                    renderCanvas(workspace)
                ) : (
                    <div className="tabbed-canvas-view__placeholder">
                        <Icon
                            name={typeIcon}
                            size={64}
                            className="tabbed-canvas-view__placeholder-icon"
                        />
                        <span className="tabbed-canvas-view__placeholder-name">
                            {workspace.name}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

TabbedCanvasView.propTypes = {
    workspace: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        isOpen: PropTypes.bool,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    }),
    onClose: PropTypes.func,
    currentBreakoutId: PropTypes.string,
    onJoinBreakout: PropTypes.func,
    onLeaveBreakout: PropTypes.func,
    onToggleGrid: PropTypes.func,
    onToggleViewGroups: PropTypes.func,
    onFullscreen: PropTypes.func,
    /** Custom render function for canvas content */
    renderCanvas: PropTypes.func,
};

export { TabbedCanvasView };
export default TabbedCanvasView;
