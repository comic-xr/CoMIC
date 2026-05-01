/**
 * @file useWorkspacePreferences.js
 * @description Hook for persisting and restoring workspace layout preferences
 *
 * Persists per-user, per-project:
 * - View mode (tabs/tile)
 * - Open workspace IDs
 * - Active workspace ID
 * - Window positions (floating mode)
 * - Viewport positions per canvas
 * - Workspace order
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';

const API_BASE = '/api/users/preferences';

/**
 * Fetch preferences from server
 */
async function fetchPreferences(projectId) {
    const response = await fetch(`${API_BASE}/${projectId}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        if (response.status === 404) {
            return {}; // No preferences yet
        }
        throw new Error(`Failed to fetch preferences: ${response.status}`);
    }
    const data = await response.json();
    return data.preferences || {};
}

/**
 * Save preferences to server
 */
async function savePreferences(projectId, preferences) {
    const response = await fetch(`${API_BASE}/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(preferences),
    });
    if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.status}`);
    }
    return response.json();
}

/**
 * Partially update preferences on server
 */
async function patchPreferences(projectId, updates) {
    const response = await fetch(`${API_BASE}/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error(`Failed to patch preferences: ${response.status}`);
    }
    return response.json();
}

/**
 * Default preferences shape
 */
const DEFAULT_PREFERENCES = {
    viewMode: 'tabs',
    openWorkspaceIds: [],
    activeWorkspaceId: null,
    windowPositions: {},
    windowSizes: {},
    viewportPositions: {},
    workspaceOrder: [],
    tileMaximizedWorkspaceId: null,
};

/**
 * useWorkspacePreferences - Persist and restore workspace layout state
 *
 * @param {string} projectId - The project ID to scope preferences to
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoSave - Auto-save on changes (default: true)
 * @param {number} options.saveDelay - Debounce delay in ms (default: 1000)
 * @returns {Object} Preferences state and methods
 */
export function useWorkspacePreferences(projectId, options = {}) {
    const { autoSave = true, saveDelay = 1000 } = options;

    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Track if we've applied initial preferences (to avoid overwriting with defaults)
    const initialLoadRef = useRef(false);
    const pendingSaveRef = useRef(null);

    // Create debounced save function
    const debouncedSave = useMemo(
        () =>
            debounce(async (projectId, prefs) => {
                try {
                    await savePreferences(projectId, prefs);
                    console.log('[WorkspacePreferences] Saved to server');
                } catch (err) {
                    console.error('[WorkspacePreferences] Failed to save:', err);
                }
            }, saveDelay),
        [saveDelay]
    );

    // Load preferences on mount
    useEffect(() => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        async function load() {
            setIsLoading(true);
            setError(null);

            try {
                const loaded = await fetchPreferences(projectId);
                if (cancelled) return;

                // Merge with defaults to ensure all fields exist
                const merged = {
                    ...DEFAULT_PREFERENCES,
                    ...loaded,
                };

                setPreferences(merged);
                setHasLoaded(true);
                initialLoadRef.current = true;
                console.log('[WorkspacePreferences] Loaded from server:', merged);
            } catch (err) {
                if (cancelled) return;
                console.error('[WorkspacePreferences] Failed to load:', err);
                setError(err);
                // Use defaults on error
                setPreferences(DEFAULT_PREFERENCES);
                setHasLoaded(true);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    // Save preferences when they change (debounced)
    useEffect(() => {
        if (!autoSave || !projectId || !initialLoadRef.current) return;

        debouncedSave(projectId, preferences);

        return () => {
            debouncedSave.cancel();
        };
    }, [autoSave, projectId, preferences, debouncedSave]);

    // Cleanup on unmount - flush pending saves
    useEffect(() => {
        return () => {
            debouncedSave.flush();
        };
    }, [debouncedSave]);

    /**
     * Update a single preference field
     */
    const updatePreference = useCallback((key, value) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    /**
     * Update multiple preferences at once
     */
    const updatePreferences = useCallback((updates) => {
        setPreferences((prev) => ({
            ...prev,
            ...updates,
        }));
    }, []);

    /**
     * Update window position for a workspace
     */
    const setWindowPosition = useCallback((workspaceId, position) => {
        setPreferences((prev) => ({
            ...prev,
            windowPositions: {
                ...prev.windowPositions,
                [workspaceId]: position,
            },
        }));
    }, []);

    /**
     * Update window size for a workspace
     */
    const setWindowSize = useCallback((workspaceId, size) => {
        setPreferences((prev) => ({
            ...prev,
            windowSizes: {
                ...prev.windowSizes,
                [workspaceId]: size,
            },
        }));
    }, []);

    /**
     * Update viewport position for a canvas
     */
    const setViewportPosition = useCallback((canvasId, position) => {
        setPreferences((prev) => ({
            ...prev,
            viewportPositions: {
                ...prev.viewportPositions,
                [canvasId]: position,
            },
        }));
    }, []);

    /**
     * Force save immediately (bypass debounce)
     */
    const saveNow = useCallback(async () => {
        if (!projectId) return;
        debouncedSave.cancel();
        try {
            await savePreferences(projectId, preferences);
            console.log('[WorkspacePreferences] Force saved');
        } catch (err) {
            console.error('[WorkspacePreferences] Force save failed:', err);
            throw err;
        }
    }, [projectId, preferences, debouncedSave]);

    /**
     * Reset preferences to defaults
     */
    const resetPreferences = useCallback(async () => {
        setPreferences(DEFAULT_PREFERENCES);
        if (projectId) {
            try {
                await savePreferences(projectId, DEFAULT_PREFERENCES);
            } catch (err) {
                console.error('[WorkspacePreferences] Reset failed:', err);
            }
        }
    }, [projectId]);

    return {
        // State
        preferences,
        isLoading,
        error,
        hasLoaded,

        // Individual preference getters (convenience)
        viewMode: preferences.viewMode,
        openWorkspaceIds: preferences.openWorkspaceIds,
        activeWorkspaceId: preferences.activeWorkspaceId,
        windowPositions: preferences.windowPositions,
        windowSizes: preferences.windowSizes,
        viewportPositions: preferences.viewportPositions,
        workspaceOrder: preferences.workspaceOrder,
        tileMaximizedWorkspaceId: preferences.tileMaximizedWorkspaceId,

        // Setters
        setViewMode: (mode) => updatePreference('viewMode', mode),
        setOpenWorkspaceIds: (ids) => updatePreference('openWorkspaceIds', ids),
        setActiveWorkspaceId: (id) => updatePreference('activeWorkspaceId', id),
        setWorkspaceOrder: (order) => updatePreference('workspaceOrder', order),
        setTileMaximizedWorkspaceId: (id) => updatePreference('tileMaximizedWorkspaceId', id),
        setWindowPosition,
        setWindowSize,
        setViewportPosition,

        // Batch updates
        updatePreference,
        updatePreferences,

        // Actions
        saveNow,
        resetPreferences,
    };
}

export default useWorkspacePreferences;
