/**
 * @file CompanionPanel.jsx
 * @description Reusable companion panel for browsing Views, Datasets, and ViewGroups
 *
 * This panel is shared across multiple contexts:
 * - Canvas Map: Adding content to canvas
 * - VG Editor: Adding views to layout slots
 * - LinkManager: Selecting views to link
 *
 * Provides:
 * - Datasets tab: Tree view of datasets with nested views
 * - Views tab: Flat list of all views
 * - ViewGroups tab: Saved/shared VG templates
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { FilterToolbar } from '@UI/react/components/organisms/FilterToolbar';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { ViewListItem } from './ViewListItem';
import { DatasetItem } from './DatasetItem';
import { CollapsibleSection } from './CollapsibleSection';
import { VGItem } from './VGItem';
import { LayoutMiniPreview } from '@UI/react/components/molecules/LayoutMiniPreview';
import './CompanionPanel.scss';

/**
 * Default view type definitions for the companion panel
 * Can be overridden by passing viewTypes prop
 */
const DEFAULT_VIEW_TYPES = {
  volume: { icon: 'box', color: 'purple', name: 'Volume' },
  slice: { icon: 'layers', color: 'blue', name: 'Slice' },
  data: { icon: 'barChart', color: 'green', name: 'Data' },
  chart: { icon: 'lineChart', color: 'amber', name: 'Chart' },
  notes: { icon: 'fileText', color: 'pink', name: 'Notes' },
};

const VIEW_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    icon: 'sort',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    icon: 'sort',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'type',
    label: 'Type',
    icon: 'layers',
    comparator: (a, b) => (a.type || '').localeCompare(b.type || ''),
  },
  {
    value: 'dataset',
    label: 'Dataset',
    icon: 'database',
    comparator: (a, b) => (a.datasetName || '').localeCompare(b.datasetName || ''),
  },
];

const DATASET_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    icon: 'sort',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    icon: 'sort',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'viewCount',
    label: 'View Count',
    icon: 'eye',
    comparator: (a, b) => (b.viewCount || 0) - (a.viewCount || 0),
  },
];

const VG_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    icon: 'sort',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'lastUsed',
    label: 'Last Used',
    icon: 'clock',
    comparator: (a, b) => new Date(b.lastUsed || 0) - new Date(a.lastUsed || 0),
  },
  {
    value: 'dateCreated',
    label: 'Date Created',
    icon: 'calendar',
    comparator: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  },
  {
    value: 'viewCount',
    label: 'View Count',
    icon: 'eye',
    comparator: (a, b) => (b.viewCount || 0) - (a.viewCount || 0),
  },
];

const TEMPLATE_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    icon: 'sort',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    icon: 'sort',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'slots',
    label: 'View Slots',
    icon: 'grid3x3',
    comparator: (a, b) => (b.viewSlots || 0) - (a.viewSlots || 0),
  },
  {
    value: 'scope',
    label: 'Scope',
    icon: 'users',
    comparator: (a, b) => (a.scope || '').localeCompare(b.scope || ''),
  },
];

/**
 * VG Section configurations
 */
const VG_SECTIONS = {
  recent: {
    id: 'recent',
    title: 'Recent',
    icon: 'clock',
    filter: (vg) => {
      if (!vg.lastUsed) return false;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(vg.lastUsed) > weekAgo;
    },
  },
  mySaved: {
    id: 'mySaved',
    title: 'My Saved',
    icon: 'user',
    filter: (vg) => vg.scope === 'personal',
  },
  shared: {
    id: 'shared',
    title: 'Shared',
    icon: 'users',
    filter: (vg) => vg.scope === 'team' || vg.scope === 'project',
    showCreator: true,
  },
};

/**
 * Tab configurations
 */
const TABS = {
  datasets: {
    id: 'datasets',
    label: 'Datasets',
    icon: 'database',
    color: 'teal',
  },
  views: {
    id: 'views',
    label: 'Views',
    icon: 'eye',
    color: 'blue',
  },
  viewGroups: {
    id: 'viewGroups',
    label: 'ViewGroups',
    icon: 'layoutGrid',
    color: 'purple',
  },
  templates: {
    id: 'templates',
    label: 'Templates',
    icon: 'copy',
    color: 'teal',
  },
};

/**
 * CompanionPanel - Reusable side panel for Views, Datasets, and ViewGroups
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {string} props.activeTab - Active tab ('datasets', 'views', or 'viewGroups')
 * @param {Function} props.onTabChange - Tab change handler
 * @param {Array} props.views - All views data
 * @param {Array} props.datasets - All datasets data (with nested views for tree view)
 * @param {Array} [props.viewGroups] - ViewGroup templates (optional, enables VG tab)
 * @param {Array} [props.templates] - ViewGroup templates for canvas map mode
 * @param {Function} props.onViewClick - View click handler
 * @param {Function} props.onDatasetClick - Dataset click handler
 * @param {Function} [props.onViewGroupClick] - ViewGroup click handler
 * @param {Function} [props.onTemplateClick] - Template click handler
 * @param {Function} [props.onViewDragStart] - View drag start handler
 * @param {Function} [props.onViewDragEnd] - View drag end handler
 * @param {Function} [props.onDatasetDragStart] - Dataset drag start handler
 * @param {Function} [props.onDatasetDragEnd] - Dataset drag end handler
 * @param {Function} [props.onVGDragStart] - ViewGroup drag start handler
 * @param {Function} [props.onVGDragEnd] - ViewGroup drag end handler
 * @param {Function} [props.onTemplateDragStart] - Template drag start handler
 * @param {Function} [props.onTemplateDragEnd] - Template drag end handler
 * @param {string} [props.sizeMode='standard'] - Size mode for compact rendering
 * @param {'left' | 'right'} [props.side='right'] - Which side the panel appears on
 * @param {Function} [props.onClose] - Close button handler
 * @param {string} [props.title] - Panel title (optional)
 * @param {string} [props.subtitle] - Panel subtitle (optional)
 * @param {string} [props.viewUsageLabel='In Use'] - Label for in-use views
 * @param {string} [props.vgUsageLabel='On Canvas'] - Label for placed VGs
 * @param {Object} [props.viewTypes] - Custom view type definitions
 * @param {Array} [props.enabledTabs] - Which tabs to show (default: all available)
 * @param {'vg-editor' | 'canvas-map' | 'idle'} [props.companionMode] - Current companion mode
 */
export const CompanionPanel = memo(function CompanionPanel({
  isOpen,
  activeTab,
  onTabChange,
  views = [],
  datasets = [],
  viewGroups = [],
  templates = [],
  onViewClick,
  onDatasetClick,
  onViewGroupClick,
  onTemplateClick,
  onViewDragStart,
  onViewDragEnd,
  onDatasetDragStart,
  onDatasetDragEnd,
  onVGDragStart,
  onVGDragEnd,
  onTemplateDragStart,
  onTemplateDragEnd,
  sizeMode = 'standard',
  side = 'right',
  onClose,
  title,
  subtitle,
  viewUsageLabel = 'In Use',
  vgUsageLabel = 'On Canvas',
  viewTypes = DEFAULT_VIEW_TYPES,
  enabledTabs,
  companionMode,
}) {
  const isCompact = sizeMode === 'compact';
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());
  const [expandedVGSections, setExpandedVGSections] = useState(
    new Set(['recent', 'mySaved', 'shared'])
  );
  const [expandedViewGroups, setExpandedViewGroups] = useState(new Set());

  // Per-tab independent filter state
  const viewFilter = useListFilter({
    searchFields: (view) => [view.name || '', view.datasetName || '', view.type || ''],
    sortOptions: VIEW_SORT_OPTIONS,
  });

  const datasetFilter = useListFilter({
    searchFields: (dataset) => [dataset.name || '', dataset.type || ''],
    sortOptions: DATASET_SORT_OPTIONS,
  });

  const vgFilter = useListFilter({
    searchFields: (vg) => [vg.name || '', ...(vg.datasets || []), vg.createdBy || ''],
    sortOptions: VG_SORT_OPTIONS,
  });

  const templateFilter = useListFilter({
    searchFields: (template) => [
      template.name || '',
      template.description || '',
      template.scope || '',
    ],
    sortOptions: TEMPLATE_SORT_OPTIONS,
  });

  // Determine which tabs to show
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (!enabledTabs || enabledTabs.includes('datasets')) {
      tabs.push(TABS.datasets);
    }
    if (!enabledTabs || enabledTabs.includes('views')) {
      tabs.push(TABS.views);
    }
    if (!enabledTabs || enabledTabs.includes('viewGroups')) {
      tabs.push(TABS.viewGroups);
    }
    if (templates.length > 0 && (!enabledTabs || enabledTabs.includes('templates'))) {
      tabs.push(TABS.templates);
    }
    return tabs;
  }, [enabledTabs, viewGroups.length, templates.length]);

  // Extract unique view types for filter
  const viewTypeOptions = useMemo(() => {
    const types = new Set(views.map((v) => v.type).filter(Boolean));
    return Array.from(types);
  }, [views]);

  // Extract unique dataset types for filter
  const datasetTypeOptions = useMemo(() => {
    const types = new Set(datasets.map((d) => d.type).filter(Boolean));
    return Array.from(types);
  }, [datasets]);

  const filteredViews = useMemo(
    () => viewFilter.applyFilters(views),
    [viewFilter, views]
  );

  const filteredDatasets = useMemo(
    () => datasetFilter.applyFilters(datasets),
    [datasetFilter, datasets]
  );

  // Toggle dataset expansion
  const toggleDataset = useCallback((datasetId) => {
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

  // Toggle VG section expansion
  const toggleVGSection = useCallback((sectionId) => {
    setExpandedVGSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Filter ViewGroups by search
  const filteredVGs = useMemo(
    () => vgFilter.applyFilters(viewGroups),
    [vgFilter, viewGroups]
  );

  const filteredTemplates = useMemo(
    () => templateFilter.applyFilters(templates),
    [templateFilter, templates]
  );

  // Group VGs by section
  const vgSections = useMemo(() => {
    return Object.values(VG_SECTIONS).map((section) => ({
      ...section,
      items: filteredVGs.filter(section.filter),
    }));
  }, [filteredVGs]);

  // Get current filter for active tab
  const currentFilter =
    activeTab === 'views'
      ? viewFilter
      : activeTab === 'templates'
        ? templateFilter
      : activeTab === 'viewGroups'
        ? vgFilter
        : datasetFilter;
  const currentSortOptions =
    activeTab === 'views'
      ? VIEW_SORT_OPTIONS
      : activeTab === 'templates'
        ? TEMPLATE_SORT_OPTIONS
      : activeTab === 'viewGroups'
        ? VG_SORT_OPTIONS
        : DATASET_SORT_OPTIONS;
  const currentTags =
    activeTab === 'views'
      ? viewTypeOptions
      : activeTab === 'datasets'
        ? datasetTypeOptions
        : [];

  const dragHint = useMemo(() => {
    if (activeTab === 'templates') return 'Drag to create a ViewGroup';
    if (activeTab === 'viewGroups') {
      if (companionMode === 'vg-editor') return 'Drag VG header to import all';
      if (companionMode === 'canvas-map') return 'Drag to place on canvas';
    }
    return companionMode === 'vg-editor' ? 'Drag to add to ViewGroup' : 'Drag to add to canvas';
  }, [activeTab, companionMode]);

  const toggleViewGroupExpand = useCallback((vgId) => {
    setExpandedViewGroups((prev) => {
      const next = new Set(prev);
      if (next.has(vgId)) {
        next.delete(vgId);
      } else {
        next.add(vgId);
      }
      return next;
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="companion-panel"
      data-size-mode={sizeMode}
      data-side={side}
    >
      {/* Header with optional title */}
      {(title || onClose) && (
        <div className="companion-panel__title-bar">
          <div className="companion-panel__title-text">
            {title && <h3 className="companion-panel__title">{title}</h3>}
            {subtitle && <p className="companion-panel__subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              className="companion-panel__close"
              onClick={onClose}
              aria-label="Close panel"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="companion-panel__header">
        <div className="companion-panel__tabs">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              className={`companion-panel__tab companion-panel__tab--${tab.id} ${
                activeTab === tab.id ? 'companion-panel__tab--active' : ''
              }`}
              onClick={() => onTabChange(tab.id)}
              type="button"
              title={tab.label}
            >
              <Icon name={tab.icon} size={14} />
              {!isCompact && tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="companion-panel__content">
        {/* Search and filter (contextual per tab) */}
        <div className="companion-panel__search">
          <FilterToolbar
            filter={currentFilter}
            config={{
              quickFilterDefs: [],
              typeCategories: [],
              sortOptions: currentSortOptions,
            }}
            tags={activeTab === 'viewGroups' ? [] : currentTags}
            variant="embedded"
            stacked
            showTypeFilter={false}
            showTagFilter={activeTab !== 'viewGroups' && currentTags.length > 0}
            showSortFilter
            searchPlaceholder={
              activeTab === 'views'
                ? 'Search views...'
                : activeTab === 'templates'
                  ? 'Search templates...'
                  : activeTab === 'viewGroups'
                  ? 'Search templates...'
                  : 'Search datasets...'
            }
          />
          <p className="companion-panel__hint">{dragHint}</p>
        </div>

        {/* Datasets tab */}
        {activeTab === 'datasets' && (
          <>
            {filteredDatasets.length > 0 ? (
              <div className="companion-panel__list">
                {filteredDatasets.map((dataset) => (
                  <DatasetItem
                    key={dataset.id}
                    dataset={dataset}
                    isExpanded={expandedDatasets.has(dataset.id)}
                    onToggle={toggleDataset}
                    onClick={onDatasetClick}
                    onDragStart={onDatasetDragStart}
                    onDragEnd={onDatasetDragEnd}
                    viewTypes={viewTypes}
                    onViewClick={onViewClick}
                    onViewDragStart={onViewDragStart}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={datasetFilter.searchQuery ? 'search' : 'database'}
                title={
                  datasetFilter.searchQuery
                    ? 'No datasets match your search'
                    : 'No datasets loaded'
                }
                size="sm"
              />
            )}
          </>
        )}

        {/* Views tab */}
        {activeTab === 'views' && (
          <>
            {filteredViews.length > 0 ? (
              <div className="companion-panel__list">
                {filteredViews.map((view) => (
                  <ViewListItem
                    key={view.id}
                    view={view}
                    datasetName={view.datasetName}
                    vgColor={view.vgColor}
                    onClick={onViewClick}
                    onDragStart={onViewDragStart}
                    onDragEnd={onViewDragEnd}
                    viewTypes={viewTypes}
                    useCount={view.useCount}
                    usageLabel={viewUsageLabel}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={viewFilter.searchQuery ? 'search' : 'layers'}
                title={
                  viewFilter.searchQuery
                    ? 'No views match your search'
                    : 'No views yet'
                }
                size="sm"
              />
            )}
          </>
        )}

        {/* ViewGroups tab */}
        {activeTab === 'viewGroups' && (
          <>
            {filteredVGs.length > 0 ? (
              <>
                {companionMode === 'vg-editor' || companionMode === 'canvas-map' ? (
                  <div className="companion-panel__vg-list companion-panel__vg-list--flat">
                    {filteredVGs.map((vg) => {
                      const isExpanded = expandedViewGroups.has(vg.id);
                      const isBeingEdited = !!vg.isBeingEdited;
                      const isOnCanvas = !!vg.isOnCanvas;
                      const showExpand = companionMode === 'vg-editor';
                      const isDisabled = companionMode === 'vg-editor' ? isBeingEdited : isOnCanvas;
                      const views = vg.views || [];

                      return (
                        <div
                          key={vg.id}
                          className={`companion-panel__vg-row ${isExpanded ? 'companion-panel__vg-row--expanded' : ''} ${isDisabled ? 'companion-panel__vg-row--disabled' : ''}`}
                          style={{ '--vg-color': vg.color || 'var(--accent-blue)' }}
                        >
                          <div className="companion-panel__vg-row-header">
                            {showExpand ? (
                              <button
                                type="button"
                                className="companion-panel__vg-toggle"
                                onClick={() => toggleViewGroupExpand(vg.id)}
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={12} />
                              </button>
                            ) : (
                              <span className="companion-panel__vg-toggle-spacer" />
                            )}

                            <div
                              className="companion-panel__vg-row-main"
                              onClick={() => {
                                if (!isDisabled) {
                                  onViewGroupClick?.(vg);
                                }
                              }}
                              draggable={!isDisabled && !!onVGDragStart}
                              onDragStart={(e) => onVGDragStart?.(e, vg)}
                              onDragEnd={(e) => onVGDragEnd?.(e, vg)}
                              role="button"
                              tabIndex={0}
                              aria-disabled={isDisabled}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  if (!isDisabled) {
                                    onViewGroupClick?.(vg);
                                  }
                                }
                              }}
                            >
                              <LayoutMiniPreview
                                layoutId={vg.layoutId || vg.type || 'single'}
                                viewCount={views.length}
                                color={vg.color || 'var(--accent-blue)'}
                                size={28}
                              />
                              <div className="companion-panel__vg-info">
                                <span className="companion-panel__vg-name">
                                  {vg.name || 'Untitled ViewGroup'}
                                </span>
                                <span className="companion-panel__vg-meta">
                                  {views.length} view{views.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {isBeingEdited && (
                                <span
                                  className="companion-panel__vg-badge companion-panel__vg-badge--editing"
                                  data-active={vg.isActiveEditor ? 'true' : 'false'}
                                >
                                  Editing
                                </span>
                              )}
                              {!isBeingEdited && companionMode === 'canvas-map' && isOnCanvas && (
                                <span className="companion-panel__vg-badge companion-panel__vg-badge--on-canvas">
                                  {vgUsageLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          {showExpand && isExpanded && (
                            <div className="companion-panel__vg-views">
                              {views.length > 0 ? (
                                views.map((view) => (
                                  <ViewListItem
                                    key={view.id}
                                    view={view}
                                    datasetName={view.datasetName}
                                    vgColor={vg.color}
                                    onClick={onViewClick}
                                    onDragStart={
                                      !isBeingEdited
                                        ? (e) => onViewDragStart?.(e, view, vg)
                                        : undefined
                                    }
                                    onDragEnd={onViewDragEnd}
                                    viewTypes={viewTypes}
                                    useCount={view.useCount}
                                    usageLabel={viewUsageLabel}
                                  />
                                ))
                              ) : (
                                <div className="companion-panel__vg-empty">
                                  No views in this ViewGroup
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="companion-panel__vg-sections">
                    {vgSections.map((section) => (
                      section.items.length > 0 && (
                        <CollapsibleSection
                          key={section.id}
                          title={section.title}
                          icon={section.icon}
                          count={section.items.length}
                          isExpanded={expandedVGSections.has(section.id)}
                          onToggle={() => toggleVGSection(section.id)}
                        >
                          <div className="companion-panel__vg-list">
                            {section.items.map((vg) => (
                              <VGItem
                                key={vg.id}
                                viewGroup={vg}
                                onClick={onViewGroupClick}
                                onDragStart={onVGDragStart}
                                onDragEnd={onVGDragEnd}
                                showCreator={section.showCreator}
                              />
                            ))}
                          </div>
                        </CollapsibleSection>
                      )
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={vgFilter.searchQuery ? 'search' : 'layoutGrid'}
                title={
                  vgFilter.searchQuery
                    ? 'No templates match your search'
                    : 'No saved templates'
                }
                description={
                  vgFilter.searchQuery
                    ? undefined
                    : 'Save ViewGroups to reuse them'
                }
                size="sm"
              />
            )}
          </>
        )}

        {/* Templates tab */}
        {activeTab === 'templates' && (
          <>
            {filteredTemplates.length > 0 ? (
              <div className="companion-panel__template-list">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="companion-panel__template-item"
                    style={{ '--vg-color': template.color || 'var(--accent-teal)' }}
                    onClick={() => onTemplateClick?.(template)}
                    draggable={!!onTemplateDragStart}
                    onDragStart={(e) => onTemplateDragStart?.(e, template)}
                    onDragEnd={(e) => onTemplateDragEnd?.(e, template)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTemplateClick?.(template);
                      }
                    }}
                  >
                    <LayoutMiniPreview
                      layoutId={template.layoutId || 'single'}
                      viewCount={template.viewSlots || 1}
                      color={template.color || 'var(--accent-teal)'}
                      size={28}
                    />
                    <div className="companion-panel__template-info">
                      <div className="companion-panel__template-header">
                        <span className="companion-panel__template-name">{template.name}</span>
                        <span className="companion-panel__template-slots">
                          {template.viewSlots || 1} slots
                        </span>
                      </div>
                      {template.description && (
                        <span className="companion-panel__template-desc">{template.description}</span>
                      )}
                    </div>
                    {template.scope && (
                      <span className="companion-panel__template-scope">{template.scope}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={templateFilter.searchQuery ? 'search' : 'copy'}
                title={
                  templateFilter.searchQuery
                    ? 'No templates match your search'
                    : 'No templates available'
                }
                size="sm"
              />
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      <div className="companion-panel__footer">
        {activeTab === 'datasets' && (
          <span className="companion-panel__stat">
            {filteredDatasets.length} dataset{filteredDatasets.length !== 1 ? 's' : ''}
          </span>
        )}
        {activeTab === 'views' && (
          <span className="companion-panel__stat">
            {filteredViews.length} view{filteredViews.length !== 1 ? 's' : ''}
          </span>
        )}
        {activeTab === 'viewGroups' && (
          <span className="companion-panel__stat">
            {viewGroups.length} template{viewGroups.length !== 1 ? 's' : ''}
          </span>
        )}
        {activeTab === 'templates' && (
          <span className="companion-panel__stat">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
});

export default CompanionPanel;
