/**
 * @file NavigatorTab.logic.js
 * @description Headless logic hook for Navigator Tab V5
 *
 * Manages:
 * - Tab state (minimap/views/bookmarks)
 * - Focus mode (groups/views)
 * - Selection state (group/view)
 * - Navigation state (position, home, viewport/canvas size)
 * - View filtering and search
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { formatGridPosition, parseGridPosition } from '@UI/react/utils/gridPosition.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABS = {
  MINIMAP: 'minimap',
  VIEWS: 'views',
  BOOKMARKS: 'bookmarks',
};

export const FOCUS_MODES = {
  GROUPS: 'groups',
  VIEWS: 'views',
};

export const VIEW_FILTERS = {
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  STARRED: 'starred',
  LINKED: 'linked',
};

// LocalStorage keys
const STORAGE_KEYS = {
  ACTIVE_TAB: 'cia-navigator-active-tab',
  FOCUS_MODE: 'cia-navigator-focus-mode',
  VIEW_FILTER: 'cia-navigator-view-filter',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format position as letter+number (A1, B2, etc.)
 */
export function formatPosition(row, col) {
  return formatGridPosition(col, row);
}

/**
 * Parse position string back to row/col
 */
export function parsePosition(position) {
  return parseGridPosition(position);
}

/**
 * Load value from localStorage with fallback
 */
function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Save value to localStorage
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * useNavigatorTab - Main logic hook for Navigator Tab V5
 *
 * @param {Object} options
 * @param {Object} options.canvasManager - Canvas manager instance (optional)
 * @param {Array} options.viewGroups - ViewGroups data
 * @param {Array} options.views - Views data
 * @param {Array} options.bookmarks - Bookmarks data (optional)
 * @param {Array} options.collaborators - Collaborator presence data (optional)
 * @param {Function} options.onNavigateToView - Callback when navigating to a view
 * @param {Function} options.onPlaceView - Callback when placing an inactive view
 * @param {Function} options.onFocusGroup - Callback when focusing a group
 */
export function useNavigatorTab({
  canvasManager,
  viewGroups = [],
  views = [],
  bookmarks = [],
  collaborators = [],
  onNavigateToView,
  onPlaceView,
  onFocusGroup,
} = {}) {
  // -------------------------------------------------------------------------
  // Tab & Mode State (persisted)
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTabState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_TAB, TABS.MINIMAP)
  );

  const [focusMode, setFocusModeState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FOCUS_MODE, FOCUS_MODES.GROUPS)
  );

  const [viewFilter, setViewFilterState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.VIEW_FILTER, VIEW_FILTERS.ALL)
  );

  // Persist tab changes
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    saveToStorage(STORAGE_KEYS.ACTIVE_TAB, tab);
  }, []);

  // Persist focus mode changes
  const setFocusMode = useCallback((mode) => {
    setFocusModeState(mode);
    saveToStorage(STORAGE_KEYS.FOCUS_MODE, mode);
  }, []);

  // Persist view filter changes
  const setViewFilter = useCallback((filter) => {
    setViewFilterState(filter);
    saveToStorage(STORAGE_KEYS.VIEW_FILTER, filter);
  }, []);

  // -------------------------------------------------------------------------
  // Selection State
  // -------------------------------------------------------------------------

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedViewId, setSelectedViewId] = useState(null);

  // -------------------------------------------------------------------------
  // Navigation State
  // -------------------------------------------------------------------------

  const [currentPosition, setCurrentPosition] = useState({ row: 0, col: 0 });
  const [homePosition, setHomePosition] = useState({ row: 0, col: 0 });
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewportSize, setViewportSize] = useState({ rows: 3, cols: 3 });
  const [canvasSize, setCanvasSize] = useState({ rows: 4, cols: 4 });
  const [displayMode, setDisplayMode] = useState('names'); // 'names', 'numbers', 'colors'
  const [canvasData, setCanvasData] = useState({ placements: [], dimensions: null });
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // -------------------------------------------------------------------------
  // Canvas Data Integration
  // -------------------------------------------------------------------------

  // Get real canvas data from canvasManager
  useEffect(() => {
    const loadCanvasData = () => {
      try {
        const activeCanvasId = canvasManager?.getActiveCanvasId?.();
        if (!activeCanvasId) {
          setCanvasData({ placements: [], dimensions: null });
          return;
        }

        const canvas = canvasManager?.getCanvas?.(activeCanvasId);
        if (canvas) {
          setCanvasData({
            placements: canvas.placements || [],
            dimensions: canvas.dimensions || { rows: 4, cols: 4 },
          });
          // Update canvas size from actual canvas
          if (canvas.dimensions) {
            setCanvasSize({
              rows: canvas.dimensions.rows || 4,
              cols: canvas.dimensions.cols || 4,
            });
          }
        }
      } catch (err) {
        console.warn('[NavigatorTab] Error loading canvas data:', err);
      }
    };

    loadCanvasData();

    // Listen for canvas changes
    const handleCanvasChange = () => {
      loadCanvasData();
      setUpdateTrigger(n => n + 1);
    };

    window.addEventListener('cia:canvas-updated', handleCanvasChange);
    window.addEventListener('cia:view-placed', handleCanvasChange);
    window.addEventListener('cia:view-removed', handleCanvasChange);

    return () => {
      window.removeEventListener('cia:canvas-updated', handleCanvasChange);
      window.removeEventListener('cia:view-placed', handleCanvasChange);
      window.removeEventListener('cia:view-removed', handleCanvasChange);
    };
  }, []);

  // Build minimap cells from canvas placements
  const minimapCells = useMemo(() => {
    const cells = [];
    const { placements, dimensions } = canvasData;
    const rows = dimensions?.rows || canvasSize.rows;
    const cols = dimensions?.cols || canvasSize.cols;

    // Create a map of occupied cells
    const occupiedCells = new Map();
    placements.forEach((placement) => {
      const key = `${placement.row}-${placement.col}`;
      const viewId = placement.content?.viewConfigurationId;
      const viewConfig = viewId ? getViewConfigurationManager()?.getView?.(viewId) : null;

      occupiedCells.set(key, {
        ...placement,
        viewId,
        name: viewConfig?.name || placement.content?.name || `View`,
        color: getCellColorHex(placement.row, placement.col),
        colSpan: placement.colSpan || 1,
        rowSpan: placement.rowSpan || 1,
      });
    });

    // Build grid cells
    let cellIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const key = `${row}-${col}`;
        const cell = occupiedCells.get(key);
        const inViewport =
          row >= currentPosition.row &&
          row < currentPosition.row + viewportSize.rows &&
          col >= currentPosition.col &&
          col < currentPosition.col + viewportSize.cols;
        const isHome = row === homePosition.row && col === homePosition.col;

        // Skip cells covered by multi-span placements
        let isCovered = false;
        for (const [, placement] of occupiedCells) {
          if (
            row >= placement.row &&
            row < placement.row + (placement.rowSpan || 1) &&
            col >= placement.col &&
            col < placement.col + (placement.colSpan || 1) &&
            !(row === placement.row && col === placement.col)
          ) {
            isCovered = true;
            break;
          }
        }

        if (!isCovered) {
          cells.push({
            row,
            col,
            cell,
            inViewport,
            isHome,
            cellIndex: cell ? cellIndex++ : null,
            key: `cell-${row}-${col}`,
          });
        }
      }
    }

    return cells;
  }, [canvasData, canvasSize, currentPosition, viewportSize, homePosition, updateTrigger]);

  // Get cell display text based on mode
  const getCellDisplay = useCallback((cell, cellIndex, cellWidth = 28) => {
    if (!cell) return '';

    switch (displayMode) {
      case 'numbers':
        return cellIndex !== null ? String(cellIndex + 1) : '';
      case 'colors':
        return '';
      case 'names':
      default:
        // Truncate name to fit cell
        const name = cell.name || '';
        const maxChars = Math.floor(cellWidth / 6);
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    }
  }, [displayMode]);

  // -------------------------------------------------------------------------
  // Search State
  // -------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('');

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------

  // Get selected group object
  const selectedGroup = useMemo(
    () => viewGroups.find((g) => g.id === selectedGroupId),
    [viewGroups, selectedGroupId]
  );

  // Get selected view object
  const selectedView = useMemo(
    () => views.find((v) => v.id === selectedViewId),
    [views, selectedViewId]
  );

  // Check if current position is at home
  const isAtHome = useMemo(
    () =>
      currentPosition.row === homePosition.row &&
      currentPosition.col === homePosition.col,
    [currentPosition, homePosition]
  );

  // Get views for a specific group
  const getGroupViews = useCallback(
    (groupId) => views.filter((v) => v.groupId === groupId),
    [views]
  );

  // Get group at a specific position
  const getGroupAt = useCallback(
    (row, col) =>
      viewGroups.find(
        (g) =>
          row >= g.row &&
          row < g.row + (g.rowSpan || 1) &&
          col >= g.col &&
          col < g.col + (g.colSpan || 1)
      ),
    [viewGroups]
  );

  // Check if a cell is within the current viewport
  const isInViewport = useCallback(
    (row, col) =>
      row >= currentPosition.row &&
      row < currentPosition.row + viewportSize.rows &&
      col >= currentPosition.col &&
      col < currentPosition.col + viewportSize.cols,
    [currentPosition, viewportSize]
  );

  // Get collaborators at a specific position
  const getCollaboratorsAt = useCallback(
    (row, col) =>
      collaborators.filter(
        (c) => c.position?.row === row && c.position?.col === col
      ),
    [collaborators]
  );

  // Filter views based on current filter and search
  const filteredViews = useMemo(() => {
    let result = [...views];

    // Apply filter
    switch (viewFilter) {
      case VIEW_FILTERS.ACTIVE:
        result = result.filter((v) => v.position);
        break;
      case VIEW_FILTERS.INACTIVE:
        result = result.filter((v) => !v.position);
        break;
      case VIEW_FILTERS.STARRED:
        result = result.filter((v) => v.starredWorkspace || v.starredPersonal);
        break;
      case VIEW_FILTERS.LINKED:
        result = result.filter((v) => (v.linkedCount || 0) > 0);
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((v) => v.name?.toLowerCase().includes(q));
    }

    return result;
  }, [views, viewFilter, searchQuery]);

  // Split filtered views into active (on canvas) and inactive (not placed)
  const activeViews = useMemo(
    () => filteredViews.filter((v) => v.position),
    [filteredViews]
  );

  const inactiveViews = useMemo(
    () => filteredViews.filter((v) => !v.position),
    [filteredViews]
  );

  // View count statistics for filter chips
  const viewCounts = useMemo(
    () => ({
      all: views.length,
      active: views.filter((v) => v.position).length,
      inactive: views.filter((v) => !v.position).length,
      starred: views.filter((v) => v.starredWorkspace || v.starredPersonal)
        .length,
      linked: views.filter((v) => (v.linkedCount || 0) > 0).length,
    }),
    [views]
  );

  // Bookmark statistics
  const starredBookmarks = useMemo(
    () => bookmarks.filter((b) => b.isStarred),
    [bookmarks]
  );

  const unstarredBookmarks = useMemo(
    () => bookmarks.filter((b) => !b.isStarred),
    [bookmarks]
  );

  // -------------------------------------------------------------------------
  // Navigation Handlers
  // -------------------------------------------------------------------------

  const handleNavigate = useCallback(
    (direction) => {
      setCurrentPosition((prev) => {
        const next = { ...prev };
        switch (direction) {
          case 'up':
            next.row = Math.max(0, prev.row - 1);
            break;
          case 'down':
            next.row = Math.min(canvasSize.rows - 1, prev.row + 1);
            break;
          case 'left':
            next.col = Math.max(0, prev.col - 1);
            break;
          case 'right':
            next.col = Math.min(canvasSize.cols - 1, prev.col + 1);
            break;
        }
        return next;
      });
    },
    [canvasSize]
  );

  const handleGoHome = useCallback(() => {
    setCurrentPosition({ ...homePosition });
  }, [homePosition]);

  const handleSetHome = useCallback(() => {
    setHomePosition({ ...currentPosition });
    setIsSettingHome(false);
  }, [currentPosition]);

  // -------------------------------------------------------------------------
  // Cell Click Handler
  // -------------------------------------------------------------------------

  const handleCellClick = useCallback(
    (row, col, group) => {
      // If setting home, update home position
      if (isSettingHome) {
        setHomePosition({ row, col });
        setIsSettingHome(false);
        return;
      }

      // Update current position
      setCurrentPosition({ row, col });

      // Select group if clicked
      if (group) {
        setSelectedGroupId(group.id);
        if (focusMode === FOCUS_MODES.GROUPS) {
          setSelectedViewId(null);
        }
      }
    },
    [isSettingHome, focusMode]
  );

  // -------------------------------------------------------------------------
  // View Selection Handlers
  // -------------------------------------------------------------------------

  const handleSelectView = useCallback(
    (viewId) => {
      setSelectedViewId(viewId);
      // Switch to views mode when selecting a view
      setFocusMode(FOCUS_MODES.VIEWS);
    },
    [setFocusMode]
  );

  const handleNavigateToView = useCallback(
    (viewId) => {
      const view = views.find((v) => v.id === viewId);
      if (view?.groupId) {
        const group = viewGroups.find((g) => g.id === view.groupId);
        if (group) {
          setCurrentPosition({ row: group.row, col: group.col });
        }
      }
      // Call external callback if provided
      onNavigateToView?.(viewId);
    },
    [views, viewGroups, onNavigateToView]
  );

  const handlePlaceView = useCallback(
    (viewId) => {
      onPlaceView?.(viewId);
    },
    [onPlaceView]
  );

  // -------------------------------------------------------------------------
  // Group Handlers
  // -------------------------------------------------------------------------

  const handleFocusGroup = useCallback(
    (groupId) => {
      onFocusGroup?.(groupId);
    },
    [onFocusGroup]
  );

  // -------------------------------------------------------------------------
  // Zoom Handlers
  // -------------------------------------------------------------------------

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(200, z + 25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(25, z - 25));
  }, []);

  // -------------------------------------------------------------------------
  // Size Handlers
  // -------------------------------------------------------------------------

  const handleViewportColsChange = useCallback((cols) => {
    setViewportSize((s) => ({ ...s, cols }));
  }, []);

  const handleViewportRowsChange = useCallback((rows) => {
    setViewportSize((s) => ({ ...s, rows }));
  }, []);

  const handleCanvasColsChange = useCallback((cols) => {
    setCanvasSize((s) => ({ ...s, cols }));
  }, []);

  const handleCanvasRowsChange = useCallback((rows) => {
    setCanvasSize((s) => ({ ...s, rows }));
  }, []);

  // -------------------------------------------------------------------------
  // Return API
  // -------------------------------------------------------------------------

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Focus mode
    focusMode,
    setFocusMode,

    // Selection
    selectedGroupId,
    setSelectedGroupId,
    selectedViewId,
    setSelectedViewId,
    selectedGroup,
    selectedView,

    // Navigation state
    currentPosition,
    setCurrentPosition,
    homePosition,
    setHomePosition,
    isSettingHome,
    setIsSettingHome,
    isAtHome,

    // Zoom
    zoomLevel,
    setZoomLevel,
    handleZoomIn,
    handleZoomOut,

    // Viewport/Canvas size
    viewportSize,
    setViewportSize,
    canvasSize,
    setCanvasSize,
    handleViewportColsChange,
    handleViewportRowsChange,
    handleCanvasColsChange,
    handleCanvasRowsChange,

    // Search & Filter
    searchQuery,
    setSearchQuery,
    viewFilter,
    setViewFilter,

    // Filtered data
    filteredViews,
    activeViews,
    inactiveViews,
    viewCounts,

    // Bookmarks
    starredBookmarks,
    unstarredBookmarks,

    // Navigation handlers
    handleNavigate,
    handleGoHome,
    handleSetHome,
    handleCellClick,

    // View handlers
    handleSelectView,
    handleNavigateToView,
    handlePlaceView,

    // Group handlers
    handleFocusGroup,

    // Helpers
    formatPosition,
    getGroupViews,
    getGroupAt,
    isInViewport,
    getCollaboratorsAt,

    // Canvas minimap data
    minimapCells,
    displayMode,
    setDisplayMode,
    getCellDisplay,
    canvasData,
  };
}

export default useNavigatorTab;
