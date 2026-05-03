/**
 * @file CanvasMapContent.jsx
 * @description Canvas Map Panel V2 content component
 *
 * Primary Functions:
 * - Navigate the infinite canvas
 * - Manage ViewGroups (create, edit, merge, split, link)
 * - Visualize and follow collaborators with cursor tracking
 * - Understand linking relationships between VGs and Views
 *
 * V2 Features:
 * - Minimap + companion panel for quick actions
 * - Companion panel for Views & Datasets
 * - Pannable minimap for large canvases
 * - Real-time cursor tracking for collaborators
 */

import React, { memo, useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { useWorkspacePresence } from '@UI/react/hooks/useRoomPresence';
import { useBookmarks } from '@UI/react/hooks/useBookmarks';
import { useCanvas } from '@UI/react/hooks/useCanvas';
import { useListFilter } from '@UI/react/hooks/useListFilter';

// V2 Components
import { MapToolbar } from './components/MapToolbar';
import { Minimap } from './components/Minimap';
import { CanvasMapBottomPanel } from './components/BottomPanel/CanvasMapBottomPanel';
import { ViewportsPanel, LayoutPanel, TeamPanel } from './components/ContextualPanels';

// Hooks and Utils
import { useCanvasMapState } from './hooks/useCanvasMapState';
import { MAP_MODES, SIZE_MODE_BREAKPOINTS, LAYOUTS } from './utils/constants';
import { formatCellRef, getVGDisplayName } from './utils/gridUtils';
import { addCustomTemplate, createTemplateFromViewGroup } from '@Core/viewgroups/templates';

// Styles - Component styles are imported by each component
import './CanvasMapPanel.scss';

/**
 * CanvasMapContent - V2 Content for the Canvas Map panel
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Workspace ID for loading data
 * @param {number} props.width - Current panel width
 * @param {number} props.height - Current panel height
 * @param {string} props.sizeMode - 'compact' | 'standard' | 'expanded'
 */
export const CanvasMapContent = memo(function CanvasMapContent({
  workspaceId,
  width,
  height,
  sizeMode: panelSizeMode,
}) {
  const { isVR } = useAdaptive();
  const canvasMapContext = useCanvasMap();
  const minimapContainerRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load real data from hooks
  // ---------------------------------------------------------------------------

  // Canvas data
  const { canvas, viewport, setCanvasSize } = useCanvas();

  // ViewGroups
  const {
    viewGroups: rawViewGroups,
    visibleViewGroups,
    isLoading: vgLoading,
    createViewGroup,
    updateViewGroup,
  } = useViewGroups(workspaceId);

  // Collaborators
  const { users: rawCollaborators } = useWorkspacePresence(workspaceId);

  // Bookmarks
  const {
    bookmarks: rawBookmarks,
    isLoading: bookmarksLoading,
  } = useBookmarks({ workspaceId, scope: 'all' });

  // ---------------------------------------------------------------------------
  // Transform data to match expected structure
  // ---------------------------------------------------------------------------

  // Transform canvas data
  const canvasData = useMemo(() => ({
    rows: canvas?.dimensions?.rows || 4,
    cols: canvas?.dimensions?.cols || 4,
    homePosition: { row: 0, col: 0 }, // TODO: Get from user preferences
  }), [canvas]);

  // Transform ViewGroups to expected structure
  const viewGroups = useMemo(() => {
    return (visibleViewGroups || []).map(vg => {
      const canvasPosition = vg.getCanvasPosition?.()
        || vg.canvasPosition
        || vg.position
        || (vg.row !== undefined ? {
          row: vg.row,
          col: vg.col,
          rowSpan: vg.rowSpan,
          colSpan: vg.colSpan,
        } : null);

      const normalizedPosition = canvasPosition
        ? {
          row: canvasPosition.row ?? 0,
          col: canvasPosition.col ?? 0,
          rowSpan: canvasPosition.rowSpan ?? 1,
          colSpan: canvasPosition.colSpan ?? 1,
        }
        : null;

      return ({
        id: vg.id,
        name: vg.name,
        color: vg.color || '#a855f7',
        isExplicit: !!vg.name,
        isActive: normalizedPosition?.row !== undefined && normalizedPosition?.col !== undefined,
        isLinked: !!vg.link,
        isShared: vg.isShared ?? (vg.sharedWith?.length > 0),
        isStarred: vg.isStarred ?? vg.starred ?? false,
        layoutId: vg.layout?.type || 'single',
        type: vg.layout?.type || 'single',
        tags: vg.tags || [],
        position: normalizedPosition,
        views: (vg.views || vg.getViews?.() || vg.slots || [])
          .filter((view) => view && (view.id || view.viewId))
          .map((view) => ({
            id: view.id || view.viewId,
            name: view.name || view.viewName,
            type: view.type || view.viewType,
            datasetId: view.datasetId,
            datasetName: view.datasetName,
          })),
        link: vg.link,
      });
    });
  }, [visibleViewGroups]);

  const vgTypeCategories = useMemo(() => ([
    {
      id: 'layout',
      label: 'Layout',
      icon: 'grid3x3',
      types: Object.keys(LAYOUTS).map((layoutId) => ({
        id: layoutId,
        label: layoutId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    },
  ]), []);

  const vgQuickFilters = useMemo(() => ([
    { id: 'active', label: 'Active', icon: 'checkCircle', predicate: (vg) => vg.isActive },
    { id: 'linked', label: 'Linked', icon: 'link2', predicate: (vg) => vg.isLinked },
    { id: 'shared', label: 'Shared', icon: 'share2', predicate: (vg) => vg.isShared },
    { id: 'starred', label: 'Starred', icon: 'star', predicate: (vg) => vg.isStarred },
  ]), []);

  const vgSortOptions = useMemo(() => ([
    {
      value: 'position',
      label: 'Position (A1->)',
      shortLabel: 'Position',
      icon: 'grid3x3',
      comparator: (a, b) => {
        const ap = (a.position?.row ?? 99) * 100 + (a.position?.col ?? 99);
        const bp = (b.position?.row ?? 99) * 100 + (b.position?.col ?? 99);
        return ap - bp;
      },
    },
    {
      value: 'name-asc',
      label: 'Name (A->Z)',
      shortLabel: 'Name',
      icon: 'sort',
      comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      value: 'name-desc',
      label: 'Name (Z->A)',
      shortLabel: 'Name',
      icon: 'sort',
      comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
    },
  ]), []);

  const viewGroupTags = useMemo(
    () => Array.from(new Set(viewGroups.flatMap((vg) => vg.tags || []))).filter(Boolean),
    [viewGroups]
  );

  const vgFilter = useListFilter({
    searchFields: (vg) => [
      getVGDisplayName(vg),
      ...(vg.views || []).map((v) => v.name || ''),
    ],
    quickFilterDefs: vgQuickFilters,
    sortOptions: vgSortOptions,
    persistKey: workspaceId ? `canvasmap-vg-filters:${workspaceId}` : null,
  });

  const filteredViewGroups = useMemo(
    () => vgFilter.applyFilters(viewGroups),
    [viewGroups, vgFilter.applyFilters]
  );

  const quickFilterCounts = useMemo(() => {
    return vgQuickFilters.reduce((acc, def) => {
      acc[def.id] = viewGroups.filter(def.predicate).length;
      return acc;
    }, {});
  }, [viewGroups, vgQuickFilters]);

  // Get inactive VGs (no position)
  const inactiveVGs = useMemo(() => {
    return viewGroups.filter(vg => !vg.position);
  }, [viewGroups]);

  // Get active VGs (have position)
  const activeViewGroups = useMemo(() => {
    return viewGroups.filter(vg => vg.position);
  }, [viewGroups]);

  const filteredActiveViewGroups = useMemo(() => {
    return filteredViewGroups.filter(vg => vg.position);
  }, [filteredViewGroups]);

  const filteredInactiveVGs = useMemo(() => {
    return filteredViewGroups.filter(vg => !vg.position);
  }, [filteredViewGroups]);

  useEffect(() => {
    if (!canvasMapContext) return;
    canvasMapContext.setPlacedVGs(activeViewGroups.map((vg) => vg.id));
  }, [canvasMapContext, activeViewGroups]);

  // Transform viewports from canvas viewport
  const viewports = useMemo(() => {
    if (!viewport) return [];
    return [{
      id: 'primary',
      name: 'Main',
      position: { row: viewport.row || 0, col: viewport.col || 0 },
      size: { rows: viewport.rows || 3, cols: viewport.cols || 3 },
      mode: 'snap',
      isPrimary: true,
    }];
  }, [viewport]);

  const [customViewports, setCustomViewports] = useState([]);
  const [selectedViewportId, setSelectedViewportId] = useState(null);

  useEffect(() => {
    if (viewports.length === 0) return;
    setCustomViewports((prev) => (prev.length ? prev : viewports));
    setSelectedViewportId((prev) => prev ?? viewports[0]?.id ?? null);
  }, [viewports]);

  const currentViewport = customViewports.find((vp) => vp.id === selectedViewportId) || customViewports[0];
  const currentPosition = currentViewport?.position || { row: 0, col: 0 };
  const currentPositionLabel = formatCellRef(currentPosition.row, currentPosition.col);
  const isAtHome =
    currentPosition.row === canvasData.homePosition.row &&
    currentPosition.col === canvasData.homePosition.col;

  // Transform collaborators to expected structure
  const baseCollaborators = useMemo(() => {
    return (rawCollaborators || []).map(user => ({
      id: user.id,
      name: user.name || user.email || 'Unknown',
      avatar: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U',
      color: user.color || '#22c55e',
      viewport: user.position ? {
        row: user.position.row || 0,
        col: user.position.col || 0,
        rows: 2,
        cols: 2,
      } : null,
      cursor: user.cursor ? {
        row: user.cursor.row || 0,
        col: user.cursor.col || 0,
        rowOffset: user.cursor.rowOffset || 0.5,
        colOffset: user.cursor.colOffset || 0.5,
      } : null,
      isBroadcasting: user.isBroadcasting || false,
      isOnline: true,
    }));
  }, [rawCollaborators]);

  // Extract VG links from ViewGroups
  const vgLinks = useMemo(() => {
    const links = [];
    activeViewGroups.forEach(vg => {
      if (vg.link) {
        links.push({
          id: `vgl-${vg.id}`,
          from: vg.link.originatorGroupId,
          to: vg.link.targetGroupId,
          type: vg.link.properties?.includes('camera') ? 'camera' : 'data',
          mode: vg.link.linkMode || 'bidirectional',
        });
      }
    });
    return links;
  }, [activeViewGroups]);

  const minimapVgLinks = useMemo(() => {
    const visibleIds = new Set(filteredActiveViewGroups.map(vg => vg.id));
    return vgLinks.filter(link => visibleIds.has(link.from) && visibleIds.has(link.to));
  }, [vgLinks, filteredActiveViewGroups]);

  // View links (placeholder)
  const viewLinks = useMemo(() => [], []);

  // Transform bookmarks
  const bookmarks = useMemo(() => {
    return (rawBookmarks || []).map(bm => ({
      id: bm.id,
      name: bm.name,
      position: bm.cameraState?.position || { row: 0, col: 0 },
      isStarred: bm.isStarred,
      isPinned: bm.isPinned,
    }));
  }, [rawBookmarks]);

  const [minimapResetSignal, setMinimapResetSignal] = useState(0);

  const handleResetMinimapView = useCallback(() => {
    setMinimapResetSignal((prev) => prev + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize state from hook
  // ---------------------------------------------------------------------------

  const state = useCanvasMapState({
    canvas: canvasData,
    viewGroups: activeViewGroups,
    inactiveVGs,
    viewports: customViewports,
    collaborators: baseCollaborators,
    vgLinks,
    viewLinks,
    bookmarks,
    callbacks: {},
  });

  const filteredActiveIds = useMemo(() => {
    return new Set(filteredActiveViewGroups.map(vg => vg.id));
  }, [filteredActiveViewGroups]);

  const filteredFlattenedViews = useMemo(() => {
    return (state.flattenedViews || []).filter(view => filteredActiveIds.has(view.vgId));
  }, [state.flattenedViews, filteredActiveIds]);

  const collaborators = useMemo(() => {
    return baseCollaborators.map((collab) => ({
      ...collab,
      showCursor: state.collaboratorCursorVisibility?.[collab.id] ?? true,
    }));
  }, [baseCollaborators, state.collaboratorCursorVisibility]);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [followingUser, setFollowingUser] = useState(null);

  // ---------------------------------------------------------------------------
  // Action Handlers (placeholder implementations)
  // ---------------------------------------------------------------------------

  const handleGoHome = useCallback(() => {
    console.log('Go to home position');
    // TODO: Implement navigation to home position
  }, []);

  const handleSetHome = useCallback(() => {
    console.log('Set home position');
    // TODO: Implement setting home position
  }, []);

  const handleFitAll = useCallback(() => {
    console.log('Fit all content');
    // TODO: Implement fit all
  }, []);

  const handleAddBookmark = useCallback(() => {
    console.log('Add bookmark');
    // TODO: Implement add bookmark
  }, []);

  const handleBookmarkClick = useCallback((bookmark) => {
    console.log('Navigate to bookmark:', bookmark);
    // TODO: Implement bookmark navigation
  }, []);

  const handleBookmarkDelete = useCallback((bookmarkId) => {
    console.log('Delete bookmark:', bookmarkId);
    // TODO: Implement bookmark deletion
  }, []);

  const handleAddVG = useCallback(() => {
    console.log('Add ViewGroup');
    // TODO: Implement VG creation
  }, []);

  const handleAdjustRows = useCallback((delta) => {
    if (!setCanvasSize || !canvasData) return;
    const newRows = Math.max(1, canvasData.rows + delta);
    setCanvasSize({ rows: newRows, cols: canvasData.cols });
  }, [setCanvasSize, canvasData]);

  const handleAdjustCols = useCallback((delta) => {
    if (!setCanvasSize || !canvasData) return;
    const newCols = Math.max(1, canvasData.cols + delta);
    setCanvasSize({ rows: canvasData.rows, cols: newCols });
  }, [setCanvasSize, canvasData]);

  const handleCanvasDrop = useCallback(async ({ row, col, data }) => {
    if (!data) return;

    if (data.type === 'vg-place') {
      const targetVG = rawViewGroups.find((vg) => vg.id === data.vgId);
      if (!targetVG || !updateViewGroup) return;

      const position = targetVG.canvasPosition || targetVG.position || {};
      const rowSpan = position.rowSpan || 1;
      const colSpan = position.colSpan || 1;

      try {
        await updateViewGroup(targetVG.id, {
          canvasPosition: { row, col, rowSpan, colSpan },
        });
      } catch (err) {
        console.error('Failed to place ViewGroup:', err);
      }
      return;
    }

    if (data.type === 'template-create') {
      if (!createViewGroup || !updateViewGroup) return;

      try {
        const created = await createViewGroup(data.layoutId || 'single', data.templateId || null);
        if (!created) return;
        await updateViewGroup(created.id, {
          name: data.templateName || created.name,
          color: data.color || created.color,
          canvasPosition: { row, col, rowSpan: 1, colSpan: 1 },
        });
      } catch (err) {
        console.error('Failed to create ViewGroup from template:', err);
      }
    }
  }, [rawViewGroups, createViewGroup, updateViewGroup]);

  const handleVGDoubleClick = useCallback((vgId) => {
    state.handleVGDoubleClick(vgId);
    const viewGroup = viewGroups.find((vg) => vg.id === vgId);
    if (viewGroup) {
      window.dispatchEvent(new CustomEvent('cia:open-vg-editor', {
        detail: { viewGroup, isNewVG: false },
      }));
    }
  }, [state, viewGroups]);

  const handleMove = useCallback((direction) => {
    const delta = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    }[direction];

    if (!delta) return;

    setCustomViewports((prev) =>
      prev.map((vp) => {
        if (vp.id !== selectedViewportId) return vp;
        const nextRow = Math.max(0, vp.position.row + delta.row);
        const nextCol = Math.max(0, vp.position.col + delta.col);
        const maxRow = Math.max(0, canvasData.rows - vp.size.rows);
        const maxCol = Math.max(0, canvasData.cols - vp.size.cols);
        return {
          ...vp,
          position: {
            ...vp.position,
            row: Math.min(nextRow, maxRow),
            col: Math.min(nextCol, maxCol),
          },
        };
      })
    );
  }, [canvasData.cols, canvasData.rows, selectedViewportId]);

  const handleViewportClick = useCallback((viewportId) => {
    setSelectedViewportId(viewportId);
    state.handleViewportClick(viewportId);
  }, [state]);

  const handleAddViewport = useCallback(() => {
    const nextId = `vp-${Date.now()}`;
    setCustomViewports((prev) => {
      const base = prev.find((vp) => vp.id === selectedViewportId) || prev[0];
      const seed = base || {
        id: 'primary',
        name: 'Main',
        position: { row: 0, col: 0 },
        size: { rows: 3, cols: 3 },
        mode: 'snap',
        isPrimary: true,
      };
      const nextViewport = {
        ...seed,
        id: nextId,
        name: `Viewport ${prev.length + 1}`,
        isPrimary: false,
        position: {
          ...seed.position,
          col: Math.min(seed.position.col + 1, Math.max(0, canvasData.cols - seed.size.cols)),
        },
      };
      return [...prev, nextViewport];
    });
    setSelectedViewportId(nextId);
  }, [canvasData.cols, selectedViewportId]);

  const handleDeleteViewport = useCallback((viewportId) => {
    setCustomViewports((prev) => {
      const next = prev.filter((vp) => vp.id !== viewportId);
      if (next.length === 0) return prev;
      setSelectedViewportId((current) =>
        current === viewportId ? next[0]?.id ?? null : current
      );
      return next;
    });
  }, []);

  const handleSetPrimaryViewport = useCallback((viewportId) => {
    setCustomViewports((prev) =>
      prev.map((vp) => ({ ...vp, isPrimary: vp.id === viewportId }))
    );
    setSelectedViewportId(viewportId);
  }, []);

  const handleFollowViewport = useCallback((viewportId) => {
    console.log('Follow viewport:', viewportId);
    // TODO: Implement viewport follow controls
  }, []);

  const handleVGRestore = useCallback((vgId) => {
    console.log('Restore ViewGroup:', vgId);
    // TODO: Implement VG restoration
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (!state.focusedVG) return;
    const template = createTemplateFromViewGroup(state.focusedVG, {
      name: `${getVGDisplayName(state.focusedVG)} Template`,
    });
    addCustomTemplate(template);
  }, [state.focusedVG]);

  const handleFollow = useCallback((userId) => {
    const user = collaborators.find((collab) => collab.id === userId);
    setFollowingUser(user ? { id: user.id, name: user.name, color: user.color } : null);
    console.log('Follow user:', userId);
    // TODO: Implement following
  }, [collaborators]);

  const handleStopFollowing = useCallback(() => {
    setFollowingUser(null);
    console.log('Stop following');
  }, []);

  const handleLocate = useCallback((userId) => {
    console.log('Locate user:', userId);
    // TODO: Implement user location
  }, []);

  const handleJoinVoice = useCallback(() => {
    console.log('Join voice');
    // TODO: Implement join voice
  }, []);

  const handleInvite = useCallback(() => {
    console.log('Invite team');
    // TODO: Implement team invite
  }, []);

  const handleStartBroadcast = useCallback(() => {
    setIsBroadcasting(true);
    console.log('Start broadcasting');
    // TODO: Implement broadcast start
  }, []);

  const handleStopBroadcast = useCallback(() => {
    setIsBroadcasting(false);
    console.log('Stop broadcasting');
    // TODO: Implement broadcast stop
  }, []);

  const QUICK_NAV_WIDTH = 40;
  const MINIMAP_PADDING = 8;

  const effectiveWidth = width;
  const effectiveSizeMode = (() => {
    if (!Number.isFinite(effectiveWidth)) return panelSizeMode || 'standard';
    if (effectiveWidth < SIZE_MODE_BREAKPOINTS.compact) return 'compact';
    if (effectiveWidth >= SIZE_MODE_BREAKPOINTS.expanded) return 'expanded';
    return 'standard';
  })();

  const isCompact = effectiveSizeMode === 'compact';

  // Calculate available heights
  const headerHeight = state.focusedVGId ? 40 : 0;
  const tabsHeight = 40;
  const toolbarHeight = 40;
  const chromeHeight = headerHeight + tabsHeight + toolbarHeight;
  const contentHeight = Math.max(0, height - chromeHeight);

  const isShort = height < 520;
  const minContextualHeight = isCompact ? 180 : (isShort ? 200 : 220);
  const minMinimapHeight = isShort ? 80 : 110;
  const minimapShare = isCompact ? 0.4 : (isShort ? 0.45 : 0.55);

  const contextualFloor = Math.min(
    minContextualHeight,
    Math.max(80, contentHeight - minMinimapHeight)
  );
  const maxMinimapHeight = Math.max(60, contentHeight - contextualFloor);
  const targetMinimapHeight = Math.floor(contentHeight * minimapShare);

  const minimapHeight = Math.max(
    60,
    Math.min(maxMinimapHeight, Math.max(minMinimapHeight, targetMinimapHeight))
  );
  const contextualHeight = Math.max(80, contentHeight - minimapHeight);
  const densityMode = isShort || isCompact ? 'dense' : 'standard';

  // Calculate minimap container dimensions (after minimapHeight is calculated)
  const quickNavWidth = state.toolbarPosition ? QUICK_NAV_WIDTH : 0;
  const minimapWidth = Math.max(0, width - quickNavWidth - MINIMAP_PADDING * 2);
  const minimapInnerHeight = Math.max(0, minimapHeight - MINIMAP_PADDING * 2);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (vgLoading) {
    return (
      <div className="canvas-map-v2" data-vr={isVR} data-size-mode={effectiveSizeMode}>
        <div className="canvas-map-v2__loading">
          Loading canvas data...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`canvas-map-v2 canvas-map-v2--${state.mapMode}`}
      data-vr={isVR}
      data-size-mode={effectiveSizeMode}
      data-density={densityMode}
    >
      {/* Breadcrumb / Back navigation (when focused) */}
      {state.focusedVGId && state.focusedVG && (
        <div
          className="canvas-map-v2__breadcrumb"
          style={{ '--vg-color': state.focusedVG.color }}
        >
          <button
            className="canvas-map-v2__breadcrumb-back"
            onClick={state.handleBackFromFocus}
          >
            <Icon name="chevronLeft" size={14} />
            {!isCompact && 'Canvas'}
          </button>
          <Icon name="chevronRight" size={14} className="canvas-map-v2__breadcrumb-sep" />
          <div className="canvas-map-v2__breadcrumb-current">
            <div
              className="canvas-map-v2__breadcrumb-dot"
              style={{ background: state.focusedVG.color }}
            />
            <span style={{ color: state.focusedVG.color }}>
              {getVGDisplayName(state.focusedVG)}
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <MapToolbar
        mapMode={state.mapMode}
        showViews={state.showViews}
        showVGs={state.showVGs}
        minimapZoom={state.minimapZoom}
        showViewports={state.showViewports}
        showCollaborators={state.showCollaborators}
        showBookmarks={state.showBookmarks}
        showInternals={state.showInternals}
        linksSubTab={state.linksSubTab}
        setLinksSubTab={state.setLinksSubTab}
        collaborateSubTab={state.collaborateSubTab}
        setCollaborateSubTab={state.setCollaborateSubTab}
        onlineCollaboratorsCount={state.onlineCollaboratorsCount}
        onZoomIn={state.handleZoomIn}
        onZoomOut={state.handleZoomOut}
        onResetView={handleResetMinimapView}
        toggleShowViewports={state.toggleShowViewports}
        toggleShowCollaborators={state.toggleShowCollaborators}
        toggleShowBookmarks={state.toggleShowBookmarks}
        toggleShowInternals={state.toggleShowInternals}
        toggleShowViews={state.toggleShowViews}
        toggleShowVGs={state.toggleShowVGs}
        onAddVG={handleAddVG}
        sizeMode={effectiveSizeMode}
      />

      {/* Main Body with Companion Panel beside content */}
      <div className="canvas-map-v2__body">
        {/* Main content column */}
        <div className="canvas-map-v2__main-content">
          <div
            className="canvas-map-v2__minimap-row"
            style={{ height: minimapHeight }}
          >
            <div className="canvas-map-v2__minimap-shell" ref={minimapContainerRef}>
              <div className="canvas-map-v2__minimap-container">
                <Minimap
                  canvas={canvasData}
                  viewGroups={filteredActiveViewGroups}
                  viewports={customViewports}
                  collaborators={collaborators}
                  vgLinks={minimapVgLinks}
                  bookmarks={bookmarks}
                  flattenedViews={filteredFlattenedViews}
                  showViews={state.showViews}
                  showVGs={state.showVGs}
                  mapMode={state.mapMode}
                  focusedVG={state.focusedVG}
                  minimapZoom={state.minimapZoom}
                  showGridLabels
                  showInternals={state.showInternals}
                  showViewports={state.showViewports}
                  showCollaborators={state.showCollaborators}
                  showBookmarks={state.showBookmarks}
                  showCursors={state.showCursors}
                  selectedVGId={state.selectedVGId}
                  selectedViewportId={selectedViewportId}
                  highlightedLinkId={state.highlightedLinkId}
                  onVGClick={state.handleVGClick}
                  onVGDoubleClick={handleVGDoubleClick}
                  onLinkClick={state.handleLinkClick}
                  onDropItem={handleCanvasDrop}
                  containerWidth={minimapWidth}
                  containerHeight={minimapInnerHeight}
                  resetPanSignal={minimapResetSignal}
                />
              </div>
            </div>
          </div>

          <CanvasMapBottomPanel
          mapMode={state.mapMode}
          onModeChange={state.handleModeChange}
          sizeMode={effectiveSizeMode}
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          filter={vgFilter}
          filterConfig={{ sortOptions: vgSortOptions, typeCategories: vgTypeCategories }}
          tagOptions={viewGroupTags}
          quickFilterDefs={vgQuickFilters}
          quickFilterCounts={quickFilterCounts}
          minimapZoom={state.minimapZoom}
          onZoomIn={state.handleZoomIn}
          onZoomOut={state.handleZoomOut}
          onZoomReset={state.handleZoomReset}
          onMove={handleMove}
          onGoHome={handleGoHome}
          onSetHome={handleSetHome}
          onFitAll={handleFitAll}
          onAddBookmark={handleAddBookmark}
          currentPositionLabel={currentPositionLabel}
          isAtHome={isAtHome}
          minHeight={contextualHeight}
          totalVGCount={viewGroups.length}
          activeVGCount={activeViewGroups.length}
          filteredVGCount={filteredViewGroups.length}
        >
          {state.mapMode === MAP_MODES.NAVIGATE && !state.focusedVGId && (
            <ViewportsPanel
              viewports={customViewports}
              selectedViewportId={selectedViewportId}
              onViewportClick={handleViewportClick}
              onFollowViewport={handleFollowViewport}
              onAddViewport={handleAddViewport}
              onAddViewportAndFollow={handleAddViewport}
              isBroadcasting={isBroadcasting}
              followingUser={followingUser}
              onStartBroadcast={handleStartBroadcast}
              onStopBroadcast={handleStopBroadcast}
              sizeMode={effectiveSizeMode}
            />
          )}

          {state.mapMode === MAP_MODES.LAYOUT && (
            <LayoutPanel
              viewGroups={filteredActiveViewGroups}
              filteredVGs={filteredActiveViewGroups}
              inactiveVGs={filteredInactiveVGs}
              selectedVGId={state.selectedVGId}
              focusedVG={state.focusedVG}
              onVGClick={state.handleVGClick}
              onVGDoubleClick={handleVGDoubleClick}
              onVGRestore={handleVGRestore}
              onAddVG={handleAddVG}
              onSaveTemplate={handleSaveTemplate}
              canvasRows={canvasData.rows}
              canvasCols={canvasData.cols}
              onAdjustRows={handleAdjustRows}
              onAdjustCols={handleAdjustCols}
              sizeMode={effectiveSizeMode}
            />
          )}

          {state.mapMode === MAP_MODES.TEAM && (
            <TeamPanel
              collaborateSubTab={state.collaborateSubTab}
              viewports={customViewports}
              selectedViewportId={selectedViewportId}
              collaborators={collaborators}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              isBroadcasting={isBroadcasting}
              followingUser={followingUser}
              showCursors={state.showCursors}
              myCursorVisible={state.myCursorVisible}
              myCursorColor={state.myCursorColor}
              onViewportClick={handleViewportClick}
              onAddViewport={handleAddViewport}
              onDeleteViewport={handleDeleteViewport}
              onSetPrimaryViewport={handleSetPrimaryViewport}
              onFollow={handleFollow}
              onLocate={handleLocate}
              onJoinVoice={handleJoinVoice}
              onInvite={handleInvite}
              onStartBroadcast={handleStartBroadcast}
              onStopBroadcast={handleStopBroadcast}
              onStopFollowing={handleStopFollowing}
              onToggleShowCursors={state.toggleShowCursors}
              onToggleMyCursorVisible={state.toggleMyCursorVisible}
              onChangeMyCursorColor={state.setMyCursorColor}
              onToggleCollaboratorCursor={state.toggleCollaboratorCursor}
              sizeMode={effectiveSizeMode}
            />
          )}
        </CanvasMapBottomPanel>
        </div>
      </div>
    </div>
  );
});

export default CanvasMapContent;
