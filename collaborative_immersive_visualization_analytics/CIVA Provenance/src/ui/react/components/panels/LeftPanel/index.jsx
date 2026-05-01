/**
 * @file LeftPanel/index.jsx
 * @description Unified left panel with activity bar navigation and workspace-scoped content.
 * 
 * Architecture:
 * - Activity bar: Vertical icon navigation for panel tabs
 * - Content area: Tab-specific content (Files, Datasets, etc.)
 * - Workspace context: All tabs share the selected workspace context
 * 
 * IMPORTANT: This file uses LEFT_PANEL_TABS from LeftPanelContext.
 * DO NOT define a local TABS array - that creates sync issues.
 * 
 * This component is the MONOLITHIC version that combines activity bar + content.
 * For the SEPARATED version (used with ThreeEdgeLayout), use:
 * - LeftActivityBar
 * - LeftPanelContent
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Import tab config and renderer from the SINGLE SOURCE OF TRUTH
import {
    LEFT_PANEL_TABS,
    LEFT_PANEL_DIVIDERS_AFTER,
    renderLeftPanelTabContent
} from './LeftPanelContext';

// Ensure tab components are registered
import './LeftPanelTabRegistry';

import './LeftPanel.scss';

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
        <div className="left-panel__activity-bar">
            <div className="left-panel__activity-tabs">
                {tabs.map((tab, index) => {
                    const iconName = tab.icon;
                    const isActive = activeTab === tab.id;
                    const showDivider = dividersAfter.includes(tab.id);

                    return (
                        <React.Fragment key={tab.id}>
                            <button
                                className={`left-panel__activity-btn ${isActive ? 'active' : ''}`}
                                data-color={tab.color}
                                onClick={() => handleTabClick(tab.id)}
                                title={tab.label}
                                aria-label={tab.label}
                                aria-selected={isActive}
                            >
                                <Icon name={iconName} size={18} />
                            </button>
                            {showDivider && (
                                <div className="left-panel__activity-divider" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="left-panel__activity-spacer" />

            {/* Toggle panel button at bottom */}
            <button
                className="left-panel__activity-btn left-panel__toggle-btn"
                onClick={onTogglePanel}
                title={isPanelOpen ? 'Collapse Panel' : 'Expand Panel'}
                aria-label={isPanelOpen ? 'Collapse Panel' : 'Expand Panel'}
            >
                {isPanelOpen ? <Icon name="panelLeftClose" size={18} /> : <Icon name="chevronRight" size={18} />}
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LeftPanel - Main unified left panel component
 * 
 * This is the MONOLITHIC version that includes both the activity bar
 * and the content panel. Use this when you don't need separate layout control.
 * 
 * For ThreeEdgeLayout integration, use the separated components:
 * - LeftActivityBar (in activity bar slot)
 * - LeftPanelContent (in content slot)
 * 
 * Note: This component receives props from ResizablePanel via React.cloneElement:
 * - isCollapsed: boolean - Whether panel is collapsed
 * - onToggle: function - Callback to toggle panel
 * - side: string - Always 'left' for this panel
 * 
 * @param {Object} props
 * @param {string} props.workspaceId - Current workspace ID from context
 * @param {boolean} props.isCollapsed - Whether panel is collapsed (from ResizablePanel)
 * @param {Function} props.onToggle - Callback to toggle panel (from ResizablePanel)
 * @param {string} props.side - Panel side, always 'left' (from ResizablePanel)
 */
export function LeftPanel({
    workspaceId,
    // These props come from ResizablePanel via React.cloneElement
    isCollapsed = false,
    onToggle,
    side = 'left',
}) {
    // Active tab state
    const [activeTab, setActiveTab] = useState('files');

    // Get current tab config from the SINGLE SOURCE OF TRUTH
    const currentTab = useMemo(
        () => LEFT_PANEL_TABS.find(t => t.id === activeTab) || LEFT_PANEL_TABS[0],
        [activeTab]
    );

    // Handle tab change
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
        // Dispatch event so InstanceViewport can track when Instance Tools is active
        window.dispatchEvent(new CustomEvent('cia:left-panel-tab-change', {
            detail: { tabId, isInstanceToolsActive: tabId === 'tools' }
        }));
    }, []);

    // Handle navigation between panels (for cross-panel links)
    const handleNavigateToPanel = useCallback((panelId) => {
        const tab = LEFT_PANEL_TABS.find(t => t.id === panelId);
        if (tab) {
            setActiveTab(panelId);
        }
    }, []);

    // Dispatch initial tab state on mount so InstanceViewport knows the initial state
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('cia:left-panel-tab-change', {
            detail: { tabId: activeTab, isInstanceToolsActive: activeTab === 'tools' }
        }));
    }, []); // Only on mount

    // Listen for instance tools open event - DOCKED version only
    // The floating panel (InstanceToolsFloating) handles 'cia:open-instance-tools'
    // This listener handles 'cia:open-instance-tools-docked' for explicit docked panel requests
    useEffect(() => {
        const handleOpenInstanceToolsDocked = () => {
            setActiveTab('tools');
            // Dispatch tab change event
            window.dispatchEvent(new CustomEvent('cia:left-panel-tab-change', {
                detail: { tabId: 'tools', isInstanceToolsActive: true }
            }));
            // Ensure panel is open
            if (isCollapsed && onToggle) {
                onToggle();
            }
        };

        window.addEventListener('cia:open-instance-tools-docked', handleOpenInstanceToolsDocked);
        return () => {
            window.removeEventListener('cia:open-instance-tools-docked', handleOpenInstanceToolsDocked);
        };
    }, [isCollapsed, onToggle]);

    useEffect(() => {
        const handleNavigateToPanelEvent = (event) => {
            const panelId = event?.detail?.panelId;
            const tab = LEFT_PANEL_TABS.find(t => t.id === panelId);
            if (!tab) return;

            handleTabChange(panelId);
            if (isCollapsed && onToggle) {
                onToggle();
            }
        };

        window.addEventListener('cia:navigate-to-panel', handleNavigateToPanelEvent);
        return () => {
            window.removeEventListener('cia:navigate-to-panel', handleNavigateToPanelEvent);
        };
    }, [handleTabChange, isCollapsed, onToggle]);

    return (
        <div className="left-panel" data-collapsed={isCollapsed}>
            {/* Activity Bar - Always visible */}
            <ActivityBar
                tabs={LEFT_PANEL_TABS}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onTogglePanel={onToggle}
                isPanelOpen={!isCollapsed}
                dividersAfter={LEFT_PANEL_DIVIDERS_AFTER}
            />

            {/* Content Panel - Hidden when collapsed */}
            {!isCollapsed && (
                <div
                    className="left-panel__content"
                    data-active-tab={activeTab}
                    data-color={currentTab.color}
                >
                    {/* 
                     * Tab content - rendered via centralized registry
                     * NO switch statement here - all routing handled by renderLeftPanelTabContent
                     */}
                    {renderLeftPanelTabContent(activeTab, {
                        workspaceId,
                        onNavigateToPanel: handleNavigateToPanel,
                    })}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

// Default export - monolithic component
export default LeftPanel;

// Re-export tab config from context (DO NOT define locally)
export { LEFT_PANEL_TABS } from './LeftPanelContext';

// Separated components (activity bar and content in separate grid cells)
export {
    LeftPanelProvider,
    useLeftPanelContext,
    LEFT_PANEL_DIVIDERS_AFTER,
    LEFT_PANEL_SHORTCUTS,
    renderLeftPanelTabContent,
    registerLeftPanelTab,
} from './LeftPanelContext';

export { LeftActivityBar } from './LeftActivityBar';
export { LeftPanelContent } from './LeftPanelContent';
