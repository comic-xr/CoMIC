/**
 * @file DatasetTreeItem.jsx
 * @description Expandable dataset item showing dataset and its views.
 * Used in the "Loaded" tab to display loaded datasets with their views.
 *
 * @example
 * <DatasetTreeItem
 *   dataset={dataset}
 *   expanded={expandedDatasets.has(dataset.id)}
 *   onToggle={() => toggleDataset(dataset.id)}
 *   onViewClick={handleViewClick}
 * />
 */

import React, { memo, useState } from 'react';
import { Icon, ColorDot } from '@UI/react/components/atoms';
import { ScopeIndicator } from '@UI/react/components/atoms/ScopeIndicator';
import { useAdaptive } from '@UI/react/context';
import './DatasetTreeItem.scss';

/**
 * @typedef {Object} ViewData
 * @property {string} id - View identifier
 * @property {string} name - View display name
 * @property {string} color - View color
 * @property {boolean} active - Whether view is currently active
 * @property {string} scope - View scope level (ephemeral, personal, shared, workspace, project)
 * @property {number} [users] - Number of users viewing (for shared views)
 */

/**
 * @typedef {Object} DatasetData
 * @property {string} id - Dataset identifier
 * @property {string} name - Dataset display name
 * @property {string} [type] - Dataset type (nifti, dicom, etc.)
 * @property {string} [loadState] - Current load state
 * @property {string} [size] - Size display string
 * @property {ViewData[]} views - Array of views for this dataset
 */

/**
 * @typedef {Object} DatasetTreeItemProps
 * @property {DatasetData} dataset - Dataset data object
 * @property {boolean} expanded - Whether the item is expanded
 * @property {() => void} onToggle - Toggle expansion handler
 * @property {(viewId: string) => void} [onViewClick] - View click handler
 * @property {(viewId: string) => void} [onViewDoubleClick] - View double-click handler
 * @property {() => void} [onCreateView] - Create view handler
 * @property {string} [className] - Additional CSS classes
 */

/**
 * DatasetTreeItem - Expandable dataset with views
 *
 * @param {DatasetTreeItemProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const DatasetTreeItem = memo(function DatasetTreeItem({
    dataset,
    expanded,
    onToggle,
    onViewClick,
    onViewDoubleClick,
    onCreateView,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const [hoveredView, setHoveredView] = useState(null);

    const hasViews = dataset.views && dataset.views.length > 0;
    const viewCount = dataset.views?.length || 0;

    const classList = [
        'dataset-tree-item',
        expanded && 'dataset-tree-item--expanded',
        isVR && 'dataset-tree-item--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {/* Dataset header */}
            <div
                className="dataset-tree-item__header"
                onClick={onToggle}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle();
                    }
                }}
            >
                {/* Expand chevron */}
                <span className="dataset-tree-item__chevron">
                    <Icon
                        name={expanded ? 'chevronDown' : 'chevronRight'}
                        size={10}
                    />
                </span>

                {/* Dataset icon */}
                <Icon
                    name="database"
                    size={14}
                    className="dataset-tree-item__icon"
                />

                {/* Dataset name */}
                <span className="dataset-tree-item__name" title={dataset.name}>
                    {dataset.name}
                </span>

                {/* Loaded indicator */}
                <Icon
                    name="check"
                    size={10}
                    className="dataset-tree-item__loaded-check"
                />

                {/* View count badge */}
                <span className="dataset-tree-item__view-count">
                    {viewCount}
                </span>
            </div>

            {/* Views list (when expanded) */}
            {expanded && (
                <div className="dataset-tree-item__views">
                    {hasViews ? (
                        dataset.views.map(view => (
                            <ViewItem
                                key={view.id}
                                view={view}
                                isHovered={hoveredView === view.id}
                                onHover={() => setHoveredView(view.id)}
                                onLeave={() => setHoveredView(null)}
                                onClick={() => onViewClick?.(view.id)}
                                onDoubleClick={() => onViewDoubleClick?.(view.id)}
                            />
                        ))
                    ) : (
                        <div className="dataset-tree-item__no-views">
                            No views created
                        </div>
                    )}

                    {/* Create view button */}
                    {onCreateView && (
                        <button
                            type="button"
                            className="dataset-tree-item__create-view"
                            onClick={onCreateView}
                        >
                            <Icon name="plus" size={10} />
                            <span>Create View</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

/**
 * ViewItem - Individual view row within a dataset
 */
const ViewItem = memo(function ViewItem({
    view,
    isHovered,
    onHover,
    onLeave,
    onClick,
    onDoubleClick,
}) {
    const classList = [
        'dataset-tree-item__view',
        view.active && 'dataset-tree-item__view--active',
        isHovered && 'dataset-tree-item__view--hovered',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classList}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            style={{ '--view-color': view.color }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
        >
            {/* Color indicator */}
            <ColorDot color={view.color} size="sm" glow={view.active} />

            {/* Eye icon */}
            <Icon name="eye" size={12} className="dataset-tree-item__view-icon" />

            {/* View name */}
            <span className="dataset-tree-item__view-name" title={view.name}>
                {view.name}
            </span>

            {/* Scope indicator */}
            <ScopeIndicator scope={view.scope} size="sm" />

            {/* Active badge */}
            {view.active && (
                <span className="dataset-tree-item__view-active-badge">
                    Active
                </span>
            )}
        </div>
    );
});

export default DatasetTreeItem;
