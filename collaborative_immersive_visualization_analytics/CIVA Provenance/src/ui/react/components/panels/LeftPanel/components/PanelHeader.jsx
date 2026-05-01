/**
 * @file PanelHeader.jsx
 * @description Shared panel header component for left panel tabs.
 * Used by left panel tabs for consistent header styling.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useLeftPanelContext, LEFT_PANEL_TABS } from '../LeftPanelContext';

/**
 * PanelHeader - Shared header for left panel tabs
 * Includes icon, title, and optional header content
 *
 * @param {Object} props
 * @param {string} [props.icon] - Override icon name (defaults to current tab's icon)
 * @param {string} [props.color] - Override color (defaults to current tab's color)
 * @param {string} [props.title] - Override title (defaults to current tab's label)
 * @param {React.ReactNode} [props.children] - Optional extra content (counts, actions, etc.)
 */
export function PanelHeader({ icon, color, title, children }) {
    const { activeTab } = useLeftPanelContext();

    // Get current tab config
    const currentTab = LEFT_PANEL_TABS.find(t => t.id === activeTab) || LEFT_PANEL_TABS[0];
    const iconName = icon || currentTab.icon;
    const colorName = color || currentTab.color;
    const titleText = title !== undefined ? title : currentTab.label;

    return (
        <div className={`panel-header panel-header--${colorName}`}>
            <Icon name={iconName} size={14} className="panel-header__icon" />
            {titleText && <span className="panel-header__title">{titleText}</span>}

            {/* Spacer to push content to the right */}
            <div className="panel-header__spacer" />

            {/* Optional extra content like counts, actions */}
            {children}
        </div>
    );
}

export default PanelHeader;
