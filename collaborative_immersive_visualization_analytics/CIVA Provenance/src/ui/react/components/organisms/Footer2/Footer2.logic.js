/**
 * @file Footer2.logic.js
 * @description Logic hooks for Footer2 component
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

export const FOOTER_BREAKPOINTS = {
    // Minimum width to fit all zones with labels
    // Focus(70) + Actions(70) + Tools(130) + ViewGroup(100) + Links(180) + VR(40) + dividers + spacers
    MIN_WIDTH: 650,
};

export const TOOLBAR_SECTIONS = [
    { id: 'focus', position: 'start', priority: 1 },
    { id: 'universal', position: 'start', priority: 2 },
    { id: 'typeSpecific', position: 'center', priority: 2 },
    { id: 'viewGroup', position: 'center', priority: 1 },
    { id: 'links', position: 'end', priority: 1 },
    { id: 'vr', position: 'end', priority: 1 },
];

export const LINK_PROPERTIES = [
    { id: 'camera', icon: 'camera', label: 'Camera', description: 'View angle & zoom', color: '#14b8a6', order: 1 },
    { id: 'filters', icon: 'filter', label: 'Filters', description: 'Data filters', color: '#a855f7', order: 2 },
    { id: 'colorMaps', icon: 'palette', label: 'Colors', description: 'Color mapping', color: '#ec4899', order: 3 },
    { id: 'widgets', icon: 'layout', label: 'Widgets', description: 'Active widgets', color: '#f59e0b', order: 4 },
    { id: 'cursors', icon: 'crosshair', label: 'Cursors', description: 'Cursor position', color: '#22d3ee', order: 5 },
    { id: 'annotations', icon: 'edit', label: 'Annotations', description: 'View annotations', color: '#fb923c', order: 6 },
];

export const TYPE_SPECIFIC_LINK_PROPERTIES = [
    { id: 'windowLevel', icon: 'sliders', label: 'Window/Level', color: '#3b82f6',
        applicableTypes: ['vtk-slice', 'vtk-volume'], order: 7 },
    { id: 'slicePosition', icon: 'layers', label: 'Slice', color: '#22c55e',
        applicableTypes: ['vtk-slice'], order: 8 },
    { id: 'timePosition', icon: 'clock', label: 'Time', color: '#f59e0b',
        applicableTypes: ['vtk-4d', 'timeseries'], order: 9 },
];

export const QUICK_CREATE_TEMPLATES = [
    { id: 'single', label: 'Single', icon: 'square', layout: '1x1' },
    { id: '1plus2', label: '1+2', icon: 'layoutSidebar', layout: '1+2' },
    { id: '2x2', label: '2×2', icon: 'grid2x2', layout: '2x2' },
    { id: '3up', label: '3-up', icon: 'columns', layout: '3x1' },
    { id: '2plus1', label: '2+1', icon: 'layoutSidebarRight', layout: '2+1' },
];

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for footer layout
 * All zones always visible - minimum width ensures everything fits
 */
export function useFooterLayout(containerWidth) {
    // Always return full mode - no responsive hiding
    // The minimum width constraint ensures everything fits
    return {
        mode: 'full',
        visibleSections: TOOLBAR_SECTIONS,
        showLabels: true,
        showTypeSpecific: true,
        showUniversal: true,
        isMinimal: false,
        isCompact: false,
        isFull: true,
    };
}

/**
 * Hook for ViewGroup selector state
 */
export function useViewGroupSelector(viewGroups, activeViewGroupId) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [settingsViewGroupId, setSettingsViewGroupId] = useState(null);
    const [showCreatePopover, setShowCreatePopover] = useState(false);

    const activeViewGroup = useMemo(() => {
        return viewGroups?.find(vg => vg.id === activeViewGroupId) || null;
    }, [viewGroups, activeViewGroupId]);

    const filteredViewGroups = useMemo(() => {
        if (!searchQuery.trim()) return viewGroups || [];
        const query = searchQuery.toLowerCase();
        return (viewGroups || []).filter(vg =>
            vg.name.toLowerCase().includes(query)
        );
    }, [viewGroups, searchQuery]);

    const openDropdown = useCallback(() => setIsOpen(true), []);
    const closeDropdown = useCallback(() => {
        setIsOpen(false);
        setSearchQuery('');
    }, []);
    const toggleDropdown = useCallback(() => {
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }, [isOpen, openDropdown, closeDropdown]);

    const openSettings = useCallback((viewGroupId) => {
        setSettingsViewGroupId(viewGroupId);
    }, []);
    const closeSettings = useCallback(() => {
        setSettingsViewGroupId(null);
    }, []);

    const openCreate = useCallback(() => {
        setShowCreatePopover(true);
    }, []);
    const closeCreate = useCallback(() => {
        setShowCreatePopover(false);
    }, []);

    return {
        // State
        isOpen,
        searchQuery,
        settingsViewGroupId,
        showCreatePopover,
        activeViewGroup,
        filteredViewGroups,
        // Actions
        setSearchQuery,
        openDropdown,
        closeDropdown,
        toggleDropdown,
        openSettings,
        closeSettings,
        openCreate,
        closeCreate,
    };
}

/**
 * Hook for link stats computation
 */
export function useLinkStats(activeViewGroupId, linkingService) {
    const [linkStats, setLinkStats] = useState({});

    useEffect(() => {
        if (!activeViewGroupId || !linkingService) {
            setLinkStats({});
            return;
        }

        // Compute link stats for each property
        const stats = {};
        LINK_PROPERTIES.forEach(prop => {
            const links = linkingService?.getLinksForProperty?.(activeViewGroupId, prop.id) || [];
            stats[prop.id] = {
                count: links.length,
                mode: links[0]?.mode || null,
                linkedViews: links.map(l => l.targetId),
            };
        });
        setLinkStats(stats);

        // Subscribe to link updates
        const handleLinkUpdate = (event) => {
            if (event.detail?.viewGroupId === activeViewGroupId) {
                // Recompute stats
                const newStats = {};
                LINK_PROPERTIES.forEach(prop => {
                    const links = linkingService?.getLinksForProperty?.(activeViewGroupId, prop.id) || [];
                    newStats[prop.id] = {
                        count: links.length,
                        mode: links[0]?.mode || null,
                        linkedViews: links.map(l => l.targetId),
                    };
                });
                setLinkStats(newStats);
            }
        };

        window.addEventListener('cia:links-updated', handleLinkUpdate);
        return () => window.removeEventListener('cia:links-updated', handleLinkUpdate);
    }, [activeViewGroupId, linkingService]);

    const totalActiveLinks = useMemo(() => {
        return Object.values(linkStats).reduce((sum, stat) => sum + (stat.count > 0 ? 1 : 0), 0);
    }, [linkStats]);

    const hasActiveLinks = totalActiveLinks > 0;

    return { linkStats, totalActiveLinks, hasActiveLinks };
}

/**
 * Hook for link reminder toast
 */
export function useLinkReminderToast() {
    const [shownForViewGroups, setShownForViewGroups] = useState(new Set());
    const [showReminder, setShowReminder] = useState(false);
    const [reminderViewGroupId, setReminderViewGroupId] = useState(null);

    const checkAndShowReminder = useCallback((viewGroupId, hasLinks) => {
        if (hasLinks && !shownForViewGroups.has(viewGroupId)) {
            setReminderViewGroupId(viewGroupId);
            setShowReminder(true);
        }
    }, [shownForViewGroups]);

    const dismissReminder = useCallback(() => {
        if (reminderViewGroupId) {
            setShownForViewGroups(prev => new Set([...prev, reminderViewGroupId]));
        }
        setShowReminder(false);
        setReminderViewGroupId(null);
    }, [reminderViewGroupId]);

    const disableLinksAndDismiss = useCallback(() => {
        // Emit event to disable links for this view group
        if (reminderViewGroupId) {
            window.dispatchEvent(new CustomEvent('cia:disable-viewgroup-links', {
                detail: { viewGroupId: reminderViewGroupId }
            }));
            setShownForViewGroups(prev => new Set([...prev, reminderViewGroupId]));
        }
        setShowReminder(false);
        setReminderViewGroupId(null);
    }, [reminderViewGroupId]);

    return {
        showReminder,
        checkAndShowReminder,
        dismissReminder,
        disableLinksAndDismiss,
    };
}

/**
 * Hook for duplication dialog
 */
export function useDuplicationDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [viewGroupToDuplicate, setViewGroupToDuplicate] = useState(null);
    const [selectedOption, setSelectedOption] = useState('linkToOriginal');

    const openDialog = useCallback((viewGroup) => {
        setViewGroupToDuplicate(viewGroup);
        setSelectedOption('linkToOriginal'); // Default
        setIsOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsOpen(false);
        setViewGroupToDuplicate(null);
    }, []);

    const confirmDuplication = useCallback(() => {
        if (viewGroupToDuplicate) {
            window.dispatchEvent(new CustomEvent('cia:viewgroup-duplicate', {
                detail: {
                    viewGroupId: viewGroupToDuplicate.id,
                    linkOption: selectedOption,
                }
            }));
        }
        closeDialog();
    }, [viewGroupToDuplicate, selectedOption, closeDialog]);

    return {
        isOpen,
        viewGroupToDuplicate,
        selectedOption,
        setSelectedOption,
        openDialog,
        closeDialog,
        confirmDuplication,
    };
}

export default {
    useFooterLayout,
    useViewGroupSelector,
    useLinkStats,
    useLinkReminderToast,
    useDuplicationDialog,
    FOOTER_BREAKPOINTS,
    TOOLBAR_SECTIONS,
    LINK_PROPERTIES,
    TYPE_SPECIFIC_LINK_PROPERTIES,
    QUICK_CREATE_TEMPLATES,
};
