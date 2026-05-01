/**
 * @file ViewListItem.jsx
 * @description List item component for Views within a ViewGroup (drill-in mode).
 *
 * Features:
 * - View type icon and color
 * - View name and type label
 * - Selection state
 *
 * @example
 * <ViewListItem
 *   view={view}
 *   isSelected={selectedId === view.id}
 *   onClick={() => handleSelect(view.id)}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { VIEW_TYPES } from '../constants/layouts.js';

/**
 * ViewListItem component
 *
 * @param {Object} props - Component props
 * @param {Object} props.view - View data
 * @param {boolean} [props.isSelected=false] - Whether this item is selected
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const ViewListItem = memo(function ViewListItem({
    view,
    isSelected = false,
    onClick,
    className = '',
}) {
    const viewType = VIEW_TYPES[view.type];

    return (
        <div
            className={`view-list-item ${isSelected ? 'view-list-item--selected' : ''} ${className}`}
            onClick={onClick}
            style={{
                '--view-color': viewType?.color || 'var(--color-accent-purple)',
            }}
        >
            {/* Icon */}
            <div className="view-list-item__icon">
                <Icon name={viewType?.icon || 'box'} size={20} />
            </div>

            {/* Content */}
            <div className="view-list-item__content">
                <div className="view-list-item__name">
                    {view.name}
                </div>
                <div className="view-list-item__type">
                    {viewType?.name || 'Unknown'}
                </div>
            </div>
        </div>
    );
});

export default ViewListItem;
