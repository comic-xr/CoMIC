/**
 * @file useViewGroups.js
 * @description React hook for ViewGroup management via ViewGroupManager
 * Connects UI components to the server-authoritative ViewGroup system
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { viewGroupManager } from '@Core/data/managers/ViewGroupManager.js';
import { VIEWGROUP_STATES } from '@Core/data/models/ViewGroup.js';

/**
 * Main hook for ViewGroup management
 * Provides ViewGroups list, active ViewGroup, and CRUD operations
 */
export function useViewGroups(workspaceId = null) {
    const [viewGroups, setViewGroups] = useState([]);
    const [activeViewGroupId, setActiveViewGroupId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load ViewGroups on mount or workspace change
    useEffect(() => {
        if (!workspaceId) {
            setIsLoading(false);
            return;
        }

        const loadViewGroups = async () => {
            setIsLoading(true);
            setError(null);
            try {
                viewGroupManager.initialize(workspaceId);
                await viewGroupManager.loadFromServer(workspaceId);
                setViewGroups(viewGroupManager.getAllViewGroups());
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadViewGroups();
    }, [workspaceId]);

    // Subscribe to ViewGroupManager events
    useEffect(() => {
        const handleCreated = ({ viewGroup }) => {
            setViewGroups(prev => [...prev, viewGroup]);
        };

        const handleUpdated = ({ viewGroup }) => {
            setViewGroups(prev =>
                prev.map(vg => vg.id === viewGroup.id ? viewGroup : vg)
            );
        };

        const handleDeleted = ({ viewGroupId }) => {
            setViewGroups(prev => prev.filter(vg => vg.id !== viewGroupId));
            if (activeViewGroupId === viewGroupId) {
                setActiveViewGroupId(null);
            }
        };

        const handleLinked = ({ originatorGroupId, targetGroupId }) => {
            setViewGroups(viewGroupManager.getAllViewGroups());
        };

        const handleUnlinked = ({ groupId }) => {
            setViewGroups(viewGroupManager.getAllViewGroups());
        };

        viewGroupManager.on('viewGroupCreated', handleCreated);
        viewGroupManager.on('viewGroupUpdated', handleUpdated);
        viewGroupManager.on('viewGroupDeleted', handleDeleted);
        viewGroupManager.on('viewGroupLinked', handleLinked);
        viewGroupManager.on('viewGroupUnlinked', handleUnlinked);

        return () => {
            viewGroupManager.off('viewGroupCreated', handleCreated);
            viewGroupManager.off('viewGroupUpdated', handleUpdated);
            viewGroupManager.off('viewGroupDeleted', handleDeleted);
            viewGroupManager.off('viewGroupLinked', handleLinked);
            viewGroupManager.off('viewGroupUnlinked', handleUnlinked);
        };
    }, [activeViewGroupId]);

    // Filter to only visible ViewGroups (hide solo implicit groups)
    const visibleViewGroups = useMemo(() => {
        return viewGroups.filter(vg => {
            const state = vg.getState?.() || (vg.name ? VIEWGROUP_STATES.NAMED : VIEWGROUP_STATES.SOLO);
            return state !== VIEWGROUP_STATES.SOLO;
        });
    }, [viewGroups]);

    const activeViewGroup = useMemo(() => {
        return viewGroups.find(vg => vg.id === activeViewGroupId) || null;
    }, [viewGroups, activeViewGroupId]);

    // CRUD Operations
    const createViewGroup = useCallback(async (layoutId, templateId = null) => {
        try {
            const viewGroup = await viewGroupManager.createViewGroup({
                layoutId,
                workspaceId,
                name: templateId ? `From Template` : `New Group`,
            });
            setActiveViewGroupId(viewGroup.id);
            return viewGroup;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [workspaceId]);

    const updateViewGroup = useCallback(async (viewGroupId, updates) => {
        try {
            return await viewGroupManager.updateViewGroup(viewGroupId, updates);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteViewGroup = useCallback(async (viewGroupId) => {
        try {
            await viewGroupManager.deleteViewGroup(viewGroupId);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const duplicateViewGroup = useCallback(async (viewGroupId, options = {}) => {
        try {
            // Call the duplicate endpoint
            const response = await fetch(`/api/viewgroups/${viewGroupId}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: options.name,
                    linkOption: options.linkOption || 'link_to_original',
                    linkDirection: options.linkDirection || 'duplicate_follows',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to duplicate ViewGroup');
            }

            const data = await response.json();

            // Add the new ViewGroup to local state
            if (data.viewGroup) {
                setViewGroups(prev => [...prev, data.viewGroup]);
                setActiveViewGroupId(data.viewGroup.id);
            }

            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const selectViewGroup = useCallback((viewGroupId) => {
        setActiveViewGroupId(viewGroupId);
    }, []);

    const goToViewGroup = useCallback((viewGroupId) => {
        // Emit event for canvas to pan/zoom to ViewGroup
        window.dispatchEvent(new CustomEvent('cia:goto-viewgroup', {
            detail: { viewGroupId }
        }));
        setActiveViewGroupId(viewGroupId);
    }, []);

    return {
        // State
        viewGroups,
        visibleViewGroups,
        activeViewGroup,
        activeViewGroupId,
        isLoading,
        error,
        // Actions
        createViewGroup,
        updateViewGroup,
        deleteViewGroup,
        duplicateViewGroup,
        selectViewGroup,
        goToViewGroup,
        setActiveViewGroupId,
    };
}

/**
 * Hook for View-to-View link management
 */
export function useViewLinks(viewId) {
    const [links, setLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!viewId) {
            setLinks([]);
            return;
        }

        const loadLinks = async () => {
            setIsLoading(true);
            try {
                const viewLinks = viewGroupManager.getViewLinks(viewId);
                setLinks(viewLinks);
            } catch (err) {
                console.error('Failed to load view links:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadLinks();

        // Subscribe to link events
        const handleLinkCreated = ({ viewLink }) => {
            if (viewLink.sourceViewId === viewId || viewLink.targetViewId === viewId) {
                setLinks(viewGroupManager.getViewLinks(viewId));
            }
        };

        const handleLinkDeleted = ({ viewLink }) => {
            if (viewLink.sourceViewId === viewId || viewLink.targetViewId === viewId) {
                setLinks(viewGroupManager.getViewLinks(viewId));
            }
        };

        viewGroupManager.on('viewLinkCreated', handleLinkCreated);
        viewGroupManager.on('viewLinkDeleted', handleLinkDeleted);

        return () => {
            viewGroupManager.off('viewLinkCreated', handleLinkCreated);
            viewGroupManager.off('viewLinkDeleted', handleLinkDeleted);
        };
    }, [viewId]);

    const createLink = useCallback(async (targetViewId, property, mode) => {
        return viewGroupManager.createViewLink(viewId, targetViewId, property, mode);
    }, [viewId]);

    const deleteLink = useCallback(async (linkId) => {
        return viewGroupManager.deleteViewLink(linkId);
    }, []);

    const incomingLinks = useMemo(() => {
        return links.filter(l => l.targetViewId === viewId);
    }, [links, viewId]);

    const outgoingLinks = useMemo(() => {
        return links.filter(l => l.sourceViewId === viewId);
    }, [links, viewId]);

    return {
        links,
        incomingLinks,
        outgoingLinks,
        isLoading,
        createLink,
        deleteLink,
    };
}

/**
 * Hook for ViewGroup-to-ViewGroup link management
 */
export function useViewGroupLinks(viewGroupId) {
    const [vgLinks, setVgLinks] = useState([]);

    useEffect(() => {
        if (!viewGroupId) {
            setVgLinks([]);
            return;
        }

        const handleLinked = ({ originatorGroupId, targetGroupId }) => {
            if (originatorGroupId === viewGroupId || targetGroupId === viewGroupId) {
                // Refresh VG links
                const viewGroup = viewGroupManager.getViewGroup(viewGroupId);
                if (viewGroup?.link) {
                    setVgLinks([viewGroup.link]);
                } else {
                    setVgLinks([]);
                }
            }
        };

        const handleUnlinked = ({ groupId }) => {
            if (groupId === viewGroupId) {
                setVgLinks([]);
            }
        };

        // Initial load
        const viewGroup = viewGroupManager.getViewGroup(viewGroupId);
        if (viewGroup?.link) {
            setVgLinks([viewGroup.link]);
        }

        viewGroupManager.on('viewGroupLinked', handleLinked);
        viewGroupManager.on('viewGroupUnlinked', handleUnlinked);

        return () => {
            viewGroupManager.off('viewGroupLinked', handleLinked);
            viewGroupManager.off('viewGroupUnlinked', handleUnlinked);
        };
    }, [viewGroupId]);

    const linkToGroup = useCallback(async (targetGroupId, mode, properties) => {
        return viewGroupManager.linkViewGroups(viewGroupId, targetGroupId, mode, properties);
    }, [viewGroupId]);

    const unlinkGroup = useCallback(async () => {
        return viewGroupManager.unlinkViewGroup(viewGroupId);
    }, [viewGroupId]);

    const isLinked = vgLinks.length > 0;
    const isOriginator = vgLinks.some(l => l.originatorGroupId === viewGroupId);

    return {
        vgLinks,
        isLinked,
        isOriginator,
        linkToGroup,
        unlinkGroup,
    };
}

/**
 * Hook for reconciliation status and actions
 */
export function useReconciliation(viewId) {
    const [reconciliationStatus, setReconciliationStatus] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const checkStatus = useCallback(async () => {
        if (!viewId) return;

        setIsChecking(true);
        try {
            const status = await viewGroupManager.checkReconciliationStatus(viewId);
            setReconciliationStatus(status);
            return status;
        } catch (err) {
            console.error('Failed to check reconciliation status:', err);
        } finally {
            setIsChecking(false);
        }
    }, [viewId]);

    const reconcile = useCallback(async (linkId, action) => {
        try {
            await viewGroupManager.reconcileView(viewId, linkId, action);
            await checkStatus(); // Refresh status
        } catch (err) {
            console.error('Failed to reconcile:', err);
            throw err;
        }
    }, [viewId, checkStatus]);

    useEffect(() => {
        checkStatus();

        const handleReconciliationNeeded = ({ viewId: eventViewId }) => {
            if (eventViewId === viewId) {
                checkStatus();
            }
        };

        viewGroupManager.on('reconciliationNeeded', handleReconciliationNeeded);

        return () => {
            viewGroupManager.off('reconciliationNeeded', handleReconciliationNeeded);
        };
    }, [viewId, checkStatus]);

    return {
        needsReconciliation: reconciliationStatus?.needsReconciliation || false,
        divergedLinks: reconciliationStatus?.divergedLinks || [],
        isChecking,
        checkStatus,
        reconcile,
    };
}

export default useViewGroups;
