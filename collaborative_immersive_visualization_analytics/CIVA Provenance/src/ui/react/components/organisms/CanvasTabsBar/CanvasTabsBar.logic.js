/**
 * @file CanvasTabsBar.logic.js
 * @description Business logic hooks for CanvasTabsBar component
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Configuration for canvas tabs
 */
export const CANVAS_TABS_CONFIG = {
    maxVisibleTabs: 4,
    tabMaxWidth: 180,
    tabMinWidth: 80,
};

/**
 * Workspace type configurations
 */
export const WORKSPACE_TYPES = {
    workspace: {
        icon: 'square',
        prefix: null,
        color: 'blue',
    },
    subset: {
        icon: 'filter',
        prefix: 'Subset:',
        color: 'amber',
    },
    scratch: {
        icon: 'pencil',
        prefix: null,
        color: 'green',
    },
};

/**
 * Create workspace options
 */
export const CREATE_OPTIONS = [
    {
        id: 'empty',
        label: 'Empty Workspace',
        icon: 'square',
        description: 'Start with a blank canvas',
    },
    {
        id: 'subset',
        label: 'From Subset...',
        icon: 'filter',
        description: 'Opens SubsetSelectorModal',
    },
    {
        id: 'scratch',
        label: 'Scratch Pad',
        icon: 'pencil',
        description: 'Personal temporary workspace',
    },
];

/**
 * Hook to manage open workspaces display
 */
export function useWorkspaceTabs(workspaces, activeWorkspaceId) {
    const openWorkspaces = useMemo(() =>
        workspaces.filter(w => w.isOpen),
        [workspaces]
    );

    const visibleWorkspaces = useMemo(() =>
        openWorkspaces.slice(0, CANVAS_TABS_CONFIG.maxVisibleTabs),
        [openWorkspaces]
    );

    const overflowWorkspaces = useMemo(() =>
        openWorkspaces.slice(CANVAS_TABS_CONFIG.maxVisibleTabs),
        [openWorkspaces]
    );

    const activeWorkspace = useMemo(() =>
        workspaces.find(w => w.id === activeWorkspaceId) || null,
        [workspaces, activeWorkspaceId]
    );

    const closedWorkspaces = useMemo(() =>
        workspaces.filter(w => !w.isOpen),
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

/**
 * Hook to manage tab drag-and-drop reordering
 */
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

/**
 * Hook to manage close confirmation
 */
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

/**
 * Hook to manage popover state
 */
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
 * Hook to filter workspaces by search
 */
export function useWorkspaceSearch(workspaces) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredWorkspaces = useMemo(() => {
        if (!searchQuery.trim()) return workspaces;
        const query = searchQuery.toLowerCase();
        return workspaces.filter(w =>
            w.name.toLowerCase().includes(query)
        );
    }, [workspaces, searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    return {
        searchQuery,
        setSearchQuery,
        filteredWorkspaces,
        clearSearch,
    };
}
