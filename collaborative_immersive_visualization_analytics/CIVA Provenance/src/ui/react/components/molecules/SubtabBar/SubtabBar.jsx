/**
 * @file SubtabBar.jsx
 * @description Reusable subtab bar component for panel content switching.
 * Matches the InstanceToolsTab styling pattern with colored bottom border indicators.
 *
 * @example
 * const SUBTABS = [
 *   { id: 'room', label: 'Room', icon: 'home', color: 'green' },
 *   { id: 'project', label: 'Project', icon: 'globe', color: 'blue' },
 * ];
 *
 * <SubtabBar
 *   tabs={SUBTABS}
 *   activeTab="room"
 *   onTabChange={setActiveTab}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './SubtabBar.scss';

/**
 * @typedef {Object} SubtabConfig
 * @property {string} id - Unique identifier for the tab
 * @property {string} label - Display label
 * @property {string} [icon] - Optional icon name
 * @property {string} [color] - Color theme: 'blue' | 'green' | 'amber' | 'purple' | 'pink' | 'teal' | 'red'
 * @property {number} [count] - Optional count badge
 */

/**
 * SubtabBar - Horizontal tab bar for switching between panel subtabs
 *
 * @param {Object} props
 * @param {SubtabConfig[]} props.tabs - Array of tab configurations
 * @param {string} props.activeTab - Currently active tab ID
 * @param {function} props.onTabChange - Callback when tab changes
 * @param {string} [props.className] - Additional CSS class
 */
function SubtabBar({ tabs, activeTab, onTabChange, className = '' }) {
    return (
        <div className={`subtab-bar ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        className={`subtab-bar__tab ${isActive ? 'subtab-bar__tab--active' : ''}`}
                        data-color={tab.color || 'blue'}
                        onClick={() => onTabChange(tab.id)}
                        aria-selected={isActive}
                        role="tab"
                    >
                        {tab.icon && <Icon name={tab.icon} size={12} />}
                        <span className="subtab-bar__label">{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="subtab-bar__count">{tab.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default memo(SubtabBar);
export { SubtabBar };
