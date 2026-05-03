/**
 * @file DatasetsTabV2.jsx
 * @description Redesigned Datasets Tab with tabbed interface
 *
 * Features:
 * - Three subtabs: Datasets, Derived, Templates (Views moved to Navigator)
 * - Memory usage tracking and visualization
 * - Dataset hierarchy with nested views
 * - Derived datasets with processing status
 * - View templates management
 *
 * @see docs/specifications/navigator/DatasetsTabV2.jsx for design spec
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { SortDropdown } from '@UI/react/components/molecules/SortDropdown';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { ViewItem } from '@UI/react/components/molecules/ViewItem';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { viewLifecycleService } from '@Services';
import { dataset as log } from '@Utils/logger.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { formatFileSize, formatRelativeTime } from '@Utils/formatters.js';
import './DatasetsTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS = {
  DATASETS: 'datasets',
  DERIVED: 'derived',
  TEMPLATES: 'templates',
};

const SORT_OPTIONS = [
  { id: 'memory', label: 'By Memory', icon: 'hardDrive' },
  { id: 'name', label: 'By Name', icon: 'sortAsc' },
  { id: 'recent', label: 'Recent', icon: 'clock' },
];

const DERIVED_FILTER_CHIPS = [
  { id: 'all', label: 'All', color: 'gray' },
  { id: 'processing', label: 'Processing', color: 'purple' },
  { id: 'complete', label: 'Complete', color: 'green' },
  { id: 'failed', label: 'Failed', color: 'red' },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getDatasetTypeConfig(fileType) {
  const displayInfo = getFileTypeDisplayInfo(fileType);
  if (displayInfo) {
    return {
      icon: displayInfo.icon,
      color: displayInfo.color,
      label: displayInfo.displayName || fileType?.toUpperCase() || 'Data',
    };
  }
  return {
    icon: 'database',
    color: '#6B7280',
    label: fileType?.toUpperCase() || 'Data',
  };
}

function getMemoryColor(percentage) {
  if (percentage < 70) return '#22c55e'; // green
  if (percentage < 85) return '#f59e0b'; // amber
  if (percentage < 95) return '#f97316'; // orange
  return '#ef4444'; // red
}

// =============================================================================
// MEMORY BAR COMPONENT
// =============================================================================

const MemoryBar = ({ used, available, percentage }) => {
  const color = getMemoryColor(percentage);

  return (
    <div className="datasets-tab__memory">
      <div className="datasets-tab__memory-header">
        <Icon name="hardDrive" size={12} style={{ color }} />
        <span className="datasets-tab__memory-label">Memory</span>
        <span className="datasets-tab__memory-value" style={{ color }}>
          {formatFileSize(used)} / {formatFileSize(available)}
        </span>
      </div>
      <div className="datasets-tab__memory-bar">
        <div
          className="datasets-tab__memory-fill"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      {percentage > 85 && (
        <div className="datasets-tab__memory-warning" style={{ color }}>
          <Icon name="alertTriangle" size={10} />
          <span>Memory pressure - consider unloading unused datasets</span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DATASET ITEM COMPONENT - Matches original dataset-parent styling
// =============================================================================

const DatasetItem = ({
  dataset,
  views,
  isExpanded,
  memory,
  onToggle,
  onCreateView,
  onSettings,
  onMoreActions,
}) => {
  const { isVR } = useAdaptive();
  const [isHovered, setIsHovered] = useState(false);
  const typeConfig = getDatasetTypeConfig(dataset.fileType || dataset.type);

  const activeCount = views.filter(v => v.status === 'active').length;
  const totalCount = views.length;
  const memoryPercent = memory?.available ? (dataset.fileSize / memory.available) * 100 : 0;

  return (
    <div
      className={`dataset-parent ${isHovered ? 'dataset-parent--hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="dataset-parent__card">
        <div className="dataset-parent__header">
          {/* Main clickable content */}
          <div className="dataset-parent__header-content" onClick={onToggle}>
            {/* Chevron */}
            <span className={`dataset-parent__chevron ${isExpanded ? 'dataset-parent__chevron--expanded' : ''}`}>
              <Icon name="chevronDown" size={12} />
            </span>

            {/* Type icon with colored background */}
            <div
              className="dataset-parent__type-icon"
              style={{ '--type-color': typeConfig.color }}
            >
              <Icon name={typeConfig.icon} size={14} />
            </div>

            {/* Name and metadata */}
            <div className="dataset-parent__info">
              <span className="dataset-parent__info-name">
                {dataset.name || dataset.filename || 'Untitled'}
              </span>
              <div className="dataset-parent__info-meta">
                <span
                  className="dataset-parent__handler-badge"
                  style={{ '--type-color': typeConfig.color }}
                >
                  {typeConfig.label}
                </span>
                <span className="dataset-parent__meta-item">
                  <Icon name="hardDrive" size={8} />
                  {formatFileSize(dataset.fileSize)}
                </span>
                <span className="dataset-parent__meta-item">
                  <Icon name="clock" size={8} />
                  {formatRelativeTime(dataset.loadedAt || dataset.lastAccessedAt)}
                </span>
              </div>
            </div>

            {/* Stacked: View count + Memory indicator */}
            <div className="dataset-parent__stats">
              {/* View count */}
              <div className={`dataset-parent__view-count ${activeCount > 0 ? 'dataset-parent__view-count--has-active' : ''}`}>
                <Icon name="eye" size={10} className="dataset-parent__view-count-icon" />
                <span className="dataset-parent__view-count-number">{activeCount}</span>
                {totalCount > 0 && totalCount !== activeCount && (
                  <span className="dataset-parent__view-count-total">/{totalCount}</span>
                )}
              </div>

              {/* Memory indicator */}
              <div
                className="dataset-parent__memory-indicator"
                style={{ '--type-color': typeConfig.color }}
                title={`${memoryPercent.toFixed(1)}% of available memory`}
              >
                <div
                  className="dataset-parent__memory-fill"
                  style={{ width: `${Math.min(memoryPercent * 2, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Vertical action buttons (right edge) */}
          <div className="dataset-parent__actions">
            <button
              className="dataset-parent__actions-btn dataset-parent__actions-btn--create"
              onClick={(e) => { e.stopPropagation(); onCreateView?.(dataset.id); }}
              title="Create view"
            >
              <Icon name="plus" size={10} />
            </button>
            <button
              className="dataset-parent__actions-btn"
              onClick={(e) => { e.stopPropagation(); onSettings?.(dataset.id); }}
              title="Settings"
            >
              <Icon name="settings" size={10} />
            </button>
            <button
              className="dataset-parent__actions-btn"
              onClick={(e) => { e.stopPropagation(); onMoreActions?.(dataset.id, e); }}
              title="More actions"
            >
              <Icon name="moreHorizontal" size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: Views list */}
      {isExpanded && (
        <div className="dataset-parent__children">
          {views.length > 0 ? (
            views.map(view => (
              <ViewItem
                key={view.id}
                view={view}
                mode={isVR ? 'vr' : 'desktop'}
                onFocus={() => viewLifecycleService.focusView(view.id)}
                onClose={() => viewLifecycleService.removeViewFromCanvas(view.id)}
                onTrash={() => viewLifecycleService.trashView(view.id)}
                onPlace={() => viewLifecycleService.placeView(view.id)}
              />
            ))
          ) : (
            <div className="dataset-parent__empty">
              <span>No views</span>
              <button
                className="dataset-parent__empty-action"
                onClick={() => onCreateView?.(dataset.id)}
              >
                <Icon name="plus" size={10} />
                Create view
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DERIVED ITEM COMPONENT
// =============================================================================

const DerivedItem = ({ item, sourceDataset, onRetry, onCancel }) => {
  const statusConfig = {
    processing: { icon: 'loader', color: '#a855f7', label: 'Processing' },
    complete: { icon: 'checkCircle', color: '#22c55e', label: 'Complete' },
    failed: { icon: 'xCircle', color: '#ef4444', label: 'Failed' },
    queued: { icon: 'clock', color: '#6b7280', label: 'Queued' },
  };

  const status = statusConfig[item.status] || statusConfig.queued;

  return (
    <div className={`datasets-tab__derived-item datasets-tab__derived-item--${item.status}`}>
      <div className="datasets-tab__derived-status">
        <Icon
          name={status.icon}
          size={14}
          className={item.status === 'processing' ? 'spin' : ''}
          style={{ color: status.color }}
        />
      </div>

      <div className="datasets-tab__derived-info">
        <span className="datasets-tab__derived-name">{item.name}</span>
        <div className="datasets-tab__derived-meta">
          <span>{item.operation}</span>
          <span className="datasets-tab__derived-meta-dot">·</span>
          <span>from {sourceDataset?.name || 'Unknown'}</span>
        </div>

        {item.status === 'processing' && (
          <div className="datasets-tab__derived-progress">
            <div
              className="datasets-tab__derived-progress-fill"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}

        {item.status === 'failed' && item.error && (
          <div className="datasets-tab__derived-error">
            <Icon name="alertTriangle" size={10} />
            <span>{item.error}</span>
          </div>
        )}
      </div>

      {item.status === 'complete' && (
        <span className="datasets-tab__derived-size">
          {formatFileSize(item.fileSize)}
        </span>
      )}

      {item.status === 'failed' && (
        <button
          className="datasets-tab__derived-retry"
          onClick={() => onRetry?.(item.id)}
        >
          <Icon name="refresh" size={10} />
          Retry
        </button>
      )}

      {item.status === 'processing' && (
        <button
          className="datasets-tab__derived-cancel"
          onClick={() => onCancel?.(item.id)}
        >
          <Icon name="x" size={10} />
        </button>
      )}
    </div>
  );
};

// =============================================================================
// TEMPLATE ITEM COMPONENT
// =============================================================================

const TemplateItem = ({ template, isSelected, onSelect, onApply, onEdit }) => (
  <div
    className={`datasets-tab__template-item ${isSelected ? 'datasets-tab__template-item--selected' : ''}`}
    onClick={() => onSelect?.(template.id)}
  >
    <div className="datasets-tab__template-header">
      {template.isStarred && (
        <Icon name="star" size={12} className="datasets-tab__template-star" />
      )}
      <span className="datasets-tab__template-name">{template.name}</span>
      <span className="datasets-tab__template-badge">{template.type}</span>
    </div>

    <div className="datasets-tab__template-meta">
      <span>{template.views?.length || 0} views</span>
      <span className="datasets-tab__template-meta-dot">·</span>
      <span>Used {template.usageCount}×</span>
    </div>

    {isSelected && (
      <div className="datasets-tab__template-actions">
        <button
          className="datasets-tab__template-apply"
          onClick={(e) => { e.stopPropagation(); onApply?.(template.id); }}
        >
          <Icon name="play" size={12} />
          Apply
        </button>
        <button
          className="datasets-tab__template-edit"
          onClick={(e) => { e.stopPropagation(); onEdit?.(template.id); }}
        >
          <Icon name="settings" size={12} />
        </button>
      </div>
    )}
  </div>
);

// =============================================================================
// DATASETS SUBTAB
// =============================================================================

const DatasetsSubtab = ({
  datasets,
  getViewsForDataset,
  memory,
  expanded,
  onToggleExpand,
  onCreateView,
  onSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('memory');

  const sortedDatasets = useMemo(() => {
    let result = [...datasets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        (d.name || d.filename || '').toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case 'memory':
        result.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'recent':
        result.sort((a, b) =>
          (b.lastAccessedAt || b.loadedAt || 0) - (a.lastAccessedAt || a.loadedAt || 0)
        );
        break;
    }

    return result;
  }, [datasets, searchQuery, sortBy]);

  return (
    <div className="datasets-tab__subtab">
      {/* Search + Sort */}
      <div className="datasets-tab__toolbar">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search datasets..."
          size="sm"
        />
        <SortDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={setSortBy}
          size="sm"
        />
      </div>

      {/* Dataset list */}
      <div className="datasets-tab__list">
        {sortedDatasets.length > 0 ? (
          sortedDatasets.map(dataset => (
            <DatasetItem
              key={dataset.id}
              dataset={dataset}
              views={getViewsForDataset(dataset.id)}
              isExpanded={expanded.has(dataset.id)}
              memory={memory}
              onToggle={() => onToggleExpand(dataset.id)}
              onCreateView={onCreateView}
              onSettings={onSettings}
            />
          ))
        ) : (
          <div className="datasets-tab__empty-state">
            <Icon name="database" size={32} />
            <span>No datasets loaded</span>
            <p>Load a dataset from the Files tab to get started</p>
          </div>
        )}
      </div>

      {/* Memory bar */}
      <MemoryBar
        used={memory.used}
        available={memory.available}
        percentage={memory.percentage}
      />
    </div>
  );
};

// =============================================================================
// DERIVED SUBTAB
// =============================================================================

const DerivedSubtab = ({ derived, datasets, onRetry, onCancel }) => {
  const [filter, setFilter] = useState('all');

  const processingCount = derived.filter(d => d.status === 'processing').length;

  const filteredDerived = useMemo(() => {
    if (filter === 'all') return derived;
    return derived.filter(d => d.status === filter);
  }, [derived, filter]);

  const getSourceDataset = (sourceId) => datasets.find(d => d.id === sourceId);

  return (
    <div className="datasets-tab__subtab">
      {/* Filters */}
      <div className="datasets-tab__toolbar">
        <ChipGroup
          chips={DERIVED_FILTER_CHIPS.map(c => ({
            ...c,
            count: c.id === 'all' ? derived.length : derived.filter(d => d.status === c.id).length,
          }))}
          activeChips={[filter]}
          onToggle={(id) => setFilter(id)}
          size="sm"
        />
      </div>

      {/* Processing banner */}
      {processingCount > 0 && (
        <div className="datasets-tab__processing-banner">
          <Icon name="loader" size={14} className="spin" />
          <span><strong>{processingCount}</strong> job{processingCount !== 1 ? 's' : ''} processing</span>
        </div>
      )}

      {/* Derived list */}
      <div className="datasets-tab__list">
        {filteredDerived.length > 0 ? (
          filteredDerived.map(item => (
            <DerivedItem
              key={item.id}
              item={item}
              sourceDataset={getSourceDataset(item.sourceId)}
              onRetry={onRetry}
              onCancel={onCancel}
            />
          ))
        ) : (
          <div className="datasets-tab__empty-state">
            <Icon name="gitBranch" size={32} />
            <span>No derived datasets</span>
            <p>Computed datasets will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TEMPLATES SUBTAB
// =============================================================================

const TemplatesSubtab = ({ templates, onApply, onEdit, onSaveCurrent }) => {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const filteredTemplates = useMemo(() => {
    if (filter === 'starred') return templates.filter(t => t.isStarred);
    return templates;
  }, [templates, filter]);

  return (
    <div className="datasets-tab__subtab">
      {/* Filters */}
      <div className="datasets-tab__toolbar">
        <ChipGroup
          chips={[
            { id: 'all', label: 'All', count: templates.length, color: 'gray' },
            { id: 'starred', label: 'Starred', count: templates.filter(t => t.isStarred).length, color: 'amber' },
          ]}
          activeChips={[filter]}
          onToggle={(id) => setFilter(id)}
          size="sm"
        />
      </div>

      {/* Templates list */}
      <div className="datasets-tab__list datasets-tab__list--templates">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(template => (
            <TemplateItem
              key={template.id}
              template={template}
              isSelected={selectedId === template.id}
              onSelect={setSelectedId}
              onApply={onApply}
              onEdit={onEdit}
            />
          ))
        ) : (
          <div className="datasets-tab__empty-state">
            <Icon name="layoutTemplate" size={32} />
            <span>No templates</span>
            <p>Save your current view layout as a template</p>
          </div>
        )}
      </div>

      {/* Save current button */}
      <div className="datasets-tab__template-footer">
        <button
          className="datasets-tab__save-template"
          onClick={onSaveCurrent}
        >
          <Icon name="save" size={12} />
          Save Current Layout
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DatasetsTabV2({ onNavigateToPanel }) {
  const { isVR, mode } = useAdaptive();
  const [activeTab, setActiveTab] = useState(TABS.DATASETS);
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());
  const [settingsDatasetId, setSettingsDatasetId] = useState(null);
  const [, forceUpdate] = useState(0);

  // Data hooks
  const loadedDatasets = useDatasets();

  // Mock derived and templates for now (would come from services)
  const [derived] = useState([]);
  const [templates] = useState([]);

  // Subscribe to view changes
  useEffect(() => {
    const handleViewUpdate = () => forceUpdate(n => n + 1);
    const vcm = getViewConfigurationManager();

    vcm?.on?.('viewUpdated', handleViewUpdate);
    vcm?.on?.('viewDeactivated', handleViewUpdate);
    vcm?.on?.('viewActivated', handleViewUpdate);

    return () => {
      vcm?.off?.('viewUpdated', handleViewUpdate);
      vcm?.off?.('viewDeactivated', handleViewUpdate);
      vcm?.off?.('viewActivated', handleViewUpdate);
    };
  }, []);

  // Calculate memory usage
  const memory = useMemo(() => {
    const loaded = loadedDatasets?.filter(d => d.status !== 'cold') || [];
    const totalUsed = loaded.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    const totalAvailable = 8 * 1024 * 1024 * 1024; // 8GB assumed
    return {
      used: totalUsed,
      available: totalAvailable,
      percentage: (totalUsed / totalAvailable) * 100,
    };
  }, [loadedDatasets]);

  // Get views for a dataset
  const getViewsForDataset = useCallback((datasetId) => {
    try {
      const views = getViewConfigurationManager()?.getViewsForDataset?.(datasetId) || [];
      const dataset = loadedDatasets?.find(d => d.id === datasetId);

      return views
        .filter(v => v.status !== 'trashed')
        .map(v => {
          const placement = canvasManager?.getPlacementForView?.(v.id);
          let viewColor = placement
            ? getCellColorHex(placement.row, placement.col)
            : (workspaceManager?.getViewColor?.(v.id)?.hex || v.color || '#60a5fa');

          return {
            ...v,
            datasetName: v.datasetName || dataset?.name || dataset?.filename,
            color: viewColor,
            position: placement ? { row: placement.row, col: placement.col } : null,
            status: placement ? 'active' : 'inactive',
          };
        });
    } catch (err) {
      return [];
    }
  }, [loadedDatasets]);

  // Handlers
  const handleToggleExpand = useCallback((datasetId) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(datasetId)) next.delete(datasetId);
      else next.add(datasetId);
      return next;
    });
  }, []);

  const handleCreateView = useCallback(async (datasetId) => {
    const dataset = loadedDatasets?.find(d => d.id === datasetId);
    if (dataset) {
      await viewLifecycleService.createAndPlaceView(datasetId, {}, {
        name: `View of ${dataset.name || dataset.filename || 'Dataset'}`,
      });
    }
  }, [loadedDatasets]);

  const handleOpenSettings = useCallback((datasetId) => {
    setSettingsDatasetId(datasetId);
  }, []);

  const handleLoadDataset = useCallback(() => {
    if (typeof onNavigateToPanel === 'function') {
      onNavigateToPanel('files');
      return;
    }

    window.dispatchEvent(new CustomEvent('cia:navigate-to-panel', { detail: { panelId: 'files' } }));
  }, [onNavigateToPanel]);

  // Processing count for badge
  const processingCount = derived.filter(d => d.status === 'processing').length;

  return (
    <div className={`datasets-tab datasets-tab--v2 datasets-tab--${mode}`} data-vr={isVR}>
      {/* Header */}
      <div className="panel-header panel-header--teal">
        <Icon name="database" size={14} className="panel-header__icon" />
        <span className="panel-header__title">Datasets</span>
        <div className="panel-header__spacer" />
        <div className="datasets-tab__memory-badge" style={{ '--color': getMemoryColor(memory.percentage) }}>
          <Icon name="hardDrive" size={10} />
          <span>{memory.percentage.toFixed(0)}%</span>
        </div>
      </div>

      {/* Tab bar - matches InstanceToolsTab pattern */}
      <div className="datasets-tab__tabs">
        <button
          className={`datasets-tab__tab ${activeTab === TABS.DATASETS ? 'datasets-tab__tab--active' : ''}`}
          data-color="teal"
          onClick={() => setActiveTab(TABS.DATASETS)}
        >
          <Icon name="database" size={12} />
          Datasets
        </button>
        <button
          className={`datasets-tab__tab ${activeTab === TABS.DERIVED ? 'datasets-tab__tab--active' : ''}`}
          data-color="purple"
          onClick={() => setActiveTab(TABS.DERIVED)}
        >
          <Icon name="gitBranch" size={12} />
          Derived
          {processingCount > 0 && (
            <span className="datasets-tab__tab-badge">{processingCount}</span>
          )}
        </button>
        <button
          className={`datasets-tab__tab ${activeTab === TABS.TEMPLATES ? 'datasets-tab__tab--active' : ''}`}
          data-color="amber"
          onClick={() => setActiveTab(TABS.TEMPLATES)}
        >
          <Icon name="layoutTemplate" size={12} />
          Templates
        </button>
      </div>

      {/* Content */}
      <div className="datasets-tab__content">
        {activeTab === TABS.DATASETS && (
          <DatasetsSubtab
            datasets={loadedDatasets || []}
            getViewsForDataset={getViewsForDataset}
            memory={memory}
            expanded={expandedDatasets}
            onToggleExpand={handleToggleExpand}
            onCreateView={handleCreateView}
            onSettings={handleOpenSettings}
          />
        )}

        {activeTab === TABS.DERIVED && (
          <DerivedSubtab
            derived={derived}
            datasets={loadedDatasets || []}
            onRetry={(id) => log.info('Retry derived:', id)}
            onCancel={(id) => log.info('Cancel derived:', id)}
          />
        )}

        {activeTab === TABS.TEMPLATES && (
          <TemplatesSubtab
            templates={templates}
            onApply={(id) => log.info('Apply template:', id)}
            onEdit={(id) => log.info('Edit template:', id)}
            onSaveCurrent={() => log.info('Save current layout')}
          />
        )}
      </div>

      {/* Footer */}
      <div className="panel-footer">
        <button className="panel-footer__btn panel-footer__btn--icon" title="Help">
          <Icon name="helpCircle" size={12} />
        </button>
        <button
          className="panel-footer__btn panel-footer__btn--primary"
          onClick={handleLoadDataset}
        >
          <Icon name="folderOpen" size={12} />
          Load from Files
        </button>
        <button className="panel-footer__btn panel-footer__btn--icon" title="Refresh">
          <Icon name="refresh" size={12} />
        </button>
      </div>

      {/* Settings Modal */}
      {settingsDatasetId && (
        <DatasetSettingsModal
          isOpen={true}
          dataset={loadedDatasets?.find(d => d.id === settingsDatasetId)}
          views={getViewsForDataset(settingsDatasetId)}
          onClose={() => setSettingsDatasetId(null)}
          onCreateView={() => handleCreateView(settingsDatasetId)}
        />
      )}
    </div>
  );
}

export default DatasetsTabV2;
