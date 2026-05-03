/**
 * @file useVRManagerEvents.js
 * @description React hook to bridge VRManager events to React state.
 *
 * Subscribes to VRManager events and exposes VR state as React state,
 * including hand poses, controller states, and VR session status.
 */

import { useState, useEffect, useCallback } from 'react';
import { vrManager } from '@Core/vr/VRManager.js';

/**
 * Hook to subscribe to VRManager events and expose VR state
 * @returns {Object} VR state including hand poses, controllers, and session info
 */
export function useVRManagerEvents() {
    // Hand tracking state
    const [handPoses, setHandPoses] = useState({ left: null, right: null });

    // Controller state
    const [controllers, setControllers] = useState({ left: null, right: null });

    // Session state
    const [isInVR, setIsInVR] = useState(false);
    const [sessionType, setSessionType] = useState(null); // 'immersive-vr' | 'immersive-ar'

    // Controller button states
    const [buttonStates, setButtonStates] = useState({
        left: { trigger: false, grip: false, thumbstick: false, a: false, b: false },
        right: { trigger: false, grip: false, thumbstick: false, a: false, b: false },
    });

    // Subscribe to VR events
    useEffect(() => {
        if (!vrManager) return;

        // Session events
        const handleVREntered = (event) => {
            setIsInVR(true);
            setSessionType(event?.sessionType || 'immersive-vr');
        };

        const handleVRExited = () => {
            setIsInVR(false);
            setSessionType(null);
            setHandPoses({ left: null, right: null });
            setControllers({ left: null, right: null });
        };

        // Hand tracking events
        const handleHandUpdate = (event) => {
            const { hand, pose } = event || {};
            if (hand && pose) {
                setHandPoses((prev) => ({
                    ...prev,
                    [hand]: pose,
                }));
            }
        };

        // Controller events
        const handleControllerUpdate = (event) => {
            const { hand, controller } = event || {};
            if (hand && controller) {
                setControllers((prev) => ({
                    ...prev,
                    [hand]: controller,
                }));
            }
        };

        // Button events
        const handleButtonPress = (event) => {
            const { hand, button } = event || {};
            if (hand && button) {
                setButtonStates((prev) => ({
                    ...prev,
                    [hand]: {
                        ...prev[hand],
                        [button]: true,
                    },
                }));
            }
        };

        const handleButtonRelease = (event) => {
            const { hand, button } = event || {};
            if (hand && button) {
                setButtonStates((prev) => ({
                    ...prev,
                    [hand]: {
                        ...prev[hand],
                        [button]: false,
                    },
                }));
            }
        };

        // Subscribe to events
        vrManager.on('vrEntered', handleVREntered);
        vrManager.on('vrExited', handleVRExited);
        vrManager.on('handUpdate', handleHandUpdate);
        vrManager.on('controllerUpdate', handleControllerUpdate);
        vrManager.on('buttonPress', handleButtonPress);
        vrManager.on('buttonRelease', handleButtonRelease);

        // Check initial state
        if (vrManager.isInVR?.()) {
            setIsInVR(true);
        }

        // Cleanup
        return () => {
            vrManager.off('vrEntered', handleVREntered);
            vrManager.off('vrExited', handleVRExited);
            vrManager.off('handUpdate', handleHandUpdate);
            vrManager.off('controllerUpdate', handleControllerUpdate);
            vrManager.off('buttonPress', handleButtonPress);
            vrManager.off('buttonRelease', handleButtonRelease);
        };
    }, []);

    // Helper to get wrist position for a specific hand
    const getWristPosition = useCallback((hand) => {
        const pose = handPoses[hand];
        if (!pose?.wrist) return null;
        return pose.wrist;
    }, [handPoses]);

    // Helper to check if a button is pressed
    const isButtonPressed = useCallback((hand, button) => {
        return buttonStates[hand]?.[button] || false;
    }, [buttonStates]);

    return {
        // State
        handPoses,
        controllers,
        buttonStates,
        isInVR,
        sessionType,

        // Helpers
        getWristPosition,
        isButtonPressed,

        // Direct access to left/right
        leftHand: handPoses.left,
        rightHand: handPoses.right,
        leftController: controllers.left,
        rightController: controllers.right,
    };
}

/**
 * Hook to detect double-tap on a controller button
 * @param {string} hand - 'left' or 'right'
 * @param {string} button - Button name (e.g., 'a', 'b', 'trigger')
 * @param {number} maxInterval - Max time between taps in ms (default: 300)
 * @param {Function} onDoubleTap - Callback when double-tap detected
 */
export function useDoubleTapButton(hand, button, maxInterval = 300, onDoubleTap) {
    const [lastTapTime, setLastTapTime] = useState(0);

    useEffect(() => {
        if (!vrManager) return;

        const handleButtonPress = (event) => {
            if (event?.hand !== hand || event?.button !== button) return;

            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime;

            if (timeSinceLastTap < maxInterval && timeSinceLastTap > 50) {
                // Double tap detected
                onDoubleTap?.();
                setLastTapTime(0); // Reset to prevent triple-tap
            } else {
                setLastTapTime(now);
            }
        };

        vrManager.on('buttonPress', handleButtonPress);
        return () => vrManager.off('buttonPress', handleButtonPress);
    }, [hand, button, maxInterval, onDoubleTap, lastTapTime]);
}

export default useVRManagerEvents;
