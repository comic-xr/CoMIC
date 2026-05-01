/**
 * AdaptiveContext
 * Location: src/ui/react/context/AdaptiveContext.jsx
 *
 * Provides adaptive mode context for desktop/VR switching.
 * All adaptive components should use this context to determine their sizing and behavior.
 *
 * Modes:
 * - 'desktop': Standard mouse/keyboard interaction with hover states
 * - 'vr': Touch-friendly with larger targets (48px min), always-visible labels
 *
 * Density:
 * - 'comfortable': Default spacing for general use
 * - 'compact': Tighter spacing for information-dense views
 *
 * @module AdaptiveContext
 */

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { vrManager } from '@Core/vr/VRManager.js';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

export const ADAPTIVE_TOKENS = {
    desktop: {
        comfortable: {
            // Sizing
            itemHeight: 36,
            itemHeightSm: 28,
            itemHeightLg: 44,
            buttonHeight: 32,
            buttonHeightSm: 24,
            buttonHeightLg: 40,
            inputHeight: 32,
            touchTarget: 32,

            // Spacing
            itemPadding: '8px 12px',
            itemPaddingSm: '4px 8px',
            itemPaddingLg: '12px 16px',
            gap: 8,
            gapSm: 4,
            gapLg: 12,

            // Typography
            fontSize: 12,
            fontSizeSm: 10,
            fontSizeLg: 14,
            metaFontSize: 10,
            labelFontSize: 11,

            // Icons
            iconSize: 16,
            iconSizeSm: 12,
            iconSizeLg: 20,
            iconStrokeWeight: 2,    // Thicker strokes for desktop

            // Button sizes (for AdaptiveButton sm/md/lg)
            buttonSizes: { sm: 24, md: 32, lg: 40 },

            // Border radius
            borderRadius: 6,
            borderRadiusSm: 4,
            borderRadiusLg: 8,

            // Interaction
            showHoverStates: true,
            showLabelsOnButtons: false,
            animationDuration: '0.15s',

            // Panel overlay timing
            hoverDelay: 300,        // ms before peek activates
            peekGracePeriod: 400,   // ms before peek closes
            dwellTime: 0,           // No dwell on desktop (uses hover)

            // Panel dimensions
            panelWidth: 320,
            activityBarWidth: 48,
        },
        compact: {
            itemHeight: 28,
            itemHeightSm: 24,
            itemHeightLg: 36,
            buttonHeight: 24,
            buttonHeightSm: 20,
            buttonHeightLg: 32,
            inputHeight: 28,
            touchTarget: 28,

            itemPadding: '4px 8px',
            itemPaddingSm: '2px 6px',
            itemPaddingLg: '8px 12px',
            gap: 6,
            gapSm: 3,
            gapLg: 8,

            fontSize: 11,
            fontSizeSm: 9,
            fontSizeLg: 12,
            metaFontSize: 9,
            labelFontSize: 10,

            iconSize: 14,
            iconSizeSm: 10,
            iconSizeLg: 16,
            iconStrokeWeight: 2,    // Thicker strokes for desktop

            // Button sizes (for AdaptiveButton sm/md/lg)
            buttonSizes: { sm: 20, md: 24, lg: 32 },

            borderRadius: 4,
            borderRadiusSm: 3,
            borderRadiusLg: 6,

            showHoverStates: true,
            showLabelsOnButtons: false,
            animationDuration: '0.1s',

            // Panel overlay timing
            hoverDelay: 300,
            peekGracePeriod: 400,
            dwellTime: 0,

            // Panel dimensions
            panelWidth: 280,
            activityBarWidth: 40,
        },
    },
    vr: {
        comfortable: {
            // Sizing - VR requires larger touch targets (48px minimum)
            itemHeight: 64,
            itemHeightSm: 52,
            itemHeightLg: 80,
            buttonHeight: 48,
            buttonHeightSm: 40,
            buttonHeightLg: 56,
            inputHeight: 48,
            touchTarget: 48,

            // Spacing
            itemPadding: '16px 20px',
            itemPaddingSm: '12px 16px',
            itemPaddingLg: '20px 24px',
            gap: 16,
            gapSm: 10,
            gapLg: 20,

            // Typography - larger for readability
            fontSize: 16,
            fontSizeSm: 14,
            fontSizeLg: 18,
            metaFontSize: 13,
            labelFontSize: 14,

            // Icons
            iconSize: 24,
            iconSizeSm: 20,
            iconSizeLg: 28,
            iconStrokeWeight: 1.5,  // Thinner strokes for VR (larger icons)

            // Button sizes (for AdaptiveButton sm/md/lg) - larger for VR
            buttonSizes: { sm: 44, md: 56, lg: 72 },

            // Border radius
            borderRadius: 12,
            borderRadiusSm: 8,
            borderRadiusLg: 16,

            // Interaction - no hover in VR, always show labels
            showHoverStates: false,
            showLabelsOnButtons: true,
            animationDuration: '0.2s',

            // Panel overlay timing - VR uses dwell instead of hover
            hoverDelay: 0,          // No delay in VR (dwell handles it)
            peekGracePeriod: 600,   // Longer grace in VR (controllers less precise)
            dwellTime: 500,         // ms for VR dwell hover

            // Panel dimensions - larger for VR
            panelWidth: 400,
            activityBarWidth: 64,
        },
        compact: {
            itemHeight: 52,
            itemHeightSm: 44,
            itemHeightLg: 64,
            buttonHeight: 44,
            buttonHeightSm: 36,
            buttonHeightLg: 52,
            inputHeight: 44,
            touchTarget: 44,

            itemPadding: '12px 16px',
            itemPaddingSm: '10px 14px',
            itemPaddingLg: '16px 20px',
            gap: 12,
            gapSm: 8,
            gapLg: 16,

            fontSize: 14,
            fontSizeSm: 12,
            fontSizeLg: 16,
            metaFontSize: 12,
            labelFontSize: 13,

            iconSize: 20,
            iconSizeSm: 16,
            iconSizeLg: 24,
            iconStrokeWeight: 1.5,  // Thinner strokes for VR (larger icons)

            // Button sizes (for AdaptiveButton sm/md/lg) - larger for VR
            buttonSizes: { sm: 36, md: 44, lg: 52 },

            borderRadius: 10,
            borderRadiusSm: 6,
            borderRadiusLg: 12,

            showHoverStates: false,
            showLabelsOnButtons: true,
            animationDuration: '0.15s',

            // Panel overlay timing
            hoverDelay: 0,
            peekGracePeriod: 600,
            dwellTime: 500,

            // Panel dimensions
            panelWidth: 360,
            activityBarWidth: 56,
        },
    },
};

// =============================================================================
// CONTEXT
// =============================================================================

const AdaptiveContext = createContext({
    mode: 'desktop',
    density: 'comfortable',
    tokens: ADAPTIVE_TOKENS.desktop.comfortable,
    isVR: false,
    setMode: () => {},
    setDensity: () => {},
});

// =============================================================================
// PROVIDER
// =============================================================================

export function AdaptiveProvider({ children, initialMode = 'desktop', initialDensity = 'comfortable', autoSyncVR = true }) {
    const [mode, setMode] = useState(initialMode);
    const [density, setDensity] = useState(initialDensity);

    // Auto-sync with VRManager when entering/exiting VR
    useEffect(() => {
        if (!autoSyncVR || !vrManager) return;

        const handleVREnter = () => {
            setMode('vr');
        };

        const handleVRExit = () => {
            setMode('desktop');
        };

        // Subscribe to VRManager events
        vrManager.on('vrEntered', handleVREnter);
        vrManager.on('sessionStarted', handleVREnter);
        vrManager.on('vrExited', handleVRExit);
        vrManager.on('sessionEnded', handleVRExit);

        // Check initial state - if already in VR, set mode
        if (vrManager.isInVR?.()) {
            setMode('vr');
        }

        return () => {
            vrManager.off('vrEntered', handleVREnter);
            vrManager.off('sessionStarted', handleVREnter);
            vrManager.off('vrExited', handleVRExit);
            vrManager.off('sessionEnded', handleVRExit);
        };
    }, [autoSyncVR]);

    const tokens = useMemo(() => {
        return ADAPTIVE_TOKENS[mode]?.[density] || ADAPTIVE_TOKENS.desktop.comfortable;
    }, [mode, density]);

    const isVR = mode === 'vr';

    const value = useMemo(() => ({
        mode,
        density,
        tokens,
        isVR,
        setMode,
        setDensity,
    }), [mode, density, tokens, isVR]);

    return (
        <AdaptiveContext.Provider value={value}>
            {children}
        </AdaptiveContext.Provider>
    );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access adaptive context
 * @returns {Object} Adaptive context value
 */
export function useAdaptive() {
    const context = useContext(AdaptiveContext);
    if (!context) {
        // Return desktop defaults if no provider (graceful fallback)
        return {
            mode: 'desktop',
            density: 'comfortable',
            tokens: ADAPTIVE_TOKENS.desktop.comfortable,
            isVR: false,
            setMode: () => {},
            setDensity: () => {},
        };
    }
    return context;
}

/**
 * Hook to get current tokens
 * @returns {Object} Current design tokens
 */
export function useAdaptiveTokens() {
    const { tokens } = useAdaptive();
    return tokens;
}

/**
 * Hook to check if in VR mode
 * @returns {boolean} True if in VR mode
 */
export function useIsVR() {
    const { isVR } = useAdaptive();
    return isVR;
}

/**
 * Helper to get CSS custom properties from tokens
 * @param {Object} tokens - Design tokens
 * @returns {Object} CSS custom properties object
 */
export function getAdaptiveCSSVars(tokens) {
    return {
        '--adaptive-item-height': `${tokens.itemHeight}px`,
        '--adaptive-button-height': `${tokens.buttonHeight}px`,
        '--adaptive-input-height': `${tokens.inputHeight}px`,
        '--adaptive-touch-target': `${tokens.touchTarget}px`,
        '--adaptive-gap': `${tokens.gap}px`,
        '--adaptive-font-size': `${tokens.fontSize}px`,
        '--adaptive-icon-size': `${tokens.iconSize}px`,
        '--adaptive-border-radius': `${tokens.borderRadius}px`,
        '--adaptive-animation-duration': tokens.animationDuration,
    };
}

export default AdaptiveContext;
