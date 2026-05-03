// src/ui/react/hooks/useThumbnail.js
// Hook for fetching server-generated view thumbnails
//
// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY MODEL: SERVER-AUTHORITATIVE THUMBNAILS
// ═══════════════════════════════════════════════════════════════════════════════
//
// Thumbnails are generated ONLY by server-side events. The client cannot:
// - Upload thumbnails
// - Request/trigger generation
// - Influence when thumbnails are captured
//
// The client can ONLY fetch existing thumbnails.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@Services/apiClient.js";
import { thumbnails as log } from "@Utils/logger.js";

/**
 * Thumbnail fetch states
 */
export const THUMBNAIL_STATUS = {
  IDLE: "idle", // No viewId provided
  LOADING: "loading", // Fetching from server
  LOADED: "loaded", // Successfully loaded
  NOT_FOUND: "not-found", // Server returned 404 (not generated yet)
  ERROR: "error", // Fetch failed
};

/**
 * useThumbnail - Hook for fetching server-generated view thumbnails
 *
 * This hook ONLY fetches thumbnails. It cannot trigger generation.
 * Thumbnails are generated server-side when files are uploaded or views created.
 *
 * @param {string} viewId - The view configuration ID
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Whether to fetch (default: true if viewId provided)
 * @param {string} options.snapshotId - Specific snapshot thumbnail to fetch
 * @param {number} options.retryInterval - If not found, retry after this many ms (0 = no retry)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 5)
 * @returns {Object} { url, status, error, refetch }
 *
 * @example
 * function ViewCard({ viewId }) {
 *   const { url, status } = useThumbnail(viewId);
 *
 *   if (status === 'loading') return <Skeleton />;
 *   if (status === 'not-found') return <PlaceholderIcon />;
 *   if (status === 'error') return <ErrorIcon />;
 *
 *   return <img src={url} alt="View thumbnail" />;
 * }
 */
export function useThumbnail(viewId, options = {}) {
  const {
    enabled = true,
    snapshotId = null,
    retryInterval = 0, // Disabled by default - server generates on its schedule
    maxRetries = 5,
  } = options;

  const [status, setStatus] = useState(THUMBNAIL_STATUS.IDLE);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0); // Increment to force cache-busting

  // Track blob URL for cleanup
  const blobUrlRef = useRef(null);

  // Track retry count
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  // Cleanup blob URL and timeouts on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Fetch the thumbnail from server
   */
  const fetchThumbnail = useCallback(
    async (bustCache = false) => {
      if (!viewId || !enabled) {
        setStatus(THUMBNAIL_STATUS.IDLE);
        return;
      }

      setStatus(THUMBNAIL_STATUS.LOADING);
      setError(null);

      try {
        // Build endpoint with cache-busting if needed
        const params = new URLSearchParams();
        if (snapshotId) params.append("snapshotId", snapshotId);
        if (bustCache) params.append("_t", Date.now()); // Cache-busting timestamp
        const queryString = params.toString();
        const endpoint = `/views/${viewId}/thumbnail${
          queryString ? `?${queryString}` : ""
        }`;

        log.debug(
          `Fetching thumbnail: ${endpoint}${bustCache ? " (cache-busted)" : ""}`
        );

        // Fetch image as blob
        // Note: apiClient.baseUrl should be the API server URL
        const baseUrl =
          apiClient?.baseUrl ||
          window.API_BASE_URL ||
          "http://localhost:3001/api";
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: apiClient?.getAuthHeaders?.() || {},
          cache: bustCache ? "no-store" : "default", // Force fresh fetch when busting cache
        });

        // Not found - thumbnail hasn't been generated yet
        if (response.status === 404) {
          log.debug(`No thumbnail for view ${viewId} (not generated yet)`);
          setStatus(THUMBNAIL_STATUS.NOT_FOUND);
          setUrl(null);

          // Schedule retry if enabled
          if (retryInterval > 0 && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            log.debug(
              `Will retry thumbnail fetch in ${retryInterval}ms (attempt ${retryCountRef.current}/${maxRetries})`
            );
            retryTimeoutRef.current = setTimeout(
              () => fetchThumbnail(false),
              retryInterval
            );
          }

          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success - create blob URL
        const blob = await response.blob();

        // Cleanup previous blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        const newUrl = URL.createObjectURL(blob);
        blobUrlRef.current = newUrl;
        setUrl(newUrl);
        setStatus(THUMBNAIL_STATUS.LOADED);
        retryCountRef.current = 0; // Reset retry count on success

        log.debug(`Thumbnail loaded for view ${viewId}`);
      } catch (err) {
        log.error(`Failed to fetch thumbnail for ${viewId}:`, err);
        setError(err.message);
        setStatus(THUMBNAIL_STATUS.ERROR);
      }
    },
    [viewId, enabled, snapshotId, retryInterval, maxRetries]
  );

  // Fetch on mount and when dependencies change
  useEffect(() => {
    retryCountRef.current = 0; // Reset retries on viewId change
    fetchThumbnail(false);
  }, [fetchThumbnail]);

  // Listen for server-broadcast events indicating thumbnail is ready
  // This event comes from WebSocket when server finishes generating
  useEffect(() => {
    if (!viewId) return;

    const handleThumbnailReady = (event) => {
      const { viewId: readyViewId, snapshotId: readySnapshotId } =
        event.detail || {};

      // Check if this notification is for our thumbnail
      const isMatch =
        readyViewId === viewId &&
        (!snapshotId || snapshotId === readySnapshotId);

      if (isMatch) {
        log.info(
          `Server updated thumbnail for ${viewId}, refetching with cache-bust...`
        );
        retryCountRef.current = 0;
        setRevision((r) => r + 1); // Trigger re-render
        fetchThumbnail(true); // Bust cache when triggered by WebSocket
      }
    };

    // This event is dispatched by serverSync when it receives ws:thumbnail:ready
    window.addEventListener("cia:thumbnail-ready", handleThumbnailReady);
    return () => {
      window.removeEventListener("cia:thumbnail-ready", handleThumbnailReady);
    };
  }, [viewId, snapshotId, fetchThumbnail]);

  return {
    url,
    status,
    error,
    refetch: fetchThumbnail,
    isLoading: status === THUMBNAIL_STATUS.LOADING,
    isLoaded: status === THUMBNAIL_STATUS.LOADED,
    isNotFound: status === THUMBNAIL_STATUS.NOT_FOUND,
    hasError: status === THUMBNAIL_STATUS.ERROR,
  };
}

/**
 * useThumbnailUrl - Convenience hook that just returns the URL or null
 *
 * @param {string} viewId - View configuration ID
 * @returns {string|null} Thumbnail URL or null
 */
export function useThumbnailUrl(viewId) {
  const { url, isLoaded } = useThumbnail(viewId);
  return isLoaded ? url : null;
}

export default useThumbnail;
