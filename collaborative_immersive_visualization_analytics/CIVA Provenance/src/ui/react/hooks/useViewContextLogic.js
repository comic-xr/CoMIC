/**
 * @file useViewContextLogic.js
 * @description Hook that provides view context data for canvas toolbars and footers.
 *
 * This hook bridges:
 * - LayoutPanelContext (canvas navigation, viewport)
 * - workspaceManager (active instance - source of truth)
 * - ViewConfigurationManager (view names, metadata)
 *
 * Used by:
 * - CanvasToolbar (ViewContextBlock)
 *
 * Usage:
 * ```jsx
 * const viewContext = useViewContextLogic();
 * <ViewContextBlock {...viewContext} />
 * ```
 */

import { useCallback, useMemo, useEffect, useState } from "react";
import { useLayoutPanelContext } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import {
  getViewConfigurationManager,
  getDatasetManager,
} from "@Init/appInitializer";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { eventBus, BUS_EVENTS } from "@Core/events";
import { ui as log } from "@Utils/logger.js";
// Viewport events are dispatched by LayoutPanel.logic.js - no need to import here

// =============================================================================
// SHARED COLOR UTILITIES - Single source of truth
// =============================================================================

import {
  getCellColorHex,
  getViewColor,
  VIEW_COLORS,
} from "@UI/react/utils/canvasColors.js";

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useViewContextLogic() {
  // =========================================================================
  // LAYOUT PANEL CONTEXT (canvas navigation + cells)
  // =========================================================================

  const layoutContext = useLayoutPanelContext();
  const logic = layoutContext?.logic || {};

  // Get cells (enriched placements) from context - this is the source of truth
  const cells = logic.cells || [];


  // Extract viewport position with safe defaults
  const viewport = useMemo(
    () => ({
      row: logic.viewport?.row ?? 0,
      col: logic.viewport?.col ?? 0,
    }),
    [logic.viewport]
  );

  // Extract viewport size (how many cells are visible)
  const viewportSize = useMemo(
    () => ({
      rows: logic.viewportSize?.rows ?? 3,
      cols: logic.viewportSize?.cols ?? 3,
    }),
    [logic.viewportSize]
  );

  // Canvas position for display (col, row format)
  const canvasPosition = useMemo(
    () => ({
      col: viewport.col,
      row: viewport.row,
    }),
    [viewport]
  );

  const isAtOrigin = canvasPosition.col === 0 && canvasPosition.row === 0;

  // Navigation functions from layout context
  const moveViewport = logic.moveViewport || (() => {});
  const navigateToCell = logic.navigateToCell || (() => {});
  const setViewportPosition = logic.setViewportPosition || (() => {});
  const homepoint = logic.homepoint || { row: 0, col: 0 };

  // =========================================================================
  // NAVIGATION HANDLERS
  // =========================================================================

  /**
   * Handle direction-based navigation (up/down/left/right)
   * Uses both LayoutPanelContext (if available) AND direct event dispatch
   * to ensure navigation always works
   */
  const handleNavigate = useCallback(
    (direction) => {
      log.debug("ViewContext navigation:", direction);

      let deltaRow = 0;
      let deltaCol = 0;

      switch (direction) {
        case "up":
          deltaRow = -1;
          break;
        case "down":
          deltaRow = 1;
          break;
        case "left":
          deltaCol = -1;
          break;
        case "right":
          deltaCol = 1;
          break;
        default:
          log.warn("Unknown direction:", direction);
          return;
      }

      // Call context moveViewport - it dispatches the event internally
      // Don't dispatch again to avoid double movement
      moveViewport(deltaRow, deltaCol);
    },
    [moveViewport]
  );

  /**
   * Navigate to home/origin position
   * Uses both LayoutPanelContext (if available) AND direct event dispatch
   */
  const handleHome = useCallback(() => {
    log.debug("ViewContext: Navigate home");
    const targetRow = homepoint?.row ?? 0;
    const targetCol = homepoint?.col ?? 0;

    // Call context navigateToCell - it dispatches the event internally
    // Don't dispatch again to avoid double movement
    navigateToCell(targetRow, targetCol);
  }, [navigateToCell, homepoint]);

  /**
   * Open bookmarks panel/popout
   */
  const handleBookmark = useCallback(() => {
    log.debug("ViewContext: Open bookmarks");
    window.dispatchEvent(new CustomEvent("open:bookmarks"));
  }, []);

  // =========================================================================
  // VIEW DATA (enriched with names)
  // =========================================================================

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeInstance, setActiveInstance] = useState(null);
  const [subsetIds, setSubsetIds] = useState([]);
  const [viewLinks, setViewLinks] = useState({}); // { viewId: { linkType: { target, direction } } }

  // Helper to extract links from a ViewConfiguration (Hub Model)
  // Now includes all sync group members, not just direct link target
  const extractLinksFromView = useCallback((viewConfigId) => {
    const vcm = getViewConfigurationManager?.();
    if (!vcm) return {};

    const extractedLinks = {};
    const linkableProps = ["camera", "cursors", "filters", "widgets", "annotationDisplay", "colorMaps"];

    for (const prop of linkableProps) {
      // Get all sync group members for this property
      const groupMembers = vcm.getSyncGroupMembers?.(viewConfigId, prop) || [];

      if (groupMembers.length > 0) {
        extractedLinks[prop] = {
          targets: groupMembers, // Array of all synced view IDs
          direction: "bidirectional", // Hub model is always bidirectional
        };
      }
    }

    return extractedLinks;
  }, []);

  // Sync viewLinks from actual ViewConfiguration when active view changes
  useEffect(() => {
    const instance = activeInstance;
    if (!instance) return;

    const viewConfigId = instance.viewConfigId || instance.viewId;
    if (!viewConfigId) return;

    const extractedLinks = extractLinksFromView(viewConfigId);

    // Update state (even if empty - clears stale links)
    setViewLinks((prev) => ({
      ...prev,
      [viewConfigId]: extractedLinks,
    }));
  }, [activeInstance, extractLinksFromView]);

  // Listen for linkChanged events to update UI when links change (including reverse links)
  useEffect(() => {
    const vcm = getViewConfigurationManager?.();
    if (!vcm) return;

    const handleLinkChanged = ({ viewId, property, action }) => {
      log.debug("ViewContext: Link changed event", { viewId, property, action });

      // Re-extract links for the affected view
      const extractedLinks = extractLinksFromView(viewId);

      setViewLinks((prev) => ({
        ...prev,
        [viewId]: extractedLinks,
      }));
    };

    vcm.on("linkChanged", handleLinkChanged);

    return () => {
      vcm.off("linkChanged", handleLinkChanged);
    };
  }, [extractLinksFromView]);

  // Listen for view/placement changes
  useEffect(() => {
    const refresh = () => setRefreshKey((k) => k + 1);

    const unsubs = [
      eventBus.on(BUS_EVENTS.VIEW_PLACED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_REMOVED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_ADDED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_REMOVED, refresh),
    ];

    // Also listen for DOM events
    window.addEventListener("cia:views-loaded", refresh);
    window.addEventListener("cia:view-added", refresh);
    window.addEventListener("cia:view-updated", refresh);

    return () => {
      unsubs.forEach((unsub) => unsub?.());
      window.removeEventListener("cia:views-loaded", refresh);
      window.removeEventListener("cia:view-added", refresh);
      window.removeEventListener("cia:view-updated", refresh);
    };
  }, []);

  // Sync with workspaceManager.getActiveInstance() - the source of truth
  // This matches InstanceToolsTab behavior exactly
  useEffect(() => {
    const updateActiveInstance = () => {
      const instance = workspaceManager?.getActiveInstance?.();
      setActiveInstance(instance || null);
    };

    // Initial check
    updateActiveInstance();

    // Listen for the same events as InstanceToolsTab
    const handleInstanceFocus = () => {
      updateActiveInstance();
    };

    window.addEventListener("cia:instance-focused", handleInstanceFocus);
    window.addEventListener("cia:active-instance-changed", handleInstanceFocus);

    // Also listen to eventBus
    const unsub = eventBus.on(BUS_EVENTS.VIEW_FOCUSED, handleInstanceFocus);

    return () => {
      unsub?.();
      window.removeEventListener("cia:instance-focused", handleInstanceFocus);
      window.removeEventListener(
        "cia:active-instance-changed",
        handleInstanceFocus
      );
    };
  }, []);

  /**
   * Get enriched views on canvas with names
   * Uses cells from LayoutPanelContext which are already enriched with view metadata
   */
  const onCanvasViews = useMemo(() => {
    // cells from context are already enriched with viewConfiguration data
    return cells.map((cell, index) => {
      const viewId = cell.viewConfigurationId || cell.id;
      const cellName = cell.name || cell.title;

      // Check if the name is a default placeholder
      const isDefaultName =
        !cellName ||
        cellName === "Untitled View" ||
        cellName === "Default View";

      // Get view config and dataset info
      const vcm = getViewConfigurationManager?.();
      const viewConfig = vcm?.getView?.(viewId);
      const datasetId = viewConfig?.datasetId || cell.datasetId;
      const dataset = datasetId
        ? getDatasetManager?.()?.getDataset?.(datasetId)
        : null;

      // Get dataset filename as fallback for default names
      let displayName = cellName;
      if (isDefaultName) {
        displayName = dataset?.filename || cellName || `View ${index + 1}`;
      }

      // Use position-based color to match CanvasCell
      const positionColor = getCellColorHex(cell.row, cell.col);

      return {
        id: viewId,
        name: displayName,
        type: cell.content?.type || viewConfig?.handlerType || "vtk",
        position: { col: cell.col, row: cell.row },
        color: positionColor,
        datasetId: datasetId, // Include datasetId for smart linking
        datasetName: dataset?.filename || dataset?.name || cell.datasetName || datasetId,
      };
    });
  }, [cells, refreshKey]);

  /**
   * Get available views (not on canvas)
   * Uses same approach as useViewsTab - access _viewConfigs directly
   */
  const availableViews = useMemo(() => {
    const vcm = getViewConfigurationManager?.();
    if (!vcm) return [];

    // Get all views - access _viewConfigs Map directly (same as useViewsTab)
    let allViews = [];
    if (vcm._viewConfigs instanceof Map) {
      allViews = Array.from(vcm._viewConfigs.values());
    } else {
      // Fallback: combine available methods
      const myViews = vcm.getMyViews?.() || [];
      const sharedViews = vcm.getSharedWithMe?.() || [];
      const viewMap = new Map();
      [...myViews, ...sharedViews].forEach((v) => {
        if (v?.id) viewMap.set(v.id, v);
      });
      allViews = Array.from(viewMap.values());
    }

    const onCanvasIds = new Set(onCanvasViews.map((v) => v.id));

    const available = allViews
      .filter((v) => !onCanvasIds.has(v.id) && v.status !== "trashed")
      .map((v, index) => {
        const dataset = v.datasetId
          ? getDatasetManager?.()?.getDataset?.(v.datasetId)
          : null;
        return {
          id: v.id,
          name: v.name || `View of ${v.datasetId || "Unknown"}`,
          type: v.handlerType || v.type || "vtk",
          color: getViewColor(v.id, index),
          datasetId: v.datasetId, // Include datasetId for smart linking
          datasetName: dataset?.filename || dataset?.name || v.datasetName || v.datasetId,
        };
      });

    return available;
  }, [onCanvasViews, refreshKey]);

  /**
   * Active view (currently selected) - derived from workspaceManager's activeInstance
   * Uses workspaceManager.getViewColor() for consistent coloring with InstanceToolsTab
   */
  const activeView = useMemo(() => {
    if (!activeInstance) return null;

    const viewConfigId = activeInstance.viewConfigId || activeInstance.viewId;
    if (!viewConfigId) return null;

    // Get color from workspaceManager for consistency
    const instanceColor = workspaceManager.getViewColor?.(viewConfigId);
    const colorHex =
      instanceColor?.hex || activeInstance.color?.hex || activeInstance.color;

    // Find matching view in onCanvasViews for position info
    const canvasView = onCanvasViews.find((v) => v.id === viewConfigId);

    // Get view name from ViewConfigurationManager
    // Prefer dataset filename over default "Untitled View" name
    const vcm = getViewConfigurationManager?.();
    const viewConfig = vcm?.getView?.(viewConfigId);
    const dataset = viewConfig?.datasetId
      ? getDatasetManager?.()?.getDataset?.(viewConfig.datasetId)
      : null;

    // Check if view name is a default placeholder
    const isDefaultName =
      !viewConfig?.name ||
      viewConfig.name === "Untitled View" ||
      viewConfig.name === "Default View";

    // Prefer dataset filename over default view name
    const displayName = isDefaultName
      ? dataset?.filename ||
        viewConfig?.name ||
        activeInstance.name ||
        canvasView?.name ||
        "Active View"
      : viewConfig.name;

    // Use position-based color from canvasView (matches CanvasCell coloring)
    // Fall back to workspaceManager color or default
    const finalColor = canvasView?.color || colorHex || VIEW_COLORS[0];

    return {
      id: viewConfigId,
      name: displayName,
      type: viewConfig?.handlerType || activeInstance.type || "vtk",
      position: canvasView?.position || null,
      color: finalColor,
      datasetId: viewConfig?.datasetId || canvasView?.datasetId, // Include datasetId for smart linking
      datasetName:
        dataset?.filename || viewConfig?.datasetName || canvasView?.datasetName,
      links: viewLinks[viewConfigId] || {},
    };
  }, [activeInstance, onCanvasViews, refreshKey, viewLinks]);

  // =========================================================================
  // VIEW HANDLERS
  // =========================================================================

  /**
   * Select a view (focus it)
   * Sets the active instance via workspaceManager to stay in sync with InstanceToolsTab
   * Uses pane-scoped setter in tile mode, global setter otherwise
   * @param {string|object} viewOrId - View object with id property, or view ID string
   * @param {string} [paneId] - Optional pane ID for scoped focus (tile mode)
   */
  const handleSelectView = useCallback(
    (viewOrId, paneId = null) => {
      // Support both view object and view ID
      const viewId = typeof viewOrId === "string" ? viewOrId : viewOrId?.id;
      if (!viewId) {
        log.debug("ViewContext: Clear active view");
        workspaceManager?.setActiveInstance?.(null);
        window.dispatchEvent(
          new CustomEvent("cia:active-instance-changed", {
            detail: { viewId: null, instanceId: null, paneId: null },
          })
        );
        return;
      }

      log.debug("ViewContext: Select view", viewId, "paneId:", paneId);

      // Determine effective pane ID - use provided, or fall back to focused pane
      const effectivePaneId = paneId || workspaceManager?.getFocusedPaneId?.();

      // Find the instance by viewConfigId and set it as active
      const instance = workspaceManager?.getInstanceByViewConfigId?.(viewId);
      if (instance?.instanceId) {
        // Use pane-scoped setter if we have a pane ID (tile mode)
        if (effectivePaneId) {
          workspaceManager.setActiveInstanceForPane(effectivePaneId, instance.instanceId);
          log.debug(`ViewContext: Set active instance for pane ${effectivePaneId}: ${instance.instanceId}`);
          // Only set global if this pane is focused (avoid cross-pane interference in tile mode)
          if (workspaceManager.getFocusedPaneId?.() === effectivePaneId) {
            workspaceManager.setActiveInstance(instance.instanceId);
          }
        } else {
          // No pane context (tab mode) - set global directly
          workspaceManager.setActiveInstance(instance.instanceId);
        }
      }

      // Find the view's position and navigate to it
      const view = onCanvasViews.find((v) => v.id === viewId);
      if (view?.position) {
        navigateToCell(view.position.row, view.position.col);
      }

      // Emit events for other components
      eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId, paneId: effectivePaneId });
      window.dispatchEvent(
        new CustomEvent("cia:instance-focused", {
          detail: {
            viewId,
            instanceId: instance?.instanceId,
            paneId: effectivePaneId,
            canvasId: effectivePaneId,
          },
        })
      );
    },
    [onCanvasViews, navigateToCell]
  );

  /**
   * Place a view on the canvas.
   * Delegates to ViewLifecycleService which handles:
   * - Flow-aware position finding (viewport first, then rest of canvas)
   * - Auto-expansion when canvas is full
   * - Smart viewport navigation (minimal shift)
   *
   * @param {string} viewId - View configuration ID to place
   * @param {string} [paneId] - Optional pane ID for scoped focus (tile mode)
   */
  const handlePlaceView = useCallback(
    async (viewId, paneId = null) => {
      log.debug("ViewContext: Place view", viewId, "paneId:", paneId);

      // Determine effective pane ID
      const effectivePaneId = paneId || workspaceManager?.getFocusedPaneId?.();

      try {
        // Import dynamically to avoid circular dependencies
        const { viewLifecycleService } = await import("@Services/ViewLifecycleService.js");
        await viewLifecycleService.placeView(viewId);

        // Set the placed view as active
        const instance = workspaceManager?.getInstanceByViewConfigId?.(viewId);
        if (instance?.instanceId) {
          // Use pane-scoped setter if we have a pane ID (tile mode)
          if (effectivePaneId) {
            workspaceManager.setActiveInstanceForPane(effectivePaneId, instance.instanceId);
            // Only set global if this pane is focused (avoid cross-pane interference)
            if (workspaceManager.getFocusedPaneId?.() === effectivePaneId) {
              workspaceManager.setActiveInstance(instance.instanceId);
            }
          } else {
            // No pane context (tab mode) - set global directly
            workspaceManager.setActiveInstance(instance.instanceId);
          }
        }
      } catch (error) {
        log.error("ViewContext: Failed to place view", error);
        window.dispatchEvent(new CustomEvent("cia:error", {
          detail: { message: `Failed to place view: ${error.message}` }
        }));
      }
    },
    []
  );

  /**
   * Remove a view from the canvas
   * Uses logic.removePlacement from LayoutPanelContext
   */
  const handleRemoveView = useCallback(
    async (viewId) => {
      // Find the placement with this view
      const placement = cells.find(
        (cell) => cell.viewConfigurationId === viewId || cell.id === viewId
      );

      if (placement && logic.removePlacement) {
        await logic.removePlacement(placement.id);
      }
    },
    [cells, logic]
  );

  /**
   * Handle view actions (remove, place, create)
   */
  const handleViewAction = useCallback(
    (action, view) => {
      switch (action) {
        case "remove":
          if (view?.id) handleRemoveView(view.id);
          break;
        case "place":
          if (view?.id) handlePlaceView(view.id);
          break;
        case "create":
          window.dispatchEvent(new CustomEvent("open:create-view"));
          break;
        default:
          break;
      }
    },
    [handleRemoveView, handlePlaceView]
  );

  /**
   * Handle subset change - update which views are in the subset
   */
  const handleSubsetChange = useCallback((newSubsetIds) => {
    log.debug("ViewContext: Subset changed", newSubsetIds);
    setSubsetIds(newSubsetIds);
  }, []);

  /**
   * Handle link update - update link configuration for a view
   * Uses ViewConfigurationManager methods for proper sync and persistence
   * @param {string} linkType - Type of link (camera, filters, cursors, widgets, colorMaps, annotationDisplay)
   * @param {string|null} targetViewId - Target view ID or null to remove link
   * @param {string} direction - Link direction (bidirectional, follow, broadcast)
   */
  const handleUpdateLink = useCallback(
    (linkType, targetViewId, direction) => {
      const viewId = activeView?.id;
      if (!viewId) return;

      log.debug("ViewContext: Update link", {
        viewId,
        linkType,
        targetViewId,
        direction,
      });

      // Get the ViewConfigurationManager
      const vcm = getViewConfigurationManager?.();
      if (!vcm) {
        log.warn("ViewContext: ViewConfigurationManager not available");
        return;
      }

      // Map UI direction names to LINK_MODES
      const directionToMode = {
        bidirectional: "bidirectional",
        follow: "follow",
        broadcast: "broadcast",
      };
      const linkMode = directionToMode[direction] || "bidirectional";

      try {
        // If targetViewId is null, unlink the property
        if (targetViewId === null) {
          // Use ViewConfigurationManager's unlinkProperty for proper sync
          vcm.unlinkProperty(viewId, linkType);
          log.debug("ViewContext: Unlinked", linkType);
        } else {
          // Use ViewConfigurationManager's linkProperty for proper sync
          // This handles: creating link, registering observers, applying initial state, syncing to server
          vcm.linkProperty(viewId, linkType, targetViewId, linkMode);
          log.debug("ViewContext: Linked", linkType, "to", targetViewId, "mode:", linkMode);
        }
      } catch (error) {
        log.error("ViewContext: Failed to update link", error);
      }

      // Update local state for UI
      setViewLinks((prev) => {
        const viewLinksData = prev[viewId] || {};

        // If targetViewId is null, remove the link
        if (targetViewId === null) {
          const { [linkType]: removed, ...rest } = viewLinksData;
          return {
            ...prev,
            [viewId]: rest,
          };
        }

        // Set or update the link
        return {
          ...prev,
          [viewId]: {
            ...viewLinksData,
            [linkType]: {
              target: targetViewId,
              direction: direction || "bidirectional",
            },
          },
        };
      });

      // Emit event for other components to react
      eventBus.emit(BUS_EVENTS.VIEW_LINK_CHANGED, {
        viewId,
        linkType,
        targetViewId,
        direction,
      });
    },
    [activeView?.id]
  );

  // =========================================================================
  // RETURN API
  // =========================================================================

  return {
    // Navigation props
    canvasPosition,
    isAtOrigin,
    onNavigate: handleNavigate,
    onHome: handleHome,
    onBookmark: handleBookmark,

    // View props
    activeView,
    onCanvasViews,
    availableViews,
    onSelectView: handleSelectView,
    onPlaceView: handlePlaceView,
    onViewAction: handleViewAction,

    // Subset props
    subsetIds,
    onSubsetChange: handleSubsetChange,

    // Link props
    onUpdateLink: handleUpdateLink,
  };
}

export default useViewContextLogic;
