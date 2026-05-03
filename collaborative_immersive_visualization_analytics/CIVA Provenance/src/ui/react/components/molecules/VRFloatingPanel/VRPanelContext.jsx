/**
 * @file VRPanelContext.jsx
 * @description Context for managing VR floating panel state.
 * Extends panel management with 3D positioning capabilities.
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
} from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Panel positioning modes in VR
 */
export const VR_PANEL_MODES = {
    HUD: 'hud',
    WORLD: 'world',
    HAND: 'hand',
    DASHBOARD: 'dashboard',
};

/**
 * Predefined snap positions
 */
export const VR_SNAP_POSITIONS = {
    HUD_CENTER: { mode: 'hud', offset: { x: 0, y: 0, z: -0.8 } },
    HUD_LEFT: { mode: 'hud', offset: { x: -0.4, y: 0, z: -0.7 } },
    HUD_RIGHT: { mode: 'hud', offset: { x: 0.4, y: 0, z: -0.7 } },
    HUD_TOP: { mode: 'hud', offset: { x: 0, y: 0.3, z: -0.8 } },
    HUD_BOTTOM: { mode: 'hud', offset: { x: 0, y: -0.3, z: -0.8 } },
    LEFT_WRIST: { mode: 'hand', hand: 'left', offset: { x: 0, y: 0.1, z: 0 } },
    RIGHT_WRIST: { mode: 'hand', hand: 'right', offset: { x: 0, y: 0.1, z: 0 } },
    DASHBOARD_LEFT: { mode: 'dashboard', angle: -45, distance: 1.2, height: 1.2 },
    DASHBOARD_CENTER: { mode: 'dashboard', angle: 0, distance: 1.0, height: 1.4 },
    DASHBOARD_RIGHT: { mode: 'dashboard', angle: 45, distance: 1.2, height: 1.2 },
};

/**
 * Panel size presets (in meters)
 */
export const VR_PANEL_SIZES = {
    SMALL: { width: 0.3, height: 0.25 },
    MEDIUM: { width: 0.45, height: 0.35 },
    LARGE: { width: 0.6, height: 0.5 },
    WIDE: { width: 0.7, height: 0.35 },
    TALL: { width: 0.35, height: 0.6 },
};

// =============================================================================
// CONTEXT
// =============================================================================

const VRPanelContext = createContext(null);

/**
 * Get default VR state for a panel
 */
function getDefaultVRState(panelId) {
    return {
        panelId,
        mode: VR_PANEL_MODES.HUD,
        position: { x: 0, y: 0, z: -0.8 },
        rotation: { x: 0, y: 0, z: 0 },
        offset: { x: 0, y: 0, z: -0.8 },
        width: VR_PANEL_SIZES.MEDIUM.width,
        height: VR_PANEL_SIZES.MEDIUM.height,
        scale: 1,
        opacity: 1,
        minimized: false,
        snappedTo: null,
        initialized: false,
    };
}

/**
 * VRPanelProvider - Manages VR panel state
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.isVR=false] - Whether in VR mode
 */
export function VRPanelProvider({ children, isVR = false }) {
    const [vrPanelStates, setVRPanelStates] = useState(new Map());
    const [grabbedPanel, setGrabbedPanel] = useState(null);
    const [activeSnapZone, setActiveSnapZone] = useState(null);
    const [arrangementMode, setArrangementMode] = useState('free');

    const setVRPanelState = useCallback((panelId, state) => {
        setVRPanelStates((prev) => {
            const next = new Map(prev);
            next.set(panelId, { ...next.get(panelId), ...state });
            return next;
        });
    }, []);

    const getVRPanelState = useCallback(
        (panelId) => {
            return vrPanelStates.get(panelId) || getDefaultVRState(panelId);
        },
        [vrPanelStates]
    );

    const initializeVRPanel = useCallback((panelId, options = {}) => {
        const defaultState = getDefaultVRState(panelId);
        setVRPanelStates((prev) => {
            const next = new Map(prev);
            next.set(panelId, {
                ...defaultState,
                ...options,
                initialized: true,
            });
            return next;
        });
    }, []);

    const removeVRPanel = useCallback((panelId) => {
        setVRPanelStates((prev) => {
            const next = new Map(prev);
            next.delete(panelId);
            return next;
        });
    }, []);

    const startGrab = useCallback((panelId, controllerId, grabPoint) => {
        setGrabbedPanel({
            panelId,
            controllerId,
            grabPoint,
            startTime: Date.now(),
        });
    }, []);

    const updateGrab = useCallback(
        (controllerPosition, controllerRotation) => {
            if (!grabbedPanel) return;

            setVRPanelStates((prev) => {
                const next = new Map(prev);
                const panel = next.get(grabbedPanel.panelId);
                if (panel) {
                    next.set(grabbedPanel.panelId, {
                        ...panel,
                        position: controllerPosition,
                        rotation: controllerRotation,
                        mode: VR_PANEL_MODES.WORLD,
                    });
                }
                return next;
            });
        },
        [grabbedPanel]
    );

    const endGrab = useCallback(
        (snapToZone = true) => {
            if (!grabbedPanel) return;

            if (snapToZone && activeSnapZone) {
                const snapPosition = VR_SNAP_POSITIONS[activeSnapZone];
                if (snapPosition) {
                    setVRPanelStates((prev) => {
                        const next = new Map(prev);
                        const panel = next.get(grabbedPanel.panelId);
                        if (panel) {
                            next.set(grabbedPanel.panelId, {
                                ...panel,
                                ...snapPosition,
                                snappedTo: activeSnapZone,
                            });
                        }
                        return next;
                    });
                }
            }

            setGrabbedPanel(null);
            setActiveSnapZone(null);
        },
        [grabbedPanel, activeSnapZone]
    );

    const snapPanelTo = useCallback((panelId, snapPosition) => {
        const position = VR_SNAP_POSITIONS[snapPosition];
        if (!position) return;

        setVRPanelStates((prev) => {
            const next = new Map(prev);
            const panel = next.get(panelId);
            if (panel) {
                next.set(panelId, {
                    ...panel,
                    ...position,
                    snappedTo: snapPosition,
                });
            }
            return next;
        });
    }, []);

    const resizePanel = useCallback((panelId, delta) => {
        setVRPanelStates((prev) => {
            const next = new Map(prev);
            const panel = next.get(panelId);
            if (panel) {
                const newWidth = Math.max(
                    0.2,
                    Math.min(1.0, panel.width + delta.x * 0.01)
                );
                const newHeight = Math.max(
                    0.15,
                    Math.min(0.8, panel.height + delta.y * 0.01)
                );
                next.set(panelId, {
                    ...panel,
                    width: newWidth,
                    height: newHeight,
                });
            }
            return next;
        });
    }, []);

    const arrangeDashboard = useCallback(() => {
        const panelIds = Array.from(vrPanelStates.keys());
        const positions = ['DASHBOARD_LEFT', 'DASHBOARD_CENTER', 'DASHBOARD_RIGHT'];

        panelIds.forEach((panelId, index) => {
            if (index < positions.length) {
                snapPanelTo(panelId, positions[index]);
            }
        });

        setArrangementMode('dashboard');
    }, [vrPanelStates, snapPanelTo]);

    const stackPanels = useCallback(() => {
        const panelIds = Array.from(vrPanelStates.keys());

        panelIds.forEach((panelId, index) => {
            setVRPanelStates((prev) => {
                const next = new Map(prev);
                const panel = next.get(panelId);
                if (panel) {
                    next.set(panelId, {
                        ...panel,
                        mode: VR_PANEL_MODES.HUD,
                        offset: { x: 0, y: 0, z: -0.8 - index * 0.05 },
                        snappedTo: null,
                    });
                }
                return next;
            });
        });

        setArrangementMode('stacked');
    }, [vrPanelStates]);

    const contextValue = useMemo(
        () => ({
            isVR,
            vrPanelStates,
            getVRPanelState,
            setVRPanelState,
            initializeVRPanel,
            removeVRPanel,
            grabbedPanel,
            startGrab,
            updateGrab,
            endGrab,
            activeSnapZone,
            setActiveSnapZone,
            snapPanelTo,
            resizePanel,
            arrangementMode,
            arrangeDashboard,
            stackPanels,
        }),
        [
            isVR,
            vrPanelStates,
            getVRPanelState,
            setVRPanelState,
            initializeVRPanel,
            removeVRPanel,
            grabbedPanel,
            startGrab,
            updateGrab,
            endGrab,
            activeSnapZone,
            snapPanelTo,
            resizePanel,
            arrangementMode,
            arrangeDashboard,
            stackPanels,
        ]
    );

    return (
        <VRPanelContext.Provider value={contextValue}>
            {children}
        </VRPanelContext.Provider>
    );
}

/**
 * useVRPanels - Access VR panel context
 */
export function useVRPanels() {
    const context = useContext(VRPanelContext);
    if (!context) {
        throw new Error('useVRPanels must be used within VRPanelProvider');
    }
    return context;
}

export default VRPanelProvider;
