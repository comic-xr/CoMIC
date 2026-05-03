// src/ui/react/hooks/useAsyncData.js
// Generic hook for async data fetching with loading/error states
//
// This hook extracts the common pattern used across:
// - useFilters, useBookmarks, useAnnotations
// - useProjectFiles, useRooms, useDatasets
//
// Features:
// - Automatic abort on unmount or refetch
// - Loading and error state management
// - Refetch capability
// - Optional initial data
// - Dependency-based refetching
//
// Usage:
//   const { data, isLoading, error, refetch } = useAsyncData(
//     async (signal) => {
//       const response = await fetch('/api/items', { signal });
//       return response.json();
//     },
//     [dependency1, dependency2]
//   );

import { useState, useEffect, useCallback, useRef } from "react";
import { api as log } from "@Utils/logger.js";

/**
 * @typedef {Object} AsyncDataState
 * @property {T|null} data - The fetched data
 * @property {boolean} isLoading - Whether data is being fetched
 * @property {string|null} error - Error message if fetch failed
 * @property {boolean} isError - Convenience boolean for error state
 * @property {boolean} isSuccess - Convenience boolean for success state
 */

/**
 * @typedef {Object} AsyncDataOptions
 * @property {T} [initialData] - Initial data before first fetch
 * @property {boolean} [enabled=true] - Whether to fetch on mount
 * @property {boolean} [refetchOnWindowFocus=false] - Refetch when window regains focus
 * @property {number} [retryCount=0] - Number of times to retry on failure
 * @property {number} [retryDelay=1000] - Delay between retries in ms
 * @property {function} [onSuccess] - Callback when fetch succeeds
 * @property {function} [onError] - Callback when fetch fails
 */

/**
 * useAsyncData - Generic hook for async data fetching
 *
 * Handles loading states, error handling, abort controllers, and refetching.
 * Replaces boilerplate in useFilters, useBookmarks, useAnnotations, etc.
 *
 * @template T
 * @param {function(AbortSignal): Promise<T>} fetchFn - Async function that fetches data
 * @param {Array} [deps=[]] - Dependencies that trigger refetch when changed
 * @param {AsyncDataOptions} [options={}] - Configuration options
 * @returns {AsyncDataState & { refetch: function(): Promise<T|null> }}
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useAsyncData(
 *   async (signal) => {
 *     const res = await fetch('/api/users', { signal });
 *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *     return res.json();
 *   }
 * );
 *
 * @example
 * // With dependencies and options
 * const { data, refetch } = useAsyncData(
 *   async (signal) => fetchUserById(userId, signal),
 *   [userId],
 *   {
 *     enabled: !!userId,
 *     onSuccess: (data) => console.log('Loaded:', data),
 *   }
 * );
 */
export function useAsyncData(fetchFn, deps = [], options = {}) {
  const {
    initialData = null,
    enabled = true,
    refetchOnWindowFocus = false,
    retryCount = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  // State
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // Refs for cleanup and retry tracking
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  /**
   * Execute the fetch operation
   * @param {boolean} isRetry - Whether this is a retry attempt
   * @returns {Promise<T|null>}
   */
  const executeFetch = useCallback(
    async (isRetry = false) => {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      // Reset state (but not on retry to avoid UI flicker)
      if (!isRetry) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await fetchFn(signal);

        // Only update state if still mounted
        if (mountedRef.current) {
          setData(result);
          setIsLoading(false);
          setError(null);
          retryCountRef.current = 0;

          // Call success callback
          if (onSuccess) {
            try {
              onSuccess(result);
            } catch (callbackError) {
              log.error("onSuccess callback error:", callbackError);
            }
          }
        }

        return result;
      } catch (err) {
        // Ignore abort errors (expected behavior)
        if (err.name === "AbortError") {
          return null;
        }

        // Only update state if still mounted
        if (mountedRef.current) {
          const errorMessage = err.message || "An error occurred";

          // Retry logic
          if (retryCountRef.current < retryCount) {
            retryCountRef.current += 1;
            log.debug(
              `Fetch failed, retrying (${retryCountRef.current}/${retryCount})...`
            );

            // Schedule retry
            await new Promise((resolve) => setTimeout(resolve, retryDelay));

            if (mountedRef.current) {
              return executeFetch(true);
            }
          }

          // No more retries - set error state
          setError(errorMessage);
          setIsLoading(false);

          // Call error callback
          if (onError) {
            try {
              onError(err);
            } catch (callbackError) {
              log.error("onError callback error:", callbackError);
            }
          }

          log.debug("Fetch error:", errorMessage);
        }

        return null;
      }
    },
    [fetchFn, retryCount, retryDelay, onSuccess, onError]
  );

  /**
   * Public refetch function
   * Can be called manually to refresh data
   */
  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    return executeFetch(false);
  }, [executeFetch]);

  // Initial fetch and dependency-based refetching
  useEffect(() => {
    if (enabled) {
      executeFetch(false);
    } else {
      setIsLoading(false);
    }

    return () => {
      // Abort on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Optional: Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (enabled && mountedRef.current) {
        refetch();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchOnWindowFocus, enabled, refetch]);

  // Computed states for convenience
  const isError = error !== null;
  const isSuccess = !isLoading && !isError && data !== null;

  return {
    data,
    isLoading,
    error,
    isError,
    isSuccess,
    refetch,
  };
}

/**
 * useAsyncMutation - For operations that modify data (create/update/delete)
 *
 * Unlike useAsyncData, this doesn't fetch on mount - only when called.
 *
 * @template T, V
 * @param {function(V, AbortSignal): Promise<T>} mutationFn - Async mutation function
 * @param {Object} [options={}] - Configuration options
 * @returns {{ mutate: function(V): Promise<T|null>, isLoading: boolean, error: string|null, reset: function }}
 *
 * @example
 * const { mutate, isLoading, error } = useAsyncMutation(
 *   async (newItem) => {
 *     const res = await fetch('/api/items', {
 *       method: 'POST',
 *       body: JSON.stringify(newItem),
 *     });
 *     return res.json();
 *   },
 *   { onSuccess: () => refetchList() }
 * );
 *
 * // Later...
 * await mutate({ name: 'New Item' });
 */
export function useAsyncMutation(mutationFn, options = {}) {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const mutate = useCallback(
    async (variables) => {
      // Abort any in-flight mutation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables, signal);

        if (mountedRef.current) {
          setIsLoading(false);

          if (onSuccess) {
            try {
              onSuccess(result, variables);
            } catch (callbackError) {
              log.error("onSuccess callback error:", callbackError);
            }
          }
        }

        return result;
      } catch (err) {
        if (err.name === "AbortError") {
          return null;
        }

        if (mountedRef.current) {
          const errorMessage = err.message || "Mutation failed";
          setError(errorMessage);
          setIsLoading(false);

          if (onError) {
            try {
              onError(err, variables);
            } catch (callbackError) {
              log.error("onError callback error:", callbackError);
            }
          }
        }

        return null;
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    isError: error !== null,
    reset,
  };
}

export default useAsyncData;
