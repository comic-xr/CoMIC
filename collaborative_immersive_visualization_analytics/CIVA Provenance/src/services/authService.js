// src/services/authService.js
// Client-side authentication service for Keycloak integration
//
// SECURITY:
// - Tokens stored in memory only (not localStorage/sessionStorage)
// - Uses PKCE for authorization code flow
// - Automatic token refresh before expiry
// - Clears tokens on logout/window close
//
// USAGE:
//   import { authService } from '@Services/authService.js';
//   await authService.login();
//   const token = await authService.getAccessToken();

import { config } from "@Core/config/clientConfig.js";
import { auth as log } from "@Utils/logger.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { getResolvedMockUser } from "@Config/mockUsers.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Buffer time before token expiry to trigger refresh (ms) */
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // 1 minute before expiry

/** Minimum time between refresh attempts (ms) */
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds

/** Storage key for PKCE code verifier (only during auth flow) */
const PKCE_VERIFIER_KEY = "cia_pkce_verifier";

/** Storage key for auth redirect state */
const AUTH_STATE_KEY = "cia_auth_state";

/** Mock user for development bypass mode (CIA Admin) */
const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000002",
  externalId: "cia-admin",
  email: "admin@cia-web.local",
  name: "CIA Admin",
  roles: ["user", "admin"],
};

function getActiveDevUser() {
  return getResolvedMockUser() || DEV_USER;
}

function getSessionDisplayName() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("cia_username") || null;
}

// =============================================================================
// PKCE UTILITIES
// =============================================================================

/**
 * Generate a cryptographically random string for PKCE
 */
function generateRandomString(length = 64) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier() {
  return generateRandomString(64);
}

/**
 * Generate PKCE code challenge from verifier (SHA-256 + base64url)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);

  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState() {
  return generateRandomString(32);
}

// =============================================================================
// AUTH SERVICE CLASS
// =============================================================================

class AuthService {
  // Private fields - tokens stored in memory only
  #accessToken = null;
  #refreshToken = null;
  #idToken = null;
  #user = null;
  #tokenExpiry = null;
  #refreshTimer = null;
  #lastRefreshAttempt = 0;
  #listeners = new Set();
  #initialized = false;
  #isDevMode = false; // Track if running in dev mode (server-side bypass enabled)

  constructor() {
    // Bind methods for event handlers
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handleBeforeUnload = this._handleBeforeUnload.bind(this);
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the auth service
   * Call this once at app startup
   */
  async initialize() {
    if (this.#initialized) {
      log.debug("Auth service already initialized");
      return;
    }

    log.debug("Initializing auth service...");

    // Check for dev bypass mode
    if (this.isDevMode()) {
      const activeDevUser = getActiveDevUser();
      log.info(`Development bypass mode - using mock user "${activeDevUser.name}"`);
      this.#user = {
        id: activeDevUser.id,
        externalId: activeDevUser.externalId,
        email: activeDevUser.email,
        name: activeDevUser.name,
        roles: activeDevUser.roles || DEV_USER.roles,
      };
      this.#accessToken = "dev-bypass-token";
      this.#tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      sessionManager.setToken("dev-bypass-token");
      this.#initialized = true;
      this._notifyListeners("authenticated");
      return;
    }

    // Set up event listeners
    if (typeof window !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this._handleVisibilityChange
      );
      window.addEventListener("beforeunload", this._handleBeforeUnload);
    }

    // Check if returning from OAuth callback
    const callbackHandled = await this._checkForCallback();

    if (!callbackHandled) {
      // Try to restore session from server (e.g., if using httpOnly refresh token cookie)
      await this._tryRestoreSession();
    }

    this.#initialized = true;
    log.debug("Auth service initialized");
  }

  /**
   * Check if we're returning from a Keycloak callback
   */
  async _checkForCallback() {
    if (typeof window === "undefined") return false;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      log.error(
        "OAuth error:",
        error,
        url.searchParams.get("error_description")
      );
      this._cleanupAuthFlow();
      this._notifyListeners("error", { error });
      // Clear URL params
      window.history.replaceState({}, "", url.pathname);
      return true;
    }

    if (code && state) {
      log.debug("Handling OAuth callback...");
      try {
        await this.handleCallback(code, state);
        // Clear URL params
        window.history.replaceState({}, "", url.pathname);
        return true;
      } catch (error) {
        log.error("Failed to handle callback:", error);
        this._cleanupAuthFlow();
        this._notifyListeners("error", { error: error.message });
        window.history.replaceState({}, "", url.pathname);
        return true;
      }
    }

    return false;
  }

  /**
   * Try to restore session (e.g., refresh token in httpOnly cookie)
   */
  async _tryRestoreSession() {
    try {
      // Try to get auth status from server
      const response = await fetch(`${config.apiBaseUrl}/auth/me`, {
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const userData = await response.json();
        this.#user = userData;
        // We don't have the actual token, but server accepted the session
        log.debug("Session restored from server");
        this._notifyListeners("authenticated");
      }
    } catch (error) {
      log.debug("No existing session found");
    }
  }

  // ===========================================================================
  // LOGIN / LOGOUT
  // ===========================================================================

  /**
   * Initiate login by redirecting to Keycloak
   * @param {Object} options - Login options
   * @param {string} options.redirectUri - Where to redirect after login (default: current URL)
   * @param {string} options.prompt - Keycloak prompt parameter (login, consent, none)
   */
  async login(options = {}) {
    if (this.isDevMode()) {
      log.debug("Dev bypass - already authenticated");
      return;
    }

    const redirectUri =
      options.redirectUri || window.location.origin + window.location.pathname;
    const prompt = options.prompt || undefined;

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE verifier and state temporarily (needed for callback)
    sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
    sessionStorage.setItem(
      AUTH_STATE_KEY,
      JSON.stringify({
        state,
        redirectUri,
        timestamp: Date.now(),
      })
    );

    // Build authorization URL
    const authUrl = new URL(
      `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/auth`
    );

    authUrl.searchParams.set("client_id", config.keycloakClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    if (prompt) {
      authUrl.searchParams.set("prompt", prompt);
    }

    log.debug("Redirecting to Keycloak login...");
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback - exchange authorization code for tokens
   * @param {string} code - Authorization code from Keycloak
   * @param {string} state - State parameter for CSRF validation
   */
  async handleCallback(code, state) {
    // Validate state
    const storedAuthState = sessionStorage.getItem(AUTH_STATE_KEY);
    if (!storedAuthState) {
      throw new Error("No auth state found - possible CSRF attack");
    }

    const authState = JSON.parse(storedAuthState);
    if (authState.state !== state) {
      throw new Error("State mismatch - possible CSRF attack");
    }

    // Check if auth flow is too old (5 minute timeout)
    if (Date.now() - authState.timestamp > 5 * 60 * 1000) {
      throw new Error("Auth flow expired - please try again");
    }

    // Get PKCE verifier
    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error("No PKCE verifier found");
    }

    // Exchange code for tokens
    const tokenUrl = `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.keycloakClientId,
        code,
        redirect_uri: authState.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error_description || "Token exchange failed");
    }

    const tokenData = await response.json();

    // Store tokens
    this._setTokens(tokenData);

    // Clean up auth flow data
    this._cleanupAuthFlow();

    log.info("Successfully authenticated");
    this._notifyListeners("authenticated");
  }

  /**
   * Logout - clear tokens and redirect to Keycloak logout
   * @param {Object} options - Logout options
   * @param {string} options.redirectUri - Where to redirect after logout
   */
  async logout(options = {}) {
    const redirectUri = options.redirectUri || window.location.origin;

    // Clear local state
    this._clearTokens();
    this._notifyListeners("logout");

    if (this.isDevMode()) {
      log.debug("Dev bypass - local logout only");
      return;
    }

    // Build logout URL
    const logoutUrl = new URL(
      `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/logout`
    );

    logoutUrl.searchParams.set("client_id", config.keycloakClientId);
    logoutUrl.searchParams.set("post_logout_redirect_uri", redirectUri);

    if (this.#idToken) {
      logoutUrl.searchParams.set("id_token_hint", this.#idToken);
    }

    log.debug("Redirecting to Keycloak logout...");
    window.location.href = logoutUrl.toString();
  }

  /**
   * Handle 401 Unauthorized response from API
   * Attempts to refresh token, or triggers re-login if refresh fails
   * @returns {Promise<boolean>} True if token was refreshed successfully
   */
  async handleUnauthorized() {
    if (this.isDevMode()) {
      log.debug("Dev bypass - ignoring unauthorized");
      return true;
    }

    log.debug("Handling 401 Unauthorized...");

    // Try to refresh the token
    if (this.#refreshToken) {
      try {
        await this.refreshAccessToken();
        log.debug("Token refreshed after 401");
        return true;
      } catch (error) {
        log.error("Token refresh failed after 401:", error);
      }
    }

    // Refresh failed or no refresh token - need to re-login
    this._clearTokens();
    this._notifyListeners("session_expired");

    // Optionally trigger login automatically
    // await this.login();

    return false;
  }

  // ===========================================================================
  // DEV MODE
  // ===========================================================================

  /**
   * Check if server has dev bypass enabled
   * @returns {Promise<boolean>} True if server is in dev bypass mode
   */
  async checkServerDevMode() {
    try {
      const response = await fetch(`${config.apiBaseUrl}/auth/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        this.#isDevMode = data.devBypassEnabled === true;
        log.debug(`Server dev mode: ${this.#isDevMode}`);
        return this.#isDevMode;
      }
    } catch (error) {
      log.warn("Failed to check server dev mode:", error.message);
    }
    return false;
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if dev mode is enabled (client or server)
   */
  isDevMode() {
    return this._isDevBypass() || this.#isDevMode;
  }

  /**
   * Login as development user (skip Keycloak)
   * Only works when server has DEV_BYPASS_AUTH=true
   */
  async loginAsDev() {
    log.info("Logging in as development user...");

    const activeDevUser = getActiveDevUser();

    // Set dev mode user
    this.#user = {
      id: activeDevUser.id,
      externalId: activeDevUser.externalId,
      email: activeDevUser.email,
      name: activeDevUser.name,
      roles: activeDevUser.roles || DEV_USER.roles,
    };
    this.#accessToken = "dev-bypass-token";
    this.#refreshToken = null;
    this.#idToken = null;
    this.#tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.#isDevMode = true;
    this.#initialized = true;

    // Cache token in sessionManager for sync access
    sessionManager.setToken("dev-bypass-token");

    this._notifyListeners("authenticated");
    log.info("Logged in as development user:", this.#user.name);
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  /**
   * Get the current access token
   * Refreshes automatically if expired or about to expire
   * @returns {Promise<string|null>} Access token or null if not authenticated
   */
  async getAccessToken() {
    if (this.isDevMode()) {
      return this.#accessToken;
    }

    if (!this.#accessToken) {
      return null;
    }

    // Check if token needs refresh
    if (this._shouldRefreshToken()) {
      if (!this.#refreshToken) {
        this._clearTokens();
        this._notifyListeners("session_expired");
        return null;
      }

      try {
        await this.refreshAccessToken();
      } catch (error) {
        log.error("Failed to refresh token:", error);
        // Token refresh failed - user needs to re-login
        this._clearTokens();
        this._notifyListeners("session_expired");
        return null;
      }
    }

    return this.#accessToken;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken() {
    if (this.isDevMode()) {
      return this.#accessToken;
    }

    if (!this.#refreshToken) {
      throw new Error("No refresh token available");
    }

    // Prevent rapid refresh attempts
    const now = Date.now();
    if (now - this.#lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
      log.debug("Skipping refresh - too soon since last attempt");
      return this.#accessToken;
    }
    this.#lastRefreshAttempt = now;

    log.debug("Refreshing access token...");

    const tokenUrl = `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.keycloakClientId,
        refresh_token: this.#refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error_description || "Token refresh failed");
    }

    const tokenData = await response.json();
    this._setTokens(tokenData);

    log.debug("Token refreshed successfully");
    return this.#accessToken;
  }

  /**
   * Get current user info
   * @returns {Object|null} User object or null if not authenticated
   */
  getUser() {
    return this.#user;
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    if (this.isDevMode()) {
      return true;
    }
    return this.#accessToken !== null && !this._isTokenExpired();
  }

  /**
   * Get authorization header value for API requests
   * @returns {Promise<string|null>}
   */
  async getAuthHeader() {
    const token = await this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Build request headers for API calls.
   * In dev/mock-user mode we prefer explicit identity headers over bearer tokens
   * so separate browser instances can act as different users reliably.
   * @param {Object} headers
   * @returns {Promise<Object>}
   */
  async buildRequestHeaders(headers = {}) {
    const requestHeaders = { ...headers };

    if (this.isDevMode()) {
      const activeDevUser = getActiveDevUser();
      if (activeDevUser?.id) {
        requestHeaders["x-user-id"] = activeDevUser.id;
      }
      const sessionDisplayName = getSessionDisplayName();
      if (sessionDisplayName || activeDevUser?.name) {
        requestHeaders["x-user-name"] = sessionDisplayName || activeDevUser.name;
      }
      if (activeDevUser?.email) {
        requestHeaders["x-user-email"] = activeDevUser.email;
      }
      delete requestHeaders.Authorization;
      return requestHeaders;
    }

    const authHeader = await this.getAuthHeader().catch(() => null);
    if (authHeader) {
      requestHeaders.Authorization = authHeader;
    }

    return requestHeaders;
  }

  // ===========================================================================
  // EVENT LISTENERS
  // ===========================================================================

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Called with (event, data)
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  /**
   * Notify listeners of auth state change
   */
  _notifyListeners(event, data = {}) {
    for (const listener of this.#listeners) {
      try {
        listener(event, data);
      } catch (error) {
        log.error("Auth listener error:", error);
      }
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Check if dev bypass mode is enabled
   */
  _isDevBypass() {
    return config.devBypassAuth === true || config.devBypassAuth === "true";
  }

  /**
   * Store tokens from token response
   */
  _setTokens(tokenData) {
    this.#accessToken = tokenData.access_token;
    this.#refreshToken = tokenData.refresh_token;
    this.#idToken = tokenData.id_token;

    // Calculate expiry time
    const expiresIn = tokenData.expires_in || 300; // Default 5 minutes
    this.#tokenExpiry = Date.now() + expiresIn * 1000;

    // Parse user info from ID token or access token
    this.#user = this._parseUserFromToken(tokenData.access_token);

    // Cache token in sessionManager for sync access by other services
    sessionManager.setToken(tokenData.access_token);

    // Set up automatic refresh
    this._scheduleTokenRefresh(expiresIn);
  }

  /**
   * Clear all tokens and state
   */
  _clearTokens() {
    this.#accessToken = null;
    this.#refreshToken = null;
    this.#idToken = null;
    this.#user = null;
    this.#tokenExpiry = null;

    // Clear cached token in sessionManager
    sessionManager.setToken(null);

    if (this.#refreshTimer) {
      clearTimeout(this.#refreshTimer);
      this.#refreshTimer = null;
    }
  }

  /**
   * Clean up auth flow data from sessionStorage
   */
  _cleanupAuthFlow() {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(AUTH_STATE_KEY);
  }

  /**
   * Parse user info from JWT token
   */
  _parseUserFromToken(token) {
    try {
      // JWT is base64url encoded: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      // Decode payload (handle base64url)
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(payload));

      return {
        id: decoded.sub,
        externalId: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.preferred_username,
        roles: decoded.realm_access?.roles || [],
        username: decoded.preferred_username,
      };
    } catch (error) {
      log.error("Failed to parse user from token:", error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  _isTokenExpired() {
    if (!this.#tokenExpiry) return true;
    return Date.now() >= this.#tokenExpiry;
  }

  /**
   * Check if token should be refreshed (expired or about to expire)
   */
  _shouldRefreshToken() {
    if (!this.#tokenExpiry) return true;
    return Date.now() >= this.#tokenExpiry - TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Schedule automatic token refresh
   */
  _scheduleTokenRefresh(expiresIn) {
    if (this.#refreshTimer) {
      clearTimeout(this.#refreshTimer);
    }

    // Calculate when to refresh (1 minute before expiry, minimum 30 seconds)
    const refreshIn = Math.max(
      expiresIn * 1000 - TOKEN_REFRESH_BUFFER_MS,
      MIN_REFRESH_INTERVAL_MS
    );

    log.debug(`Scheduling token refresh in ${Math.round(refreshIn / 1000)}s`);

    this.#refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        log.error("Automatic token refresh failed:", error);
        this._notifyListeners("session_expired");
      }
    }, refreshIn);
  }

  /**
   * Handle page visibility change - refresh token when page becomes visible
   */
  _handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.isAuthenticated()) {
      // Check if token needs refresh after returning to page
      if (this._shouldRefreshToken()) {
        this.refreshAccessToken().catch((error) => {
          log.error("Failed to refresh token on visibility change:", error);
        });
      }
    }
  }

  /**
   * Handle page unload - clean up timers
   */
  _handleBeforeUnload() {
    if (this.#refreshTimer) {
      clearTimeout(this.#refreshTimer);
      this.#refreshTimer = null;
    }
  }

  // ===========================================================================
  // DEBUGGING
  // ===========================================================================

  /**
   * Get auth state for debugging (no tokens exposed)
   */
  getDebugState() {
    return {
      initialized: this.#initialized,
      isAuthenticated: this.isAuthenticated(),
      hasAccessToken: this.#accessToken !== null,
      hasRefreshToken: this.#refreshToken !== null,
      tokenExpiry: this.#tokenExpiry
        ? new Date(this.#tokenExpiry).toISOString()
        : null,
      user: this.#user ? { id: this.#user.id, email: this.#user.email } : null,
      isDevBypass: this._isDevBypass(),
      isDevMode: this.isDevMode(),
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/** Singleton auth service instance */
export const authService = new AuthService();

// Convenience exports for common operations
export const login = (options) => authService.login(options);
export const loginAsDev = () => authService.loginAsDev();
export const logout = (options) => authService.logout(options);
export const getAccessToken = () => authService.getAccessToken();
export const getUser = () => authService.getUser();
export const isAuthenticated = () => authService.isAuthenticated();
export const isDevMode = () => authService.isDevMode();
export const checkServerDevMode = () => authService.checkServerDevMode();
export const onAuthStateChange = (callback) =>
  authService.onAuthStateChange(callback);

// Export class for testing
export { AuthService };

// Make available for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.authService = authService;
}
