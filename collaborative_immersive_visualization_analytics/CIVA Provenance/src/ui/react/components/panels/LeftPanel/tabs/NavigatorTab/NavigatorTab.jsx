/**
 * @file NavigatorTab.jsx
 * @description Navigator Tab V5 - Spatial Navigation & View Organization
 *
 * Features:
 * - Three tabs: Map (minimap), Views (view list), Bookmarks
 * - Focus modes: Groups vs Views on minimap
 * - D-pad navigation with home position
 * - Viewport/Canvas size controls
 * - Reuses ViewItem components for consistency
 *
 * Architectural Principle:
 * Navigator handles spatial navigation ONLY.
 * Type-specific controls belong in Instance Tools.
 */

import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { SortDropdown } from '@UI/react/components/molecules/SortDropdown';
import { DirectionalButton } from '@UI/react/components/molecules/DirectionalButton';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { ViewItem, InactiveViewItem, TrashedViewItem } from '@UI/react/components/molecules/ViewItem';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useViewsTab, VIEW_MODES } from '../ViewsTab/hooks/useViewsTab';
import {
  useNavigatorTab,
  TABS,
  FOCUS_MODES,
  formatPosition,
} from './NavigatorTab.logic';
import './NavigatorTab.scss';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Number Spinner for size controls
 */
const NumberSpinner = memo(function NumberSpinner({
  value,
  onChange,
  min = 1,
  max = 10,
  color,
}) {
  const { isVR } = useAdaptive();

  return (
    <div className="navigator-tab__spinner" data-color={color}>
      <button
        className="navigator-tab__spinner-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        data-vr={isVR}
      >
        <Icon name="minus" size={isVR ? 12 : 8} />
      </button>
      <span className="navigator-tab__spinner-value" data-color={color}>
        {value}
      </span>
      <button
        className="navigator-tab__spinner-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        data-vr={isVR}
      >
        <Icon name="plus" size={isVR ? 12 : 8} />
      </button>
    </div>
  );
});

/**
 * D-Pad Navigation Control
 */
const DPadControl = memo(function DPadControl({
  onNavigate,
  onGoHome,
  isAtHome,
  disabled,
}) {
  const { isVR } = useAdaptive();

  return (
    <div className="navigator-tab__dpad">
      <DirectionalButton
        direction="up"
        onClick={() => onNavigate('up')}
        disabled={disabled?.up}
        tooltip="Move Up"
        size={isVR ? 'md' : 'sm'}
        className="navigator-tab__dpad-btn"
      />
      <div className="navigator-tab__dpad-row">
        <DirectionalButton
          direction="left"
          onClick={() => onNavigate('left')}
          disabled={disabled?.left}
          tooltip="Move Left"
          size={isVR ? 'md' : 'sm'}
          className="navigator-tab__dpad-btn"
        />
        <DirectionalButton
          direction="center"
          onClick={onGoHome}
          tooltip="Go to home position"
          size={isVR ? 'md' : 'sm'}
          active={isAtHome}
          className="navigator-tab__dpad-home"
        />
        <DirectionalButton
          direction="right"
          onClick={() => onNavigate('right')}
          disabled={disabled?.right}
          tooltip="Move Right"
          size={isVR ? 'md' : 'sm'}
          className="navigator-tab__dpad-btn"
        />
      </div>
      <DirectionalButton
        direction="down"
        onClick={() => onNavigate('down')}
        disabled={disabled?.down}
        tooltip="Move Down"
        size={isVR ? 'md' : 'sm'}
        className="navigator-tab__dpad-btn"
      />
    </div>
  );
});

/**
 * Display mode constants for minimap
 */
const DISPLAY_MODES = {
  NAMES: 'names',
  NUMBERS: 'numbers',
  COLORS: 'colors',
};

/**
 * Minimap Grid Component - Renders real canvas views
 */
const MinimapGrid = memo(function MinimapGrid({
  canvasSize,
  viewportSize,
  currentPosition,
  homePosition,
  minimapCells,
  displayMode,
  setDisplayMode,
  getCellDisplay,
  isSettingHome,
  onCellClick,
  onViewSelect,
}) {
  const { isVR } = useAdaptive();

  // Cell dimensions
  const CELL_W = isVR ? 40 : 28;
  const CELL_H = isVR ? 32 : 22;
  const GAP = 2;

  return (
    <div className={`navigator-tab__minimap ${isSettingHome ? 'navigator-tab__minimap--setting-home' : ''}`}>
      {/* Display Mode Toggle */}
      <div className="navigator-tab__display-toggles">
        <button
          className={`navigator-tab__display-btn ${displayMode === DISPLAY_MODES.NAMES ? 'navigator-tab__display-btn--active' : ''}`}
          onClick={() => setDisplayMode(DISPLAY_MODES.NAMES)}
          title="Show Names"
        >
          A
        </button>
        <button
          className={`navigator-tab__display-btn ${displayMode === DISPLAY_MODES.NUMBERS ? 'navigator-tab__display-btn--active' : ''}`}
          onClick={() => setDisplayMode(DISPLAY_MODES.NUMBERS)}
          title="Show Numbers"
        >
          #
        </button>
        <button
          className={`navigator-tab__display-btn ${displayMode === DISPLAY_MODES.COLORS ? 'navigator-tab__display-btn--active' : ''}`}
          onClick={() => setDisplayMode(DISPLAY_MODES.COLORS)}
          title="Colors Only"
        >
          ●
        </button>
      </div>

      {isSettingHome && (
        <div className="navigator-tab__minimap-hint">
          <Icon name="target" size={12} />
          <span>Click a cell to set as home</span>
        </div>
      )}
      <div
        className="navigator-tab__minimap-grid"
        style={{
          gridTemplateColumns: `repeat(${canvasSize.cols}, ${CELL_W}px)`,
          gridTemplateRows: `repeat(${canvasSize.rows}, ${CELL_H}px)`,
          gap: GAP,
        }}
      >
        {minimapCells.map(({ row, col, cell, inViewport, isHome, cellIndex, key }) => {
          const color = cell?.color || 'transparent';
          const cellWidth = CELL_W * (cell?.colSpan || 1);

          return (
            <div
              key={key}
              className={`navigator-tab__minimap-cell ${
                cell ? 'navigator-tab__minimap-cell--occupied' : ''
              } ${isHome ? 'navigator-tab__minimap-cell--home' : ''}`}
              style={{
                gridColumn: cell ? `span ${cell.colSpan || 1}` : 'span 1',
                gridRow: cell ? `span ${cell.rowSpan || 1}` : 'span 1',
                '--cell-color': color,
                opacity: inViewport ? 1 : 0.5,
                cursor: isSettingHome ? 'crosshair' : 'pointer',
              }}
              onClick={() => {
                if (cell?.viewId) {
                  onViewSelect?.(cell.viewId);
                }
                onCellClick(row, col, cell);
              }}
            >
              {cell ? (
                <span className="navigator-tab__minimap-cell-text">
                  {getCellDisplay(cell, cellIndex, cellWidth)}
                </span>
              ) : isHome ? (
                <Icon name="home" size={isVR ? 14 : 10} />
              ) : null}
              {isHome && cell && (
                <div className="navigator-tab__minimap-cell-home-dot" />
              )}
            </div>
          );
        })}

        {/* Viewport indicator */}
        <div
          className="navigator-tab__viewport-indicator"
          style={{
            top: currentPosition.row * (CELL_H + GAP),
            left: currentPosition.col * (CELL_W + GAP),
            width: viewportSize.cols * (CELL_W + GAP) - GAP,
            height: viewportSize.rows * (CELL_H + GAP) - GAP,
          }}
        />
      </div>
    </div>
  );
});


/**
 * Bookmarks Panel Content (Bookmarks Tab)
 */
const BookmarksPanel = memo(function BookmarksPanel({
  starredBookmarks,
  unstarredBookmarks,
  viewGroups,
  onLoadBookmark,
  onCreateBookmark,
}) {
  const { isVR } = useAdaptive();

  const getGroupForBookmark = (bm) =>
    viewGroups.find((g) => g.id === bm.viewGroupId);

  return (
    <div className="navigator-tab__bookmarks-panel">
      {/* Scrollable list area */}
      <div className="navigator-tab__bookmarks-list">
        {/* Starred */}
        {starredBookmarks.length > 0 && (
          <>
            <div className="navigator-tab__section-header" data-color="amber">
              <Icon name="star" size={10} />
              STARRED
            </div>
            {starredBookmarks.map((bm) => {
              const group = getGroupForBookmark(bm);
              return (
                <div
                  key={bm.id}
                  className="navigator-tab__bookmark-item"
                  onClick={() => onLoadBookmark?.(bm.id)}
                >
                  <Icon name="starFilled" size={isVR ? 14 : 12} className="navigator-tab__bookmark-star" />
                  <div className="navigator-tab__bookmark-info">
                    <span className="navigator-tab__bookmark-name">
                      {bm.name}
                    </span>
                    <span className="navigator-tab__bookmark-group">
                      <span
                        className="navigator-tab__bookmark-group-dot"
                        style={{ background: group?.color }}
                      />
                      {group?.name || 'Unknown'}
                    </span>
                  </div>
                  <button className="navigator-tab__bookmark-load">
                    <Icon name="play" size={isVR ? 12 : 10} />
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* All Bookmarks */}
        {unstarredBookmarks.length > 0 && (
          <>
            <div
              className="navigator-tab__section-header"
              data-color="muted"
            >
              ALL BOOKMARKS
            </div>
            {unstarredBookmarks.map((bm) => {
              const group = getGroupForBookmark(bm);
              return (
                <div
                  key={bm.id}
                  className="navigator-tab__bookmark-item"
                  onClick={() => onLoadBookmark?.(bm.id)}
                >
                  <Icon name="mapPin" size={isVR ? 14 : 12} className="navigator-tab__bookmark-pin" />
                  <div className="navigator-tab__bookmark-info">
                    <span className="navigator-tab__bookmark-name">
                      {bm.name}
                    </span>
                    <span className="navigator-tab__bookmark-group">
                      <span
                        className="navigator-tab__bookmark-group-dot"
                        style={{ background: group?.color }}
                      />
                      {group?.name || 'Unknown'}
                    </span>
                  </div>
                  <button className="navigator-tab__bookmark-load">
                    <Icon name="play" size={isVR ? 12 : 10} />
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* Empty State */}
        {starredBookmarks.length === 0 && unstarredBookmarks.length === 0 && (
          <div className="navigator-tab__empty">
            <Icon name="bookmark" size={24} />
            <span>No bookmarks yet</span>
          </div>
        )}
      </div>

      {/* Create Bookmark Button - pinned to bottom */}
      <div className="navigator-tab__bookmark-create">
        <button
          className="navigator-tab__bookmark-create-btn"
          onClick={onCreateBookmark}
        >
          <Icon name="plus" size={isVR ? 14 : 12} />
          New Bookmark
        </button>
      </div>
    </div>
  );
});

/**
 * Views Panel Component with search, filters, sorting, and grouping
 */
const ViewsPanel = memo(function ViewsPanel({
  isVR,
  viewsSearchQuery,
  setViewsSearchQuery,
  activeFilters,
  toggleFilter,
  allViews,
  onCanvasViews,
  notPlacedViews,
  recentlyDeletedViews,
  getAvailableViewsForLinking,
  handleSelectView,
  handleRemoveFromCanvas,
  handleTrashView,
  handleRenameView,
  handleNavigateToView,
  handleResizeView,
  handleFocusView,
  handleToggleVisibility,
  handleBookmarkView,
  handleShareView,
  handleOpenTools,
  handleDuplicateView,
  handleRemoveFilter,
  handleLinkPropertyChange,
  handleLinkModeChange,
  handlePlaceView,
  handleRestoreView,
  handlePermanentDelete,
  handleCreateView,
}) {
  // Local state for grouping and sorting
  const [groupMode, setGroupMode] = useState(VIEW_GROUP_MODES.STATUS);
  const [sortOption, setSortOption] = useState('name-asc');

  // Refs for section navigation
  const listRef = useRef(null);
  const sectionRefs = useRef({});

  // Scroll to section handler
  const scrollToSection = useCallback((sectionId) => {
    const sectionEl = sectionRefs.current[sectionId];
    if (sectionEl && listRef.current) {
      sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Group views by dataset
  const viewsByDataset = useMemo(() => {
    const groups = {};
    const combinedViews = [...onCanvasViews, ...notPlacedViews];

    combinedViews.forEach(view => {
      const datasetId = view.datasetId || 'unknown';
      const datasetName = view.datasetName || 'Unknown Dataset';
      if (!groups[datasetId]) {
        groups[datasetId] = {
          id: datasetId,
          name: datasetName,
          color: view.color || '#6b7280',
          views: [],
        };
      }
      groups[datasetId].views.push(view);
    });

    return Object.values(groups);
  }, [onCanvasViews, notPlacedViews]);

  // Sort views based on selected option
  const sortViews = useCallback((views) => {
    return [...views].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'recent':
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        case 'position':
          const posA = a.position ? a.position.row * 100 + a.position.col : 999;
          const posB = b.position ? b.position.row * 100 + b.position.col : 999;
          return posA - posB;
        default:
          return 0;
      }
    });
  }, [sortOption]);

  const sortedOnCanvas = useMemo(() => sortViews(onCanvasViews), [sortViews, onCanvasViews]);
  const sortedNotPlaced = useMemo(() => sortViews(notPlacedViews), [sortViews, notPlacedViews]);

  return (
    <div className="navigator-tab__views-panel">
      {/* Search and Sort Row */}
      <div className="navigator-tab__search-bar">
        <SearchInput
          value={viewsSearchQuery}
          onChange={setViewsSearchQuery}
          placeholder="Search views..."
          size={isVR ? 'md' : 'sm'}
          className="navigator-tab__search-input"
        />
        <SortDropdown
          options={VIEW_SORT_OPTIONS}
          value={sortOption}
          onChange={setSortOption}
          size="sm"
        />
      </div>

      {/* Filter Chips */}
      <div className="navigator-tab__filters">
        <ChipGroup
          chips={VIEW_FILTER_CHIPS}
          activeChips={activeFilters}
          onToggle={toggleFilter}
          size="sm"
        />
      </div>

      {/* Group Mode Toggle + Section Nav */}
      <div className="navigator-tab__group-toggle">
        <span className="navigator-tab__group-toggle-label">Group by:</span>
        <div className="navigator-tab__group-toggle-btns">
          <button
            className={`navigator-tab__group-toggle-btn ${groupMode === VIEW_GROUP_MODES.STATUS ? 'navigator-tab__group-toggle-btn--active' : ''}`}
            onClick={() => setGroupMode(VIEW_GROUP_MODES.STATUS)}
          >
            <Icon name="layers" size={10} />
            Status
          </button>
          <button
            className={`navigator-tab__group-toggle-btn ${groupMode === VIEW_GROUP_MODES.DATASET ? 'navigator-tab__group-toggle-btn--active' : ''}`}
            onClick={() => setGroupMode(VIEW_GROUP_MODES.DATASET)}
          >
            <Icon name="database" size={10} />
            Dataset
          </button>
        </div>
      </div>

      {/* Section Navigation Bar */}
      <div className="navigator-tab__section-nav">
        {groupMode === VIEW_GROUP_MODES.STATUS ? (
          <>
            {sortedOnCanvas.length > 0 && (
              <button
                className="navigator-tab__section-nav-btn"
                data-color="green"
                onClick={() => scrollToSection('on-canvas')}
              >
                <span className="navigator-tab__section-nav-dot" />
                Active
                <span className="navigator-tab__section-nav-count">{sortedOnCanvas.length}</span>
              </button>
            )}
            {sortedNotPlaced.length > 0 && (
              <button
                className="navigator-tab__section-nav-btn"
                data-color="gray"
                onClick={() => scrollToSection('not-placed')}
              >
                <span className="navigator-tab__section-nav-dot" />
                Inactive
                <span className="navigator-tab__section-nav-count">{sortedNotPlaced.length}</span>
              </button>
            )}
            {recentlyDeletedViews.length > 0 && (
              <button
                className="navigator-tab__section-nav-btn"
                data-color="red"
                onClick={() => scrollToSection('deleted')}
              >
                <span className="navigator-tab__section-nav-dot" />
                Deleted
                <span className="navigator-tab__section-nav-count">{recentlyDeletedViews.length}</span>
              </button>
            )}
          </>
        ) : (
          <>
            {viewsByDataset.map((dataset) => (
              <button
                key={dataset.id}
                className="navigator-tab__section-nav-btn"
                data-color="teal"
                onClick={() => scrollToSection(`dataset-${dataset.id}`)}
              >
                <span
                  className="navigator-tab__section-nav-dot"
                  style={{ background: dataset.color }}
                />
                {dataset.name.length > 12 ? dataset.name.slice(0, 12) + '…' : dataset.name}
                <span className="navigator-tab__section-nav-count">{dataset.views.length}</span>
              </button>
            ))}
            {recentlyDeletedViews.length > 0 && (
              <button
                className="navigator-tab__section-nav-btn"
                data-color="red"
                onClick={() => scrollToSection('deleted')}
              >
                <span className="navigator-tab__section-nav-dot" />
                Deleted
                <span className="navigator-tab__section-nav-count">{recentlyDeletedViews.length}</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* View List */}
      <div className="navigator-tab__view-list" ref={listRef}>
        {groupMode === VIEW_GROUP_MODES.STATUS ? (
          <>
            {/* On Canvas Section */}
            {sortedOnCanvas.length > 0 && (
              <>
                <div
                  className="navigator-tab__section-header"
                  data-color="green"
                  ref={(el) => (sectionRefs.current['on-canvas'] = el)}
                >
                  <span className="navigator-tab__section-dot" />
                  ON CANVAS
                  <span className="navigator-tab__section-badge">
                    {sortedOnCanvas.length}
                  </span>
                </div>
                {sortedOnCanvas.map((view) => (
                  <ViewItem
                    key={view.id}
                    view={view}
                    isActive={true}
                    showPosition={true}
                    availableViews={getAvailableViewsForLinking(view.id)}
                    onSelect={handleSelectView}
                    onClose={handleRemoveFromCanvas}
                    onTrash={handleTrashView}
                    onRename={handleRenameView}
                    onNavigate={handleNavigateToView}
                    onSizeChange={(size) => handleResizeView(view.id, size)}
                    onFocus={handleFocusView}
                    onVisibilityToggle={handleToggleVisibility}
                    onBookmark={handleBookmarkView}
                    onShare={handleShareView}
                    onOpenTools={handleOpenTools}
                    onDuplicate={handleDuplicateView}
                    onFilterRemove={(filterId) => handleRemoveFilter(view.id, filterId)}
                    onLinkPropertyChange={(propId, config) => handleLinkPropertyChange(view.id, propId, config)}
                    onLinkModeChange={(linkMode) => handleLinkModeChange(view.id, linkMode)}
                  />
                ))}
              </>
            )}

            {/* Not Placed Section */}
            {sortedNotPlaced.length > 0 && (
              <>
                <div
                  className="navigator-tab__section-header"
                  data-color="muted"
                  ref={(el) => (sectionRefs.current['not-placed'] = el)}
                >
                  <span className="navigator-tab__section-dot" />
                  NOT PLACED
                  <span className="navigator-tab__section-badge">
                    {sortedNotPlaced.length}
                  </span>
                </div>
                {sortedNotPlaced.map((view) => (
                  <InactiveViewItem
                    key={view.id}
                    view={view}
                    onPlace={handlePlaceView}
                    onTrash={handleTrashView}
                  />
                ))}
              </>
            )}

            {/* Recently Deleted Section */}
            {recentlyDeletedViews.length > 0 && (
              <>
                <div
                  className="navigator-tab__section-header"
                  data-color="red"
                  ref={(el) => (sectionRefs.current['deleted'] = el)}
                >
                  <span className="navigator-tab__section-dot" />
                  RECENTLY DELETED
                  <span className="navigator-tab__section-badge">
                    {recentlyDeletedViews.length}
                  </span>
                </div>
                {recentlyDeletedViews.map((view) => (
                  <TrashedViewItem
                    key={view.id}
                    view={view}
                    onRestore={handleRestoreView}
                    onPermanentDelete={handlePermanentDelete}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          /* Dataset Grouping Mode */
          <>
            {viewsByDataset.map((dataset) => (
              <div
                key={dataset.id}
                className="navigator-tab__dataset-group"
                ref={(el) => (sectionRefs.current[`dataset-${dataset.id}`] = el)}
              >
                <div className="navigator-tab__section-header" data-color="teal">
                  <span
                    className="navigator-tab__section-dot"
                    style={{ background: dataset.color }}
                  />
                  {dataset.name.toUpperCase()}
                  <span className="navigator-tab__section-badge">
                    {dataset.views.length}
                  </span>
                </div>
                {sortViews(dataset.views).map((view) =>
                  view.position ? (
                    <ViewItem
                      key={view.id}
                      view={view}
                      isActive={true}
                      showPosition={true}
                      availableViews={getAvailableViewsForLinking(view.id)}
                      onSelect={handleSelectView}
                      onClose={handleRemoveFromCanvas}
                      onTrash={handleTrashView}
                      onRename={handleRenameView}
                      onNavigate={handleNavigateToView}
                      onSizeChange={(size) => handleResizeView(view.id, size)}
                      onFocus={handleFocusView}
                      onVisibilityToggle={handleToggleVisibility}
                      onBookmark={handleBookmarkView}
                      onShare={handleShareView}
                      onOpenTools={handleOpenTools}
                      onDuplicate={handleDuplicateView}
                      onFilterRemove={(filterId) => handleRemoveFilter(view.id, filterId)}
                      onLinkPropertyChange={(propId, config) => handleLinkPropertyChange(view.id, propId, config)}
                      onLinkModeChange={(linkMode) => handleLinkModeChange(view.id, linkMode)}
                    />
                  ) : (
                    <InactiveViewItem
                      key={view.id}
                      view={view}
                      onPlace={handlePlaceView}
                      onTrash={handleTrashView}
                    />
                  )
                )}
              </div>
            ))}

            {/* Recently Deleted Section (always show at bottom) */}
            {recentlyDeletedViews.length > 0 && (
              <>
                <div
                  className="navigator-tab__section-header"
                  data-color="red"
                  ref={(el) => (sectionRefs.current['deleted'] = el)}
                >
                  <span className="navigator-tab__section-dot" />
                  RECENTLY DELETED
                  <span className="navigator-tab__section-badge">
                    {recentlyDeletedViews.length}
                  </span>
                </div>
                {recentlyDeletedViews.map((view) => (
                  <TrashedViewItem
                    key={view.id}
                    view={view}
                    onRestore={handleRestoreView}
                    onPermanentDelete={handlePermanentDelete}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Empty State */}
        {onCanvasViews.length === 0 && notPlacedViews.length === 0 && (
          <EmptyState
            icon="layers"
            title="No views"
            description="Load a dataset to create views"
            size="sm"
          />
        )}
      </div>

      {/* New View Button */}
      <div className="navigator-tab__views-footer">
        <button
          className="navigator-tab__new-view-btn"
          onClick={handleCreateView}
        >
          <Icon name="plus" size={isVR ? 14 : 12} />
          New View
        </button>
      </div>
    </div>
  );
});

/**
 * Group Footer (shown when a group is selected in Groups mode)
 */
const GroupFooter = memo(function GroupFooter({
  group,
  views,
  onViewSelect,
  onFocusGroup,
}) {
  const { isVR } = useAdaptive();

  if (!group) return null;

  return (
    <div className="navigator-tab__group-footer">
      <div className="navigator-tab__group-header">
        <div
          className="navigator-tab__group-dot"
          style={{ background: group.color }}
        />
        <span className="navigator-tab__group-name">{group.name}</span>
        <span className="navigator-tab__group-count">
          {views.length} views
        </span>
      </div>
      <div className="navigator-tab__group-views">
        {views.map((v) => (
          <span
            key={v.id}
            className="navigator-tab__group-view-chip"
            onClick={() => onViewSelect(v.id)}
          >
            <span
              className="navigator-tab__group-view-dot"
              style={{ background: v.color }}
            />
            {v.name}
          </span>
        ))}
      </div>
      <button
        className="navigator-tab__focus-group-btn"
        style={{ background: group.color }}
        onClick={() => onFocusGroup(group.id)}
      >
        <Icon name="target" size={isVR ? 14 : 12} />
        Focus Group
      </button>
    </div>
  );
});

/**
 * View Footer (shown when a view is selected in Views mode)
 */
const ViewFooter = memo(function ViewFooter({ view }) {
  if (!view) return null;

  return (
    <div className="navigator-tab__view-footer">
      <div className="navigator-tab__view-header">
        <div
          className="navigator-tab__view-dot"
          style={{ background: view.color, boxShadow: `0 0 6px ${view.color}` }}
        />
        <span className="navigator-tab__view-name">{view.name}</span>
        <span className="navigator-tab__view-type">({view.instanceType})</span>
        {view.position && (
          <span
            className="navigator-tab__view-position"
            style={{ background: `${view.color}30`, color: view.color }}
          >
            {view.position}
          </span>
        )}
      </div>
      <div className="navigator-tab__view-hint">
        <Icon name="arrowRight" size={10} />
        Use Instance Tools to adjust settings
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// View filter configuration
const VIEW_FILTER_CHIPS = [
  { id: 'active', label: 'Active', color: 'green' },
  { id: 'inactive', label: 'Inactive', color: 'gray' },
  { id: 'shared', label: 'Shared', color: 'pink' },
  { id: 'linked', label: 'Linked', color: 'teal' },
];

// View grouping modes
const VIEW_GROUP_MODES = {
  STATUS: 'status',
  DATASET: 'dataset',
};

// Sort options for views
const VIEW_SORT_OPTIONS = [
  { id: 'name-asc', label: 'Name A-Z', icon: 'sortAsc' },
  { id: 'name-desc', label: 'Name Z-A', icon: 'sortDesc' },
  { id: 'recent', label: 'Recently Modified', icon: 'clock' },
  { id: 'position', label: 'Grid Position', icon: 'grid' },
];

export const NavigatorTab = memo(function NavigatorTab({
  workspaceId,
  viewGroups = [],
  bookmarks = [],
  collaborators = [],
  onFocusGroup,
  onLoadBookmark,
  onCreateBookmark,
}) {
  const { isVR, mode } = useAdaptive();

  // Use the real ViewsTab hook for views functionality
  const viewsHook = useViewsTab({ workspaceId });
  const {
    views: allViews,
    onCanvasViews,
    notPlacedViews,
    recentlyDeletedViews,
    searchQuery: viewsSearchQuery,
    setSearchQuery: setViewsSearchQuery,
    activeFilters,
    toggleFilter,
    handlePlaceView,
    handleRemoveFromCanvas,
    handleTrashView,
    handleRestoreView,
    handlePermanentDelete,
    handleSelectView,
    handleNavigateToView,
    handleRenameView,
    handleResizeView,
    handleFocusView,
    handleToggleVisibility,
    handleBookmarkView,
    handleShareView,
    handleOpenTools,
    handleDuplicateView,
    handleRemoveFilter,
    handleLinkPropertyChange,
    handleLinkModeChange,
    handleCreateView,
  } = viewsHook;

  // Create available views list for linking (excluding current view)
  const getAvailableViewsForLinking = useCallback((currentViewId) => {
    return (allViews || [])
      .filter(v => v.id !== currentViewId && v.isOnCanvas)
      .map(v => ({ id: v.id, name: v.name }));
  }, [allViews]);

  // Initialize navigator logic hook (for minimap/navigation)
  const logic = useNavigatorTab({
    viewGroups,
    views: allViews,
    bookmarks,
    collaborators,
    onNavigateToView: handleNavigateToView,
    onPlaceView: handlePlaceView,
    onFocusGroup,
  });

  const {
    // Tab state
    activeTab,
    setActiveTab,
    focusMode,
    setFocusMode,

    // Selection
    selectedGroup,
    selectedViewId,
    selectedView,

    // Navigation
    currentPosition,
    homePosition,
    isSettingHome,
    setIsSettingHome,
    isAtHome,
    viewportSize,
    canvasSize,
    zoomLevel,

    // Handlers (minimap-specific)
    handleNavigate,
    handleGoHome,
    handleCellClick,
    handleFocusGroup: handleFocusGroupNav,
    handleZoomIn,
    handleZoomOut,
    handleViewportColsChange,
    handleViewportRowsChange,
    handleCanvasColsChange,
    handleCanvasRowsChange,

    // Helpers
    getGroupViews,
    getGroupAt,
    isInViewport,
    getCollaboratorsAt,

    // Bookmarks
    starredBookmarks,
    unstarredBookmarks,

    // Canvas minimap data (real views)
    minimapCells,
    displayMode,
    setDisplayMode,
    getCellDisplay,
  } = logic;

  // Navigation disabled states
  const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
  const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);
  const navDisabled = {
    up: currentPosition.row <= 0,
    down: currentPosition.row >= maxRow,
    left: currentPosition.col <= 0,
    right: currentPosition.col >= maxCol,
  };

  // Get views for selected group
  const selectedGroupViews = selectedGroup
    ? getGroupViews(selectedGroup.id)
    : [];

  return (
    <div className={`navigator-tab navigator-tab--${mode}`} data-vr={isVR}>
      {/* Header - matches other tabs */}
      <div className="panel-header panel-header--teal">
        <Icon name="compass" size={14} className="panel-header__icon" />
        <span className="panel-header__title">Navigator</span>
      </div>

      {/* Tab Bar */}
      <div className="navigator-tab__tabs">
        {[
          { id: TABS.MINIMAP, label: 'Map', icon: 'map', color: 'teal' },
          { id: TABS.VIEWS, label: 'Views', icon: 'eye', color: 'purple' },
          { id: TABS.BOOKMARKS, label: 'Marks', icon: 'bookmark', color: 'amber' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`navigator-tab__tab ${
              activeTab === tab.id ? 'navigator-tab__tab--active' : ''
            }`}
            data-color={tab.color}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={isVR ? 14 : 12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="navigator-tab__content">
        {/* Minimap Tab */}
        {activeTab === TABS.MINIMAP && (
          <>
            <MinimapGrid
              canvasSize={canvasSize}
              viewportSize={viewportSize}
              currentPosition={currentPosition}
              homePosition={homePosition}
              minimapCells={minimapCells}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              getCellDisplay={getCellDisplay}
              isSettingHome={isSettingHome}
              onCellClick={handleCellClick}
              onViewSelect={handleSelectView}
            />

            {/* D-Pad + Position Info */}
            <div className="navigator-tab__nav-block">
              <div className="navigator-tab__nav-columns">
                <DPadControl
                  onNavigate={handleNavigate}
                  onGoHome={handleGoHome}
                  isAtHome={isAtHome}
                  disabled={navDisabled}
                />
                <div className="navigator-tab__nav-info">
                  <div className="navigator-tab__info-row">
                    <span className="navigator-tab__info-label">Position:</span>
                    <span className="navigator-tab__info-value navigator-tab__info-value--teal">
                      {formatPosition(currentPosition.row, currentPosition.col)}
                    </span>
                  </div>
                  <div className="navigator-tab__info-row">
                    <span className="navigator-tab__info-label">Home:</span>
                    <span
                      className={`navigator-tab__info-value ${
                        isAtHome ? 'navigator-tab__info-value--amber' : ''
                      }`}
                    >
                      {formatPosition(homePosition.row, homePosition.col)}
                      {isAtHome && ' \u2713'}
                    </span>
                  </div>
                  <button
                    className={`navigator-tab__set-home-btn ${
                      isSettingHome ? 'navigator-tab__set-home-btn--active' : ''
                    }`}
                    onClick={() =>
                      isSettingHome ? setIsSettingHome(false) : setIsSettingHome(true)
                    }
                  >
                    <Icon name={isSettingHome ? 'x' : 'mapPin'} size={isVR ? 12 : 10} />
                    {isSettingHome ? 'Cancel' : 'Set Home'}
                  </button>
                </div>
              </div>
            </div>

            {/* Size Controls - each on its own line */}
            <div className="navigator-tab__size-controls">
              <div className="navigator-tab__size-row">
                <span className="navigator-tab__size-label">Zoom:</span>
                <div className="navigator-tab__size-value-group">
                  <button
                    className="navigator-tab__size-btn"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 25}
                  >
                    <Icon name="minus" size={isVR ? 12 : 10} />
                  </button>
                  <span className="navigator-tab__size-value">{zoomLevel}%</span>
                  <button
                    className="navigator-tab__size-btn"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 200}
                  >
                    <Icon name="plus" size={isVR ? 12 : 10} />
                  </button>
                </div>
              </div>

              <div className="navigator-tab__size-row">
                <span className="navigator-tab__size-label" data-color="green">
                  Viewport:
                </span>
                <div className="navigator-tab__size-value-group">
                  <NumberSpinner
                    value={viewportSize.cols}
                    onChange={handleViewportColsChange}
                    min={1}
                    max={canvasSize.cols}
                    color="green"
                  />
                  <span className="navigator-tab__size-x">×</span>
                  <NumberSpinner
                    value={viewportSize.rows}
                    onChange={handleViewportRowsChange}
                    min={1}
                    max={canvasSize.rows}
                    color="green"
                  />
                </div>
              </div>

              <div className="navigator-tab__size-row">
                <span className="navigator-tab__size-label" data-color="purple">
                  Canvas:
                </span>
                <div className="navigator-tab__size-value-group">
                  <NumberSpinner
                    value={canvasSize.cols}
                    onChange={handleCanvasColsChange}
                    min={1}
                    max={12}
                    color="purple"
                  />
                  <span className="navigator-tab__size-x">×</span>
                  <NumberSpinner
                    value={canvasSize.rows}
                    onChange={handleCanvasRowsChange}
                    min={1}
                    max={12}
                    color="purple"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Views Tab - Uses real ViewsTab functionality */}
        {activeTab === TABS.VIEWS && (
          <ViewsPanel
            isVR={isVR}
            viewsSearchQuery={viewsSearchQuery}
            setViewsSearchQuery={setViewsSearchQuery}
            activeFilters={activeFilters}
            toggleFilter={toggleFilter}
            allViews={allViews}
            onCanvasViews={onCanvasViews}
            notPlacedViews={notPlacedViews}
            recentlyDeletedViews={recentlyDeletedViews}
            getAvailableViewsForLinking={getAvailableViewsForLinking}
            handleSelectView={handleSelectView}
            handleRemoveFromCanvas={handleRemoveFromCanvas}
            handleTrashView={handleTrashView}
            handleRenameView={handleRenameView}
            handleNavigateToView={handleNavigateToView}
            handleResizeView={handleResizeView}
            handleFocusView={handleFocusView}
            handleToggleVisibility={handleToggleVisibility}
            handleBookmarkView={handleBookmarkView}
            handleShareView={handleShareView}
            handleOpenTools={handleOpenTools}
            handleDuplicateView={handleDuplicateView}
            handleRemoveFilter={handleRemoveFilter}
            handleLinkPropertyChange={handleLinkPropertyChange}
            handleLinkModeChange={handleLinkModeChange}
            handlePlaceView={handlePlaceView}
            handleRestoreView={handleRestoreView}
            handlePermanentDelete={handlePermanentDelete}
            handleCreateView={handleCreateView}
          />
        )}

        {/* Bookmarks Tab */}
        {activeTab === TABS.BOOKMARKS && (
          <BookmarksPanel
            starredBookmarks={starredBookmarks}
            unstarredBookmarks={unstarredBookmarks}
            viewGroups={viewGroups}
            onLoadBookmark={onLoadBookmark}
            onCreateBookmark={onCreateBookmark}
          />
        )}
      </div>

      {/* Footer (contextual) */}
      {activeTab === TABS.MINIMAP && focusMode === FOCUS_MODES.GROUPS && selectedGroup && (
        <GroupFooter
          group={selectedGroup}
          views={selectedGroupViews}
          onViewSelect={handleSelectView}
          onFocusGroup={handleFocusGroup}
        />
      )}

      {activeTab === TABS.MINIMAP && focusMode === FOCUS_MODES.VIEWS && selectedView && (
        <ViewFooter view={selectedView} />
      )}
    </div>
  );
});

export default NavigatorTab;
