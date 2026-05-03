/**
 * ViewsSubtab Component
 *
 * Flat list of all active views using ViewItem component.
 * Features:
 * - Sortable by: Row, Column, Name, Dataset, Recently Active
 * - Groupable by: Dataset, Row, None
 * - Draggable to Grid Preview for repositioning
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ViewItem } from '@UI/react/components/molecules/ViewItem';
import { DatasetContextHeader } from './DatasetContextHeader';
import './ViewsSubtab.scss';

// Sort options
const SORT_OPTIONS = [
    { id: 'row', label: 'Row', icon: 'layoutGrid' },
    { id: 'column', label: 'Column', icon: 'layoutGrid' },
    { id: 'name', label: 'Name', icon: 'sortAsc' },
    { id: 'dataset', label: 'Dataset', icon: 'database' },
    { id: 'recent', label: 'Recently Active', icon: 'clock' },
];

// Group options
const GROUP_OPTIONS = [
    { id: 'none', label: 'None' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'row', label: 'Row' },
];

export const ViewsSubtab = memo(function ViewsSubtab({
    views = [],
    datasets = [],
    selectedViewId = null,
    onSelectView,
    onCloseView,
    onRenameView,
    onNavigate,
    onCloseAllInDataset,
    onSpawnView,
    onGoToDataset,
    onSaveView,
    onShareView,
    onSpawnLink,
    onSizeChange,
    onLinkPropertyChange,
    onFocus,
    onVisibilityToggle,
    className = '',
}) {
    const [sortBy, setSortBy] = useState('row');
    const [groupBy, setGroupBy] = useState('none');
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [groupMenuOpen, setGroupMenuOpen] = useState(false);

    // Get dataset info for a view
    const getDatasetForView = useCallback((view) => {
        return datasets.find(d => d.id === view.datasetId);
    }, [datasets]);

    // Sort views
    const sortedViews = useMemo(() => {
        const sorted = [...views];

        switch (sortBy) {
            case 'row':
                sorted.sort((a, b) => (a.position?.row || 0) - (b.position?.row || 0));
                break;
            case 'column':
                sorted.sort((a, b) => (a.position?.col || 0) - (b.position?.col || 0));
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'dataset':
                sorted.sort((a, b) => {
                    const datasetA = getDatasetForView(a)?.name || '';
                    const datasetB = getDatasetForView(b)?.name || '';
                    return datasetA.localeCompare(datasetB);
                });
                break;
            case 'recent':
                sorted.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
                break;
        }

        return sorted;
    }, [views, sortBy, getDatasetForView]);

    // Group views
    const groupedViews = useMemo(() => {
        if (groupBy === 'none') {
            return [{ key: 'all', label: null, views: sortedViews }];
        }

        const groups = new Map();

        sortedViews.forEach(view => {
            let groupKey;
            let groupLabel;

            if (groupBy === 'dataset') {
                const dataset = getDatasetForView(view);
                groupKey = dataset?.id || 'unknown';
                groupLabel = dataset?.name || 'Unknown Dataset';
            } else if (groupBy === 'row') {
                groupKey = `row-${view.position?.row || 0}`;
                groupLabel = `Row ${(view.position?.row || 0) + 1}`;
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, { key: groupKey, label: groupLabel, views: [] });
            }
            groups.get(groupKey).views.push(view);
        });

        return Array.from(groups.values());
    }, [sortedViews, groupBy, getDatasetForView]);

    // Get selected view's dataset for context header
    const selectedView = views.find(v => v.id === selectedViewId);
    const selectedDataset = selectedView ? getDatasetForView(selectedView) : null;

    return (
        <div className={`views-subtab ${className}`}>
            {/* Toolbar */}
            <div className="views-subtab__toolbar">
                {/* Sort dropdown */}
                <div className="views-subtab__dropdown">
                    <button
                        className="views-subtab__dropdown-btn"
                        onClick={() => {
                            setSortMenuOpen(!sortMenuOpen);
                            setGroupMenuOpen(false);
                        }}
                    >
                        <Icon name="arrowUpDown" size={12} />
                        <span>Sort: {SORT_OPTIONS.find(o => o.id === sortBy)?.label}</span>
                        <Icon name="chevronDown" size={12} />
                    </button>

                    {sortMenuOpen && (
                        <div className="views-subtab__menu">
                            {SORT_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.id}
                                        className={`views-subtab__menu-item ${sortBy === option.id ? 'views-subtab__menu-item--active' : ''}`}
                                        onClick={() => {
                                            setSortBy(option.id);
                                            setSortMenuOpen(false);
                                        }}
                                    >
                                        <Icon size={12} />
                                        <span>{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Group dropdown */}
                <div className="views-subtab__dropdown">
                    <button
                        className="views-subtab__dropdown-btn"
                        onClick={() => {
                            setGroupMenuOpen(!groupMenuOpen);
                            setSortMenuOpen(false);
                        }}
                    >
                        <Icon name="layoutGrid" size={12} />
                        <span>Group: {GROUP_OPTIONS.find(o => o.id === groupBy)?.label}</span>
                        <Icon name="chevronDown" size={12} />
                    </button>

                    {groupMenuOpen && (
                        <div className="views-subtab__menu">
                            {GROUP_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    className={`views-subtab__menu-item ${groupBy === option.id ? 'views-subtab__menu-item--active' : ''}`}
                                    onClick={() => {
                                        setGroupBy(option.id);
                                        setGroupMenuOpen(false);
                                    }}
                                >
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* View count */}
                <span className="views-subtab__count">
                    {views.length} view{views.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Dataset context header (when view selected) */}
            {selectedDataset && (
                <DatasetContextHeader
                    dataset={selectedDataset}
                    viewCount={views.filter(v => v.datasetId === selectedDataset.id).length}
                    onCloseAll={() => onCloseAllInDataset?.(selectedDataset.id)}
                    onSpawn={() => onSpawnView?.(selectedDataset.id)}
                    onGoToDataset={() => onGoToDataset?.(selectedDataset.id)}
                />
            )}

            {/* Views list */}
            <div className="views-subtab__list">
                {groupedViews.map((group) => (
                    <div key={group.key} className="views-subtab__group">
                        {group.label && (
                            <div className="views-subtab__group-header">
                                <span className="views-subtab__group-label">{group.label}</span>
                                <span className="views-subtab__group-count">
                                    {group.views.length}
                                </span>
                            </div>
                        )}

                        <div className="views-subtab__group-items">
                            {group.views.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    isActive={view.isActive}
                                    isSelected={view.id === selectedViewId}
                                    linkedCount={view.linkedCount || 0}
                                    filterCount={view.filterCount || 0}
                                    linkProperties={view.linkProperties || {}}
                                    onSelect={onSelectView}
                                    onClose={onCloseView}
                                    onRename={onRenameView}
                                    onNavigate={onNavigate}
                                    onSaveView={onSaveView}
                                    onShareView={onShareView}
                                    onSpawnLink={onSpawnLink}
                                    onSizeChange={onSizeChange}
                                    onLinkPropertyChange={onLinkPropertyChange}
                                    onFocus={onFocus}
                                    onVisibilityToggle={onVisibilityToggle}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {views.length === 0 && (
                    <div className="views-subtab__empty">
                        <p>No active views</p>
                        <p className="views-subtab__empty-hint">
                            Open a dataset to create views
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ViewsSubtab;