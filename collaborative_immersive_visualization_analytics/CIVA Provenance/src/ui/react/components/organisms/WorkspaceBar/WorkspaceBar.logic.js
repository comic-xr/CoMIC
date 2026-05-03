/**
 * @file WorkspaceBar.logic.js
 * @description Business logic hooks for WorkspaceBar component.
 */

import { useState, useMemo, useCallback } from 'react';

export const WORKSPACE_TABS_CONFIG = {
    maxVisibleTabs: 3,
};

/**
 * Hook to manage workspace bar state.
 */
export function useWorkspaceBar(workspaces, activeWorkspaceId) {
    const activeWorkspace = useMemo(() =>
        (workspaces || []).find(ws => ws.id === activeWorkspaceId) || null,
        [workspaces, activeWorkspaceId]
    );

    return { activeWorkspace };
}

export function useWorkspaceTabs(workspaces, activeWorkspaceId) {
    const openWorkspaces = useMemo(() =>
        (workspaces || []).filter(w => w.isOpen),
        [workspaces]
    );

    const visibleWorkspaces = useMemo(() =>
        openWorkspaces.slice(0, WORKSPACE_TABS_CONFIG.maxVisibleTabs),
        [openWorkspaces]
    );

    const overflowWorkspaces = useMemo(() =>
        openWorkspaces.slice(WORKSPACE_TABS_CONFIG.maxVisibleTabs),
        [openWorkspaces]
    );

    const activeWorkspace = useMemo(() =>
        (workspaces || []).find(w => w.id === activeWorkspaceId) || null,
        [workspaces, activeWorkspaceId]
    );

    const closedWorkspaces = useMemo(() =>
        (workspaces || []).filter(w => !w.isOpen),
        [workspaces]
    );

    return {
        openWorkspaces,
        visibleWorkspaces,
        overflowWorkspaces,
        activeWorkspace,
        closedWorkspaces,
    };
}

export function useTabDragDrop(onReorderWorkspaces) {
    const [dragTargetId, setDragTargetId] = useState(null);

    const handleDragOver = useCallback((targetId) => {
        setDragTargetId(targetId);
    }, []);

    const handleDrop = useCallback((draggedId, targetId) => {
        if (draggedId !== targetId) {
            onReorderWorkspaces?.(draggedId, targetId);
        }
        setDragTargetId(null);
    }, [onReorderWorkspaces]);

    const handleDragEnd = useCallback(() => {
        setDragTargetId(null);
    }, []);

    return {
        dragTargetId,
        handleDragOver,
        handleDrop,
        handleDragEnd,
    };
}

export function useCloseConfirmation(onCloseWorkspace) {
    const [pendingClose, setPendingClose] = useState(null);

    const handleClose = useCallback((workspace) => {
        if (workspace.hasChanges) {
            setPendingClose(workspace);
        } else {
            onCloseWorkspace?.(workspace.id);
        }
    }, [onCloseWorkspace]);

    const confirmClose = useCallback(() => {
        if (pendingClose) {
            onCloseWorkspace?.(pendingClose.id);
            setPendingClose(null);
        }
    }, [pendingClose, onCloseWorkspace]);

    const cancelClose = useCallback(() => {
        setPendingClose(null);
    }, []);

    return {
        pendingClose,
        handleClose,
        confirmClose,
        cancelClose,
    };
}

export function usePopoverState() {
    const [showCreatePopover, setShowCreatePopover] = useState(false);
    const [showOverflowDropdown, setShowOverflowDropdown] = useState(false);

    const toggleCreatePopover = useCallback(() => {
        setShowCreatePopover(prev => !prev);
        setShowOverflowDropdown(false);
    }, []);

    const toggleOverflowDropdown = useCallback(() => {
        setShowOverflowDropdown(prev => !prev);
        setShowCreatePopover(false);
    }, []);

    const closeAllPopovers = useCallback(() => {
        setShowCreatePopover(false);
        setShowOverflowDropdown(false);
    }, []);

    return {
        showCreatePopover,
        showOverflowDropdown,
        setShowCreatePopover,
        setShowOverflowDropdown,
        toggleCreatePopover,
        toggleOverflowDropdown,
        closeAllPopovers,
    };
}

/**
 * Hook to manage manager dropdowns (Popout and Breakout managers).
 */
export function useManagerDropdowns() {
    const [showPopoutDropdown, setShowPopoutDropdown] = useState(false);
    const [showBreakoutDropdown, setShowBreakoutDropdown] = useState(false);

    const togglePopout = useCallback(() => {
        setShowPopoutDropdown(prev => !prev);
        setShowBreakoutDropdown(false);
    }, []);

    const toggleBreakout = useCallback(() => {
        setShowBreakoutDropdown(prev => !prev);
        setShowPopoutDropdown(false);
    }, []);

    const closeAll = useCallback(() => {
        setShowPopoutDropdown(false);
        setShowBreakoutDropdown(false);
    }, []);

    return {
        showPopoutDropdown,
        showBreakoutDropdown,
        togglePopout,
        toggleBreakout,
        closeAll,
    };
}
