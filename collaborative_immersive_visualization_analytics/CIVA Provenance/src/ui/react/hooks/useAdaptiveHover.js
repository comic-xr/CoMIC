/**
 * useAdaptiveHover - Unified hover detection for Desktop and VR
 *
 * Desktop: Traditional mouse hover with optional delay
 * VR: Dwell-based hover with progress indicator
 *
 * @module useAdaptiveHover
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';

/**
 * Hook for adaptive hover behavior across Desktop and VR
 *
 * @param {RefObject} elementRef - Reference to hoverable element
 * @param {Object} options - Configuration options
 * @param {Function} options.onHoverStart - Callback when hover activates
 * @param {Function} options.onHoverEnd - Callback when hover deactivates
 * @param {Function} options.onDwellProgress - Callback during VR dwell (0-1)
 * @param {boolean} options.disabled - Disable hover detection
 * @returns {Object} Hover state and controls
 */
export function useAdaptiveHover(elementRef, options = {}) {
    const { isVR, tokens } = useAdaptive();

    const {
        onHoverStart = null,
        onHoverEnd = null,
        onDwellProgress = null,
        disabled = false,
    } = options;

    const [isHovered, setIsHovered] = useState(false);
    const [dwellProgress, setDwellProgress] = useState(0);

    const dwellStartRef = useRef(null);
    const animationFrameRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    // ==========================================================================
    // DESKTOP: Mouse hover with optional delay
    // ==========================================================================

    useEffect(() => {
        if (isVR || disabled || !elementRef.current) return;

        const element = elementRef.current;
        const hoverDelay = tokens.hoverDelay || 0;

        const handleMouseEnter = () => {
            if (hoverDelay > 0) {
                hoverTimeoutRef.current = setTimeout(() => {
                    setIsHovered(true);
                    setDwellProgress(1);
                    onHoverStart?.();
                }, hoverDelay);
            } else {
                setIsHovered(true);
                setDwellProgress(1);
                onHoverStart?.();
            }
        };

        const handleMouseLeave = () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
            setIsHovered(false);
            setDwellProgress(0);
            onHoverEnd?.();
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [isVR, disabled, elementRef, onHoverStart, onHoverEnd, tokens.hoverDelay]);

    // ==========================================================================
    // VR: Dwell-based hover with progress
    // ==========================================================================

    const startDwell = useCallback(() => {
        if (!isVR || disabled || isHovered) return;

        const dwellTime = tokens.dwellTime || 500;
        dwellStartRef.current = performance.now();

        const updateProgress = () => {
            if (!dwellStartRef.current) return;

            const elapsed = performance.now() - dwellStartRef.current;
            const progress = Math.min(elapsed / dwellTime, 1);

            setDwellProgress(progress);
            onDwellProgress?.(progress);

            if (progress >= 1) {
                setIsHovered(true);
                onHoverStart?.();
                dwellStartRef.current = null;
            } else {
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateProgress);
    }, [isVR, disabled, isHovered, tokens.dwellTime, onHoverStart, onDwellProgress]);

    const cancelDwell = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        dwellStartRef.current = null;
        setDwellProgress(0);

        if (isHovered) {
            setIsHovered(false);
            onHoverEnd?.();
        }
    }, [isHovered, onHoverEnd]);

    // ==========================================================================
    // VR Event Listeners (for ray intersection events)
    // ==========================================================================

    useEffect(() => {
        if (!isVR || disabled || !elementRef.current) return;

        const element = elementRef.current;
        const elementId = element.dataset.hoverId || element.id;

        if (!elementId) {
            // No warning in production - element just won't work with VR ray events
            return;
        }

        const handleVRRayEnter = (event) => {
            if (event.detail.elementId === elementId) {
                startDwell();
            }
        };

        const handleVRRayExit = (event) => {
            if (event.detail.elementId === elementId) {
                cancelDwell();
            }
        };

        window.addEventListener('cia:vr-ray-enter', handleVRRayEnter);
        window.addEventListener('cia:vr-ray-exit', handleVRRayExit);

        return () => {
            window.removeEventListener('cia:vr-ray-enter', handleVRRayEnter);
            window.removeEventListener('cia:vr-ray-exit', handleVRRayExit);
            cancelDwell();
        };
    }, [isVR, disabled, elementRef, startDwell, cancelDwell]);

    // ==========================================================================
    // Cleanup
    // ==========================================================================

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return {
        /** Whether element is currently "hovered" */
        isHovered,
        /** VR dwell progress (0-1), always 0 or 1 on desktop */
        dwellProgress,
        /** Whether currently in dwell state (VR only, progress > 0 && < 1) */
        isHovering: dwellProgress > 0 && dwellProgress < 1,
        /** Manually start dwell (for VR simulation/testing) */
        startDwell,
        /** Manually cancel dwell */
        cancelDwell,
    };
}

export default useAdaptiveHover;
