/**
 * @file PopoutButtons.jsx
 * @description Buttons to toggle floating popout panels.
 */

// UPDATED: Now uses useScratchPadFloating hook for proper floating panel integration

import React, { useCallback } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from "@UI/react/components/atoms/Tooltip";
import { useScratchPadFloating } from "@UI/react/components/panels/FloatingPanel/ScratchPadFloating";
import { useLayoutPanelContext, DOCK_POSITIONS } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";

import "./PopoutButtons.scss";

/**
 * PopoutButtons - Floating panel toggle buttons
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onToggleNavigator] - Optional override for navigator toggle
 */
export function PopoutButtons({ onToggleNavigator }) {
    // ScratchPad floating panel
    const scratchPad = useScratchPadFloating();

    // Canvas Navigator - uses LayoutPanelContext
    const layoutContext = useLayoutPanelContext?.() || {};
    const { dockPosition, setDockPosition } = layoutContext;

    // Toggle canvas navigator between docked and floating
    const handleToggleNavigator = useCallback(() => {
        if (onToggleNavigator) {
            onToggleNavigator();
            return;
        }

        if (setDockPosition) {
            const isFloating =
                dockPosition === DOCK_POSITIONS.FLOAT ||
                dockPosition === DOCK_POSITIONS.BOTTOM_LEFT ||
                dockPosition === DOCK_POSITIONS.BOTTOM_RIGHT;

            if (isFloating) {
                setDockPosition(DOCK_POSITIONS.LEFT_PANEL);
            } else {
                setDockPosition(DOCK_POSITIONS.BOTTOM_LEFT);
            }
        }
    }, [onToggleNavigator, dockPosition, setDockPosition]);

    // Toggle ScratchPad
    const handleToggleScratchPad = useCallback(
        (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            scratchPad.toggle({
                x: rect.left,
                y: rect.top - 410, // Position above the button
            });
        },
        [scratchPad]
    );

    const isNavigatorFloating =
        dockPosition &&
        dockPosition !== DOCK_POSITIONS.LEFT_PANEL &&
        dockPosition !== DOCK_POSITIONS.MINIMIZED;

    return (
        <div className="popout-buttons">
            {/* Canvas Navigator */}
            <Tooltip content="Canvas Navigator">
                <button
                    className={`popout-buttons__btn ${isNavigatorFloating ? "active" : ""}`}
                    onClick={handleToggleNavigator}
                    aria-pressed={isNavigatorFloating}
                    type="button"
                >
                    <Icon name="map" size={16} />
                </button>
            </Tooltip>

            {/* ScratchPad */}
            <Tooltip content="Scratch Pad">
                <button
                    className={`popout-buttons__btn ${scratchPad.isOpen ? "active" : ""}`}
                    onClick={handleToggleScratchPad}
                    aria-pressed={scratchPad.isOpen}
                    type="button"
                >
                    <Icon name="stickyNote" size={16} />
                </button>
            </Tooltip>
        </div>
    );
}

export default PopoutButtons;