/**
 * @file ActivityFilter.jsx
 * @description Filter dropdown for activity types.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} ActivityFilterProps
 * @property {Array} filters - Available filter options
 * @property {string} activeFilter - Currently active filter ID
 * @property {function} onFilterChange - Callback when filter changes
 */

/**
 * Activity filter component.
 * Provides dropdown to filter activity types.
 *
 * @param {ActivityFilterProps} props - Component props
 * @returns {React.ReactElement} The rendered filter
 */
export function ActivityFilter({ filters, activeFilter, onFilterChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = filters.find(f => f.id === activeFilter) || filters[0];

    return (
        <div className="activity-filter">
            <button
                className="activity-filter__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Icon name="filter" size={12} />
                <span>{current.label}</span>
                <Icon name="chevronDown" size={10} className={isOpen ? 'open' : ''} />
            </button>

            {isOpen && (
                <>
                    <div className="activity-filter__backdrop" onClick={() => setIsOpen(false)} />
                    <div className="activity-filter__dropdown">
                        {filters.map(filter => (
                            <button
                                key={filter.id}
                                className={`activity-filter__option ${filter.id === activeFilter ? 'active' : ''}`}
                                onClick={() => {
                                    onFilterChange(filter.id);
                                    setIsOpen(false);
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default ActivityFilter;