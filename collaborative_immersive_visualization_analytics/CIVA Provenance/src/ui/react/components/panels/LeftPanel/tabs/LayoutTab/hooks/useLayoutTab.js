/**
 * @file useLayoutTab.js
 * @description State management hook for Layout Tab V4.6
 *
 * Manages:
 * - ViewGroups and their positions on canvas
 * - Viewports (user viewing windows)
 * - Selection state (single and multi-select)
 * - Drill-in mode for ViewGroup editing
 * - Custom layouts and saved templates
 *
 * @example
 * const {
 *   viewGroups,
 *   canvas,
 *   viewports,
 *   handleSelectViewGroup,
 *   handleDrillIn,
 * } = useLayoutTab({ workspaceId });
 */

import { useState, useCallback, useMemo } from 'react';
import {
    BUILTIN_LAYOUTS,
    VIEWGROUP_COLORS,
    getLayoutCapacity,
    getLayoutById,
    createViewGroup,
    createView,
    createViewport,
    createCanvas,
    createViewGroupPosition,
} from '../constants/layouts.js';

// =============================================================================
// INITIAL MOCK DATA (for development)
// =============================================================================

const INITIAL_VIEWGROUPS = [
    createViewGroup({
        id: 'vg-1',
        name: 'Brain Analysis',
        layoutId: '1+2',
        views: [
            createView({ id: 'v-1', type: 'volume', name: 'Main View' }),
            createView({ id: 'v-2', type: 'slice', name: 'Axial' }),
            createView({ id: 'v-3', type: 'data', name: 'Stats' }),
        ],
        color: '#a855f7',
    }),
    createViewGroup({
        id: 'vg-2',
        name: 'Data Explorer',
        layoutId: 'side-by-side',
        views: [
            createView({ id: 'v-4', type: 'chart', name: 'Timeline' }),
            createView({ id: 'v-5', type: 'data', name: 'Table' }),
        ],
        color: '#f59e0b',
    }),
    createViewGroup({
        id: 'vg-3',
        name: 'Empty Group',
        layoutId: 'single',
        views: [],
        color: '#22c55e',
    }),
    createViewGroup({
        id: 'vg-4',
        name: 'Comparison',
        layoutId: '3-up',
        views: [
            createView({ id: 'v-6', type: 'slice', name: 'Pre-op' }),
            createView({ id: 'v-7', type: 'slice', name: 'Post-op' }),
            createView({ id: 'v-8', type: 'slice', name: 'Diff' }),
        ],
        color: '#3b82f6',
    }),
];

const INITIAL_CANVAS = createCanvas({
    rows: 4,
    cols: 4,
    viewGroupPositions: [
        createViewGroupPosition({ viewGroupId: 'vg-1', row: 0, col: 0, rowSpan: 2, colSpan: 2 }),
        createViewGroupPosition({ viewGroupId: 'vg-2', row: 0, col: 2, rowSpan: 1, colSpan: 2 }),
        createViewGroupPosition({ viewGroupId: 'vg-3', row: 1, col: 2, rowSpan: 1, colSpan: 1 }),
        createViewGroupPosition({ viewGroupId: 'vg-4', row: 2, col: 0, rowSpan: 2, colSpan: 3 }),
    ],
});

const INITIAL_VIEWPORTS = [
    createViewport({
        id: 'vp-1',
        name: 'Main View',
        userId: 'user-1',
        position: { row: 0, col: 0 },
        size: { rows: 3, cols: 3 },
        mode: 'snap',
        isPrimary: true,
        isShared: false,
    }),
    createViewport({
        id: 'vp-2',
        name: 'Secondary',
        userId: 'user-1',
        position: { row: 0, col: 3 },
        size: { rows: 2, cols: 1 },
        mode: 'free',
        isPrimary: false,
        isShared: false,
    }),
    createViewport({
        id: 'vp-3',
        name: 'Overview',
        userId: 'user-1',
        position: { row: 3, col: 0 },
        size: { rows: 1, cols: 2 },
        mode: 'snap',
        isPrimary: false,
        isShared: true,
    }),
];

const INITIAL_CUSTOM_LAYOUTS = [
    { id: 'custom-1', name: 'Neuro Setup', rows: 2, cols: 3, isCustom: true },
    { id: 'custom-2', name: 'Comparison View', rows: 1, cols: 4, isCustom: true },
];

const INITIAL_SAVED_TEMPLATES = [
    { id: 'tpl-1', name: 'Brain Analysis Workspace', type: 'full', scope: 'personal', preview: ['1+2', '2x2'] },
    { id: 'tpl-2', name: 'Quick Compare', type: 'structure', scope: 'workspace', preview: ['3-up'] },
];

// =============================================================================
// HOOK
// =============================================================================

/**
 * @typedef {Object} UseLayoutTabOptions
 * @property {string} workspaceId - Current workspace ID
 * @property {Array} [mockViewGroups] - Mock ViewGroups for testing
 * @property {Object} [mockCanvas] - Mock canvas for testing
 * @property {Array} [mockViewports] - Mock viewports for testing
 */

/**
 * Hook for Layout Tab state management
 *
 * @param {UseLayoutTabOptions} options - Hook options
 * @returns {Object} Hook return value
 */
export function useLayoutTab({
    workspaceId,
    mockViewGroups = null,
    mockCanvas = null,
    mockViewports = null,
} = {}) {
    // =========================================================================
    // DATA STATE
    // =========================================================================

    const [viewGroups, setViewGroups] = useState(mockViewGroups ?? INITIAL_VIEWGROUPS);
    const [canvas, setCanvas] = useState(mockCanvas ?? INITIAL_CANVAS);
    const [viewports, setViewports] = useState(mockViewports ?? INITIAL_VIEWPORTS);
    const [customLayouts, setCustomLayouts] = useState(INITIAL_CUSTOM_LAYOUTS);
    const [savedTemplates, setSavedTemplates] = useState(INITIAL_SAVED_TEMPLATES);

    // =========================================================================
    // SELECTION STATE
    // =========================================================================

    const [selectedViewGroupId, setSelectedViewGroupId] = useState(null);
    const [selectedViewportId, setSelectedViewportId] = useState(null);
    const [drillInViewGroupId, setDrillInViewGroupId] = useState(null);

    // =========================================================================
    // MULTI-SELECT STATE
    // =========================================================================

    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedViewGroupIds, setSelectedViewGroupIds] = useState([]);

    // =========================================================================
    // UI STATE
    // =========================================================================

    const [activeTab, setActiveTab] = useState('viewgroups');
    const [mapCollapsed, setMapCollapsed] = useState(false);
    const [mapHeight, setMapHeight] = useState(220);
    const [mapZoom, setMapZoom] = useState(100);
    const [showViewGroups, setShowViewGroups] = useState(true);
    const [showViewports, setShowViewports] = useState(true);

    // =========================================================================
    // DERIVED STATE
    // =========================================================================

    const allLayouts = useMemo(
        () => [...BUILTIN_LAYOUTS, ...customLayouts],
        [customLayouts]
    );

    const drillInViewGroup = useMemo(
        () => viewGroups.find(vg => vg.id === drillInViewGroupId),
        [viewGroups, drillInViewGroupId]
    );

    const drillInLayout = useMemo(
        () => drillInViewGroup ? getLayoutById(drillInViewGroup.layoutId, customLayouts) : null,
        [drillInViewGroup, customLayouts]
    );

    // =========================================================================
    // SELECTION HANDLERS
    // =========================================================================

    const handleSelectViewGroup = useCallback((id) => {
        setSelectedViewGroupId(id);
        setSelectedViewportId(null);
        if (!drillInViewGroupId) {
            setActiveTab('viewgroups');
        }
    }, [drillInViewGroupId]);

    const handleSelectViewport = useCallback((id) => {
        setSelectedViewportId(id);
        setSelectedViewGroupId(null);
        setActiveTab('viewports');
    }, []);

    // =========================================================================
    // DRILL-IN HANDLERS
    // =========================================================================

    const handleDrillIn = useCallback((id) => {
        setDrillInViewGroupId(id);
        setSelectedViewGroupId(id);
        setActiveTab('viewgroups');
        setMultiSelectMode(false);
        setSelectedViewGroupIds([]);
    }, []);

    const handleDrillOut = useCallback(() => {
        setDrillInViewGroupId(null);
    }, []);

    // =========================================================================
    // VIEWGROUP HANDLERS
    // =========================================================================

    const handleUpdateViewGroup = useCallback((updatedViewGroup) => {
        setViewGroups(prev => prev.map(vg =>
            vg.id === updatedViewGroup.id ? updatedViewGroup : vg
        ));
    }, []);

    const handleChangeLayout = useCallback((viewGroupId, layoutId) => {
        setViewGroups(prev => prev.map(vg =>
            vg.id === viewGroupId ? { ...vg, layoutId } : vg
        ));
    }, []);

    const handleAddViewGroup = useCallback((layoutId) => {
        const newId = `vg-${Date.now()}`;
        const color = VIEWGROUP_COLORS[viewGroups.length % VIEWGROUP_COLORS.length];
        const newVG = createViewGroup({
            id: newId,
            name: `ViewGroup ${viewGroups.length + 1}`,
            layoutId,
            views: [],
            color,
        });

        // Find next available row
        let maxRow = 0;
        canvas.viewGroupPositions.forEach(p => {
            maxRow = Math.max(maxRow, p.row + p.rowSpan);
        });

        setViewGroups(prev => [...prev, newVG]);
        setCanvas(prev => ({
            ...prev,
            rows: Math.max(prev.rows, maxRow + 1),
            viewGroupPositions: [
                ...prev.viewGroupPositions,
                createViewGroupPosition({
                    viewGroupId: newId,
                    row: maxRow,
                    col: 0,
                    rowSpan: 1,
                    colSpan: 1,
                }),
            ],
        }));
        handleSelectViewGroup(newId);
    }, [viewGroups, canvas, handleSelectViewGroup]);

    const handleDropLayout = useCallback((layoutId, position) => {
        const newId = `vg-${Date.now()}`;
        const color = VIEWGROUP_COLORS[viewGroups.length % VIEWGROUP_COLORS.length];
        const newVG = createViewGroup({
            id: newId,
            name: `ViewGroup ${viewGroups.length + 1}`,
            layoutId,
            views: [],
            color,
        });

        setViewGroups(prev => [...prev, newVG]);
        setCanvas(prev => ({
            ...prev,
            viewGroupPositions: [
                ...prev.viewGroupPositions,
                createViewGroupPosition({
                    viewGroupId: newId,
                    row: position.row,
                    col: position.col,
                    rowSpan: 1,
                    colSpan: 1,
                }),
            ],
        }));
        handleSelectViewGroup(newId);
    }, [viewGroups, handleSelectViewGroup]);

    const handleDeleteViewGroup = useCallback((viewGroup) => {
        setViewGroups(prev => prev.filter(v => v.id !== viewGroup.id));
        setCanvas(prev => ({
            ...prev,
            viewGroupPositions: prev.viewGroupPositions.filter(p => p.viewGroupId !== viewGroup.id),
        }));
        if (selectedViewGroupId === viewGroup.id) {
            setSelectedViewGroupId(null);
        }
        if (drillInViewGroupId === viewGroup.id) {
            setDrillInViewGroupId(null);
        }
    }, [selectedViewGroupId, drillInViewGroupId]);

    const handleDuplicateViewGroup = useCallback((viewGroup) => {
        const newId = `vg-${Date.now()}`;
        const newVG = {
            ...viewGroup,
            id: newId,
            name: `${viewGroup.name} Copy`,
            linkedTo: null,
            views: viewGroup.views.map(v => ({
                ...v,
                id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            })),
        };

        const position = canvas.viewGroupPositions.find(p => p.viewGroupId === viewGroup.id);
        setViewGroups(prev => [...prev, newVG]);

        if (position) {
            setCanvas(prev => ({
                ...prev,
                viewGroupPositions: [
                    ...prev.viewGroupPositions,
                    createViewGroupPosition({
                        viewGroupId: newId,
                        row: position.row + position.rowSpan,
                        col: position.col,
                        rowSpan: position.rowSpan,
                        colSpan: position.colSpan,
                    }),
                ],
            }));
        }
        handleSelectViewGroup(newId);
    }, [canvas, handleSelectViewGroup]);

    // =========================================================================
    // MULTI-SELECT HANDLERS
    // =========================================================================

    const handleToggleViewGroupCheck = useCallback((id) => {
        setSelectedViewGroupIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleCombineViewGroups = useCallback(() => {
        if (selectedViewGroupIds.length < 2) return;
        // TODO: Implement combine logic
        console.log('Combine ViewGroups:', selectedViewGroupIds);
        setSelectedViewGroupIds([]);
        setMultiSelectMode(false);
    }, [selectedViewGroupIds]);

    const handleLinkViewGroups = useCallback(() => {
        if (selectedViewGroupIds.length < 2) return;
        // TODO: Implement link logic
        console.log('Link ViewGroups:', selectedViewGroupIds);
        setSelectedViewGroupIds([]);
        setMultiSelectMode(false);
    }, [selectedViewGroupIds]);

    const handleSwapViewGroups = useCallback(() => {
        if (selectedViewGroupIds.length !== 2) return;

        const [idA, idB] = selectedViewGroupIds;
        setCanvas(prev => ({
            ...prev,
            viewGroupPositions: prev.viewGroupPositions.map(p => {
                if (p.viewGroupId === idA) return { ...p, viewGroupId: idB };
                if (p.viewGroupId === idB) return { ...p, viewGroupId: idA };
                return p;
            }),
        }));

        setSelectedViewGroupIds([]);
        setMultiSelectMode(false);
    }, [selectedViewGroupIds]);

    const handleMatchSizeViewGroups = useCallback(() => {
        if (selectedViewGroupIds.length < 2) return;
        // TODO: Implement match size logic
        console.log('Match size ViewGroups:', selectedViewGroupIds);
        setSelectedViewGroupIds([]);
        setMultiSelectMode(false);
    }, [selectedViewGroupIds]);

    const handleDeleteSelectedViewGroups = useCallback(() => {
        setViewGroups(prev => prev.filter(vg => !selectedViewGroupIds.includes(vg.id)));
        setCanvas(prev => ({
            ...prev,
            viewGroupPositions: prev.viewGroupPositions.filter(
                p => !selectedViewGroupIds.includes(p.viewGroupId)
            ),
        }));
        setSelectedViewGroupIds([]);
        setMultiSelectMode(false);
    }, [selectedViewGroupIds]);

    const handleExitMultiSelect = useCallback(() => {
        setMultiSelectMode(false);
        setSelectedViewGroupIds([]);
    }, []);

    // =========================================================================
    // VIEWPORT HANDLERS
    // =========================================================================

    const handleDuplicateViewport = useCallback((viewport) => {
        const newId = `vp-${Date.now()}`;
        setViewports(prev => [...prev, {
            ...viewport,
            id: newId,
            name: `${viewport.name} Copy`,
            isPrimary: false,
        }]);
    }, []);

    const handleDeleteViewport = useCallback((viewport) => {
        setViewports(prev => prev.filter(v => v.id !== viewport.id));
        if (selectedViewportId === viewport.id) {
            setSelectedViewportId(null);
        }
    }, [selectedViewportId]);

    const handleToggleShareViewport = useCallback((viewport) => {
        setViewports(prev => prev.map(v =>
            v.id === viewport.id ? { ...v, isShared: !v.isShared } : v
        ));
    }, []);

    const handleRenameViewport = useCallback((viewport, newName) => {
        setViewports(prev => prev.map(v =>
            v.id === viewport.id ? { ...v, name: newName } : v
        ));
    }, []);

    const handleAddViewport = useCallback(() => {
        const newId = `vp-${Date.now()}`;
        const newViewport = createViewport({
            id: newId,
            name: `Viewport ${viewports.length + 1}`,
            userId: 'user-1', // TODO: Get from auth context
            position: { row: 0, col: 0 },
            size: { rows: 1, cols: 1 },
            mode: 'snap',
            isPrimary: false,
            isShared: false,
        });
        setViewports(prev => [...prev, newViewport]);
        handleSelectViewport(newId);
    }, [viewports, handleSelectViewport]);

    // =========================================================================
    // CANVAS HANDLERS
    // =========================================================================

    const handleUpdateCanvas = useCallback((updatedCanvas) => {
        setCanvas(updatedCanvas);
    }, []);

    // =========================================================================
    // CUSTOM LAYOUT HANDLERS
    // =========================================================================

    const handleSaveAsCustomLayout = useCallback(() => {
        // TODO: Open save dialog
        console.log('Save as custom layout');
    }, []);

    const handleDeleteCustomLayout = useCallback((layoutId) => {
        setCustomLayouts(prev => prev.filter(l => l.id !== layoutId));
    }, []);

    // =========================================================================
    // TEMPLATE HANDLERS
    // =========================================================================

    const handleLoadTemplate = useCallback((template) => {
        // TODO: Implement template loading
        console.log('Load template:', template);
    }, []);

    const handleSaveCurrentAsTemplate = useCallback(() => {
        // TODO: Implement template saving
        console.log('Save current as template');
    }, []);

    const handleApplyLayoutToViewGroup = useCallback((layout) => {
        if (!drillInViewGroupId || !drillInViewGroup) return;

        const capacity = getLayoutCapacity(layout);
        if (drillInViewGroup.views.length <= capacity) {
            handleChangeLayout(drillInViewGroupId, layout.id);
        }
        // If views > capacity, the caller should show ViewRemovalConfirmation
    }, [drillInViewGroupId, drillInViewGroup, handleChangeLayout]);

    // =========================================================================
    // RETURN
    // =========================================================================

    return {
        // Data state
        viewGroups,
        canvas,
        viewports,
        customLayouts,
        savedTemplates,

        // Selection state
        selectedViewGroupId,
        selectedViewportId,
        drillInViewGroupId,

        // Multi-select state
        multiSelectMode,
        setMultiSelectMode,
        selectedViewGroupIds,

        // UI state
        activeTab,
        setActiveTab,
        mapCollapsed,
        setMapCollapsed,
        mapHeight,
        setMapHeight,
        mapZoom,
        setMapZoom,
        showViewGroups,
        setShowViewGroups,
        showViewports,
        setShowViewports,

        // Derived state
        allLayouts,
        drillInViewGroup,
        drillInLayout,

        // Selection handlers
        handleSelectViewGroup,
        handleSelectViewport,

        // Drill-in handlers
        handleDrillIn,
        handleDrillOut,

        // ViewGroup handlers
        handleUpdateViewGroup,
        handleChangeLayout,
        handleAddViewGroup,
        handleDropLayout,
        handleDeleteViewGroup,
        handleDuplicateViewGroup,

        // Multi-select handlers
        handleToggleViewGroupCheck,
        handleCombineViewGroups,
        handleLinkViewGroups,
        handleSwapViewGroups,
        handleMatchSizeViewGroups,
        handleDeleteSelectedViewGroups,
        handleExitMultiSelect,

        // Viewport handlers
        handleDuplicateViewport,
        handleDeleteViewport,
        handleToggleShareViewport,
        handleRenameViewport,
        handleAddViewport,

        // Canvas handlers
        handleUpdateCanvas,

        // Custom layout handlers
        handleSaveAsCustomLayout,
        handleDeleteCustomLayout,

        // Template handlers
        handleLoadTemplate,
        handleSaveCurrentAsTemplate,
        handleApplyLayoutToViewGroup,
    };
}

export default useLayoutTab;
