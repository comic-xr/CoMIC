// src/ui/react/context/DevUserContext.jsx
// Context for managing mock user selection in development mode
//
// This context allows switching between mock users for testing
// collaboration features without needing multiple browser sessions.
//
// USAGE:
//   import { useDevUser } from '@UI/react/context/DevUserContext';
//   const { currentUser, switchUser, isDevMode } = useDevUser();

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import {
    MOCK_USERS,
    getMockUser,
    getResolvedMockUser,
    getResolvedMockUserId,
    storeMockUserId,
} from "@Config/mockUsers.js";
import { config } from "@Core/config/clientConfig.js";
import { auth as log } from "@Utils/logger.js";

// =============================================================================
// CONTEXT
// =============================================================================

const DevUserContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * DevUserProvider - Provides mock user management for development mode
 *
 * Features:
 * - Persists selected user across page reloads
 * - Exposes switchUser() for changing identity
 * - Provides user info for API headers
 * - Only active when DEV_BYPASS_AUTH is enabled or forceDevMode prop is true
 *
 * @param {Object} props
 * @param {boolean} props.forceDevMode - Override to enable dev mode (e.g., when user logged in via dev login)
 */
export function DevUserProvider({ children, forceDevMode = false }) {
    // Check if dev mode is enabled (config or forced via prop)
    const isDevMode =
        forceDevMode || config.devBypassAuth === true || config.devBypassAuth === "true";

    // Current mock user state
    const [currentUser, setCurrentUser] = useState(() => {
        if (!isDevMode) return null;
        return getResolvedMockUser();
    });

    // Switch to a different mock user
    const switchUser = useCallback(
        (userId) => {
            if (!isDevMode) {
                log.warn("DevUserContext: Cannot switch users - not in dev mode");
                return false;
            }

            const newUser = getMockUser(userId);
            if (!newUser) {
                log.error("DevUserContext: Unknown user ID:", userId);
                return false;
            }

            log.info(`DevUserContext: Switching to user "${newUser.name}"`);
            setCurrentUser(newUser);
            storeMockUserId(userId);

            // Dispatch event for other parts of the app to react
            window.dispatchEvent(
                new CustomEvent("cia:dev-user-changed", {
                    detail: { user: newUser, previousUserId: currentUser?.id },
                })
            );

            return true;
        },
        [isDevMode, currentUser]
    );

    // Get headers to include in API requests
    const getDevHeaders = useCallback(() => {
        if (!isDevMode || !currentUser) return {};

        return {
            "x-user-id": currentUser.id,
            "x-user-email": currentUser.email,
            "x-user-name": currentUser.name,
        };
    }, [isDevMode, currentUser]);

    // Context value
    const value = {
        // State
        isDevMode,
        currentUser,
        allUsers: MOCK_USERS,

        // Actions
        switchUser,
        getDevHeaders,

        // Convenience getters
        userId: currentUser?.id || null,
        userName: currentUser?.name || null,
        userEmail: currentUser?.email || null,
        userColor: currentUser?.color || "#6366f1",
    };

    useEffect(() => {
        if (!isDevMode) return;

        const resolvedUserId = getResolvedMockUserId();
        const resolvedUser = getResolvedMockUser();

        if (resolvedUserId) {
            storeMockUserId(resolvedUserId);
        }

        if (!currentUser || currentUser.id !== resolvedUser.id) {
            setCurrentUser(resolvedUser);
        }

        log.info(
            `DevUserContext: Active as "${resolvedUser.name}" (${resolvedUser.id})`
        );
    }, [isDevMode, currentUser]);

    return (
        <DevUserContext.Provider value={value}>{children}</DevUserContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useDevUser - Access dev user context
 *
 * @returns {DevUserContextValue}
 *
 * @example
 * const { currentUser, switchUser, isDevMode } = useDevUser();
 * if (isDevMode) {
 *   return <UserSwitcher users={allUsers} onSwitch={switchUser} />;
 * }
 */
export function useDevUser() {
    const context = useContext(DevUserContext);

    if (!context) {
        // Return safe defaults if used outside provider
        return {
            isDevMode: false,
            currentUser: null,
            allUsers: [],
            switchUser: () => false,
            getDevHeaders: () => ({}),
            userId: null,
            userName: null,
            userEmail: null,
            userColor: "#6366f1",
        };
    }

    return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DevUserContext;