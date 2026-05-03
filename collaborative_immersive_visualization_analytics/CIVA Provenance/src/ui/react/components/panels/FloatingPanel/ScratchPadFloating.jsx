// src/ui/react/components/panels/FloatingPanel/ScratchPadFloating.jsx
// ScratchPad as a floating panel - independent of docked panels
//
// Can be opened from canvas toolbar and moved around freely.
// Uses the FloatingPanel system for position/size management.

import React, { memo, useCallback } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { FloatingPanel } from "./FloatingPanel";
import { useFloatingPanels } from "./FloatingPanelContext";
import { ScratchPad, useScratchPad } from "@UI/react/components/workspace/ScratchPad";

// =============================================================================
// CONSTANTS
// =============================================================================

export const SCRATCHPAD_PANEL_ID = "scratchpad";

export const SCRATCHPAD_CONFIG = {
    title: "Scratch Pad",
    icon: 'stickyNote',
    color: "amber",
    defaultWidth: 320,
    defaultHeight: 400,
    minWidth: 240,
    minHeight: 200,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * useScratchPadFloating - Hook to manage ScratchPad floating panel
 */
export function useScratchPadFloating() {
    const { popOutPanel, dockPanel, isPoppedOut, bringToFront } = useFloatingPanels();

    const isOpen = isPoppedOut(SCRATCHPAD_PANEL_ID);

    const open = useCallback(
        (position = {}) => {
            popOutPanel(SCRATCHPAD_PANEL_ID, {
                ...SCRATCHPAD_CONFIG,
                x: position.x ?? window.innerWidth - SCRATCHPAD_CONFIG.defaultWidth - 20,
                y: position.y ?? window.innerHeight - SCRATCHPAD_CONFIG.defaultHeight - 80,
                width: SCRATCHPAD_CONFIG.defaultWidth,
                height: SCRATCHPAD_CONFIG.defaultHeight,
            });
        },
        [popOutPanel]
    );

    const close = useCallback(() => {
        dockPanel(SCRATCHPAD_PANEL_ID);
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
        bringToFront(SCRATCHPAD_PANEL_ID);
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
 * ScratchPadFloating - Floating ScratchPad panel
 *
 * This component should be rendered in AllFloatingPanels or similar.
 * It checks if ScratchPad is supposed to be open and renders the FloatingPanel.
 */
export const ScratchPadFloating = memo(function ScratchPadFloating() {
    const { floatingPanels, dockPanel } = useFloatingPanels();

    const panelState = floatingPanels[SCRATCHPAD_PANEL_ID];

    // Get ScratchPad logic
    const scratchPad = useScratchPad({
        initialScope: "personal",
        initialExpanded: true,
    });

    // Handle close/dock
    const handleClose = useCallback(() => {
        dockPanel(SCRATCHPAD_PANEL_ID);
    }, [dockPanel]);

    // Don't render if not open
    if (!panelState) return null;

    return (
        <FloatingPanel
            panelId={SCRATCHPAD_PANEL_ID}
            title={SCRATCHPAD_CONFIG.title}
            icon={SCRATCHPAD_CONFIG.icon}
            color={SCRATCHPAD_CONFIG.color}
            onDock={handleClose}
        >
            <ScratchPadContent scratchPad={scratchPad} />
        </FloatingPanel>
    );
});

/**
 * ScratchPadContent - The actual ScratchPad content for the floating panel
 */
const ScratchPadContent = memo(function ScratchPadContent({ scratchPad }) {
    return (
        <div className="scratchpad-floating">
            <ScratchPad
                isExpanded={true}
                scope={scratchPad.scope}
                onScopeChange={scratchPad.setScope}
                isPinned={false}
                onTogglePin={() => { }}
                isDetached={true}
                onToggleDetach={() => { }}
                onClose={() => { }}
                clipboardItems={scratchPad.clipboardItems}
                onRemoveItem={scratchPad.removeItem}
                onClearClipboard={scratchPad.clearClipboard}
                onDragStart={scratchPad.handleDragStart}
                onDragEnd={scratchPad.handleDragEnd}
                quickTools={scratchPad.quickTools}
                activeTool={scratchPad.activeTool}
                onActivateTool={scratchPad.setActiveTool}
            />
        </div>
    );
});

export default ScratchPadFloating;