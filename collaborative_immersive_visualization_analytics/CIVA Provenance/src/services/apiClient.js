// src/services/apiClient.js
// Centralized API client with authentication integration
//
// All API requests should go through this client to ensure:
// - Auth tokens are automatically attached
// - 401 responses trigger token refresh/re-auth
// - Consistent error handling
// - Request/response logging
//
// Usage:
//   import { apiClient } from '@Services/apiClient.js';
//   const data = await apiClient.get('/projects');
//   await apiClient.post('/views', { name: 'My View' });

import { config } from "@Core/config/clientConfig.js";
import { authService } from "./authService.js";
import { api as log } from "@Utils/logger.js";

// =============================================================================
// API ERROR CLASS
// =============================================================================

/**
 * Custom error class for API errors
 * Includes HTTP status code and parsed error details
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Error message
   * @param {Object} details - Additional error details from response
   */
  constructor(status, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;

    // Maintain proper stack trace (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if error is a client error (4xx)
   */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  get isServerError() {
    return this.status >= 500;
  }

  /**
   * Check if error is an authentication error
   */
  get isAuthError() {
    return this.status === 401;
  }

  /**
   * Check if error is a permission error
   */
  get isForbidden() {
    return this.status === 403;
  }

  /**
   * Check if error is a not found error
   */
  get isNotFound() {
    return this.status === 404;
  }

  /**
   * Human-readable string representation
   */
  toString() {
    return `ApiError [${this.status}]: ${this.message}`;
  }
}

// =============================================================================
// API CLIENT CLASS
// =============================================================================

class ApiClient {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || config.apiBaseUrl || "/api";
    this._retryingRequest = false; // Prevent infinite retry loops
  }

  // ===========================================================================
  // CORE REQUEST METHOD
  // ===========================================================================

  /**
   * Make an authenticated API request
   *
   * @param {string} endpoint - API endpoint (e.g., '/projects')
   * @param {Object} options - Fetch options
   * @param {string} options.method - HTTP method (GET, POST, etc.)
   * @param {Object} options.body - Request body (will be JSON stringified if object)
   * @param {Object} options.headers - Additional headers
   * @param {boolean} options.skipAuth - Skip auth header (for public endpoints)
   * @param {boolean} options.rawResponse - Return raw Response instead of JSON
   * @param {boolean} options.skipRetry - Don't retry on 401
   * @returns {Promise<any>} Parsed JSON response or raw Response
   */
  async request(endpoint, options = {}) {
    const {
      method = "GET",
      body,
      headers: customHeaders = {},
      skipAuth = false,
      rawResponse = false,
      skipRetry = false,
      ...fetchOptions
    } = options;

    // Build headers
    const headers = await authService.buildRequestHeaders(customHeaders);

    // Add Content-Type for requests with body
    if (body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Token authentication disabled - all API calls work without tokens
    // This allows the collaborative app to function without Keycloak/JWT validation

    // Build request URL
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    // Prepare request body
    let requestBody = body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      requestBody = JSON.stringify(body);
    }

    // Log request (debug level)
    log.debug(`${method} ${endpoint}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        credentials: "include", // Include cookies for session-based auth
        ...fetchOptions,
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && !skipRetry && !this._retryingRequest) {
        log.debug("Received 401, attempting token refresh...");

        this._retryingRequest = true;
        try {
          const refreshed = await authService.handleUnauthorized();

          if (refreshed) {
            // Retry the original request with new token
            log.debug("Token refreshed, retrying request...");
            const result = await this.request(endpoint, {
              ...options,
              skipRetry: true, // Prevent infinite retry
            });
            return result;
          }
        } finally {
          this._retryingRequest = false;
        }

        // Refresh failed - throw auth error
        throw new ApiError(401, "Authentication required", {
          hint: "Please log in again",
        });
      }

      // Return raw response if requested
      if (rawResponse) {
        return response;
      }

      // Handle error responses
      if (!response.ok) {
        const errorData = await this._parseErrorResponse(response);
        throw new ApiError(
          response.status,
          errorData.message || errorData.error || `HTTP ${response.status}`,
          errorData
        );
      }

      // Parse successful response
      const contentType = response.headers.get("Content-Type");

      // Handle empty responses
      if (response.status === 204 || !contentType) {
        return null;
      }

      // Parse JSON responses
      if (contentType.includes("application/json")) {
        return await response.json();
      }

      // Return text for other content types
      return await response.text();
    } catch (error) {
      // Re-throw ApiErrors as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap network errors
      log.error(`Request failed: ${method} ${endpoint}`, error);
      throw new ApiError(0, `Network error: ${error.message}`, {
        originalError: error.message,
      });
    }
  }

  /**
   * Parse error response body
   */
  async _parseErrorResponse(response) {
    try {
      const contentType = response.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }
      const text = await response.text();
      return { message: text || response.statusText };
    } catch {
      return { message: response.statusText };
    }
  }

  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================

  /**
   * GET request
   * @param {string} endpoint
   * @param {Object} options
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   * @param {string} endpoint
   * @param {any} data - Request body
   * @param {Object} options
   */
  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body: data });
  }

  /**
   * PUT request
   * @param {string} endpoint
   * @param {any} data - Request body
   * @param {Object} options
   */
  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body: data });
  }

  /**
   * PATCH request
   * @param {string} endpoint
   * @param {any} data - Request body
   * @param {Object} options
   */
  patch(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body: data });
  }

  /**
   * DELETE request
   * @param {string} endpoint
   * @param {Object} options
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  // ===========================================================================
  // FILE UPLOAD METHODS
  // ===========================================================================

  /**
   * Upload a file using FormData
   * @param {string} endpoint
   * @param {FormData} formData
   * @param {Object} options
   */
  async upload(endpoint, formData, options = {}) {
    // Don't set Content-Type - let browser set it with boundary
    const headers = { ...options.headers };
    delete headers["Content-Type"];

    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: formData,
      headers,
    });
  }

  /**
   * Download a file and return as Blob
   * @param {string} endpoint
   * @param {Object} options
   */
  async download(endpoint, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      rawResponse: true,
    });

    if (!response.ok) {
      const errorData = await this._parseErrorResponse(response);
      throw new ApiError(
        response.status,
        errorData.message || "Download failed",
        errorData
      );
    }

    return await response.blob();
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Check if API is reachable
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    try {
      const response = await this.request("/health", {
        skipAuth: true,
        rawResponse: true,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get API status/info
   * @returns {Promise<Object>}
   */
  async getStatus() {
    return this.get("/health", { skipAuth: true });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/** Singleton API client instance */
export const apiClient = new ApiClient();

// Export class for testing or custom instances
export { ApiClient };

// Make available for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.apiClient = apiClient;
}
