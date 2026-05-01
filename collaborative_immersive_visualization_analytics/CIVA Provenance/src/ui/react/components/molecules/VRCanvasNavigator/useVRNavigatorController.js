/**
 * @file useVRNavigatorController.js
 * @description Hook for integrating VR controller input with canvas navigator.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useVRNavigator } from './VRNavigatorContext';

// Thumbstick threshold for navigation
const THUMBSTICK_THRESHOLD = 0.5;

// Debounce time for thumbstick navigation (ms)
const NAV_DEBOUNCE = 300;

/**
 * useVRNavigatorController - Handle VR controller input for navigator
 * @param {Object} options - Configuration options
 * @param {Function} options.onNavigate - Callback for navigation (dx, dy)
 * @param {Function} options.onZoom - Callback for zoom (direction)
 */
export function useVRNavigatorController({ onNavigate, onZoom }) {
    const { handleGripChange, cancelOperation } = useVRNavigator();

    const lastNavTime = useRef(0);
    const thumbstickState = useRef({ x: 0, y: 0 });

    /**
     * Process thumbstick input for navigation
     */
    const processThumbstick = useCallback(
        (x, y) => {
            const now = Date.now();

            // Debounce navigation
            if (now - lastNavTime.current < NAV_DEBOUNCE) return;

            // Check if thumbstick is pushed past threshold
            if (Math.abs(x) > THUMBSTICK_THRESHOLD || Math.abs(y) > THUMBSTICK_THRESHOLD) {
                const dx = x > THUMBSTICK_THRESHOLD ? 1 : x < -THUMBSTICK_THRESHOLD ? -1 : 0;
                const dy = y > THUMBSTICK_THRESHOLD ? 1 : y < -THUMBSTICK_THRESHOLD ? -1 : 0;

                if (dx !== 0 || dy !== 0) {
                    onNavigate?.(dx, dy);
                    lastNavTime.current = now;
                }
            }

            thumbstickState.current = { x, y };
        },
        [onNavigate]
    );

    /**
     * Handle controller input event
     */
    const handleControllerInput = useCallback(
        (event) => {
            switch (event.type) {
                case 'grip':
                    // Grip button for multi-select modifier
                    handleGripChange(event.pressed);
                    break;

                case 'thumbstick':
                    // Thumbstick for navigation
                    processThumbstick(event.x, event.y);
                    break;

                case 'button_b':
                    // B button to cancel operations
                    if (event.pressed) {
                        cancelOperation();
                    }
                    break;

                case 'button_y':
                    // Y button for zoom in
                    if (event.pressed) {
                        onZoom?.(1);
                    }
                    break;

                case 'button_a':
                    // A button for zoom out (when combined with modifier)
                    if (event.pressed && event.modifier) {
                        onZoom?.(-1);
                    }
                    break;

                default:
                    break;
            }
        },
        [handleGripChange, processThumbstick, cancelOperation, onZoom]
    );

    useEffect(() => {
        // In production, this would connect to WebXR controller events
        // For now, we provide keyboard fallbacks for development

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    onNavigate?.(0, -1);
                    break;
                case 'ArrowDown':
                    onNavigate?.(0, 1);
                    break;
                case 'ArrowLeft':
                    onNavigate?.(-1, 0);
                    break;
                case 'ArrowRight':
                    onNavigate?.(1, 0);
                    break;
                case 'Escape':
                    cancelOperation();
                    break;
                case '+':
                case '=':
                    onZoom?.(1);
                    break;
                case '-':
                    onZoom?.(-1);
                    break;
                case 'Shift':
                    handleGripChange(true);
                    break;
                default:
                    break;
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                handleGripChange(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Would also add XR controller event listeners here:
        // xrSession?.addEventListener('inputsourceschange', handleInputSourcesChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleGripChange, cancelOperation, onNavigate, onZoom]);

    return {
        handleControllerInput,
        processThumbstick,
    };
}

export default useVRNavigatorController;
