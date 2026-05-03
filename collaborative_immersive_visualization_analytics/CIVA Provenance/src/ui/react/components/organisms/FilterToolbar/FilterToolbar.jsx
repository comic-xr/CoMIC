/**
 * @file FilterToolbar.jsx
 * @description Main filter UI component with responsive layouts.
 *
 * RESPONSIVE LAYOUTS:
 * - Full (≥400px): Two rows - Search on top, dropdowns below
 * - Compact (300-399px): Single row, icon-only dropdowns
 * - Minimal (270-299px): Single row, combined filters dropdown
 * - Ultra (<270px): Two rows - Search on top, icon-only controls below (no quick filters)
 *
 * CRITICAL: Single-line enforcement - no wrapping allowed
 *
 * @example
 * const filter = useListFilter(FILES_FILTER_CONFIG);
 *
 * <FilterToolbar
 *   filter={filter}
 *   config={FILES_FILTER_CONFIG}
 *   counts={typeCounts}
 *   tags={availableTags}
 *   width={containerWidth}
 * />
 */

import React, { memo, useRef, useState, useMemo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { QuickFilterChip } from '@UI/react/components/molecules/QuickFilterChip';
import { TypeFilterDropdown } from '@UI/react/components/molecules/TypeFilterDropdown';
import { TagsDropdown } from '@UI/react/components/molecules/TagsDropdown';
import { SortDropdown } from '@UI/react/components/molecules/SortDropdown';
import { CombinedFiltersDropdown } from '@UI/react/components/molecules/CombinedFiltersDropdown';
import { FilterOverflowMenu } from '@UI/react/components/molecules/FilterOverflowMenu';
import './FilterToolbar.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Layout breakpoints */
export const LAYOUT_BREAKPOINTS = {
  FULL: 400,
  COMPACT: 300,
  ULTRA: 270,
};

// =============================================================================
// DROPDOWN TRIGGER BUTTON
// =============================================================================

const DropdownTrigger = React.forwardRef(function DropdownTrigger(
  {
    label,
    icon,
    badge = 0,
    active = false,
    isOpen = false,
    onClick,
    iconOnly = false,
    className = '',
  },
  ref
) {
  const button = (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={[
        'filter-toolbar__dropdown-trigger',
        active && 'filter-toolbar__dropdown-trigger--active',
        isOpen && 'filter-toolbar__dropdown-trigger--open',
        iconOnly && 'filter-toolbar__dropdown-trigger--icon-only',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-haspopup="menu"
      aria-expanded={isOpen}
    >
      <Icon name={icon} size={12} />
      {!iconOnly && <span className="filter-toolbar__dropdown-label">{label}</span>}
      {badge > 0 && (
        <span className="filter-toolbar__dropdown-badge">{badge}</span>
      )}
      <Icon name="chevronDown" size={10} className="filter-toolbar__dropdown-chevron" />
    </button>
  );

  if (iconOnly) {
    return <Tooltip content={label}>{button}</Tooltip>;
  }

  return button;
});

// =============================================================================
// QUICK FILTERS ROW
// =============================================================================

const QuickFiltersRow = memo(function QuickFiltersRow({
  quickFilterDefs,
  activeFilters,
  onToggle,
  counts,
  maxVisible = 4,
  compact = false,
  collapsed = false,
  onToggleCollapse,
}) {
  const { isVR } = useAdaptive();
  const overflowRef = useRef(null);

  // VR: Always show all filters (no overflow menu)
  const effectiveMaxVisible = isVR ? quickFilterDefs.length : maxVisible;

  const visibleFilters = quickFilterDefs.slice(0, effectiveMaxVisible);
  const overflowFilters = quickFilterDefs.slice(effectiveMaxVisible);
  const hasOverflow = overflowFilters.length > 0;

  // Count active filters in overflow
  const overflowActiveCount = overflowFilters.filter((f) =>
    activeFilters.includes(f.id)
  ).length;

  if (collapsed) {
    return (
      <button
        type="button"
        className="quick-filters-row quick-filters-row--collapsed"
        onClick={onToggleCollapse}
      >
        <Icon name="chevronDown" size={10} />
        <span>Quick filters</span>
        {activeFilters.length > 0 && (
          <span className="quick-filters-row__badge">{activeFilters.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="quick-filters-row">
      <span className="quick-filters-row__label">Quick:</span>

      {visibleFilters.map((def) => (
        <QuickFilterChip
          key={def.id}
          id={def.id}
          label={def.label}
          icon={def.icon}
          count={counts[def.id] || 0}
          active={activeFilters.includes(def.id)}
          onClick={() => onToggle(def.id)}
          compact={compact}
        />
      ))}

      {hasOverflow && (
        <FilterOverflowMenu
          ref={overflowRef}
          filters={overflowFilters}
          activeFilters={activeFilters}
          counts={counts}
          onToggle={onToggle}
          activeCount={overflowActiveCount}
        />
      )}

      {onToggleCollapse && (
        <button
          type="button"
          className="quick-filters-row__collapse-btn"
          onClick={onToggleCollapse}
          aria-label="Collapse quick filters"
        >
          <Icon name="chevronUp" size={12} />
        </button>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * FilterToolbar - Main filter UI component
 *
 * @param {Object} props
 * @param {Object} props.filter - Return value from useListFilter hook
 * @param {Object} props.config - Filter configuration object
 * @param {Object} [props.counts] - Type counts: { typeId: number }
 * @param {Object} [props.quickFilterCounts] - Quick filter counts: { filterId: number }
 * @param {Array} [props.tags] - Available tags for TagsDropdown
 * @param {Object} [props.tagsByCategory] - Tags grouped by category
 * @param {'full'|'compact'|'minimal'|'ultra'|'auto'} [props.layout='auto'] - Force layout mode
 * @param {number} [props.width] - Container width (for auto layout)
 * @param {string} [props.searchPlaceholder] - Search input placeholder
 * @param {boolean} [props.showQuickFilters=true] - Show quick filters row
 * @param {number} [props.maxVisibleQuickFilters=4] - Max quick filters before overflow
 * @param {boolean} [props.collapsible=false] - Allow collapsing quick filters
 * @param {boolean} [props.showTypeFilter=true] - Show type filter dropdown
 * @param {boolean} [props.showTagFilter=true] - Show tag filter dropdown
 * @param {boolean} [props.showSortFilter=true] - Show sort filter dropdown
 * @param {boolean} [props.quickFiltersToggleable=false] - Add toggle button for quick filters
 * @param {'default'|'embedded'} [props.variant='default'] - Visual variant
 * @param {boolean} [props.stacked=false] - Stack controls on second line (embedded variant only)
 * @param {string} [props.className] - Additional CSS classes
 */
export const FilterToolbar = memo(function FilterToolbar({
  filter,
  config,
  counts = {},
  quickFilterCounts = {},
  tags = [],
  tagsByCategory = {},
  layout = 'auto',
  width,
  searchPlaceholder = 'Search...',
  showQuickFilters = true,
  maxVisibleQuickFilters = 4,
  collapsible = false,
  showTypeFilter = true,
  showTagFilter = true,
  showSortFilter = true,
  quickFiltersToggleable = false,
  variant = 'default',
  stacked = false,
  className = '',
}) {
  const { isVR } = useAdaptive();

  const isEmbedded = variant === 'embedded';

  // Dropdown states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const [quickFiltersCollapsed, setQuickFiltersCollapsed] = useState(false);
  const [quickFiltersOpen, setQuickFiltersOpen] = useState(!quickFiltersToggleable);

  // Refs
  const typeButtonRef = useRef(null);
  const tagButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const filtersButtonRef = useRef(null);

  // Determine layout mode
  const layoutMode = useMemo(() => {
    if (layout !== 'auto') return layout;
    if (isVR) return 'full'; // VR always uses full mode
    if (!width) return 'full';
    if (width >= LAYOUT_BREAKPOINTS.FULL) return 'full';
    if (width >= LAYOUT_BREAKPOINTS.COMPACT) return 'compact';
    if (width >= LAYOUT_BREAKPOINTS.ULTRA) return 'minimal';
    return 'ultra';
  }, [layout, width, isVR]);

  const isFull = layoutMode === 'full';
  const isCompact = layoutMode === 'compact';
  const isMinimal = layoutMode === 'minimal';
  const isUltra = layoutMode === 'ultra';

  // Calculate quick filter visibility
  const quickFilterMaxVisible = useMemo(() => {
    if (isFull) return maxVisibleQuickFilters;
    if (isCompact) return Math.max(2, maxVisibleQuickFilters - 1);
    return 2; // Minimal
  }, [isFull, isCompact, maxVisibleQuickFilters]);

  // Get current sort option for display
  const currentSort = config.sortOptions?.find((o) => o.value === filter.sortBy);

  // Sort options formatted for SortDropdown
  const sortOptionsForDropdown = useMemo(
    () =>
      (config.sortOptions || []).map((opt) => ({
        id: opt.value,
        label: opt.label,
        icon: opt.icon,
      })),
    [config.sortOptions]
  );

  // Close other dropdowns when opening one
  const closeOtherDropdowns = (keep) => {
    if (keep !== 'type') setTypeDropdownOpen(false);
    if (keep !== 'tag') setTagDropdownOpen(false);
    if (keep !== 'sort') setSortDropdownOpen(false);
    if (keep !== 'filters') setFiltersDropdownOpen(false);
  };

  const hasTypes = showTypeFilter && config.typeCategories?.length > 0;
  const hasTags = showTagFilter && tags.length > 0;
  const hasSort = showSortFilter && config.sortOptions?.length > 0;
  const hasQuickFilters = config.quickFilterDefs?.length > 0;

  // Effective quick filters visibility (respects toggleable state)
  const quickFiltersVisible = showQuickFilters && hasQuickFilters && (quickFiltersToggleable ? quickFiltersOpen : true);
  const activeFilterCount = filter?.activeFilterCount ?? 0;

  // =========================================================================
  // EMBEDDED VARIANT - Simplified for contextual panels
  // =========================================================================
  if (isEmbedded) {
    const hasFiltersDropdown = hasTypes || hasTags;
    const filtersDropdownBadge = (filter.selectedTypes?.length || 0) + (filter.selectedTags?.length || 0);

    return (
      <div
        className={[
          'filter-toolbar',
          'filter-toolbar--embedded',
          stacked && 'filter-toolbar--stacked',
          isVR && 'filter-toolbar--vr',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Search bar with optional filter toggle and filters dropdown */}
        <div className="filter-toolbar__embedded-bar">
          <SearchInput
            value={filter.searchQuery}
            onChange={filter.setSearchQuery}
            placeholder={searchPlaceholder}
            size="sm"
          />

          {/* Controls wrapper - groups filter/sort controls, allows stacking */}
          <div className="filter-toolbar__embedded-controls">
            {/* Filters dropdown (for types/tags) */}
            {hasFiltersDropdown && (
              <DropdownTrigger
                ref={filtersButtonRef}
                label="Filters"
                icon="filter"
                badge={filtersDropdownBadge}
                active={filtersDropdownBadge > 0}
                isOpen={filtersDropdownOpen}
                onClick={() => setFiltersDropdownOpen(!filtersDropdownOpen)}
                iconOnly
              />
            )}

            {/* Quick filters toggle */}
            {quickFiltersToggleable && hasQuickFilters && (
              <button
                type="button"
                className={[
                  'filter-toolbar__filter-toggle',
                  quickFiltersOpen && 'filter-toolbar__filter-toggle--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setQuickFiltersOpen(!quickFiltersOpen)}
                title="Toggle quick filters"
              >
                <Icon name="filterList" size={14} />
                {filter.quickFilters?.length > 0 && (
                  <span className="filter-toolbar__filter-badge">
                    {filter.quickFilters.length}
                  </span>
                )}
              </button>
            )}

            {/* Sort dropdown */}
            {hasSort && (
              <div className="filter-toolbar__sort-wrapper filter-toolbar__sort-wrapper--compact">
                <SortDropdown
                  value={filter.sortBy}
                  onChange={filter.setSortBy}
                  options={sortOptionsForDropdown}
                  showLabel={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick filters (toggleable) */}
        {quickFiltersVisible && (
          <div className="filter-toolbar__embedded-filters">
            <QuickFiltersRow
              quickFilterDefs={config.quickFilterDefs}
              activeFilters={filter.quickFilters}
              onToggle={filter.toggleQuickFilter}
              counts={quickFilterCounts}
              maxVisible={quickFilterMaxVisible}
              compact
            />
          </div>
        )}

        {/* Filters dropdown panel */}
        {hasFiltersDropdown && (
          <CombinedFiltersDropdown
            isOpen={filtersDropdownOpen}
            onClose={() => setFiltersDropdownOpen(false)}
            triggerRef={filtersButtonRef}
            typeCategories={config.typeCategories || []}
            selectedTypes={filter.selectedTypes}
            typeCounts={counts}
            onToggleType={filter.toggleType}
            onSelectAllTypes={filter.selectAllTypes}
            onClearAllTypes={filter.clearAllTypes}
            tags={tags}
            tagsByCategory={tagsByCategory}
            selectedTags={filter.selectedTags}
            onToggleTag={filter.toggleTag}
            onClearAllTags={filter.clearAllTags}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // DEFAULT VARIANT - Full featured toolbar
  // =========================================================================
  return (
    <div
      className={[
        'filter-toolbar',
        `filter-toolbar--${layoutMode}`,
        isVR && 'filter-toolbar--vr',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ================================================================= */}
      {/* FULL MODE: Two rows                                               */}
      {/* ================================================================= */}
      {isFull && (
        <>
          {/* Row 1: Search (full width) */}
          <div className="filter-toolbar__search-row">
            <SearchInput
              value={filter.searchQuery}
              onChange={filter.setSearchQuery}
              placeholder={searchPlaceholder}
            />
          </div>

          {/* Row 2: Dropdowns (single line enforced) */}
          <div className="filter-toolbar__dropdowns-row">
            {/* Type filter */}
            {hasTypes && (
              <DropdownTrigger
                ref={typeButtonRef}
                label="Types"
                icon="file"
                badge={filter.selectedTypes.length}
                active={filter.selectedTypes.length > 0}
                isOpen={typeDropdownOpen}
                onClick={() => {
                  closeOtherDropdowns('type');
                  setTypeDropdownOpen(!typeDropdownOpen);
                }}
              />
            )}

            {/* Tags filter */}
            {hasTags && (
              <DropdownTrigger
                ref={tagButtonRef}
                label="Tags"
                icon="tag"
                badge={filter.selectedTags.length}
                active={filter.selectedTags.length > 0}
                isOpen={tagDropdownOpen}
                onClick={() => {
                  closeOtherDropdowns('tag');
                  setTagDropdownOpen(!tagDropdownOpen);
                }}
              />
            )}

            {/* Sort */}
            {hasSort && (
              <div className="filter-toolbar__sort-wrapper">
                <SortDropdown
                  value={filter.sortBy}
                  onChange={filter.setSortBy}
                  options={sortOptionsForDropdown}
                  showLabel
                />
              </div>
            )}

            {/* Spacer */}
            <div className="filter-toolbar__spacer" />

            {/* Clear button */}
            {filter.hasActiveFilters && (
              <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
                <button
                  type="button"
                  className="filter-toolbar__clear-btn"
                  onClick={filter.clearAll}
                  aria-label="Clear all filters"
                >
                  <Icon name="x" size={12} />
                  <span className="filter-toolbar__clear-count">
                    {filter.activeFilterCount}
                  </span>
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* COMPACT/MINIMAL MODE: Single row                                  */}
      {/* ================================================================= */}
      {isUltra && (
        <>
          <div className="filter-toolbar__search-row">
            <SearchInput
              value={filter.searchQuery}
              onChange={filter.setSearchQuery}
              placeholder={searchPlaceholder}
              size="sm"
            />
          </div>

          <div className="filter-toolbar__controls-row">
            <DropdownTrigger
              ref={filtersButtonRef}
              label="Filters"
              icon="filter"
              badge={filter.selectedTypes.length + filter.selectedTags.length}
              active={
                filter.selectedTypes.length > 0 || filter.selectedTags.length > 0
              }
              isOpen={filtersDropdownOpen}
              onClick={() => setFiltersDropdownOpen(!filtersDropdownOpen)}
              iconOnly
            />

            {hasSort && (
              <div className="filter-toolbar__sort-wrapper filter-toolbar__sort-wrapper--compact">
                <SortDropdown
                  value={filter.sortBy}
                  onChange={filter.setSortBy}
                  options={sortOptionsForDropdown}
                  showLabel={false}
                />
              </div>
            )}

            <div className="filter-toolbar__spacer" />

            {filter.hasActiveFilters && (
              <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
                <button
                  type="button"
                  className="filter-toolbar__clear-btn filter-toolbar__clear-btn--icon-only"
                  onClick={filter.clearAll}
                  aria-label="Clear all filters"
                >
                  <Icon name="x" size={12} />
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}

      {!isFull && !isUltra && (
        <div className="filter-toolbar__single-row">
          <div className="filter-toolbar__search-compact">
            <SearchInput
              value={filter.searchQuery}
              onChange={filter.setSearchQuery}
              placeholder="Search..."
              size="sm"
            />
          </div>

          {isMinimal ? (
            /* Minimal: Combined filters dropdown */
            <DropdownTrigger
              ref={filtersButtonRef}
              label="Filters"
              icon="filter"
              badge={filter.selectedTypes.length + filter.selectedTags.length}
              active={
                filter.selectedTypes.length > 0 || filter.selectedTags.length > 0
              }
              isOpen={filtersDropdownOpen}
              onClick={() => setFiltersDropdownOpen(!filtersDropdownOpen)}
              iconOnly
            />
          ) : (
            /* Compact: Icon-only dropdowns */
            <>
              {hasTypes && (
                <DropdownTrigger
                  ref={typeButtonRef}
                  label="Types"
                  icon="file"
                  badge={filter.selectedTypes.length}
                  active={filter.selectedTypes.length > 0}
                  isOpen={typeDropdownOpen}
                  onClick={() => {
                    closeOtherDropdowns('type');
                    setTypeDropdownOpen(!typeDropdownOpen);
                  }}
                  iconOnly
                />
              )}
              {hasTags && (
                <DropdownTrigger
                  ref={tagButtonRef}
                  label="Tags"
                  icon="tag"
                  badge={filter.selectedTags.length}
                  active={filter.selectedTags.length > 0}
                  isOpen={tagDropdownOpen}
                  onClick={() => {
                    closeOtherDropdowns('tag');
                    setTagDropdownOpen(!tagDropdownOpen);
                  }}
                  iconOnly
                />
              )}
            </>
          )}

          {/* Sort (always icon-only in compact/minimal) */}
          {hasSort && (
            <div className="filter-toolbar__sort-wrapper filter-toolbar__sort-wrapper--compact">
              <SortDropdown
                value={filter.sortBy}
                onChange={filter.setSortBy}
                options={sortOptionsForDropdown}
                showLabel={false}
              />
            </div>
          )}

          {/* Clear */}
          {filter.hasActiveFilters && (
            <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
              <button
                type="button"
                className="filter-toolbar__clear-btn filter-toolbar__clear-btn--icon-only"
                onClick={filter.clearAll}
                aria-label="Clear all filters"
              >
                <Icon name="x" size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* DROPDOWNS (rendered via portal)                                   */}
      {/* ================================================================= */}

      {/* Minimal mode: Combined Types + Tags dropdown */}
      {(isMinimal || isUltra) && (
        <CombinedFiltersDropdown
          isOpen={filtersDropdownOpen}
          onClose={() => setFiltersDropdownOpen(false)}
          triggerRef={filtersButtonRef}
          typeCategories={config.typeCategories || []}
          selectedTypes={filter.selectedTypes}
          typeCounts={counts}
          onToggleType={filter.toggleType}
          onSelectAllTypes={filter.selectAllTypes}
          onClearAllTypes={filter.clearAllTypes}
          tags={tags}
          tagsByCategory={tagsByCategory}
          selectedTags={filter.selectedTags}
          onToggleTag={filter.toggleTag}
          onClearAllTags={filter.clearAllTags}
        />
      )}

      {/* Full/Compact mode: Separate dropdowns */}
      {!isMinimal && !isUltra && (
        <>
          {hasTypes && (
            <TypeFilterDropdown
              isOpen={typeDropdownOpen}
              onClose={() => setTypeDropdownOpen(false)}
              triggerRef={typeButtonRef}
              categories={config.typeCategories || []}
              selectedTypes={filter.selectedTypes}
              typeCounts={counts}
              onToggleType={filter.toggleType}
              onSelectAll={filter.selectAllTypes}
              onClearAll={filter.clearAllTypes}
            />
          )}

          {hasTags && (
            <TagsDropdown
              isOpen={tagDropdownOpen}
              onClose={() => setTagDropdownOpen(false)}
              triggerRef={tagButtonRef}
              tags={tags}
              tagsByCategory={tagsByCategory}
              selectedTags={filter.selectedTags}
              onToggleTag={filter.toggleTag}
            />
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* QUICK FILTERS ROW                                                 */}
      {/* ================================================================= */}

      {quickFiltersVisible && !isUltra && (
        <QuickFiltersRow
          quickFilterDefs={config.quickFilterDefs}
          activeFilters={filter.quickFilters}
          onToggle={filter.toggleQuickFilter}
          counts={quickFilterCounts}
          maxVisible={quickFilterMaxVisible}
          compact={!isFull}
          collapsed={quickFiltersCollapsed}
          onToggleCollapse={collapsible ? () => setQuickFiltersCollapsed(!quickFiltersCollapsed) : undefined}
        />
      )}

      {/* ================================================================= */}
      {/* FILTER SUMMARY (minimal mode only)                                */}
      {/* ================================================================= */}

      {isMinimal && filter.hasActiveFilters && (
        <div className="filter-toolbar__summary">
          <Icon name="filter" size={10} />
          <span>
            {filter.activeFilterCount} filter
            {filter.activeFilterCount !== 1 ? 's' : ''} active
          </span>
          <button
            type="button"
            className="filter-toolbar__summary-clear"
            onClick={filter.clearAll}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
});

export default FilterToolbar;
