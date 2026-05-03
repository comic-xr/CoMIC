// src/ui/react/__mocks__/hooks/useBookmarks.mock.js
// Mock implementation of useBookmarks for Storybook
//
// Bookmarks save view states (camera, filters, etc.) for quick recall.
// Actions log to console for visibility in Storybook.

import { useState, useCallback, useMemo } from "react";
import { MOCK_USERS } from "../data/users.mock.js";

// =============================================================================
// MOCK BOOKMARK DATA
// =============================================================================

const MOCK_BOOKMARKS = [
  {
    id: "bm-tumor-overview",
    name: "Tumor Overview",
    description: "Main tumor mass from superior angle",
    viewConfigId: "view-brain-axial",
    datasetId: "ds-brain-scan",
    datasetName: "Brain_Scan_001.nii",
    thumbnail: null, // Would be base64 screenshot
    camera: {
      position: [0, 150, 200],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
    },
    filters: [{ type: "threshold", min: 80, max: 200 }],
    tags: ["tumor", "important", "review"],
    isStarred: true,
    isShared: false,
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-20T10:00:00Z",
    updatedAt: "2025-11-28T15:30:00Z",
  },
  {
    id: "bm-lateral-view",
    name: "Lateral Hemisphere",
    description: "Left hemisphere lateral surface",
    viewConfigId: "view-brain-sagittal",
    datasetId: "ds-brain-scan",
    datasetName: "Brain_Scan_001.nii",
    thumbnail: null,
    camera: {
      position: [-200, 0, 0],
      focalPoint: [0, 0, 0],
      viewUp: [0, 0, 1],
    },
    filters: [],
    tags: ["anatomy", "hemisphere"],
    isStarred: false,
    isShared: true,
    sharedWith: ["user-smith"],
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-22T14:00:00Z",
    updatedAt: "2025-11-22T14:00:00Z",
  },
  {
    id: "bm-ct-comparison",
    name: "CT Overlay Comparison",
    description: "CT and MRI fusion view",
    viewConfigId: "view-ct-coronal",
    datasetId: "ds-ct-overlay",
    datasetName: "CT_Overlay.dcm",
    thumbnail: null,
    camera: {
      position: [0, 0, 300],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
    },
    filters: [{ type: "windowLevel", window: 400, level: 40 }],
    tags: ["ct", "comparison", "fusion"],
    isStarred: true,
    isShared: false,
    createdBy: MOCK_USERS.drSmith,
    createdAt: "2025-11-25T09:00:00Z",
    updatedAt: "2025-11-26T11:00:00Z",
  },
  {
    id: "bm-surface-detail",
    name: "Surface Detail",
    description: "High curvature regions highlighted",
    viewConfigId: "view-surface-default",
    datasetId: "ds-surface-model",
    datasetName: "Surface_Model.vtp",
    thumbnail: null,
    camera: {
      position: [50, 30, 50],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
    },
    filters: [{ type: "curvature", threshold: 0.5 }],
    tags: ["surface", "detail"],
    isStarred: false,
    isShared: true,
    sharedWith: ["user-alex", "user-smith"],
    createdBy: MOCK_USERS.alexChen,
    createdAt: "2025-11-27T16:00:00Z",
    updatedAt: "2025-11-27T16:00:00Z",
  },
];

// =============================================================================
// MOCK HOOK
// =============================================================================

/**
 * Mock implementation of useBookmarks hook
 *
 * @param {Object} options - Filter options
 * @param {string} options.datasetId - Filter by dataset
 * @param {boolean} options.starredOnly - Show only starred
 * @param {boolean} options.sharedOnly - Show only shared
 * @returns {Object} Bookmarks data and actions
 */
export function useMockBookmarks(options = {}) {
  const { datasetId, starredOnly, sharedOnly } = options;
  const [bookmarks, setBookmarks] = useState(MOCK_BOOKMARKS);

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    if (datasetId) {
      result = result.filter((b) => b.datasetId === datasetId);
    }
    if (starredOnly) {
      result = result.filter((b) => b.isStarred);
    }
    if (sharedOnly) {
      result = result.filter((b) => b.isShared);
    }

    return result;
  }, [bookmarks, datasetId, starredOnly, sharedOnly]);

  // Get starred bookmarks
  const starredBookmarks = useMemo(
    () => bookmarks.filter((b) => b.isStarred),
    [bookmarks]
  );

  // Create bookmark from current view state
  const createBookmark = useCallback(async (viewConfigId, data) => {
    console.log("[Mock useBookmarks] createBookmark:", { viewConfigId, data });

    const newBookmark = {
      id: `bm-${Date.now()}`,
      name: data.name || "Untitled Bookmark",
      description: data.description || "",
      viewConfigId,
      datasetId: data.datasetId,
      datasetName: data.datasetName || "Unknown Dataset",
      thumbnail: data.thumbnail || null,
      camera: data.camera || {
        position: [0, 0, 100],
        focalPoint: [0, 0, 0],
        viewUp: [0, 1, 0],
      },
      filters: data.filters || [],
      tags: data.tags || [],
      isStarred: false,
      isShared: false,
      createdBy: MOCK_USERS.current,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBookmarks((prev) => [...prev, newBookmark]);
    return newBookmark;
  }, []);

  // Update bookmark
  const updateBookmark = useCallback(async (bookmarkId, updates) => {
    console.log("[Mock useBookmarks] updateBookmark:", { bookmarkId, updates });

    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bookmarkId
          ? { ...b, ...updates, updatedAt: new Date().toISOString() }
          : b
      )
    );
    return { success: true };
  }, []);

  // Delete bookmark
  const deleteBookmark = useCallback(async (bookmarkId) => {
    console.log("[Mock useBookmarks] deleteBookmark:", bookmarkId);

    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    return { success: true };
  }, []);

  // Toggle starred
  const toggleStarred = useCallback((bookmarkId) => {
    console.log("[Mock useBookmarks] toggleStarred:", bookmarkId);

    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bookmarkId ? { ...b, isStarred: !b.isStarred } : b
      )
    );
  }, []);

  // Apply bookmark (restore view state)
  const applyBookmark = useCallback(
    (bookmarkId) => {
      console.log("[Mock useBookmarks] applyBookmark:", bookmarkId);
      const bookmark = bookmarks.find((b) => b.id === bookmarkId);
      if (bookmark) {
        console.log("  -> Would restore camera:", bookmark.camera);
        console.log("  -> Would restore filters:", bookmark.filters);
      }
      return bookmark;
    },
    [bookmarks]
  );

  // Share bookmark
  const shareBookmark = useCallback(async (bookmarkId, userIds) => {
    console.log("[Mock useBookmarks] shareBookmark:", { bookmarkId, userIds });

    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bookmarkId ? { ...b, isShared: true, sharedWith: userIds } : b
      )
    );
    return { success: true };
  }, []);

  return {
    bookmarks: filteredBookmarks,
    starredBookmarks,
    isLoading: false,
    error: null,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    toggleStarred,
    applyBookmark,
    shareBookmark,
  };
}

// Export mock data for direct use in stories
export { MOCK_BOOKMARKS };
