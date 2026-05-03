/**
 * @file LinkIndicatorsContext.jsx
 * @description Context provider for managing link visualization state on the canvas.
 * Tracks viewport positions, sync events, and user preferences for link display.
 *
 * Features:
 * - Centralized state for all link visualization
 * - Tracks recent sync events for pulse animations
 * - User preferences for display options (borders, lines, badges)
 * - Integration with ViewConfigurationManager events
 *
 * @example
 * <LinkIndicatorsProvider>
 *   <Canvas />
 * </LinkIndicatorsProvider>
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Duration for sync pulse animation in milliseconds.
 */
const PULSE_DECAY = 2000;

/**
 * Link property colors (consistent with badges).
 */
export const LINK_COLORS = {
    camera: '#2dd4bf',
    filters: '#a78bfa',
    colorMaps: '#f472b6',
    widgets: '#fbbf24',
    cursors: '#60a5fa',
    annotationDisplay: '#fb923c',
};

/**
 * Status colors for link states.
 */
export const STATUS_COLORS = {
    synced: '#4ade80',
    syncing: '#22d3ee',
    paused: '#fbbf24',
    broken: '#f87171',
};

/**
 * Role colors for hub/member distinction.
 */
export const ROLE_COLORS = {
    hub: '#fbbf24',
    member: '#2dd4bf',
};

/**
 * Property icons for compact display.
 */
export const PROPERTY_ICONS = {
    camera: 'camera',
    filters: 'tune',
    colorMaps: 'palette',
    widgets: 'widgets',
    cursors: 'eye',
    annotationDisplay: 'editNote',
};

/**
 * Default settings for link indicators.
 */
const DEFAULT_SETTINGS = {
    showBorders: true,
    showConnectionLines: false,
    showSyncPulse: true,
    showCornerBadges: true,
    showInMiniMap: true,
    lineStyle: 'curved', // 'curved' | 'straight' | 'orthogonal'
    borderStyle: 'glow', // 'solid' | 'glow' | 'gradient'
};

// =============================================================================
// CONTEXT
// =============================================================================

const LinkIndicatorsContext = createContext(null);

/**
 * LinkIndicatorsProvider - Manages link visualization state
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} [props.viewConfigManager] - Optional ViewConfigurationManager for event subscription
 * @param {Object} [props.initialSettings] - Optional initial settings override
 */
export function LinkIndicatorsProvider({
    children,
    viewConfigManager,
    initialSettings = {},
}) {
    // User preferences for visualization
    const [settings, setSettings] = useState({
        ...DEFAULT_SETTINGS,
        ...initialSettings,
    });

    // Track recent sync events for pulse animations
    // Map<viewId, { property, sourceUserId, sourceUserName, timestamp }>
    const [recentSyncs, setRecentSyncs] = useState(new Map());

    // Track viewport positions for connection lines
    // Map<viewId, DOMRect>
    const [viewportRects, setViewportRects] = useState(new Map());

    // Register a viewport's position
    const registerViewport = useCallback((viewId, rect) => {
        setViewportRects((prev) => {
            const next = new Map(prev);
            next.set(viewId, rect);
            return next;
        });
    }, []);

    // Unregister a viewport
    const unregisterViewport = useCallback((viewId) => {
        setViewportRects((prev) => {
            const next = new Map(prev);
            next.delete(viewId);
            return next;
        });
    }, []);

    // Record a sync event (triggers pulse animation)
    const recordSyncEvent = useCallback(
        (viewId, property, sourceUserId, sourceUserName) => {
            const event = {
                property,
                sourceUserId,
                sourceUserName,
                timestamp: Date.now(),
            };

            setRecentSyncs((prev) => {
                const next = new Map(prev);
                next.set(viewId, event);
                return next;
            });

            // Auto-clear after decay time
            setTimeout(() => {
                setRecentSyncs((prev) => {
                    const next = new Map(prev);
                    const current = next.get(viewId);
                    if (current && current.timestamp === event.timestamp) {
                        next.delete(viewId);
                    }
                    return next;
                });
            }, PULSE_DECAY);
        },
        []
    );

    // Listen to ViewConfigurationManager events
    useEffect(() => {
        if (!viewConfigManager) return;

        const handleSyncPropagated = (event) => {
            const { targetViewIds, property, sourceViewId, sourceOwnerName } =
                event;
            for (const viewId of targetViewIds) {
                recordSyncEvent(viewId, property, sourceViewId, sourceOwnerName);
            }
        };

        viewConfigManager.on?.('syncGroupSyncPropagated', handleSyncPropagated);

        return () => {
            viewConfigManager.off?.(
                'syncGroupSyncPropagated',
                handleSyncPropagated
            );
        };
    }, [viewConfigManager, recordSyncEvent]);

    // Update settings
    const updateSettings = useCallback((updates) => {
        setSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    // Toggle a single setting
    const toggleSetting = useCallback((key) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Reset to defaults
    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const contextValue = {
        // Settings
        settings,
        updateSettings,
        toggleSetting,
        resetSettings,

        // Sync events
        recentSyncs,
        recordSyncEvent,

        // Viewport tracking
        viewportRects,
        registerViewport,
        unregisterViewport,

        // External references
        viewConfigManager,

        // Constants
        PULSE_DECAY,
    };

    return (
        <LinkIndicatorsContext.Provider value={contextValue}>
            {children}
        </LinkIndicatorsContext.Provider>
    );
}

/**
 * Hook to access link indicators context.
 * @returns {Object} Link indicators context value
 * @throws {Error} If used outside of LinkIndicatorsProvider
 */
export function useLinkIndicators() {
    const context = useContext(LinkIndicatorsContext);
    if (!context) {
        throw new Error(
            'useLinkIndicators must be used within LinkIndicatorsProvider'
        );
    }
    return context;
}

/**
 * Hook for keyboard shortcuts related to link indicators.
 * @param {Function} [onOpenLinkManager] - Callback when Ctrl+L is pressed
 */
export function useLinkIndicatorShortcuts(onOpenLinkManager) {
    const { settings, updateSettings } = useLinkIndicators();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input
            if (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA'
            ) {
                return;
            }

            const key = e.key.toLowerCase();
            const mod = e.metaKey || e.ctrlKey;
            const shift = e.shiftKey;
            const alt = e.altKey;

            if (key === 'l') {
                if (mod) {
                    e.preventDefault();
                    onOpenLinkManager?.();
                } else if (shift) {
                    e.preventDefault();
                    const styles = ['solid', 'glow', 'gradient'];
                    const currentIndex = styles.indexOf(settings.borderStyle);
                    const nextStyle = styles[(currentIndex + 1) % styles.length];
                    updateSettings({ borderStyle: nextStyle });
                } else if (alt) {
                    e.preventDefault();
                    const allOff =
                        !settings.showBorders &&
                        !settings.showConnectionLines &&
                        !settings.showCornerBadges;
                    updateSettings({
                        showBorders: allOff,
                        showConnectionLines: allOff,
                        showCornerBadges: allOff,
                        showSyncPulse: allOff,
                        showInMiniMap: allOff,
                    });
                } else {
                    e.preventDefault();
                    updateSettings({
                        showConnectionLines: !settings.showConnectionLines,
                    });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings, updateSettings, onOpenLinkManager]);
}

export default LinkIndicatorsProvider;
