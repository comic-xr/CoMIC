/**
 * @file RightPanelContent.jsx
 * @description Expandable content for the right panel.
 * Renders in ThreeEdgeLayout's right panel content slot.
 * Supports pop-out to floating panel with space reclamation.
 *
 * Uses centralized tab rendering from RightPanelContext.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registry.
 */

import React from 'react';

import {
    useRightPanelContext,
    RIGHT_PANEL_TABS,
    renderRightPanelTabContent
} from './RightPanelContext';

// Ensure tab components are registered
import './RightPanelTabRegistry';

// Uses existing styles from RightPanel.scss
import './RightPanel.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RightPanelContent - Expandable content for the right panel
 *
 * Rendered inside ThreeEdgeLayout's content row when panel is open.
 * Contains the actual tab content (people, chat, voice, etc).
 * Supports pop-out to floating window for flexible positioning.
 *
 * Note: Floating panels are rendered at the app level (AllFloatingPanels),
 * not here, so they persist even when the docked panel is closed.
 *
 * @param {Object} props
 * @param {string} [props.workspaceId='default'] - Current workspace ID
 * @param {string} [props.projectId] - Current project ID (for chat, DMs, etc.)
 * @param {string} [props.roomId] - Current room ID (for filtering presence)
 * @param {string} [props.roomName] - Current room name (for voice chat display)
 * @param {Array} [props.availableRooms] - Available rooms from useRoomIndicator
 */
export function RightPanelContent({
    workspaceId = 'default',
    projectId,
    roomId,
    roomName,
    availableRooms = [],
    onSwitchRoom,
}) {
    const { activeTab } = useRightPanelContext();

    // Get current tab config from the single source of truth
    const currentTab = RIGHT_PANEL_TABS.find(t => t.id === activeTab);

    return (
        <div
            className="right-panel__content"
            data-active-tab={activeTab}
            data-color={currentTab?.color}
        >
            {/*
             * Tab content - rendered via centralized registry
             * Each tab component has its own header (panel-header)
             * NO switch statement here - all routing handled by renderRightPanelTabContent
             */}
            {renderRightPanelTabContent(activeTab, {
                workspaceId,
                roomId,
                roomName,
                projectId, // Pass actual project ID for ChatTab, DMUserList, etc.
                availableRooms, // Pass rooms from useRoomIndicator for ChatTab
                onSwitchRoom,
            })}
        </div>
    );
}

export default RightPanelContent;
