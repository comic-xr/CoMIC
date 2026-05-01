/**
 * @file useViewsTab.js
 * @description Hook for Views tab state management.
 *
 * ARCHITECTURE:
 * - Uses ViewLifecycleService for all view operations (centralized)
 * - Uses EventBus + manager events for reactivity
 * - Uses useState instead of useMemo for views to ensure reactivity
 * - Properly tracks active/inactive/linked status
 *
 * UPDATED: Now uses ViewLifecycleService instead of direct manager calls
 *
 * @example
 * const { views, onCanvasViews, handlePlaceView } = useViewsTab({ workspaceId });
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { getViewConfigurationManager, getDatasetManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { viewLifecycleService } from "@Services/ViewLifecycleService.js";
import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
import {
  VIEW_EVENTS,
  CANVAS_MANAGER_EVENTS as CANVAS_EVENTS,
  DOM_EVENTS,
} from "@Core/events/eventConstants.js";
import { dispatchNavigateTo } from "@UI/react/hooks/useViewportSync.js";
import { view as log } from "@Utils/logger.js";
import { getCellColorHex } from "@UI/react/utils/canvasColors.js";
import { canvasHistory } from "@UI/react/store/canvasHistoryStore.js";
import { useListFilter, VIEWS_FILTER_CONFIG } from "@UI/react/hooks";

// =============================================================================
// VIEW MODES
// =============================================================================

export const VIEW_MODES = {
  LIST: "list", // Simple list
  BY_STATUS: "byStatus", // Grouped by On Canvas / Not Placed / Deleted
  BY_DATASET: "byDataset", // Grouped by parent dataset
  GRID: "grid", // Grid preview mode
};

// =============================================================================
// HELPER: Get all views from manager
// =============================================================================

function getAllViewsFromManager(viewManager) {
  if (!viewManager) return [];

  // Access internal _viewConfigs Map directly
  // This bypasses userId filtering that breaks in dev mode
  if (viewManager._viewConfigs instanceof Map) {
    return Array.from(viewManager._viewConfigs.values());
  }

  // Fallback: combine available methods
  const myViews = viewManager.getMyViews?.() || [];
  const sharedViews = viewManager.getSharedWithMe?.() || [];

  const viewMap = new Map();
  [...myViews, ...sharedViews].forEach((v) => {
    if (v?.id) viewMap.set(v.id, v);
  });

  return Array.from(viewMap.values());
}

// =============================================================================
// HELPER: Find placement for a view (fallback if canvasManager method doesn't exist)
// =============================================================================

function findPlacementForView(viewId) {
  if (!viewId || !canvasManager) return null;

  // Try canvasManager method first (if it exists)
  if (typeof canvasManager.getPlacementForView === "function") {
    return canvasManager.getPlacementForView(viewId);
  }

  // Fallback: manually search through canvases
  // Check active canvas first
  const activeCanvas = canvasManager.getActiveCanvas?.();
  if (activeCanvas?.placements) {
    const placement = activeCanvas.placements.find(
      (p) =>
        p.content?.viewConfigurationId === viewId ||
        p.content?.viewId === viewId
    );
    if (placement) return placement;
  }

  // Check all canvases
  const allCanvases = canvasManager.getAllCanvases?.() || [];
  for (const canvas of allCanvases) {
    if (canvas.id === activeCanvas?.id) continue; // Already checked
    const placement = canvas.placements?.find(
      (p) =>
        p.content?.viewConfigurationId === viewId ||
        p.content?.viewId === viewId
    );
    if (placement) return placement;
  }

  return null;
}

// =============================================================================
// HELPER: Enrich view with runtime data
// =============================================================================

function enrichView(view) {
  if (!view) return null;

  // Get placement info from canvas
  const placement = findPlacementForView(view.id);

  // Determine if view has any links
  const hasLinks =
    view.links &&
    Object.values(view.links).some(
      (link) => link && (link.isActive?.() || link.targetViewId)
    );

  // Count active links
  const linkedCount = view.links
    ? Object.values(view.links).filter((link) => link?.targetViewId).length
    : 0;

  // isOnCanvas is determined by placement existence
  const isOnCanvas = placement !== null;

  // For views ON the canvas, use position-based color (matches CanvasCell coloring)
  // For views NOT on canvas, use workspaceManager color or random color
  let viewColor;
  if (isOnCanvas && placement) {
    // Position-based color - matches CanvasCell exactly
    viewColor = getCellColorHex(placement.row, placement.col);
  } else {
    // Fallback for views not on canvas
    const instanceColorObj = workspaceManager?.getViewColor?.(view.id);
    viewColor = instanceColorObj?.hex || instanceColorObj || view.color || "#60a5fa";
  }

  // Look up actual dataset name from DatasetManager if not set on view
  let datasetName = view.datasetName;
  if (!datasetName && view.datasetId) {
    const datasetManager = getDatasetManager();
    const dataset = datasetManager?.getDataset(view.datasetId);
    datasetName = dataset?.name || dataset?.fileName || view.datasetId;
  }

  return {
    ...view,
    id: view.id,
    name: view.name || "Untitled View",
    datasetId: view.datasetId,
    datasetName: datasetName || "Unknown Dataset",
    color: viewColor,

    // Position & size
    position: placement ? { row: placement.row, col: placement.col } : null,
    rowSpan: placement?.rowSpan || view.rowSpan || 1,
    colSpan: placement?.colSpan || view.colSpan || 1,

    // Canvas placement status
    isOnCanvas,
    placementId: placement?.id || null,

    // Status - PLACEMENT is authoritative for active/inactive
    // Only use view.status for "trashed" state
    status:
      view.status === "trashed"
        ? "trashed"
        : isOnCanvas
        ? "active"
        : "inactive",

    // Link info
    hasLinks,
    linkedCount,
    isLinked: hasLinks,

    // Visibility (for hide/show toggle)
    visible: view.visible !== false,
  };
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for Views tab state management.
 *
 * @param {Object} options - Hook options
 * @param {string} options.workspaceId - Current workspace ID
 * @returns {Object} Hook return value
 */
export function useViewsTab({ workspaceId }) {
  // =========================================================================
  // STATE - Use useState for reactivity (not useMemo!)
  // =========================================================================

  const [views, setViews] = useState([]);
  const [trashedViews, setTrashedViews] = useState([]);
  const [viewMode, setViewMode] = useState(VIEW_MODES.BY_STATUS);
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // =========================================================================
  // UNIFIED FILTER SYSTEM
  // =========================================================================

  const filter = useListFilter({
    ...VIEWS_FILTER_CONFIG,
    // Override search fields to match view structure
    searchFields: (view) => [view.name, view.datasetName],
  });

  // =========================================================================
  // LOAD VIEWS - Called on mount and when events fire
  // =========================================================================

  const loadViews = useCallback(() => {
    try {
      const viewManager = getViewConfigurationManager();
      if (!viewManager) {
        log.debug("ViewConfigurationManager not available yet");
        return;
      }

      // Get all views
      const allRawViews = getAllViewsFromManager(viewManager);

      // Separate trashed from non-trashed
      const nonTrashed = allRawViews.filter((v) => v.status !== "trashed");
      const trashed =
        viewManager.getTrashedViews?.() ||
        allRawViews.filter((v) => v.status === "trashed");

      // Enrich views with runtime data
      const enrichedViews = nonTrashed.map(enrichView).filter(Boolean);
      const enrichedTrashed = trashed.map(enrichView).filter(Boolean);

      setViews(enrichedViews);
      setTrashedViews(enrichedTrashed);

      log.debug(
        `Loaded ${enrichedViews.length} views, ${enrichedTrashed.length} trashed`
      );
    } catch (e) {
      log.error("Failed to load views:", e);
      setError(e);
    }
  }, []);

  // =========================================================================
  // INITIAL LOAD
  // =========================================================================

  useEffect(() => {
    loadViews();
  }, [loadViews, workspaceId]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - Manager Events
  // =========================================================================

  useEffect(() => {
    const viewManager = getViewConfigurationManager();
    if (!viewManager?.on) return;

    // Subscribe to ViewConfigurationManager events
    const events = [
      VIEW_EVENTS.ADDED,
      VIEW_EVENTS.UPDATED,
      VIEW_EVENTS.REMOVED,
      VIEW_EVENTS.TRASHED,
      VIEW_EVENTS.RESTORED,
      VIEW_EVENTS.DELETED,
    ];

    events.forEach((event) => viewManager.on(event, loadViews));

    return () => {
      events.forEach((event) => viewManager.off(event, loadViews));
    };
  }, [loadViews]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - EventBus Events (from ViewLifecycleService)
  // =========================================================================

  useEffect(() => {
    const unsubs = [
      eventBus.on(BUS_EVENTS.VIEW_CREATED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_PLACED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_REMOVED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_TRASHED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_RESTORED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_DELETED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_RENAMED, loadViews),
      eventBus.on(BUS_EVENTS.PLACEMENT_ADDED, loadViews),
      eventBus.on(BUS_EVENTS.PLACEMENT_REMOVED, loadViews),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [loadViews]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - Canvas Manager Events
  // =========================================================================

  useEffect(() => {
    const unsubs = [
      canvasManager.on(CANVAS_EVENTS.PLACEMENT_ADDED, loadViews),
      canvasManager.on(CANVAS_EVENTS.PLACEMENT_REMOVED, loadViews),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [loadViews]);

  // =========================================================================
  // FILTERED & SORTED VIEWS - Using unified filter system
  // =========================================================================

  const filteredViews = useMemo(() => {
    // Apply unified filter system
    let result = filter.applyFilters(views);

    // Quick filters in Views tab work as OR filters for status
    // If quick filters are active, apply them as status filters
    if (filter.quickFilters.length > 0) {
      result = result.filter((v) => {
        // If any quick filter matches, include the view
        return filter.quickFilters.some((filterId) => {
          if (filterId === "active") return v.status === "active" || v.isOnCanvas;
          if (filterId === "inactive") return v.status === "inactive" && !v.isOnCanvas;
          if (filterId === "shared") return v.isShared;
          if (filterId === "linked") return v.isLinked || v.hasLinks;
          return false;
        });
      });
    }

    return result;
  }, [views, filter]);

  // =========================================================================
  // CATEGORIZED VIEWS
  // =========================================================================

  const onCanvasViews = useMemo(
    () => filteredViews.filter((v) => v.isOnCanvas),
    [filteredViews]
  );

  const notPlacedViews = useMemo(
    () => filteredViews.filter((v) => !v.isOnCanvas && v.status !== "trashed"),
    [filteredViews]
  );

  const linkedViews = useMemo(
    () => filteredViews.filter((v) => v.isLinked),
    [filteredViews]
  );

  const unlinkedViews = useMemo(
    () => filteredViews.filter((v) => !v.isLinked),
    [filteredViews]
  );

  const recentlyDeletedViews = useMemo(() => trashedViews, [trashedViews]);

  // Group by dataset
  const viewsByDataset = useMemo(() => {
    const groups = new Map();

    filteredViews.forEach((view) => {
      const datasetId = view.datasetId || "unknown";
      const datasetName = view.datasetName || "Unknown Dataset";

      if (!groups.has(datasetId)) {
        groups.set(datasetId, {
          id: datasetId,
          name: datasetName,
          views: [],
        });
      }
      groups.get(datasetId).views.push(view);
    });

    return Array.from(groups.values());
  }, [filteredViews]);

  // =========================================================================
  // FILTER TOGGLE - Now uses unified filter system
  // =========================================================================

  // Legacy toggle for backwards compatibility
  const toggleFilter = useCallback((filterId) => {
    filter.toggleQuickFilter(filterId);
  }, [filter]);

  // =========================================================================
  // DATASET EXPANSION
  // =========================================================================

  const toggleDatasetExpanded = useCallback((datasetId) => {
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  }, []);

  // =========================================================================
  // VIEW LIFECYCLE HANDLERS - Using ViewLifecycleService
  // =========================================================================

  /**
   * Place a view on the canvas
   */
  const handlePlaceView = useCallback(async (viewId) => {
    log.debug("Placing view on canvas:", viewId);
    try {
      await viewLifecycleService.placeView(viewId);
    } catch (e) {
      log.error("Failed to place view:", e);
      setError(e);
    }
  }, []);

  /**
   * Remove a view from the canvas (but keep the view)
   */
  const handleRemoveFromCanvas = useCallback(async (viewId) => {
    log.debug("Removing view from canvas:", viewId);
    try {
      await viewLifecycleService.removeViewFromCanvas(viewId);
    } catch (e) {
      log.error("Failed to remove view:", e);
      setError(e);
    }
  }, []);

  /**
   * Move a view to trash (soft delete)
   */
  const handleTrashView = useCallback(async (viewId) => {
    log.debug("Trashing view:", viewId);
    try {
      await viewLifecycleService.trashView(viewId);
    } catch (e) {
      log.error("Failed to trash view:", e);
      setError(e);
    }
  }, []);

  /**
   * Restore a view from trash
   */
  const handleRestoreView = useCallback(async (viewId) => {
    log.debug("Restoring view:", viewId);
    try {
      await viewLifecycleService.restoreView(viewId);
    } catch (e) {
      log.error("Failed to restore view:", e);
      setError(e);
    }
  }, []);

  /**
   * Permanently delete a view
   */
  const handlePermanentDelete = useCallback(async (viewId) => {
    log.debug("Permanently deleting view:", viewId);
    try {
      await viewLifecycleService.deleteView(viewId);
    } catch (e) {
      log.error("Failed to delete view:", e);
      setError(e);
    }
  }, []);

  /**
   * Open the create view modal
   */
  const handleCreateView = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DOM_EVENTS.OPEN_CREATE_VIEW_MODAL));
  }, []);

  /**
   * Select/focus a view (navigate to it if on canvas)
   */
  const handleSelectView = useCallback((viewId) => {
    log.debug("Selecting view:", viewId);
    viewLifecycleService.focusView(viewId);
  }, []);

  /**
   * Navigate to view's position on canvas
   */
  const handleNavigateToView = useCallback(
    (viewId) => {
      const view = views.find((v) => v.id === viewId);
      if (view?.position) {
        log.debug("Navigating to view position:", view.position);
        // Use the correct viewport navigation function
        dispatchNavigateTo(view.position.row, view.position.col);
      } else {
        log.debug("Cannot navigate - view has no position:", viewId);
      }
    },
    [views]
  );

  /**
   * Rename a view
   */
  const handleRenameView = useCallback(async (viewId, newName) => {
    log.debug("Renaming view:", viewId, "to", newName);
    try {
      await viewLifecycleService.renameView(viewId, newName);
    } catch (e) {
      log.error("Failed to rename view:", e);
      setError(e);
    }
  }, []);

  /**
   * Resize a view's placement on canvas
   * Note: This still uses canvasManager directly as it's a placement operation
   */
  const handleResizeView = useCallback((viewId, size) => {
    log.debug("Resizing view:", viewId, size);

    // Find placement using our fallback function (canvasManager.getPlacementForView may not exist)
    const placement = findPlacementForView(viewId);
    if (placement) {
      const prevRowSpan = placement.rowSpan || 1;
      const prevColSpan = placement.colSpan || 1;
      canvasManager?.resizePlacement?.(placement.id, size.rows, size.cols);
      canvasHistory.record({
        type: "RESIZE",
        description: `Resize view to ${size.rows}×${size.cols}`,
        undo: () => canvasManager.resizePlacement(placement.id, prevRowSpan, prevColSpan),
        redo: () => canvasManager.resizePlacement(placement.id, size.rows, size.cols),
      });
    } else {
      log.warn("Cannot resize view - no placement found:", viewId);
    }
  }, []);

  /**
   * Focus a view - makes it active and navigates to it if needed
   *
   * ViewLifecycleService.focusView now handles:
   * 1. Dispatching cia:instance-focused to make the cell active
   * 2. Smart viewport navigation (minimum movement to show cell)
   */
  const handleFocusView = useCallback((viewId) => {
    log.debug("Focusing view:", viewId);
    viewLifecycleService.focusView(viewId);
  }, []);

  /**
   * Toggle view visibility (hide/show on canvas)
   */
  const handleToggleVisibility = useCallback((viewId) => {
    viewLifecycleService.toggleViewVisibility(viewId);
  }, []);

  /**
   * Bookmark a view
   */
  const handleBookmarkView = useCallback((viewId) => {
    log.debug("Bookmarking view:", viewId);
    // TODO: Implement bookmark service integration
    window.dispatchEvent(new CustomEvent(DOM_EVENTS.OPEN_BOOKMARK_VIEW_MODAL, { detail: { viewId } }));
  }, []);

  /**
   * Share a view
   */
  const handleShareView = useCallback((viewId) => {
    log.debug("Sharing view:", viewId);
    window.dispatchEvent(new CustomEvent(DOM_EVENTS.OPEN_SHARE_VIEW_MODAL, { detail: { viewId } }));
  }, []);

  /**
   * Open tools for a view
   */
  const handleOpenTools = useCallback((viewId) => {
    log.debug("Opening tools for view:", viewId);
    // Focus the view first, then switch to Instance Tools tab
    viewLifecycleService.focusView(viewId);
    window.dispatchEvent(new CustomEvent(DOM_EVENTS.SWITCH_TAB, { detail: { tab: 'instanceTools' } }));
  }, []);

  /**
   * Duplicate a view
   */
  const handleDuplicateView = useCallback(async (viewId) => {
    log.debug("Duplicating view:", viewId);
    try {
      await viewLifecycleService.duplicateView(viewId);
    } catch (e) {
      log.error("Failed to duplicate view:", e);
      setError(e);
    }
  }, []);

  /**
   * Remove a filter from a view
   */
  const handleRemoveFilter = useCallback((viewId, filterId) => {
    log.debug("Removing filter from view:", viewId, filterId);
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView?.(viewId);
    if (view?.filters?.[filterId]) {
      view.filters[filterId].active = false;
      viewManager?.updateView?.(viewId, { filters: view.filters });
    }
  }, []);

  /**
   * Update link property configuration
   */
  const handleLinkPropertyChange = useCallback((viewId, propertyId, config) => {
    log.debug("Updating link property:", viewId, propertyId, config);
    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView?.(viewId);
    if (view) {
      const links = { ...view.links, [propertyId]: config };
      viewManager?.updateView?.(viewId, { links });
    }
  }, []);

  /**
   * Update link mode (Follow, Bidirectional, Broadcast)
   */
  const handleLinkModeChange = useCallback((viewId, mode) => {
    log.debug("Updating link mode:", viewId, mode);
    const viewManager = getViewConfigurationManager();
    viewManager?.updateView?.(viewId, { linkMode: mode });
  }, []);

  // =========================================================================
  // MANUAL REFRESH
  // =========================================================================

  const refetch = useCallback(() => {
    loadViews();
  }, [loadViews]);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // Data
    views: filteredViews,
    allViews: views,
    onCanvasViews,
    notPlacedViews,
    linkedViews,
    unlinkedViews,
    recentlyDeletedViews,
    viewsByDataset,

    // Unified filter system
    filter,
    filterConfig: VIEWS_FILTER_CONFIG,

    // State
    isLoading,
    error,
    viewMode,
    setViewMode,
    expandedDatasets,
    toggleDatasetExpanded,

    // Legacy filter props (backwards compatibility)
    searchQuery: filter.searchQuery,
    setSearchQuery: filter.setSearchQuery,
    activeFilters: filter.quickFilters,
    toggleFilter,
    sortBy: filter.sortBy,
    setSortBy: filter.setSortBy,

    // Handlers - all using ViewLifecycleService
    handlePlaceView,
    handleRemoveFromCanvas,
    handleTrashView,
    handleRestoreView,
    handlePermanentDelete,
    handleCreateView,
    handleSelectView,
    handleNavigateToView,
    handleRenameView,
    handleResizeView,
    handleFocusView,
    handleToggleVisibility,

    // New handlers for expanded panel
    handleBookmarkView,
    handleShareView,
    handleOpenTools,
    handleDuplicateView,
    handleRemoveFilter,
    handleLinkPropertyChange,
    handleLinkModeChange,
    refetch,
  };
}

export default useViewsTab;
