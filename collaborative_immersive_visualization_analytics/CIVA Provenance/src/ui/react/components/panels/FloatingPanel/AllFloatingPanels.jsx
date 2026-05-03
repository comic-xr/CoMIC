/**
 * @file AllFloatingPanels.jsx
 * @description Renders all floating panels at the app level.
 * This component should be placed inside FloatingPanelProvider.
 * 
 * Uses centralized tab rendering from panel contexts.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registries.
 */

import React, { useCallback } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useFloatingPanels } from "./FloatingPanelContext";
import { useLayoutContext } from "@UI/react/components/layout/ThreeEdgeLayout";

// Import centralized renderers and tab configs
import {
    LEFT_PANEL_TABS,
    renderLeftPanelTabContent,
} from "@UI/react/components/panels/LeftPanel/LeftPanelContext";
import {
    RIGHT_PANEL_TABS,
    renderRightPanelTabContent,
} from "@UI/react/components/panels/RightPanel/RightPanelContext";

// Ensure tab components are registered
import "@UI/react/components/panels/LeftPanel/LeftPanelTabRegistry";
import "@UI/react/components/panels/RightPanel/RightPanelTabRegistry";

// ScratchPad floating panel
import { ScratchPadFloating, SCRATCHPAD_PANEL_ID } from "./ScratchPadFloating";

// Instance Tools floating panel
import { InstanceToolsFloating, INSTANCE_TOOLS_PANEL_ID } from "./InstanceToolsFloating";

// Link Manager floating panels (View Links, User Following, Workspace Links Hub)
import {
    AllLinkManagerFloating,
    VIEW_LINK_MANAGER_PANEL_ID,
    USER_FOLLOWING_PANEL_ID,
    WORKSPACE_LINKS_HUB_PANEL_ID,
} from "./LinkManagerFloating";

// VR Session floating panel
import { VRSessionFloating, VR_SESSION_PANEL_ID } from "./VRSessionFloating";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AllFloatingPanels - Renders floating versions of panel tabs
 *
 * Placed at the app level to ensure panels persist even when docked panels close.
 * Uses centralized renderers - no local switch statements.
 *
 * Now also renders:
 * - ScratchPad (independent floating panel, not tied to docked tabs)
 */
export function AllFloatingPanels() {
    const { floatingPanels, dockPanel } = useFloatingPanels();

    const { setLeftOpen, setRightOpen } = useLayoutContext();

    // Handle docking a panel
    const handleDock = useCallback(
        (panelId) => {
            dockPanel(panelId);

            // Re-open the corresponding docked panel
            if (panelId.startsWith("left-")) {
                setLeftOpen(true);
            } else if (panelId.startsWith("right-")) {
                setRightOpen(true);
            }
        },
        [dockPanel, setLeftOpen, setRightOpen]
    );

    // Render a panel from registry
    const renderPanelContent = useCallback((panelId, panelState) => {
        // Left panel tabs
        if (panelId.startsWith("left-")) {
            const tabId = panelId.replace("left-", "");
            return renderLeftPanelTabContent(tabId, {});
        }

        // Right panel tabs
        if (panelId.startsWith("right-")) {
            const tabId = panelId.replace("right-", "");
            return renderRightPanelTabContent(tabId, {});
        }

        // Custom content provided at popOut time
        if (panelState.content) {
            return panelState.content;
        }

        return null;
    }, []);

    return (
        <>
            {/* Render all floating panels from registry (left/right panel tabs) */}
            {Object.entries(floatingPanels)
                .filter(([id]) =>
                    id !== SCRATCHPAD_PANEL_ID &&
                    id !== INSTANCE_TOOLS_PANEL_ID &&
                    id !== VIEW_LINK_MANAGER_PANEL_ID &&
                    id !== USER_FOLLOWING_PANEL_ID &&
                    id !== WORKSPACE_LINKS_HUB_PANEL_ID &&
                    id !== VR_SESSION_PANEL_ID
                ) // Handled separately
                .map(([panelId, panelState]) => {
                    // Find tab config for icon/color
                    let tabConfig = null;
                    if (panelId.startsWith("left-")) {
                        const tabId = panelId.replace("left-", "");
                        tabConfig = LEFT_PANEL_TABS.find((t) => t.id === tabId);
                    } else if (panelId.startsWith("right-")) {
                        const tabId = panelId.replace("right-", "");
                        tabConfig = RIGHT_PANEL_TABS.find((t) => t.id === tabId);
                    }

                    return (
                        <FloatingPanel
                            key={panelId}
                            panelId={panelId}
                            title={panelState.title || tabConfig?.label || panelId}
                            icon={panelState.icon || tabConfig?.icon}
                            color={panelState.color || tabConfig?.color || "blue"}
                            onDock={() => handleDock(panelId)}
                        >
                            {renderPanelContent(panelId, panelState)}
                        </FloatingPanel>
                    );
                })}

            {/* ScratchPad - Independent floating panel */}
            <ScratchPadFloating />

            {/* Instance Tools - Floating panel for viewport tools */}
            <InstanceToolsFloating />

            {/* Link Manager Panels - View Links, User Following, Workspace Links Hub */}
            <AllLinkManagerFloating />

            {/* VR Session Panel - Shows during active VR sessions */}
            <VRSessionFloating />
        </>
    );
}

export default AllFloatingPanels;