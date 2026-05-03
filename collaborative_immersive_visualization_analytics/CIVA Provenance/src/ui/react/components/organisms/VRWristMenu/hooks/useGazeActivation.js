/**
 * @file useGazeActivation.js
 * @description Hook for gaze-based activation with dwell timer.
 *
 * Activates after user looks at target for specified duration.
 * Provides progress for visual feedback (dwell ring).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ACTIVATION_CONFIG } from '../VRWristMenuContext';

/**
 * Hook for gaze-based activation
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.isGazing - Whether user is currently gazing at target
 * @param {number} options.dwellTime - Time in ms to activate (default 500)
 * @param {Function} options.onActivate - Callback when activation completes
 * @param {boolean} options.enabled - Whether activation is enabled
 * @returns {Object} Activation state and progress
 */
export function useGazeActivation({
    isGazing = false,
    dwellTime = ACTIVATION_CONFIG.dwellTime,
    onActivate,
    enabled = true,
}) {
    const [progress, setProgress] = useState(0);
    const [isActivating, setIsActivating] = useState(false);
    const startTimeRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Reset activation
    const reset = useCallback(() => {
        setProgress(0);
        setIsActivating(false);
        startTimeRef.current = null;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    // Update progress during gaze
    useEffect(() => {
        if (!enabled || !isGazing) {
            reset();
            return;
        }

        setIsActivating(true);
        startTimeRef.current = performance.now();

        const updateProgress = () => {
            if (!startTimeRef.current) return;

            const elapsed = performance.now() - startTimeRef.current;
            const newProgress = Math.min(1, elapsed / dwellTime);

            setProgress(newProgress);

            if (newProgress >= 1) {
                // Activation complete
                onActivate?.();
                reset();
            } else {
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateProgress);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, isGazing, dwellTime, onActivate, reset]);

    return {
        progress,
        isActivating,
        reset,
    };
}

/**
 * Hook for double-tap detection
 *
 * @param {Object} options - Configuration options
 * @param {string} options.button - Button to detect ('x', 'y', 'a', 'b')
 * @param {string} options.hand - Hand to detect ('left', 'right')
 * @param {number} options.threshold - Max time between taps in ms
 * @param {Function} options.onDoubleTap - Callback when double-tap detected
 * @param {boolean} options.enabled - Whether detection is enabled
 */
export function useDoubleTapDetection({
    button = 'x',
    hand = 'left',
    threshold = ACTIVATION_CONFIG.doubleTapThreshold,
    onDoubleTap,
    enabled = true,
}) {
    const lastTapTimeRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        const handleButtonPress = (event) => {
            const { button: pressedButton, handedness } = event.detail || event;

            if (pressedButton !== button || handedness !== hand) return;

            const now = performance.now();
            const timeSinceLastTap = now - lastTapTimeRef.current;

            if (timeSinceLastTap < threshold) {
                // Double tap detected
                onDoubleTap?.();
                lastTapTimeRef.current = 0; // Reset to prevent triple-tap
            } else {
                lastTapTimeRef.current = now;
            }
        };

        // Listen for button events (this would come from VRManager)
        window.addEventListener('cia:vr-button-press', handleButtonPress);

        return () => {
            window.removeEventListener('cia:vr-button-press', handleButtonPress);
        };
    }, [enabled, button, hand, threshold, onDoubleTap]);
}

/**
 * Hook for dismiss detection (looking away)
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.isGazing - Whether user is currently gazing at menu
 * @param {number} options.dismissTime - Time in ms to dismiss (default 500)
 * @param {Function} options.onDismiss - Callback when dismiss triggers
 * @param {boolean} options.enabled - Whether dismiss detection is enabled
 */
export function useDismissDetection({
    isGazing = true,
    dismissTime = ACTIVATION_CONFIG.dismissTime,
    onDismiss,
    enabled = true,
}) {
    const notGazingStartRef = useRef(null);

    useEffect(() => {
        if (!enabled) {
            notGazingStartRef.current = null;
            return;
        }

        if (isGazing) {
            notGazingStartRef.current = null;
            return;
        }

        // User stopped gazing - start dismiss timer
        notGazingStartRef.current = performance.now();

        const checkDismiss = () => {
            if (!notGazingStartRef.current) return;

            const elapsed = performance.now() - notGazingStartRef.current;
            if (elapsed >= dismissTime) {
                onDismiss?.();
                notGazingStartRef.current = null;
            }
        };

        const intervalId = setInterval(checkDismiss, 100);

        return () => {
            clearInterval(intervalId);
        };
    }, [enabled, isGazing, dismissTime, onDismiss]);
}

export default useGazeActivation;
