// src/ui/react/hooks/useAuth.js
// React hook for authentication state management
// Provides reactive auth state from authService

import { useState, useEffect, useCallback, useMemo } from "react";
import { authService } from "@Services/authService.js";
import { config } from "@Core/config/clientConfig.js";
import { auth as log } from "@Utils/logger.js";

/**
 * useAuth - Subscribe to authentication state changes
 *
 * Returns reactive auth state and methods for login/logout.
 * Automatically subscribes to authService events on mount.
 *
 * @returns {Object} Auth state and methods
 *
 * @example
 * const { user, isAuthenticated, isLoading, login, logout } = useAuth();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginButton onClick={login} />;
 * return <UserMenu user={user} onLogout={logout} />;
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [serverDevModeEnabled, setServerDevModeEnabled] = useState(false);
  const [error, setError] = useState(null);

  // Check if client-side dev bypass is enabled
  const isDevBypass = useMemo(() => {
    return config.devBypassAuth === true || config.devBypassAuth === "true";
  }, []);

  // Initialize and subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      log.debug("useAuth: Initializing...");

      try {
        // Check if server has dev mode enabled
        const serverDevMode = await authService.checkServerDevMode();
        if (mounted) {
          setServerDevModeEnabled(serverDevMode);
        }

        // Initialize auth service if not already done
        await authService.initialize();

        if (!mounted) return;

        // Get initial state
        const currentUser = authService.getUser();
        const authenticated = authService.isAuthenticated();
        const devMode = authService.isDevMode();

        setUser(currentUser);
        setIsAuthenticated(authenticated);
        setIsDevMode(devMode);
        setIsLoading(false);

        log.debug("useAuth: Initialized", {
          authenticated,
          devMode,
          serverDevMode,
          user: currentUser?.email,
        });
      } catch (err) {
        log.error("useAuth: Initialization failed:", err);
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((event, data) => {
      if (!mounted) return;

      log.debug("useAuth: Auth event:", event);

      switch (event) {
        case "authenticated":
          setUser(authService.getUser());
          setIsAuthenticated(true);
          setIsDevMode(authService.isDevMode());
          setError(null);
          break;

        case "logout":
          setUser(null);
          setIsAuthenticated(false);
          setIsDevMode(false);
          break;

        case "session_expired":
          setUser(null);
          setIsAuthenticated(false);
          setError("Session expired. Please log in again.");
          break;

        case "error":
          setError(data?.error || "Authentication error");
          break;

        default:
          break;
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Login handler
  const login = useCallback(async (options = {}) => {
    log.debug("useAuth: Triggering login...");
    setError(null);

    try {
      await authService.login(options);
    } catch (err) {
      log.error("useAuth: Login failed:", err);
      setError(err.message);
    }
  }, []);

  // Logout handler
  const logout = useCallback(async (options = {}) => {
    log.debug("useAuth: Triggering logout...");

    try {
      await authService.logout(options);
    } catch (err) {
      log.error("useAuth: Logout failed:", err);
      setError(err.message);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh token manually
  const refreshToken = useCallback(async () => {
    try {
      await authService.refreshAccessToken();
      setUser(authService.getUser());
    } catch (err) {
      log.error("useAuth: Token refresh failed:", err);
      setError(err.message);
    }
  }, []);

  // Login as dev user (skip Keycloak)
  const loginAsDev = useCallback(async () => {
    log.debug("useAuth: Logging in as dev user...");
    setError(null);

    try {
      await authService.loginAsDev();
    } catch (err) {
      log.error("useAuth: Dev login failed:", err);
      setError(err.message);
    }
  }, []);

  return {
    // State
    user,
    isLoading,
    isAuthenticated,
    isDevMode,
    serverDevModeEnabled,
    error,
    isDevBypass,

    // Methods
    login,
    loginAsDev,
    logout,
    clearError,
    refreshToken,

    // Convenience getters
    userName: user?.name || user?.username || null,
    userEmail: user?.email || null,
    userId: user?.id || null,
    userRoles: user?.roles || [],
  };
}

export default useAuth;
