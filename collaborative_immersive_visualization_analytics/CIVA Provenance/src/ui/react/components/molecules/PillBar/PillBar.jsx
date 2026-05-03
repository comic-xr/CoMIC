/**
 * PillBar Component
 *
 * Horizontal pill-style tabs for subtab navigation.
 * Used in Workspace tab (Presence, Layout, Homepoints) and
 * Datasets tab (Datasets, Views).
 *
 * @param {Array} tabs - Array of tab objects with { id, label, icon?, badge?, disabled? }
 * @param {string} activeTab - Currently active tab id
 * @param {function} onTabChange - Callback when tab changes (receives tab id)
 * @param {string} size - Size variant: 'sm' | 'md' (default: 'md')
 * @param {string} className - Additional CSS class
 */

import { memo, useCallback } from 'react';
import './PillBar.scss';

export const PillBar = memo(function PillBar({
    tabs = [],
    activeTab,
    onTabChange,
    size = 'md',
    className = '',
}) {
    const handleTabClick = useCallback((tabId, disabled) => {
        if (disabled) return;
        onTabChange?.(tabId);
    }, [onTabChange]);

    return (
        <div className={`pill-bar pill-bar--${size} ${className}`}>
            <div className="pill-bar__track">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            className={`pill-bar__pill ${isActive ? 'pill-bar__pill--active' : ''} ${tab.disabled ? 'pill-bar__pill--disabled' : ''}`}
                            onClick={() => handleTabClick(tab.id, tab.disabled)}
                            disabled={tab.disabled}
                            aria-selected={isActive}
                            role="tab"
                            data-color={tab.color}
                        >
                            {Icon && (
                                <span className="pill-bar__pill-icon">
                                    <Icon size={size === 'sm' ? 12 : 14} />
                                </span>
                            )}
                            <span className="pill-bar__pill-label">{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className="pill-bar__pill-badge">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

/**
 * PillBarItem - For composable usage
 */
export const PillBarItem = memo(function PillBarItem({
    id,
    label,
    icon: Icon,
    badge,
    isActive = false,
    disabled = false,
    color,
    onClick,
    size = 'md',
}) {
    return (
        <button
            className={`pill-bar__pill ${isActive ? 'pill-bar__pill--active' : ''} ${disabled ? 'pill-bar__pill--disabled' : ''}`}
            onClick={() => !disabled && onClick?.(id)}
            disabled={disabled}
            aria-selected={isActive}
            role="tab"
            data-color={color}
        >
            {Icon && (
                <span className="pill-bar__pill-icon">
                    <Icon size={size === 'sm' ? 12 : 14} />
                </span>
            )}
            <span className="pill-bar__pill-label">{label}</span>
            {badge !== undefined && (
                <span className="pill-bar__pill-badge">
                    {badge}
                </span>
            )}
        </button>
    );
});

export default PillBar;