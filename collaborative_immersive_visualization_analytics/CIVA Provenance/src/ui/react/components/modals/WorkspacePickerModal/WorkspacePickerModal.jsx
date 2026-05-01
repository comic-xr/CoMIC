/**
 * @file WorkspacePickerModal.jsx
 * @description Modal for selecting workspace when switching rooms.
 * Uses the base Modal component for consistent styling and behavior.
 *
 * Features:
 * - Grouped workspace lists (Personal, Room, Project)
 * - Online presence indicators per workspace
 * - Last-used workspace memory per room
 * - Auto-enter when no workspaces available
 * - Double-click for quick selection
 *
 * @example
 * <WorkspacePickerModal
 *   isOpen={showPicker}
 *   targetRoom={{ roomId: 'room-1', roomName: 'Team Room' }}
 *   groupedWorkspaces={{ personal: [], room: [], project: [] }}
 *   onConfirm={(workspaceId) => switchWorkspace(workspaceId)}
 *   onSkip={() => enterRoomWithoutSwitch()}
 *   onCancel={() => setShowPicker(false)}
 * />
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { getIconComponent } from '@UI/react/components/atoms/Icon';

import { Modal } from '@UI/react/components/modals/Modal';
import { useWorkspacePresence } from '@UI/react/hooks/useRoomPresence.js';

import './WorkspacePickerModal.scss';

// Key for localStorage
const LAST_WORKSPACE_KEY = 'cia-web:lastWorkspaceByRoom';

/**
 * Get last used workspace for a room from localStorage
 */
function getLastWorkspaceForRoom(roomId) {
    try {
        const stored = localStorage.getItem(LAST_WORKSPACE_KEY);
        if (stored) {
            const map = JSON.parse(stored);
            return map[roomId] || null;
        }
    } catch (e) {
        console.warn('Failed to read last workspace preference:', e);
    }
    return null;
}

/**
 * Save last used workspace for a room to localStorage
 */
function saveLastWorkspaceForRoom(roomId, workspaceId) {
    try {
        const stored = localStorage.getItem(LAST_WORKSPACE_KEY);
        const map = stored ? JSON.parse(stored) : {};
        map[roomId] = workspaceId;
        localStorage.setItem(LAST_WORKSPACE_KEY, JSON.stringify(map));
    } catch (e) {
        console.warn('Failed to save last workspace preference:', e);
    }
}

/**
 * WorkspaceItemWithPresence - Shows online count for a workspace
 */
const WorkspaceItemWithPresence = memo(function WorkspaceItemWithPresence({
    workspace,
    isSelected,
    onSelect,
    onDoubleClick,
}) {
    const { users } = useWorkspacePresence(workspace.id);
    const onlineCount = users?.length || 0;

    return (
        <button
            className={`workspace-picker__item ${isSelected ? 'workspace-picker__item--selected' : ''
                }`}
            onClick={() => onSelect(workspace)}
            onDoubleClick={() => onDoubleClick(workspace)}
        >
            <span className="workspace-picker__item-name">{workspace.name}</span>
            {onlineCount > 0 && (
                <span className="workspace-picker__item-members">
                    <Icon name="users" size={10} />
                    {onlineCount}
                </span>
            )}
            <Icon name="chevronRight" size={14} className="workspace-picker__item-arrow" />
        </button>
    );
});

/**
 * WorkspaceGroup - Renders a group of workspaces (Personal/Room/Project)
 */
const WorkspaceGroup = memo(function WorkspaceGroup({
    title,
    icon,
    workspaces,
    selectedId,
    onSelect,
    onDoubleClick,
    emptyMessage,
}) {
    const IconComponent = getIconComponent(icon);

    if (workspaces.length === 0) {
        return (
            <div className="workspace-picker__group workspace-picker__group--empty">
                <div className="workspace-picker__group-header">
                    <IconComponent size={14} />
                    <span>{title}</span>
                </div>
                <p className="workspace-picker__empty">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="workspace-picker__group">
            <div className="workspace-picker__group-header">
                <IconComponent size={14} />
                <span>{title}</span>
                <span className="workspace-picker__count">{workspaces.length}</span>
            </div>
            <div className="workspace-picker__list">
                {workspaces.map((ws) => (
                    <WorkspaceItemWithPresence
                        key={ws.id}
                        workspace={ws}
                        isSelected={selectedId === ws.id}
                        onSelect={onSelect}
                        onDoubleClick={onDoubleClick}
                    />
                ))}
            </div>
        </div>
    );
});

/**
 * WorkspacePickerModal - Main modal component
 *
 * Props:
 * - isOpen: boolean
 * - targetRoom: { roomId, roomName } - The room user is switching to
 * - currentWorkspaceId: string - Currently active workspace
 * - groupedWorkspaces: { personal, room, project } - Workspaces by type
 * - onConfirm: (workspaceId) => void - Called when user picks workspace
 * - onSkip: () => void - Called when user continues without changing workspace
 * - onCancel: () => void - Called when user cancels room switch
 * - onCreateWorkspace: (type, roomId) => Promise<workspace> - Create new workspace
 * - onAutoEnter: (roomId, roomName) => void - Called when auto-entering (no picker)
 */
export const WorkspacePickerModal = memo(function WorkspacePickerModal({
    isOpen,
    targetRoom,
    currentWorkspaceId,
    groupedWorkspaces = { personal: [], room: [], project: [] },
    onConfirm,
    onSkip,
    onCancel,
    onCreateWorkspace,
    onAutoEnter,
}) {
    const [selectedWorkspace, setSelectedWorkspace] = useState(null);

    // Filter workspaces for target room
    const filtered = useMemo(() => {
        const targetRoomId = targetRoom?.roomId;

        // Personal workspaces (always visible)
        const personal = groupedWorkspaces.personal || [];

        // Room workspaces: exact match OR null roomId (floating breakouts)
        const room = (groupedWorkspaces.room || []).filter(
            (w) => w.roomId === targetRoomId || !w.roomId
        );

        // Project workspaces (always visible)
        const project = groupedWorkspaces.project || [];

        return { personal, room, project };
    }, [groupedWorkspaces, targetRoom]);

    // Total available workspaces
    const totalWorkspaces = useMemo(() => {
        return filtered.personal.length + filtered.room.length + filtered.project.length;
    }, [filtered]);

    // Check for last-used workspace in this room
    const lastUsedWorkspaceId = useMemo(() => {
        if (!targetRoom?.roomId) return null;
        return getLastWorkspaceForRoom(targetRoom.roomId);
    }, [targetRoom]);

    // Auto-select logic when modal opens
    useEffect(() => {
        if (!isOpen || !targetRoom) return;

        // If no workspaces available, auto-create and enter
        if (totalWorkspaces === 0) {
            // Auto-create a default workspace for this room
            if (onCreateWorkspace) {
                onCreateWorkspace('breakout', targetRoom.roomId)
                    .then((newWorkspace) => {
                        if (newWorkspace) {
                            saveLastWorkspaceForRoom(targetRoom.roomId, newWorkspace.id);
                            onConfirm?.(newWorkspace.id);
                        } else {
                            // Fallback: just enter room without workspace change
                            onAutoEnter?.(targetRoom.roomId, targetRoom.roomName);
                        }
                    })
                    .catch(() => {
                        // On error, just enter room
                        onAutoEnter?.(targetRoom.roomId, targetRoom.roomName);
                    });
            } else {
                // No create function, just enter room
                onAutoEnter?.(targetRoom.roomId, targetRoom.roomName);
            }
            return;
        }

        // Pre-select last used workspace if available
        if (lastUsedWorkspaceId) {
            const allWorkspaces = [
                ...filtered.personal,
                ...filtered.room,
                ...filtered.project,
            ];
            const lastUsed = allWorkspaces.find((w) => w.id === lastUsedWorkspaceId);
            if (lastUsed) {
                setSelectedWorkspace(lastUsed);
                return;
            }
        }

        // Otherwise, no pre-selection
        setSelectedWorkspace(null);
    }, [
        isOpen,
        targetRoom,
        totalWorkspaces,
        lastUsedWorkspaceId,
        filtered,
        onCreateWorkspace,
        onConfirm,
        onAutoEnter,
    ]);

    // Handle workspace selection
    const handleSelect = useCallback((workspace) => {
        setSelectedWorkspace(workspace);
    }, []);

    // Handle confirm
    const handleConfirm = useCallback(() => {
        if (!selectedWorkspace || !targetRoom) return;

        // Save as last-used for this room
        saveLastWorkspaceForRoom(targetRoom.roomId, selectedWorkspace.id);
        onConfirm?.(selectedWorkspace.id);
    }, [selectedWorkspace, targetRoom, onConfirm]);

    // Handle double-click for quick select
    const handleDoubleClick = useCallback(
        (workspace) => {
            if (!targetRoom) return;
            saveLastWorkspaceForRoom(targetRoom.roomId, workspace.id);
            onConfirm?.(workspace.id);
        },
        [targetRoom, onConfirm]
    );

    // Handle create new workspace
    const handleCreate = useCallback(async () => {
        if (!onCreateWorkspace || !targetRoom) return;

        try {
            const newWorkspace = await onCreateWorkspace('breakout', targetRoom.roomId);
            if (newWorkspace) {
                saveLastWorkspaceForRoom(targetRoom.roomId, newWorkspace.id);
                onConfirm?.(newWorkspace.id);
            }
        } catch (e) {
            console.error('Failed to create workspace:', e);
        }
    }, [onCreateWorkspace, targetRoom, onConfirm]);

    // Keyboard handling for Enter key (Escape is handled by Modal)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && selectedWorkspace) {
                e.preventDefault();
                handleConfirm();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedWorkspace, handleConfirm]);

    // Don't render if we're auto-entering (no workspaces)
    // Modal handles the isOpen check internally
    if (totalWorkspaces === 0) return null;

    // ---------------------------------------------------------------------------
    // RENDER FOOTER
    // ---------------------------------------------------------------------------

    const renderFooter = () => (
        <>
            <LabeledButton
                label="Keep Current"
                onClick={onSkip}
                variant="ghost"
                className="workspace-picker__btn workspace-picker__btn--skip"
            />
            <LabeledButton
                label="Open Workspace"
                icon="arrowRight"
                onClick={handleConfirm}
                disabled={!selectedWorkspace}
                variant="primary"
                className="workspace-picker__btn workspace-picker__btn--confirm"
            />
        </>
    );

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title="Choose Workspace"
            icon={getIconComponent('layout')}
            size="md"
            footer={renderFooter()}
        >
            <div className="workspace-picker__content">
                {/* Subtitle */}
                <p className="workspace-picker__subtitle">
                    Entering <strong>{targetRoom?.roomName || 'room'}</strong>
                </p>

                {/* Workspace Groups */}
                <div className="workspace-picker__body">
                    <WorkspaceGroup
                        title="My Workspaces"
                        icon="user"
                        workspaces={filtered.personal}
                        selectedId={selectedWorkspace?.id}
                        onSelect={handleSelect}
                        onDoubleClick={handleDoubleClick}
                        emptyMessage="No personal workspaces"
                    />

                    <WorkspaceGroup
                        title="Room Workspaces"
                        icon="briefcase"
                        workspaces={filtered.room}
                        selectedId={selectedWorkspace?.id}
                        onSelect={handleSelect}
                        onDoubleClick={handleDoubleClick}
                        emptyMessage="No workspaces in this room"
                    />

                    <WorkspaceGroup
                        title="Project Workspaces"
                        icon="globe"
                        workspaces={filtered.project}
                        selectedId={selectedWorkspace?.id}
                        onSelect={handleSelect}
                        onDoubleClick={handleDoubleClick}
                        emptyMessage="No project-wide workspaces"
                    />

                    {/* Create new workspace option */}
                    {onCreateWorkspace && (
                        <LabeledButton
                            icon="add"
                            label="Create New Workspace"
                            onClick={handleCreate}
                            variant="ghost"
                            className="workspace-picker__create"
                        />
                    )}
                </div>
            </div>
        </Modal>
    );
});

export default WorkspacePickerModal;