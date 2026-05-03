/**
 * VRAccessibilityContext
 * Location: src/ui/react/context/VRAccessibilityContext.jsx
 *
 * Provides VR accessibility settings context for the application.
 * Manages movement, panel, visual, audio, and input preferences for VR mode.
 *
 * Features:
 * - Real-time preview of settings changes
 * - Persistence to localStorage and user profile
 * - Default values optimized for comfort
 *
 * @module VRAccessibilityContext
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

export const DEFAULT_VR_ACCESSIBILITY = {
    movement: {
        snapTurn: 45, // 'off' | 15 | 30 | 45 | 90
        smoothTurn: {
            enabled: false,
            speed: 60, // degrees per second: 30 | 60 | 90 | 120
        },
        teleport: {
            style: 'quick-fade', // 'instant' | 'quick-fade' | 'slow-fade' | 'dash'
            showArc: true,
            arcColor: '#3B82F6',
            hapticOnLand: true,
        },
        vignette: {
            intensity: 'light', // 'off' | 'light' | 'medium' | 'strong'
            triggers: {
                smoothTurn: true,
                teleport: true,
                worldMove: true,
                headMove: false,
            },
        },
    },
    panels: {
        priority: {
            followMode: 'follow', // 'follow' | 'stay'
            followDelay: 0.5, // 0.3 - 1.0 seconds
            followAngle: 45, // 20 - 60 degrees
            repositionSpeed: 300, // 200 - 500 ms
        },
        standard: {
            defaultDistance: 1.2, // 0.8 - 2.0 meters
            defaultSize: 'medium', // 'small' | 'medium' | 'large'
            rememberPositions: true,
            autoFollow: false,
        },
    },
    visual: {
        uiScale: 1.0, // 0.75 - 1.5
        textScale: 1.0, // 0.8 - 1.4
        highContrast: false,
        colorMode: 'normal', // 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia'
        environmentBrightness: 100, // 50 - 150 percent
        uiBrightness: 100, // 70 - 130 percent
    },
    audio: {
        cues: {
            enabled: true,
            volume: 60, // 0 - 100
            panelSounds: true,
            priorityWhoosh: true,
            buttonClicks: true,
            errorSounds: true,
            teleportSound: true,
            navigationSounds: false,
        },
        spatial: {
            voiceEnabled: true,
            fullVolumeDistance: 3, // meters
            fadeDistance: 10, // meters
        },
        announcements: {
            enabled: false,
            events: {
                panels: false,
                focus: false,
                actions: false,
                errors: false,
            },
            voice: 'system-default',
            speechRate: 1.0,
        },
    },
    input: {
        dominantHand: 'right', // 'left' | 'right'
        handSize: 'medium', // 'small' | 'medium' | 'large'
        oneHandedMode: {
            enabled: false,
            primaryController: 'right', // 'left' | 'right'
        },
        haptics: {
            enabled: true,
            intensity: 60, // 0 - 100
            events: {
                buttons: true,
                menus: true,
                teleport: true,
                grabbing: true,
                panels: false,
            },
        },
        voice: {
            enabled: false,
            activation: 'wake-word', // 'always' | 'wake-word' | 'push-to-talk'
        },
    },
};

// =============================================================================
// STORAGE KEY
// =============================================================================

const STORAGE_KEY = 'cia-vr-accessibility-settings';

// =============================================================================
// CONTEXT
// =============================================================================

const VRAccessibilityContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * VRAccessibilityProvider
 * Provides VR accessibility settings throughout the app.
 *
 * @param {Object} props - Provider props
 * @param {React.ReactNode} props.children - Child components
 */
export function VRAccessibilityProvider({ children }) {
    // Load initial settings from localStorage or use defaults
    const [settings, setSettings] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Deep merge with defaults to handle new settings
                return deepMerge(DEFAULT_VR_ACCESSIBILITY, parsed);
            }
        } catch (e) {
            console.warn('Failed to load VR accessibility settings:', e);
        }
        return DEFAULT_VR_ACCESSIBILITY;
    });

    // Track if settings have unsaved changes (for preview vs saved state)
    const [savedSettings, setSavedSettings] = useState(settings);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // ==========================================================================
    // SETTINGS UPDATE HELPERS
    // ==========================================================================

    /**
     * Update a nested setting value
     * @param {string} path - Dot-separated path (e.g., 'movement.snapTurn')
     * @param {any} value - New value
     */
    const updateSetting = useCallback((path, value) => {
        setSettings(prev => {
            const newSettings = deepClone(prev);
            setNestedValue(newSettings, path, value);
            setHasUnsavedChanges(true);
            return newSettings;
        });
    }, []);

    /**
     * Update multiple settings at once
     * @param {Object} updates - Object with path: value pairs
     */
    const updateSettings = useCallback((updates) => {
        setSettings(prev => {
            const newSettings = deepClone(prev);
            Object.entries(updates).forEach(([path, value]) => {
                setNestedValue(newSettings, path, value);
            });
            setHasUnsavedChanges(true);
            return newSettings;
        });
    }, []);

    /**
     * Save current settings to localStorage
     */
    const saveSettings = useCallback(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            setSavedSettings(settings);
            setHasUnsavedChanges(false);
        } catch (e) {
            console.error('Failed to save VR accessibility settings:', e);
        }
    }, [settings]);

    /**
     * Revert to last saved settings
     */
    const revertSettings = useCallback(() => {
        setSettings(savedSettings);
        setHasUnsavedChanges(false);
    }, [savedSettings]);

    /**
     * Reset all settings to defaults
     */
    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_VR_ACCESSIBILITY);
        setHasUnsavedChanges(true);
    }, []);

    /**
     * Get a setting value by path
     * @param {string} path - Dot-separated path
     * @returns {any} The setting value
     */
    const getSetting = useCallback((path) => {
        return getNestedValue(settings, path);
    }, [settings]);

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const contextValue = useMemo(() => ({
        settings,
        savedSettings,
        hasUnsavedChanges,
        updateSetting,
        updateSettings,
        saveSettings,
        revertSettings,
        resetToDefaults,
        getSetting,
    }), [
        settings,
        savedSettings,
        hasUnsavedChanges,
        updateSetting,
        updateSettings,
        saveSettings,
        revertSettings,
        resetToDefaults,
        getSetting,
    ]);

    return (
        <VRAccessibilityContext.Provider value={contextValue}>
            {children}
        </VRAccessibilityContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access VR accessibility settings
 * @returns {Object} VR accessibility context value
 */
export function useVRAccessibility() {
    const context = useContext(VRAccessibilityContext);
    if (!context) {
        throw new Error('useVRAccessibility must be used within a VRAccessibilityProvider');
    }
    return context;
}

/**
 * Hook to access a specific settings section
 * @param {string} section - Section name ('movement' | 'panels' | 'visual' | 'audio' | 'input')
 * @returns {Object} Section settings and update function
 */
export function useVRAccessibilitySection(section) {
    const { settings, updateSetting } = useVRAccessibility();

    const sectionSettings = settings[section];

    const updateSection = useCallback((path, value) => {
        updateSetting(`${section}.${path}`, value);
    }, [section, updateSetting]);

    return { settings: sectionSettings, updateSection };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = deepClone(target);

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (
                source[key] &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key]) &&
                target[key] &&
                typeof target[key] === 'object'
            ) {
                result[key] = deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }

    return result;
}

/**
 * Set a nested value by path
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
}

/**
 * Get a nested value by path
 */
function getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[key];
    }

    return current;
}

export default VRAccessibilityContext;
