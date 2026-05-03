/**
 * @file LeftPanelContent.jsx
 * @description Expandable content for the left panel.
 * Renders in ThreeEdgeLayout's left panel content slot.
 * Supports pop-out to floating panel with space reclamation.
 *
 * Uses centralized tab rendering from LeftPanelContext.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registry.
 */

import React from 'react';
import {
    useLeftPanelContext,
    LEFT_PANEL_TABS,
    renderLeftPanelTabContent
} from './LeftPanelContext';

// Ensure tab components are registered
import './LeftPanelTabRegistry';

// Uses existing styles from LeftPanel.scss
import './LeftPanel.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LeftPanelContent - Expandable content for the left panel
 *
 * Rendered inside ThreeEdgeLayout's content row when panel is open.
 * Contains the actual tab content (files, datasets, tools, etc).
 * Supports pop-out to floating window for flexible positioning.
 *
 * Note: Floating panels are rendered at the app level (AllFloatingPanels),
 * not here, so they persist even when the docked panel is closed.
 *
 * @param {Object} props
 * @param {string} [props.workspaceId='default'] - Current workspace ID
 */
export function LeftPanelContent({ workspaceId = 'default' }) {
    const { activeTab, navigateToPanel } = useLeftPanelContext();

    // Get current tab config from the single source of truth
    const currentTab = LEFT_PANEL_TABS.find(t => t.id === activeTab) || LEFT_PANEL_TABS[0];

    return (
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
                onNavigateToPanel: navigateToPanel
            })}
        </div>
    );
}

export default LeftPanelContent;
