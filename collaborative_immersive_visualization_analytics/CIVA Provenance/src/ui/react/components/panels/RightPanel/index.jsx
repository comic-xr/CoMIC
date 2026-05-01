/**
 * @file RightPanel/index.jsx
 * @description Unified Right Panel with VS Code-style Activity Bar.
 * 
 * Features:
 * - Activity bar with icon tabs (fixed width, right-aligned)
 * - Tab content fills remaining space
 * - Tabs: People, Voice, Rooms, Chat, Activity, Notes, Recording, Settings
 * - Matches left panel styling patterns
 * - Toggle button at bottom of activity bar
 * 
 * IMPORTANT: This file uses RIGHT_PANEL_TABS from RightPanelContext.
 * DO NOT define a local TABS array - that creates sync issues.
 * 
 * This component is the MONOLITHIC version that combines activity bar + content.
 * For the SEPARATED version (used with ThreeEdgeLayout), use:
 * - RightActivityBar
 * - RightPanelContent
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Import tab config and renderer from the SINGLE SOURCE OF TRUTH
import {
    RIGHT_PANEL_TABS,
    RIGHT_PANEL_DIVIDERS_AFTER,
    renderRightPanelTabContent
} from './RightPanelContext';

// Ensure tab components are registered
import './RightPanelTabRegistry';

import './RightPanel.scss';

// =============================================================================
// ACTIVITY BAR
// =============================================================================

/**
 * ActivityBar - Vertical icon navigation for panel tabs
 */
function ActivityBar({
    tabs,
    activeTab,
    onTabChange,
    onTogglePanel,
    isPanelOpen,
    dividersAfter = [],
}) {
    // Handle tab click - if clicking active tab, toggle panel
    const handleTabClick = (tabId) => {
        if (tabId === activeTab) {
            // Clicking active tab toggles the panel
            onTogglePanel?.();
        } else {
            // Clicking different tab - switch to it and ensure panel is open
            onTabChange(tabId);
            if (!isPanelOpen) {
                onTogglePanel?.();
            }
        }
    };

    return (
        <div className="right-panel__activity-bar">
            <div className="right-panel__activity-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const showDivider = dividersAfter.includes(tab.id);

                    return (
                        <React.Fragment key={tab.id}>
                            <button
                                className={`right-panel__activity-btn ${isActive ? 'active' : ''}`}
                                data-color={tab.color}
                                onClick={() => handleTabClick(tab.id)}
                                title={tab.label}
                                aria-label={tab.label}
                                aria-selected={isActive}
                            >
                                <Icon size={18} />
                            </button>
                            {showDivider && (
                                <div className="right-panel__activity-divider" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="right-panel__activity-spacer" />

            {/* Toggle panel button at bottom */}
            <button
                className="right-panel__activity-btn right-panel__toggle-btn"
                onClick={onTogglePanel}
                title={isPanelOpen ? 'Collapse Panel' : 'Expand Panel'}
                aria-label={isPanelOpen ? 'Collapse Panel' : 'Expand Panel'}
            >
                {isPanelOpen ? <Icon name="panelRightClose" size={18} /> : <Icon name="chevronLeft" size={18} />}
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RightPanel - Main unified right panel component
 * 
 * This is the MONOLITHIC version that includes both the activity bar
 * and the content panel. Use this when you don't need separate layout control.
 * 
 * For ThreeEdgeLayout integration, use the separated components:
 * - RightActivityBar (in activity bar slot)
 * - RightPanelContent (in content slot)
 *
 * Note: This component receives props from ResizablePanel via React.cloneElement:
 * - isCollapsed: boolean - Whether panel is collapsed
 * - onToggle: function - Callback to toggle panel
 * - side: string - Always 'right' for this panel
 *
 * @param {Object} props
 * @param {string} [props.workspaceId='default'] - Current workspace ID from context
 * @param {string} [props.roomId] - Current room ID for presence filtering
 * @param {string} [props.roomName] - Current room name for voice display
 * @param {string} [props.initialTab='people'] - Initial active tab
 * @param {boolean} [props.isCollapsed=false] - Whether panel is collapsed (from ResizablePanel)
 * @param {Function} [props.onToggle] - Callback to toggle panel (from ResizablePanel)
 * @param {string} [props.side='right'] - Panel side, always 'right' (from ResizablePanel)
 */
export function RightPanel({
    workspaceId = 'default',
    roomId,
    roomName,
    initialTab = 'people',
    // These props come from ResizablePanel via React.cloneElement
    isCollapsed = false,
    onToggle,
    side = 'right',
}) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Get active tab config from the SINGLE SOURCE OF TRUTH
    const activeTabConfig = useMemo(() => {
        return RIGHT_PANEL_TABS.find(t => t.id === activeTab) || RIGHT_PANEL_TABS[0];
    }, [activeTab]);

    // Handle tab change
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
        // Dispatch event for tracking/analytics
        window.dispatchEvent(new CustomEvent('cia:right-panel-tab-change', {
            detail: { tabId }
        }));
    }, []);

    return (
        <div className="right-panel" data-collapsed={isCollapsed}>
            {/* Content panel - hidden when collapsed */}
            {!isCollapsed && (
                <div
                    className="right-panel__content"
                    data-color={activeTabConfig.color}
                >
                    {/* 
                     * Tab content - rendered via centralized registry
                     * NO switch statement here - all routing handled by renderRightPanelTabContent
                     */}
                    {renderRightPanelTabContent(activeTab, {
                        workspaceId,
                        roomId,
                        roomName,
                        projectId: workspaceId,
                    })}
                </div>
            )}

            {/* Activity bar - always visible, on the right */}
            <ActivityBar
                tabs={RIGHT_PANEL_TABS}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onTogglePanel={onToggle}
                isPanelOpen={!isCollapsed}
                dividersAfter={RIGHT_PANEL_DIVIDERS_AFTER}
            />
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

// Default export - monolithic component
export default RightPanel;

// Re-export tab config from context (DO NOT define locally)
export { RIGHT_PANEL_TABS } from './RightPanelContext';

// Separated components (activity bar and content in separate grid cells)
export {
    RightPanelProvider,
    useRightPanelContext,
    RIGHT_PANEL_DIVIDERS_AFTER,
    renderRightPanelTabContent,
    registerRightPanelTab,
} from './RightPanelContext';

export { RightActivityBar } from './RightActivityBar';
export { RightPanelContent } from './RightPanelContent';