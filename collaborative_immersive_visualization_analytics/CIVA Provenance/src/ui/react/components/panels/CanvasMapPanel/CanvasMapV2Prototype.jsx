/**
 * @file CanvasMapV2Prototype.jsx
 * @description Standalone Canvas Map V2 prototype using mock data (for Storybook)
 */

import React, { memo, useMemo, useRef, useCallback } from 'react';
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { useCanvasMapState } from './hooks/useCanvasMapState';
import { ModeTabs } from './components/ModeTabs';
import { MapToolbar } from './components/MapToolbar';
import { Minimap } from './components/Minimap';
import { QuickNavToolbar } from './components/QuickNavToolbar';
import { CompanionPanel } from './components/CompanionPanel';
import { NavigatePanel, LayoutPanel, LinksPanel, TeamPanel } from './components/ContextualPanels';
import { MAP_MODES, SIZE_MODE_BREAKPOINTS } from './utils/constants';
import { getVGDisplayName } from './utils/gridUtils';
import './CanvasMapPanel.scss';

const MOCK_CANVAS = { rows: 10, cols: 10, homePosition: { row: 0, col: 0 } };

const MOCK_VIEWGROUPS = [
  {
    id: 'vg-1',
    name: 'Brain Analysis',
    color: '#a855f7',
    isExplicit: true,
    layoutId: '1+2',
    position: { row: 0, col: 0, rowSpan: 3, colSpan: 4 },
    views: [
      { id: 'v-1', type: 'volume', name: 'Main Volume' },
      { id: 'v-2', type: 'slice', name: 'Axial Slice' },
      { id: 'v-3', type: 'stats', name: 'ROI Statistics' },
    ],
    isActive: true,
    isLinked: true,
    isShared: true,
    isStarred: true,
    tags: ['brain', 'mri'],
  },
  {
    id: 'vg-2',
    name: 'Data Explorer',
    color: '#22c55e',
    isExplicit: true,
    layoutId: 'side-by-side',
    position: { row: 0, col: 5, rowSpan: 2, colSpan: 4 },
    views: [
      { id: 'v-4', type: 'chart', name: 'Timeline Chart' },
      { id: 'v-5', type: 'table', name: 'Data Table' },
    ],
    isActive: true,
    isLinked: false,
    isShared: false,
    isStarred: false,
    tags: ['analysis'],
  },
  {
    id: 'vg-3',
    name: 'Heart Mesh',
    color: '#ef4444',
    isExplicit: false,
    layoutId: 'single',
    position: { row: 4, col: 1, rowSpan: 3, colSpan: 3 },
    views: [
      { id: 'v-6', type: 'mesh', name: 'Heart 3D Model' },
    ],
    isActive: true,
    isLinked: true,
    isShared: true,
    isStarred: false,
    tags: ['cardiac'],
  },
  {
    id: 'vg-4',
    name: 'Reference Images',
    color: '#f59e0b',
    isExplicit: true,
    layoutId: '2x2',
    position: { row: 5, col: 5, rowSpan: 4, colSpan: 4 },
    views: [
      { id: 'v-7', type: 'image', name: 'X-Ray Chest' },
      { id: 'v-8', type: 'image', name: 'CT Slice' },
      { id: 'v-9', type: 'image', name: 'MRI T1' },
      { id: 'v-10', type: 'annotation', name: 'Clinical Notes' },
    ],
    isActive: false,
    isLinked: false,
    isShared: false,
    isStarred: true,
    tags: ['ct', 'mri', 'reference'],
  },
];

const MOCK_DATASETS = [
  { id: 'ds-1', name: 'brain_scan_001.nii', type: 'nifti', size: '52 MB', isLoaded: true },
  { id: 'ds-2', name: 'patient_metrics.csv', type: 'csv', size: '1.2 MB', isLoaded: true },
  { id: 'ds-3', name: 'heart_mesh.vtk', type: 'vtk', size: '15 MB', isLoaded: true },
  { id: 'ds-4', name: 'xray_chest.png', type: 'image', size: '2 MB', isLoaded: false },
  { id: 'ds-5', name: 'ct_series.dcm', type: 'dicom', size: '125 MB', isLoaded: false },
];

const MOCK_BOOKMARKS = [
  { id: 'bm-1', name: 'Brain Overview', position: { row: 0, col: 0 }, isStarred: true, isActive: true },
  { id: 'bm-2', name: 'Heart Detail', position: { row: 4, col: 1 }, isStarred: false, isActive: true },
  { id: 'bm-3', name: 'Reference Gallery', position: { row: 5, col: 5 }, isStarred: true, isActive: true },
];

const MOCK_VG_LINKS = [
  { id: 'link-1', from: 'vg-1', to: 'vg-3', type: 'camera', mode: 'bidirectional' },
  { id: 'link-2', from: 'vg-1', to: 'vg-2', type: 'filter', mode: 'unidirectional' },
];

const MOCK_VIEWPORTS = [
  { id: 'main', name: 'Main', position: { row: 0, col: 0 }, size: { rows: 5, cols: 5 }, isPrimary: true },
];

const MOCK_COLLABORATORS = [
  { id: 'u-1', name: 'Alice Chen', color: '#22c55e', avatar: 'AC', viewport: { row: 2, col: 3, rows: 2, cols: 2 }, cursor: { row: 2.5, col: 4.2, rowOffset: 0.5, colOffset: 0.2 }, isOnline: true, isBroadcasting: true },
  { id: 'u-2', name: 'Bob Smith', color: '#3b82f6', avatar: 'BS', viewport: { row: 5, col: 5, rows: 2, cols: 2 }, cursor: { row: 6.1, col: 7.3, rowOffset: 0.1, colOffset: 0.3 }, isOnline: true, isBroadcasting: false },
  { id: 'u-3', name: 'Carol Davis', color: '#f59e0b', avatar: 'CD', viewport: null, cursor: null, isOnline: false, isBroadcasting: false },
];

const COMPANION_WIDTHS = { compact: 140, standard: 160 };
const QUICK_NAV_WIDTH = 40;
const MINIMAP_PADDING = 8;

export const CanvasMapV2Prototype = memo(function CanvasMapV2Prototype({
  width = 420,
  height = 620,
  sizeMode: panelSizeMode,
}) {
  const minimapContainerRef = useRef(null);

  const viewGroups = useMemo(() => MOCK_VIEWGROUPS, []);
  const inactiveVGs = useMemo(() => viewGroups.filter(vg => !vg.position), [viewGroups]);
  const activeViewGroups = useMemo(() => viewGroups.filter(vg => vg.position), [viewGroups]);

  const state = useCanvasMapState({
    canvas: MOCK_CANVAS,
    viewGroups: activeViewGroups,
    inactiveVGs,
    viewports: MOCK_VIEWPORTS,
    collaborators: MOCK_COLLABORATORS,
    vgLinks: MOCK_VG_LINKS,
    viewLinks: [],
    bookmarks: MOCK_BOOKMARKS,
    callbacks: {},
  });

  const vgQuickFilters = useMemo(() => ([
    { id: 'active', label: 'Active', icon: 'checkCircle', predicate: (vg) => vg.isActive },
    { id: 'linked', label: 'Linked', icon: 'link2', predicate: (vg) => vg.isLinked },
    { id: 'shared', label: 'Shared', icon: 'share2', predicate: (vg) => vg.isShared },
    { id: 'starred', label: 'Starred', icon: 'star', predicate: (vg) => vg.isStarred },
  ]), []);

  const vgFilter = useListFilter({
    searchFields: (vg) => [
      getVGDisplayName(vg),
      ...(vg.views || []).map(v => v.name || ''),
    ],
    quickFilterDefs: vgQuickFilters,
  });

  const filteredViewGroups = useMemo(
    () => vgFilter.applyFilters(viewGroups),
    [viewGroups, vgFilter.applyFilters]
  );

  const filteredActiveViewGroups = useMemo(
    () => filteredViewGroups.filter(vg => vg.position),
    [filteredViewGroups]
  );

  const filteredInactiveVGs = useMemo(
    () => filteredViewGroups.filter(vg => !vg.position),
    [filteredViewGroups]
  );

  const quickFilterCounts = useMemo(() => {
    return vgQuickFilters.reduce((acc, def) => {
      acc[def.id] = viewGroups.filter(def.predicate).length;
      return acc;
    }, {});
  }, [viewGroups, vgQuickFilters]);

  const minimapVgLinks = useMemo(() => {
    const visibleIds = new Set(filteredActiveViewGroups.map(vg => vg.id));
    return MOCK_VG_LINKS.filter(link => visibleIds.has(link.from) && visibleIds.has(link.to));
  }, [filteredActiveViewGroups]);

  const filteredActiveIds = useMemo(() => {
    return new Set(filteredActiveViewGroups.map(vg => vg.id));
  }, [filteredActiveViewGroups]);

  const filteredFlattenedViews = useMemo(() => {
    return (state.flattenedViews || []).filter(view => filteredActiveIds.has(view.vgId));
  }, [state.flattenedViews, filteredActiveIds]);

  const effectiveWidth = width - (state.companionOpen ? COMPANION_WIDTHS.standard : 0);
  const effectiveSizeMode = (() => {
    if (!Number.isFinite(effectiveWidth)) return panelSizeMode || 'standard';
    if (effectiveWidth < SIZE_MODE_BREAKPOINTS.compact) return 'compact';
    if (effectiveWidth >= SIZE_MODE_BREAKPOINTS.expanded) return 'expanded';
    return 'standard';
  })();

  const isCompact = effectiveSizeMode === 'compact';
  const companionWidth = state.companionOpen
    ? (isCompact ? COMPANION_WIDTHS.compact : COMPANION_WIDTHS.standard)
    : 0;

  const quickNavWidth = state.toolbarPosition ? QUICK_NAV_WIDTH : 0;
  const minimapWidth = Math.max(0, width - quickNavWidth - companionWidth - MINIMAP_PADDING * 2);

  const headerHeight = state.focusedVGId ? 40 : 0;
  const tabsHeight = 40;
  const toolbarHeight = 40;
  const chromeHeight = headerHeight + tabsHeight + toolbarHeight;
  const contentHeight = Math.max(0, height - chromeHeight);

  const isShort = height < 520;
  const minContextualHeight = isCompact ? 130 : (isShort ? 150 : 180);
  const minMinimapHeight = isShort ? 120 : 150;

  let minimapHeight = Math.max(minMinimapHeight, Math.floor(contentHeight * 0.55));
  if (contentHeight - minimapHeight < minContextualHeight) {
    minimapHeight = Math.max(minMinimapHeight, contentHeight - minContextualHeight);
  }

  const minimapInnerHeight = Math.max(0, minimapHeight - MINIMAP_PADDING * 2);
  const contextualHeight = Math.max(minContextualHeight, contentHeight - minimapHeight);
  const densityMode = isShort || isCompact ? 'dense' : 'standard';

  const allViews = useMemo(() => {
    return activeViewGroups.flatMap(vg =>
      (vg.views || []).map(v => ({
        ...v,
        vgId: vg.id,
        vgName: vg.name || getVGDisplayName(vg),
        vgColor: vg.color,
      }))
    );
  }, [activeViewGroups]);

  const handleGoHome = useCallback(() => {
    console.log('Go home');
  }, []);

  const handleSetHome = useCallback(() => {
    console.log('Set home');
  }, []);

  const handleFitAll = useCallback(() => {
    console.log('Fit all');
  }, []);

  const handleAddBookmark = useCallback(() => {
    console.log('Add bookmark');
  }, []);

  const handleAddVG = useCallback(() => {
    console.log('Add ViewGroup');
  }, []);

  return (
    <div
      className={`canvas-map-v2 canvas-map-v2--${state.mapMode}`}
      data-size-mode={effectiveSizeMode}
      data-density={densityMode}
      style={{ width, height }}
    >
      {state.focusedVGId && state.focusedVG && (
        <div className="canvas-map-v2__breadcrumb" style={{ '--vg-color': state.focusedVG.color }}>
          <button className="canvas-map-v2__breadcrumb-back" onClick={state.handleBackFromFocus}>
            Canvas
          </button>
          <span className="canvas-map-v2__breadcrumb-sep">›</span>
          <div className="canvas-map-v2__breadcrumb-current">
            <div className="canvas-map-v2__breadcrumb-dot" style={{ background: state.focusedVG.color }} />
            <span style={{ color: state.focusedVG.color }}>
              {getVGDisplayName(state.focusedVG)}
            </span>
          </div>
        </div>
      )}

      <ModeTabs
        activeMode={state.mapMode}
        onModeChange={state.handleModeChange}
        sizeMode={effectiveSizeMode}
      />

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
        toggleShowViewports={state.toggleShowViewports}
        toggleShowCollaborators={state.toggleShowCollaborators}
        toggleShowBookmarks={state.toggleShowBookmarks}
        toggleShowInternals={state.toggleShowInternals}
        toggleShowViews={state.toggleShowViews}
        toggleShowVGs={state.toggleShowVGs}
        onAddVG={handleAddVG}
        sizeMode={effectiveSizeMode}
      />

      <div className="canvas-map-v2__body">
        <div className="canvas-map-v2__minimap-row" style={{ height: minimapHeight }}>
          {state.toolbarPosition === 'left' && (
            <div className="canvas-map-v2__quicknav">
              <QuickNavToolbar
                position="left"
                onGoHome={handleGoHome}
                onSetHome={handleSetHome}
                onFitAll={handleFitAll}
                onAddBookmark={handleAddBookmark}
              />
            </div>
          )}

          <div className="canvas-map-v2__minimap-shell" ref={minimapContainerRef}>
            <div className="canvas-map-v2__minimap-container">
              <Minimap
                canvas={MOCK_CANVAS}
                viewGroups={filteredActiveViewGroups}
                viewports={MOCK_VIEWPORTS}
                collaborators={MOCK_COLLABORATORS}
                vgLinks={minimapVgLinks}
                bookmarks={MOCK_BOOKMARKS}
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
                selectedViewportId={state.selectedViewportId}
                highlightedLinkId={state.highlightedLinkId}
                onVGClick={state.handleVGClick}
                onVGDoubleClick={state.handleVGDoubleClick}
                onLinkClick={state.handleLinkClick}
                containerWidth={minimapWidth}
                containerHeight={minimapInnerHeight}
                companionOpen={state.companionOpen}
                companionWidth={companionWidth}
              />
            </div>
          </div>

          {state.toolbarPosition === 'right' && (
            <div className="canvas-map-v2__quicknav canvas-map-v2__quicknav--right">
              <QuickNavToolbar
                position="right"
                onGoHome={handleGoHome}
                onSetHome={handleSetHome}
                onFitAll={handleFitAll}
                onAddBookmark={handleAddBookmark}
              />
            </div>
          )}

          <CompanionPanel
            isOpen={state.companionOpen}
            activeTab={state.companionTab}
            onTabChange={state.setCompanionTab}
            views={allViews}
            datasets={MOCK_DATASETS}
            onViewClick={(view) => state.handleVGClick(view.vgId)}
            onDatasetClick={(dataset) => console.log('Dataset clicked:', dataset)}
            sizeMode={effectiveSizeMode}
          />
        </div>

        <div className="canvas-map-v2__panel" style={{ minHeight: contextualHeight }}>
          {state.mapMode === MAP_MODES.NAVIGATE && !state.focusedVGId && (
            <NavigatePanel
              bookmarks={MOCK_BOOKMARKS}
              filteredBookmarks={state.filteredBookmarks}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              onGoHome={handleGoHome}
              onSetHome={handleSetHome}
              onFitAll={handleFitAll}
              onAddBookmark={handleAddBookmark}
              onBookmarkClick={(bookmark) => console.log('Bookmark', bookmark)}
              onBookmarkDelete={(id) => console.log('Delete bookmark', id)}
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
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              filter={vgFilter}
              quickFilterDefs={vgQuickFilters}
              quickFilterCounts={quickFilterCounts}
              onVGClick={state.handleVGClick}
              onVGDoubleClick={state.handleVGDoubleClick}
              onVGRestore={(id) => console.log('Restore', id)}
              onAddVG={handleAddVG}
              sizeMode={effectiveSizeMode}
            />
          )}

          {state.mapMode === MAP_MODES.LINKS && (
            <LinksPanel
              linksSubTab={state.linksSubTab}
              vgLinks={minimapVgLinks}
              viewLinks={[]}
              viewGroups={filteredActiveViewGroups}
              allViews={allViews}
              highlightedLinkId={state.highlightedLinkId}
              onLinkClick={state.handleLinkClick}
              sizeMode={effectiveSizeMode}
            />
          )}

          {state.mapMode === MAP_MODES.TEAM && (
            <TeamPanel
              collaborateSubTab={state.collaborateSubTab}
              viewports={MOCK_VIEWPORTS}
              selectedViewportId={state.selectedViewportId}
              collaborators={MOCK_COLLABORATORS}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              showCursors={state.showCursors}
              myCursorVisible={state.myCursorVisible}
              myCursorColor={state.myCursorColor}
              onViewportClick={state.handleViewportClick}
              onFollow={(userId) => console.log('Follow', userId)}
              onLocate={(userId) => console.log('Locate', userId)}
              onStartBroadcast={() => console.log('Broadcast on')}
              onStopBroadcast={() => console.log('Broadcast off')}
              onToggleShowCursors={state.toggleShowCursors}
              onToggleMyCursorVisible={state.toggleMyCursorVisible}
              onChangeMyCursorColor={state.setMyCursorColor}
              onToggleCollaboratorCursor={state.toggleCollaboratorCursor}
              sizeMode={effectiveSizeMode}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default CanvasMapV2Prototype;
