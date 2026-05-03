/**
 * @file WorkspaceBar.jsx
 * @description Workspace-level bar below the RoomHeader (Canvas Tabs Bar).
 *
 * Layout: WORKSPACE (tabs + [+]) | MODE | POPOUTS (if any) | BREAKOUTS (if any)
 * Height: 58px total (18px section labels + 40px content)
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, IconButton } from '@UI/react/components/atoms';
import { WorkspaceTab } from './WorkspaceTab';
import { ModeToggle } from './ModeToggle';
import { PopoutManager } from './PopoutManager';
import { BreakoutManager } from './BreakoutManager';
import { CreateOpenPopover } from '../CanvasTabsBar/CreateOpenPopover';
import {
    useManagerDropdowns,
    useWorkspaceTabs,
    useTabDragDrop,
    useCloseConfirmation,
    usePopoverState,
} from './WorkspaceBar.logic';
import './WorkspaceBar.scss';

const WorkspaceBar = memo(function WorkspaceBar({
    workspaces = [],
    activeWorkspaceId,
    onSelectWorkspace,
    onCreateWorkspace,
    onOpenWorkspace,
    onCloseWorkspace,
    onRenameWorkspace,
    onReorderWorkspaces,
    popouts = [],
    breakouts = [],
    canvasMode = 'tile',
    onModeChange,
    onJoinBreakout,
    onCreateBreakout,
    onFocusPopout,
    onClosePopout,
    onTileAllPopouts,
    onCloseAllPopouts,
    onCloseAllWorkspaces,
    // Layout props (injected by ThreeEdgeLayout cloneElement)
    style,
    ...layoutProps
}) {
    const hasPopouts = popouts.length > 0;
    const hasBreakouts = breakouts.length > 0;

    const { visibleWorkspaces, overflowWorkspaces } = useWorkspaceTabs(
        workspaces,
        activeWorkspaceId
    );

    const { dragTargetId, handleDragOver, handleDrop } = useTabDragDrop(
        onReorderWorkspaces
    );

    const {
        pendingClose,
        handleClose,
        confirmClose,
        cancelClose,
    } = useCloseConfirmation(onCloseWorkspace);

    const {
        showCreatePopover,
        showOverflowDropdown,
        toggleCreatePopover,
        toggleOverflowDropdown,
        closeAllPopovers,
    } = usePopoverState();

    const {
        showPopoutDropdown,
        showBreakoutDropdown,
        togglePopout,
        toggleBreakout,
        closeAll,
    } = useManagerDropdowns();

    const handleSelectWorkspace = useCallback((workspaceId) => {
        onSelectWorkspace?.(workspaceId);
        closeAllPopovers();
    }, [onSelectWorkspace, closeAllPopovers]);

    const handleRename = useCallback((workspaceId, name) => {
        onRenameWorkspace?.(workspaceId, name);
    }, [onRenameWorkspace]);

    return (
        <div className="workspace-bar" style={style}>
            {/* Section Labels Row */}
            <div className="workspace-bar__labels">
                <span className="workspace-bar__label workspace-bar__label--workspace">Workspace</span>
                <span className="workspace-bar__label-spacer" />
                <span className="workspace-bar__label-divider" />
                <span className="workspace-bar__label workspace-bar__label--mode">Mode</span>
                {hasPopouts && (
                    <>
                        <span className="workspace-bar__label-divider" />
                        <span className="workspace-bar__label workspace-bar__label--popouts">Popouts</span>
                    </>
                )}
                {hasBreakouts && (
                    <>
                        <span className="workspace-bar__label-divider" />
                        <span className="workspace-bar__label workspace-bar__label--breakouts">Breakouts</span>
                    </>
                )}
            </div>

            {/* Content Row */}
            <div className="workspace-bar__content">
                {/* Workspace Tabs */}
                <div className="workspace-bar__tabs">
                    {visibleWorkspaces.map(ws => (
                        <WorkspaceTab
                            key={ws.id}
                            workspace={ws}
                            isActive={ws.id === activeWorkspaceId}
                            onSelect={handleSelectWorkspace}
                            onClose={() => handleClose(ws)}
                            onRename={(name) => handleRename(ws.id, name)}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            isDragTarget={dragTargetId === ws.id}
                        />
                    ))}

                    {overflowWorkspaces.length > 0 && (
                        <div className="workspace-bar__overflow">
                            <button
                                className="workspace-bar__overflow-trigger"
                                onClick={toggleOverflowDropdown}
                            >
                                <span>+{overflowWorkspaces.length}</span>
                                <Icon name="chevronDown" size={12} />
                            </button>
                            {showOverflowDropdown && (
                                <div className="workspace-bar__overflow-dropdown">
                                    {overflowWorkspaces.map((workspace) => (
                                        <button
                                            key={workspace.id}
                                            className="workspace-bar__overflow-item"
                                            onClick={() => handleSelectWorkspace(workspace.id)}
                                        >
                                            {workspace.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* New Workspace Button */}
                    <div className="workspace-bar__create">
                        <button
                            className={`workspace-bar__new-btn ${showCreatePopover ? 'workspace-bar__new-btn--active' : ''}`}
                            onClick={toggleCreatePopover}
                            title="New Workspace"
                        >
                            <Icon name="plus" size={14} />
                        </button>
                        <CreateOpenPopover
                            isOpen={showCreatePopover}
                            onClose={closeAllPopovers}
                            workspaces={workspaces}
                            onCreateWorkspace={onCreateWorkspace}
                            onOpenWorkspace={onOpenWorkspace}
                        />
                    </div>
                </div>

                <div className="workspace-bar__spacer" />
                <div className="workspace-bar__divider" />

                {/* Mode Toggle + Tab Controls */}
                <div className="workspace-bar__mode-group">
                    <ModeToggle
                        canvasMode={canvasMode}
                        onModeChange={onModeChange}
                    />
                    {canvasMode === 'tabs' && (
                        <div className="workspace-bar__tab-controls">
                            <IconButton
                                icon="stack_group"
                                label="Cascade windows"
                                tooltip="Cascade windows"
                                size="sm"
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('cia:workspace-arrange', {
                                        detail: { mode: 'cascade' },
                                    }));
                                }}
                            />
                            <IconButton
                                icon="view_module"
                                label="Tile windows"
                                tooltip="Tile windows"
                                size="sm"
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('cia:workspace-arrange', {
                                        detail: { mode: 'tile' },
                                    }));
                                }}
                            />
                            {onCloseAllWorkspaces && (
                                <IconButton
                                    icon="x"
                                    label="Close all windows"
                                    tooltip="Close all windows"
                                    size="sm"
                                    onClick={() => onCloseAllWorkspaces()}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Popout Manager (conditional) */}
                {hasPopouts && (
                    <>
                        <div className="workspace-bar__divider" />
                        <PopoutManager
                            popouts={popouts}
                            showDropdown={showPopoutDropdown}
                            onToggleDropdown={togglePopout}
                            onCloseDropdown={closeAll}
                            onFocusPopout={onFocusPopout}
                            onClosePopout={onClosePopout}
                            onTileAll={onTileAllPopouts}
                            onCloseAll={onCloseAllPopouts}
                        />
                    </>
                )}

                {/* Breakout Manager (conditional) */}
                {hasBreakouts && (
                    <>
                        <div className="workspace-bar__divider" />
                        <BreakoutManager
                            breakouts={breakouts}
                            showDropdown={showBreakoutDropdown}
                            onToggleDropdown={toggleBreakout}
                            onCloseDropdown={closeAll}
                            onJoinBreakout={onJoinBreakout}
                            onCreateBreakout={onCreateBreakout}
                        />
                    </>
                )}
            </div>

            {pendingClose && (
                <div className="workspace-bar__confirm-overlay">
                    <div className="workspace-bar__confirm-dialog">
                        <div className="workspace-bar__confirm-title">
                            Unsaved Changes
                        </div>
                        <div className="workspace-bar__confirm-message">
                            "{pendingClose.name}" has unsaved changes. Close anyway?
                        </div>
                        <div className="workspace-bar__confirm-actions">
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

WorkspaceBar.propTypes = {
    workspaces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        isOpen: PropTypes.bool,
        usersViewing: PropTypes.number,
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
    popouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    })),
    breakouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        usersInVoice: PropTypes.number,
    })),
    canvasMode: PropTypes.oneOf(['tile', 'tabs']),
    onModeChange: PropTypes.func,
    onJoinBreakout: PropTypes.func,
    onCreateBreakout: PropTypes.func,
    onFocusPopout: PropTypes.func,
    onClosePopout: PropTypes.func,
    onTileAllPopouts: PropTypes.func,
    onCloseAllPopouts: PropTypes.func,
    onCloseAllWorkspaces: PropTypes.func,
    style: PropTypes.object,
};

export { WorkspaceBar };
export default WorkspaceBar;
