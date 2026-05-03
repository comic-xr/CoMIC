/**
 * @file CanvasTabsBar.jsx
 * @description Workspace management bar with tabs, mode toggle, and popout/breakout indicators.
 *
 * Features:
 * - Workspace tabs (workspace, subset, scratch types)
 * - Drag-to-reorder tabs
 * - Double-click inline rename
 * - Create popover with templates
 * - Mode toggle (Tile/Tabs)
 * - Popout and Breakout manager buttons
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon } from '@UI/react/components/atoms';
import { CanvasTab } from './CanvasTab';
import { ModeToggle } from './ModeToggle';
import { CreateOpenPopover } from './CreateOpenPopover';
import {
    useWorkspaceTabs,
    useTabDragDrop,
    useCloseConfirmation,
    usePopoverState,
} from './CanvasTabsBar.logic';
import './CanvasTabsBar.scss';

/**
 * CanvasTabsBar - Main component
 */
const CanvasTabsBar = memo(function CanvasTabsBar({
    // Workspace data
    workspaces = [],
    activeWorkspaceId,
    onSelectWorkspace,
    onCreateWorkspace,
    onOpenWorkspace,
    onCloseWorkspace,
    onRenameWorkspace,
    onReorderWorkspaces,
    // Mode
    mode = 'tabs',
    onModeChange,
    // Popouts
    popoutCount = 0,
    onOpenPopoutManager,
    // Breakouts
    breakoutCount = 0,
    hasActiveBreakout = false,
    onOpenBreakoutManager,
}) {
    const {
        visibleWorkspaces,
        overflowWorkspaces,
    } = useWorkspaceTabs(workspaces, activeWorkspaceId);

    const {
        dragTargetId,
        handleDragOver,
        handleDrop,
    } = useTabDragDrop(onReorderWorkspaces);

    const {
        pendingClose,
        handleClose,
        confirmClose,
        cancelClose,
    } = useCloseConfirmation(onCloseWorkspace);

    const {
        showCreatePopover,
        showOverflowDropdown,
        setShowCreatePopover,
        setShowOverflowDropdown,
        toggleCreatePopover,
        closeAllPopovers,
    } = usePopoverState();

    const handleSelectWorkspace = useCallback((id) => {
        onSelectWorkspace?.(id);
        closeAllPopovers();
    }, [onSelectWorkspace, closeAllPopovers]);

    const handleRenameWorkspace = useCallback((id, name) => {
        onRenameWorkspace?.(id, name);
    }, [onRenameWorkspace]);

    return (
        <div className="canvas-tabs-bar">
            {/* Tabs section */}
            <div className="canvas-tabs-bar__tabs">
                {visibleWorkspaces.map(workspace => (
                    <CanvasTab
                        key={workspace.id}
                        workspace={workspace}
                        isActive={workspace.id === activeWorkspaceId}
                        onSelect={() => handleSelectWorkspace(workspace.id)}
                        onClose={() => handleClose(workspace)}
                        onRename={(name) => handleRenameWorkspace(workspace.id, name)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragTarget={dragTargetId === workspace.id}
                    />
                ))}

                {/* Overflow dropdown */}
                {overflowWorkspaces.length > 0 && (
                    <div className="canvas-tabs-bar__overflow">
                        <button
                            className="canvas-tabs-bar__overflow-trigger"
                            onClick={() => setShowOverflowDropdown(!showOverflowDropdown)}
                        >
                            <span>+{overflowWorkspaces.length}</span>
                            <Icon name="chevronDown" size={12} />
                        </button>

                        {showOverflowDropdown && (
                            <div className="canvas-tabs-bar__overflow-dropdown">
                                {overflowWorkspaces.map(workspace => (
                                    <button
                                        key={workspace.id}
                                        className="canvas-tabs-bar__overflow-item"
                                        onClick={() => handleSelectWorkspace(workspace.id)}
                                    >
                                        {workspace.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Create button + popover */}
                <div className="canvas-tabs-bar__create">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon="plus"
                        onClick={toggleCreatePopover}
                        className={showCreatePopover ? 'canvas-tabs-bar__create-btn--active' : ''}
                    />
                    <CreateOpenPopover
                        isOpen={showCreatePopover}
                        onClose={() => setShowCreatePopover(false)}
                        workspaces={workspaces}
                        onCreateWorkspace={onCreateWorkspace}
                        onOpenWorkspace={onOpenWorkspace}
                    />
                </div>
            </div>

            <div className="canvas-tabs-bar__separator" />

            {/* Mode toggle */}
            <ModeToggle mode={mode} onModeChange={onModeChange} />

            {/* Popout manager button */}
            {popoutCount > 0 && (
                <button
                    className="canvas-tabs-bar__manager-btn"
                    onClick={onOpenPopoutManager}
                >
                    <Icon name="externalLink" size={14} />
                    <span>{popoutCount}</span>
                    <Icon name="chevronDown" size={12} />
                </button>
            )}

            {/* Breakout manager button */}
            {breakoutCount > 0 && (
                <button
                    className={`canvas-tabs-bar__manager-btn ${hasActiveBreakout ? 'canvas-tabs-bar__manager-btn--active' : ''}`}
                    onClick={onOpenBreakoutManager}
                >
                    <Icon name="mic" size={14} />
                    <span>{breakoutCount}</span>
                    <Icon name="chevronDown" size={12} />
                </button>
            )}

            {/* Close confirmation dialog */}
            {pendingClose && (
                <div className="canvas-tabs-bar__confirm-overlay">
                    <div className="canvas-tabs-bar__confirm-dialog">
                        <div className="canvas-tabs-bar__confirm-title">
                            Unsaved Changes
                        </div>
                        <div className="canvas-tabs-bar__confirm-message">
                            "{pendingClose.name}" has unsaved changes. Close anyway?
                        </div>
                        <div className="canvas-tabs-bar__confirm-actions">
                            <Button variant="ghost" size="sm" onClick={cancelClose}>
                                Cancel
                            </Button>
                            <Button variant="danger" size="sm" onClick={confirmClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

CanvasTabsBar.propTypes = {
    workspaces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        isOpen: PropTypes.bool,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    })),
    activeWorkspaceId: PropTypes.string,
    onSelectWorkspace: PropTypes.func,
    onCreateWorkspace: PropTypes.func,
    onOpenWorkspace: PropTypes.func,
    onCloseWorkspace: PropTypes.func,
    onRenameWorkspace: PropTypes.func,
    onReorderWorkspaces: PropTypes.func,
    mode: PropTypes.oneOf(['tile', 'tabs']),
    onModeChange: PropTypes.func,
    popoutCount: PropTypes.number,
    onOpenPopoutManager: PropTypes.func,
    breakoutCount: PropTypes.number,
    hasActiveBreakout: PropTypes.bool,
    onOpenBreakoutManager: PropTypes.func,
};

export { CanvasTabsBar };
export default CanvasTabsBar;
