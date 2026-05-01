/**
 * @file useResponsiveMode.js
 * @description Hook for detecting container dimensions and responsive mode.
 * Used by Files Tab to switch between full and compact layouts.
 *
 * @example
 * const { dimensions, isCompact, showLabels } = useResponsiveMode(containerRef);
 */

import { useState, useEffect, useCallback } from 'react';
import { COMPACT_HEIGHT_THRESHOLD, LABEL_WIDTH_THRESHOLD } from '@UI/react/constants/filesTabConfig.js';

/**
 * @typedef {Object} Dimensions
 * @property {number} width - Container width in pixels
 * @property {number} height - Container height in pixels
 */

/**
 * @typedef {Object} UseResponsiveModeReturn
 * @property {Dimensions} dimensions - Current container dimensions
 * @property {boolean} isCompact - Whether compact mode should be used
 * @property {boolean} showLabels - Whether there's room for labels
 * @property {() => void} refresh - Force dimension recalculation
 */

/**
 * Hook for monitoring container dimensions and determining responsive mode
 *
 * @param {React.RefObject} containerRef - Ref to the container element
 * @param {Object} options - Configuration options
 * @param {number} [options.heightThreshold=300] - Height threshold for compact mode
 * @param {number} [options.widthThreshold=280] - Width threshold for showing labels
 * @returns {UseResponsiveModeReturn} Dimensions and responsive flags
 */
export function useResponsiveMode(containerRef, options = {}) {
    const {
        heightThreshold = COMPACT_HEIGHT_THRESHOLD,
        widthThreshold = LABEL_WIDTH_THRESHOLD,
    } = options;

    const [dimensions, setDimensions] = useState({ width: 320, height: 500 });

    /**
     * Calculate current dimensions
     */
    const calculateDimensions = useCallback(() => {
        if (!containerRef?.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
            width: rect.width,
            height: rect.height,
        });
    }, [containerRef]);

    /**
     * Set up ResizeObserver
     */
    useEffect(() => {
        if (!containerRef?.current) return;

        const element = containerRef.current;

        // Initial calculation
        calculateDimensions();

        // Set up observer
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [containerRef, calculateDimensions]);

    const isCompact = dimensions.height < heightThreshold;
    const showLabels = dimensions.width > widthThreshold;

    return {
        dimensions,
        isCompact,
        showLabels,
        refresh: calculateDimensions,
    };
}

/**
 * Hook for monitoring window dimensions
 * Useful for standalone panels or floating cards
 *
 * @returns {Dimensions} Window dimensions
 */
export function useWindowDimensions() {
    const [dimensions, setDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return dimensions;
}

export default useResponsiveMode;
