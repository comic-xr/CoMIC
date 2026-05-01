/**
 * @file VRWristMenuContext.jsx
 * @description Context and provider for VR Wrist Menu state management.
 *
 * Manages:
 * - Menu open/closed state
 * - Active segment
 * - Sub-menu navigation stack
 * - Integration with VRManager
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { vrManager } from '@Core/vr/VRManager.js';

// =============================================================================
// MENU CONFIGURATION
// =============================================================================

/**
 * Menu segments configuration
 */
export const WRIST_MENU_SEGMENTS = [
    { id: 'tools', label: 'Tools', icon: 'wrench', angle: 0, color: 'amber' },
    { id: 'voice', label: 'Voice', icon: 'mic', angle: 45, color: 'green' },
    { id: 'people', label: 'People', icon: 'users', angle: 90, color: 'blue' },
    { id: 'panels', label: 'Panels', icon: 'layout', angle: 135, color: 'purple' },
    { id: 'exit', label: 'Exit', icon: 'doorOpen', angle: 180, color: 'pink' },
    { id: 'space', label: 'Space', icon: 'move', angle: 225, color: 'teal' },
    { id: 'views', label: 'Views', icon: 'grid', angle: 270, color: 'cyan' },
    { id: 'record', label: 'Record', icon: 'video', angle: 315, color: 'orange' },
];

/**
 * Menu activation config
 */
export const ACTIVATION_CONFIG = {
    dwellTime: 500,         // ms for gaze activation
    doubleTapThreshold: 300, // ms between taps for double-tap
    dismissAngle: 45,       // degrees to look away for dismiss
    dismissTime: 500,       // ms to look away for auto-dismiss
};

// =============================================================================
// CONTEXT
// =============================================================================

const VRWristMenuContext = createContext({
    isOpen: false,
    activeSegment: null,
    subMenuStack: [],
    openMenu: () => {},
    closeMenu: () => {},
    selectSegment: () => {},
    openSubMenu: () => {},
    closeSubMenu: () => {},
    executeAction: () => {},
});

// =============================================================================
// PROVIDER
// =============================================================================

export function VRWristMenuProvider({ children }) {
    // Menu state
    const [isOpen, setIsOpen] = useState(false);
    const [activeSegment, setActiveSegment] = useState(null);
    const [subMenuStack, setSubMenuStack] = useState([]);
    const [hoveredSegment, setHoveredSegment] = useState(null);

    // Open the menu
    const openMenu = useCallback(() => {
        setIsOpen(true);
        setActiveSegment(null);
        setSubMenuStack([]);

        // Emit event for other systems
        window.dispatchEvent(new CustomEvent('cia:wrist-menu-opened'));
    }, []);

    // Close the menu
    const closeMenu = useCallback(() => {
        setIsOpen(false);
        setActiveSegment(null);
        setSubMenuStack([]);
        setHoveredSegment(null);

        // Emit event for other systems
        window.dispatchEvent(new CustomEvent('cia:wrist-menu-closed'));
    }, []);

    // Toggle menu
    const toggleMenu = useCallback(() => {
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }, [isOpen, openMenu, closeMenu]);

    // Select a segment
    const selectSegment = useCallback((segmentId) => {
        setActiveSegment(segmentId);

        // Emit event
        window.dispatchEvent(new CustomEvent('cia:wrist-menu-segment-selected', {
            detail: { segmentId }
        }));
    }, []);

    // Hover a segment
    const hoverSegment = useCallback((segmentId) => {
        setHoveredSegment(segmentId);
    }, []);

    // Open a sub-menu
    const openSubMenu = useCallback((menuId, parentSegmentId) => {
        setSubMenuStack(prev => [...prev, { menuId, parentSegmentId }]);
    }, []);

    // Close current sub-menu (go back)
    const closeSubMenu = useCallback(() => {
        setSubMenuStack(prev => prev.slice(0, -1));
    }, []);

    // Execute an action and optionally close menu
    const executeAction = useCallback((actionId, closeAfter = true) => {
        // Emit action event
        window.dispatchEvent(new CustomEvent('cia:wrist-menu-action', {
            detail: { actionId }
        }));

        if (closeAfter) {
            closeMenu();
        }
    }, [closeMenu]);

    // Get current sub-menu
    const currentSubMenu = useMemo(() => {
        if (subMenuStack.length === 0) return null;
        return subMenuStack[subMenuStack.length - 1];
    }, [subMenuStack]);

    // Subscribe to VRManager events for controller input
    useEffect(() => {
        if (!vrManager) return;

        // Handle X button for menu toggle
        const handleButtonPress = (event) => {
            const { button, handedness } = event.detail || event;

            // X button on left controller toggles menu
            if (handedness === 'left' && button === 'x') {
                toggleMenu();
            }

            // B button closes menu/sub-menu
            if (button === 'b' && isOpen) {
                if (subMenuStack.length > 0) {
                    closeSubMenu();
                } else {
                    closeMenu();
                }
            }
        };

        vrManager.on('buttonPress', handleButtonPress);

        return () => {
            vrManager.off('buttonPress', handleButtonPress);
        };
    }, [isOpen, subMenuStack, toggleMenu, closeMenu, closeSubMenu]);

    // Context value
    const value = useMemo(() => ({
        isOpen,
        activeSegment,
        hoveredSegment,
        subMenuStack,
        currentSubMenu,
        segments: WRIST_MENU_SEGMENTS,
        openMenu,
        closeMenu,
        toggleMenu,
        selectSegment,
        hoverSegment,
        openSubMenu,
        closeSubMenu,
        executeAction,
    }), [
        isOpen,
        activeSegment,
        hoveredSegment,
        subMenuStack,
        currentSubMenu,
        openMenu,
        closeMenu,
        toggleMenu,
        selectSegment,
        hoverSegment,
        openSubMenu,
        closeSubMenu,
        executeAction,
    ]);

    return (
        <VRWristMenuContext.Provider value={value}>
            {children}
        </VRWristMenuContext.Provider>
    );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access wrist menu context
 */
export function useVRWristMenu() {
    const context = useContext(VRWristMenuContext);
    if (!context) {
        // Return no-op defaults if no provider
        return {
            isOpen: false,
            activeSegment: null,
            hoveredSegment: null,
            subMenuStack: [],
            currentSubMenu: null,
            segments: WRIST_MENU_SEGMENTS,
            openMenu: () => {},
            closeMenu: () => {},
            toggleMenu: () => {},
            selectSegment: () => {},
            hoverSegment: () => {},
            openSubMenu: () => {},
            closeSubMenu: () => {},
            executeAction: () => {},
        };
    }
    return context;
}

export default VRWristMenuContext;
