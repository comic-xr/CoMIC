/**
 * @file useCanvasMapState.js
 * @description Core state management hook for Canvas Map Panel V2
 *
 * Provides all local panel state and computed values.
 * This enables both the default UI and custom implementations.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  MAP_MODES,
  MODE_CONFIG,
  LINKS_SUB_TABS,
  COLLABORATE_SUB_TABS,
  LAYOUTS,
  MINIMAP_CONSTANTS,
} from '../utils/constants';
import { getVGDisplayName } from '../utils/gridUtils';

// LocalStorage key prefix
const STORAGE_PREFIX = 'cia:canvas-map:';

/**
 * Load preference from localStorage
 */
function loadPreference(key, defaultValue) {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return defaultValue;
}

/**
 * Check if a preference key exists in localStorage
 */
function hasStoredPreference(key) {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${key}`) !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Save preference to localStorage
 */
function savePreference(key, value) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * useCanvasMapState - Core state management hook
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.canvas - Canvas configuration { rows, cols, homePosition }
 * @param {Array} options.viewGroups - Active ViewGroups on canvas
 * @param {Array} options.inactiveVGs - Closed ViewGroups (can be restored)
 * @param {Array} options.viewports - User viewports
 * @param {Array} options.collaborators - Team member presence data
 * @param {Array} options.vgLinks - ViewGroup link configurations
 * @param {Array} options.viewLinks - View link configurations
 * @param {Array} options.bookmarks - Saved bookmark positions
 * @param {Object} options.callbacks - Event callbacks
 */
export function useCanvasMapState({
  canvas = { rows: 4, cols: 4, homePosition: { row: 0, col: 0 } },
  viewGroups = [],
  inactiveVGs = [],
  viewports = [],
  collaborators = [],
  vgLinks = [],
  viewLinks = [],
  bookmarks = [],
  callbacks = {},
} = {}) {
  const normalizeMapMode = useCallback((mode) => {
    if (mode === MAP_MODES.LINKS) return MAP_MODES.LAYOUT;
    return MODE_CONFIG[mode] ? mode : MAP_MODES.LAYOUT;
  }, []);
  // -------------------------------------------------------------------------
  // UI State with localStorage persistence
  // -------------------------------------------------------------------------
  const [mapMode, setMapModeState] = useState(() => {
    const stored = loadPreference('mapMode', MAP_MODES.LAYOUT);
    const normalized = stored === 'collaborate' ? MAP_MODES.TEAM : stored;
    return normalizeMapMode(normalized);
  });
  const [showViews, setShowViewsState] = useState(() => {
    if (hasStoredPreference('showViews')) {
      return loadPreference('showViews', false);
    }
    const legacyDisplayMode = loadPreference('displayMode', 'vg');
    return legacyDisplayMode === 'view';
  });
  const [showVGs, setShowVGsState] = useState(() => {
    if (hasStoredPreference('showVGs')) {
      return loadPreference('showVGs', true);
    }
    const legacyDisplayMode = loadPreference('displayMode', 'vg');
    if (legacyDisplayMode === 'view') {
      const legacyShowVGOutlines = loadPreference('showVGOutlines', false);
      return !!legacyShowVGOutlines;
    }
    return true;
  });
  const [minimapZoom, setMinimapZoomState] = useState(() =>
    loadPreference('minimapZoom', 100)
  );

  // Visibility toggles with persistence
  const [showGridLabels, setShowGridLabelsState] = useState(() =>
    loadPreference('showGridLabels', true)
  );
  const [showViewports, setShowViewportsState] = useState(() =>
    loadPreference('showViewports', true)
  );
  const [showCollaborators, setShowCollaboratorsState] = useState(() =>
    loadPreference('showCollaborators', true)
  );
  const [showBookmarks, setShowBookmarksState] = useState(() =>
    loadPreference('showBookmarks', true)
  );
  const [showInternals, setShowInternalsState] = useState(() =>
    loadPreference('showInternals', true)
  );
  const [showCursors, setShowCursorsState] = useState(() =>
    loadPreference('showCursors', true)
  );

  // My cursor settings (broadcast to collaborators)
  const [myCursorVisible, setMyCursorVisibleState] = useState(() =>
    loadPreference('myCursorVisible', true)
  );
  const [myCursorColor, setMyCursorColorState] = useState(() =>
    loadPreference('myCursorColor', '#22d3ee')
  );

  // Companion panel state
  const [companionOpen, setCompanionOpenState] = useState(() =>
    loadPreference('companionOpen', false)
  );
  const [companionTab, setCompanionTabState] = useState(() =>
    loadPreference('companionTab', 'views')
  );

  // Toolbar handedness preference
  const [toolbarPosition, setToolbarPositionState] = useState(() =>
    loadPreference('toolbarPosition', 'left')
  );

  // Companion panel side is always opposite of toolbar (per V2Spec)
  // This is derived, not stored independently
  const companionSide = toolbarPosition === 'left' ? 'right' : 'left';

  // Per-collaborator cursor visibility (default true)
  const [collaboratorCursorVisibility, setCollaboratorCursorVisibility] = useState(() =>
    loadPreference('collaboratorCursorVisibility', {})
  );

  // Sub-tabs
  const [linksSubTab, setLinksSubTab] = useState(LINKS_SUB_TABS.VG);
  const [collaborateSubTab, setCollaborateSubTab] = useState(COLLABORATE_SUB_TABS.ME);

  // Selection state (not persisted)
  const [selectedVGId, setSelectedVGId] = useState(null);
  const [selectedViewportId, setSelectedViewportId] = useState(null);
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const [focusedVGId, setFocusedVGId] = useState(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Persist state changes
  const setMapMode = useCallback((mode) => {
    const normalized = normalizeMapMode(mode);
    setMapModeState(normalized);
    savePreference('mapMode', normalized);
  }, [normalizeMapMode]);

  const setShowViews = useCallback((show) => {
    setShowViewsState(show);
    savePreference('showViews', show);
  }, []);

  const setShowVGs = useCallback((show) => {
    setShowVGsState(show);
    savePreference('showVGs', show);
  }, []);

  const setMinimapZoom = useCallback((zoom) => {
    setMinimapZoomState(zoom);
    savePreference('minimapZoom', zoom);
  }, []);

  const setShowGridLabels = useCallback((show) => {
    setShowGridLabelsState(show);
    savePreference('showGridLabels', show);
  }, []);

  const setShowViewports = useCallback((show) => {
    setShowViewportsState(show);
    savePreference('showViewports', show);
  }, []);

  const setShowCollaborators = useCallback((show) => {
    setShowCollaboratorsState(show);
    savePreference('showCollaborators', show);
  }, []);

  const setShowBookmarks = useCallback((show) => {
    setShowBookmarksState(show);
    savePreference('showBookmarks', show);
  }, []);

  const setShowInternals = useCallback((show) => {
    setShowInternalsState(show);
    savePreference('showInternals', show);
  }, []);

  const setShowCursors = useCallback((show) => {
    setShowCursorsState(show);
    savePreference('showCursors', show);
  }, []);

  const setMyCursorVisible = useCallback((visible) => {
    setMyCursorVisibleState(visible);
    savePreference('myCursorVisible', visible);
  }, []);

  const setMyCursorColor = useCallback((color) => {
    setMyCursorColorState(color);
    savePreference('myCursorColor', color);
  }, []);

  const setCompanionOpen = useCallback((open) => {
    setCompanionOpenState(open);
    savePreference('companionOpen', open);
  }, []);

  const setCompanionTab = useCallback((tab) => {
    setCompanionTabState(tab);
    savePreference('companionTab', tab);
  }, []);

  const setToolbarPosition = useCallback((position) => {
    setToolbarPositionState(position);
    savePreference('toolbarPosition', position);
  }, []);

  const toggleToolbarPosition = useCallback(() => {
    setToolbarPositionState(prev => {
      const next = prev === 'left' ? 'right' : 'left';
      savePreference('toolbarPosition', next);
      return next;
    });
  }, []);

  const toggleCollaboratorCursor = useCallback((collaboratorId) => {
    setCollaboratorCursorVisibility(prev => {
      const next = {
        ...prev,
        [collaboratorId]: !(prev[collaboratorId] ?? true),
      };
      savePreference('collaboratorCursorVisibility', next);
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------
  const currentMode = MODE_CONFIG[mapMode];

  const selectedVG = useMemo(
    () => viewGroups.find(vg => vg.id === selectedVGId),
    [viewGroups, selectedVGId]
  );

  const focusedVG = useMemo(
    () => viewGroups.find(vg => vg.id === focusedVGId),
    [viewGroups, focusedVGId]
  );

  /**
   * Flattened views for View display mode
   * Each view = exactly 1 cell, positioned within its VG's canvas area
   */
  const flattenedViews = useMemo(() => {
    if (!showViews) return [];

    const views = [];
    viewGroups.forEach(vg => {
      if (!vg.position) return;

      const layout = LAYOUTS[vg.layoutId] || LAYOUTS.single;

      vg.views?.forEach((view, idx) => {
        const internalRow = Math.floor(idx / layout.cols);
        const internalCol = idx % layout.cols;

        const canvasRow = vg.position.row + Math.floor(internalRow * vg.position.rowSpan / layout.rows);
        const canvasCol = vg.position.col + Math.floor(internalCol * vg.position.colSpan / layout.cols);

        views.push({
          ...view,
          vgId: vg.id,
          vgName: vg.name,
          vgColor: vg.color,
          canvasRow,
          canvasCol,
          rowSpan: 1,
          colSpan: 1,
        });
      });
    });
    return views;
  }, [showViews, viewGroups]);

  /**
   * Current grid size
   */
  const currentGridSize = useMemo(() => {
    return { rows: canvas.rows, cols: canvas.cols };
  }, [canvas.rows, canvas.cols]);

  /**
   * Filter VGs based on search query
   */
  const filteredVGs = useMemo(() => {
    if (!searchQuery) return viewGroups;
    const query = searchQuery.toLowerCase();
    return viewGroups.filter(vg =>
      getVGDisplayName(vg).toLowerCase().includes(query)
    );
  }, [viewGroups, searchQuery]);

  /**
   * Filter bookmarks based on search query
   */
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery) return bookmarks;
    const query = searchQuery.toLowerCase();
    return bookmarks.filter(bm =>
      bm.name.toLowerCase().includes(query)
    );
  }, [bookmarks, searchQuery]);

  /**
   * Online collaborators count
   */
  const onlineCollaboratorsCount = useMemo(() => {
    return collaborators.filter(c => c.isOnline).length;
  }, [collaborators]);

  /**
   * Broadcasting collaborators
   */
  const broadcastingCollaborators = useMemo(() => {
    return collaborators.filter(c => c.isOnline && c.isBroadcasting);
  }, [collaborators]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleModeChange = useCallback((mode) => {
    setMapMode(mode);
    setHighlightedLinkId(null);
    callbacks.onModeChange?.(mode);
  }, [setMapMode, callbacks]);

  const handleVGClick = useCallback((vgId) => {
    setSelectedVGId(vgId);
    callbacks.onVGSelect?.(vgId);
  }, [callbacks]);

  const handleVGDoubleClick = useCallback((vgId) => {
    setFocusedVGId(vgId);
    setMapMode(MAP_MODES.LAYOUT);
    callbacks.onVGFocus?.(vgId);
  }, [setMapMode, callbacks]);

  const handleBackFromFocus = useCallback(() => {
    setFocusedVGId(null);
    callbacks.onVGFocus?.(null);
  }, [callbacks]);

  const handleLinkClick = useCallback((linkId) => {
    setHighlightedLinkId(prev => prev === linkId ? null : linkId);
    callbacks.onLinkHighlight?.(linkId);
  }, [callbacks]);

  const handleViewportClick = useCallback((viewportId) => {
    setSelectedViewportId(viewportId);
    callbacks.onViewportSelect?.(viewportId);
  }, [callbacks]);

  const handleZoomIn = useCallback(() => {
    setMinimapZoom(z => Math.min(MINIMAP_CONSTANTS.MAX_ZOOM, z + MINIMAP_CONSTANTS.ZOOM_STEP));
  }, [setMinimapZoom]);

  const handleZoomOut = useCallback(() => {
    setMinimapZoom(z => Math.max(MINIMAP_CONSTANTS.MIN_ZOOM, z - MINIMAP_CONSTANTS.ZOOM_STEP));
  }, [setMinimapZoom]);

  const handleZoomReset = useCallback(() => {
    setMinimapZoom(100);
  }, [setMinimapZoom]);

  const toggleShowGridLabels = useCallback(() => {
    setShowGridLabels(prev => !prev);
  }, [setShowGridLabels]);

  const toggleShowViewports = useCallback(() => {
    setShowViewports(prev => !prev);
  }, [setShowViewports]);

  const toggleShowCollaborators = useCallback(() => {
    setShowCollaborators(prev => !prev);
  }, [setShowCollaborators]);

  const toggleShowBookmarks = useCallback(() => {
    setShowBookmarks(prev => !prev);
  }, [setShowBookmarks]);

  const toggleShowInternals = useCallback(() => {
    setShowInternals(prev => !prev);
  }, [setShowInternals]);

  const toggleShowCursors = useCallback(() => {
    setShowCursors(prev => !prev);
  }, [setShowCursors]);

  const toggleShowViews = useCallback(() => {
    setShowViewsState(prev => {
      const next = !prev;
      savePreference('showViews', next);
      return next;
    });
  }, []);

  const toggleShowVGs = useCallback(() => {
    setShowVGsState(prev => {
      const next = !prev;
      savePreference('showVGs', next);
      return next;
    });
  }, []);

  const toggleMyCursorVisible = useCallback(() => {
    setMyCursorVisible(prev => !prev);
  }, [setMyCursorVisible]);

  const toggleCompanion = useCallback(() => {
    setCompanionOpen(prev => !prev);
  }, [setCompanionOpen]);

  // -------------------------------------------------------------------------
  // Return API
  // -------------------------------------------------------------------------
  return {
    // State
    mapMode,
    showViews,
    showVGs,
    minimapZoom,
    showGridLabels,
    showViewports,
    showCollaborators,
    showBookmarks,
    showInternals,
    showCursors,
    myCursorVisible,
    myCursorColor,
    companionOpen,
    companionTab,
    toolbarPosition,
    companionSide,
    collaboratorCursorVisibility,
    linksSubTab,
    collaborateSubTab,
    selectedVGId,
    selectedViewportId,
    highlightedLinkId,
    focusedVGId,
    searchQuery,
    sortOrder,

    // Setters
    setMapMode: handleModeChange,
    setShowViews,
    setShowVGs,
    setMinimapZoom,
    setShowGridLabels,
    setShowViewports,
    setShowCollaborators,
    setShowBookmarks,
    setShowInternals,
    setShowCursors,
    setMyCursorVisible,
    setMyCursorColor,
    setCompanionOpen,
    setCompanionTab,
    setToolbarPosition,
    setLinksSubTab,
    setCollaborateSubTab,
    setSearchQuery,
    setSortOrder,
    setSelectedVGId,
    setSelectedViewportId,

    // Derived
    currentMode,
    selectedVG,
    focusedVG,
    flattenedViews,
    currentGridSize,
    filteredVGs,
    filteredBookmarks,
    onlineCollaboratorsCount,
    broadcastingCollaborators,

    // Handlers
    handleModeChange,
    handleVGClick,
    handleVGDoubleClick,
    handleBackFromFocus,
    handleLinkClick,
    handleViewportClick,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    toggleShowGridLabels,
    toggleShowViewports,
    toggleShowCollaborators,
    toggleShowBookmarks,
    toggleShowInternals,
    toggleShowCursors,
    toggleShowViews,
    toggleShowVGs,
    toggleMyCursorVisible,
    toggleCompanion,
    toggleToolbarPosition,
    toggleCollaboratorCursor,
  };
}

export default useCanvasMapState;
