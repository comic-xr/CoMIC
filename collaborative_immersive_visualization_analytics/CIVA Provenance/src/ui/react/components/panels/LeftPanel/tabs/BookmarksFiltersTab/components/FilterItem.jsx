// components/FilterItem.jsx
// Individual filter item component

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { getScopeConfig } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/constants';

export function FilterItem({ filter, onApply, onTogglePin, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);
    const scopeConfig = getScopeConfig(filter.scope);  // ← Use helper function

    return (
        <div
            className="filter-item"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Type icon */}
            <div className="filter-item__icon">
                <Icon name="filter" size={14} />
            </div>

            {/* Content */}
            <div className="filter-item__content">
                <div className="filter-item__name">
                    {filter.name}
                    <span
                        className="filter-item__scope-badge"
                        data-color={scopeConfig.color}
                    >
                        {scopeConfig.label}
                    </span>
                </div>
                {filter.description && (
                    <div className="filter-item__description">{filter.description}</div>
                )}
            </div>

            {/* Actions */}
            <div className="filter-item__actions" style={{ opacity: isHovered ? 1 : 0 }}>
                <button
                    className={`filter-item__action-btn ${filter.isPinned ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onTogglePin(filter.id); }}
                    title={filter.isPinned ? 'Unpin' : 'Pin'}
                >
                    {filter.isPinned ? <Icon name="pin" size={10} fill="currentColor" /> : <Icon name="pinOff" size={10} />}
                </button>
                {filter.isOwn && (
                    <button
                        className="filter-item__action-btn"
                        onClick={(e) => { e.stopPropagation(); onDelete(filter.id); }}
                        title="Delete"
                    >
                        <Icon name="delete" size={10} />
                    </button>
                )}
            </div>

            {/* Apply button */}
            <button
                className="filter-item__apply-btn"
                onClick={() => onApply(filter.id)}
            >
                <Icon name="play" size={10} /> Apply
            </button>
        </div>
    );
}

export default FilterItem;