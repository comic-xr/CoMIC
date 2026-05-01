/**
 * @file InstanceToolsFloating.jsx
 * @description Instance Tools as a floating panel - can be opened from viewport wrench button.
 *
 * Opens near the active viewport and follows the active instance.
 * Uses the FloatingPanel system for position/size management.
 *
 * @see Canvas_Area_Design_Specification.md - Instance Tools Floating Panel section
 */

import React, { memo, useCallback, useEffect, useState } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useFloatingPanels } from "./FloatingPanelContext";

// Import the actual Instance Tools content
import { InstanceToolsPanelContent } from "@UI/react/components/panels/LeftPanel/tabs/InstanceToolsTab";

// =============================================================================
// CONSTANTS
// =============================================================================

export const INSTANCE_TOOLS_PANEL_ID = "instanceTools";

export const INSTANCE_TOOLS_CONFIG = {
    title: "Instance Tools",
    icon: "wrench",
    color: "amber",
    defaultWidth: 300,
    defaultHeight: 450,
    minWidth: 260,
    minHeight: 300,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * useInstanceToolsFloating - Hook to manage Instance Tools floating panel
 *
 * @example
 * const { isOpen, open, close, toggle } = useInstanceToolsFloating();
 */
export function useInstanceToolsFloating() {
    const { popOutPanel, dockPanel, isPoppedOut, bringToFront } = useFloatingPanels();

    const isOpen = isPoppedOut(INSTANCE_TOOLS_PANEL_ID);

    const open = useCallback(
        (position = {}) => {
            // Default position: near center-right of screen
            const defaultX = window.innerWidth - INSTANCE_TOOLS_CONFIG.defaultWidth - 80;
            const defaultY = 120;

            popOutPanel(INSTANCE_TOOLS_PANEL_ID, {
                ...INSTANCE_TOOLS_CONFIG,
                x: position.x ?? defaultX,
                y: position.y ?? defaultY,
                width: INSTANCE_TOOLS_CONFIG.defaultWidth,
                height: INSTANCE_TOOLS_CONFIG.defaultHeight,
            });
        },
        [popOutPanel]
    );

    const close = useCallback(() => {
        dockPanel(INSTANCE_TOOLS_PANEL_ID);
    }, [dockPanel]);

    const toggle = useCallback(
        (position) => {
            if (isOpen) {
                close();
            } else {
                open(position);
            }
        },
        [isOpen, open, close]
    );

    const focus = useCallback(() => {
        bringToFront(INSTANCE_TOOLS_PANEL_ID);
    }, [bringToFront]);

    return {
        isOpen,
        open,
        close,
        toggle,
        focus,
    };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * InstanceToolsFloating - Floating Instance Tools panel
 *
 * This component should be rendered in AllFloatingPanels.
 * It listens for 'cia:open-instance-tools' events and opens near the source viewport.
 */
export const InstanceToolsFloating = memo(function InstanceToolsFloating() {
    const { floatingPanels, dockPanel, bringToFront, popOutPanel } = useFloatingPanels();

    const panelState = floatingPanels[INSTANCE_TOOLS_PANEL_ID];

    // Listen for open events from viewport wrench buttons
    useEffect(() => {
        const handleOpenInstanceTools = (event) => {
            const detail = event.detail || {};

            // Calculate position near the triggering viewport if position provided
            let x = window.innerWidth - INSTANCE_TOOLS_CONFIG.defaultWidth - 80;
            let y = 120;

            if (detail.viewportRect) {
                // Position to the right of the viewport
                x = Math.min(
                    detail.viewportRect.right + 10,
                    window.innerWidth - INSTANCE_TOOLS_CONFIG.defaultWidth - 20
                );
                y = Math.max(
                    detail.viewportRect.top,
                    50
                );
            } else if (detail.x !== undefined && detail.y !== undefined) {
                x = detail.x;
                y = detail.y;
            }

            // Always open floating panel (per spec, floating is the primary UI)
            // If already open, just bring to front
            if (panelState) {
                bringToFront(INSTANCE_TOOLS_PANEL_ID);
            } else {
                popOutPanel(INSTANCE_TOOLS_PANEL_ID, {
                    ...INSTANCE_TOOLS_CONFIG,
                    x,
                    y,
                    width: INSTANCE_TOOLS_CONFIG.defaultWidth,
                    height: INSTANCE_TOOLS_CONFIG.defaultHeight,
                });
            }
        };

        // Toggle handler for keyboard shortcut (T key)
        const handleToggleInstanceTools = () => {
            if (panelState) {
                // Close if open
                dockPanel(INSTANCE_TOOLS_PANEL_ID);
            } else {
                // Open at default position
                popOutPanel(INSTANCE_TOOLS_PANEL_ID, {
                    ...INSTANCE_TOOLS_CONFIG,
                    x: window.innerWidth - INSTANCE_TOOLS_CONFIG.defaultWidth - 80,
                    y: 120,
                    width: INSTANCE_TOOLS_CONFIG.defaultWidth,
                    height: INSTANCE_TOOLS_CONFIG.defaultHeight,
                });
            }
        };

        // Listen for BOTH events - floating version and regular open
        window.addEventListener('cia:open-instance-tools-floating', handleOpenInstanceTools);
        window.addEventListener('cia:open-instance-tools', handleOpenInstanceTools);
        window.addEventListener('cia:toggle-instance-tools-floating', handleToggleInstanceTools);
        return () => {
            window.removeEventListener('cia:open-instance-tools-floating', handleOpenInstanceTools);
            window.removeEventListener('cia:open-instance-tools', handleOpenInstanceTools);
            window.removeEventListener('cia:toggle-instance-tools-floating', handleToggleInstanceTools);
        };
    }, [popOutPanel, dockPanel, bringToFront, panelState]);

    // Handle close/dock - dock back to left panel
    const handleClose = useCallback(() => {
        dockPanel(INSTANCE_TOOLS_PANEL_ID);
    }, [dockPanel]);

    // Don't render if not open
    if (!panelState) return null;

    return (
        <FloatingPanel
            panelId={INSTANCE_TOOLS_PANEL_ID}
            color={INSTANCE_TOOLS_CONFIG.color}
            onDock={handleClose}
        >
            <InstanceToolsContent />
        </FloatingPanel>
    );
});

/**
 * InstanceToolsContent - The actual Instance Tools content for the floating panel
 */
const InstanceToolsContent = memo(function InstanceToolsContent() {
    return (
        <div className="instance-tools-floating">
            <InstanceToolsPanelContent />
        </div>
    );
});

export default InstanceToolsFloating;
