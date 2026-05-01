// src/ui/react/__mocks__/hooks/useFilters.mock.js
// Mock implementation of useFilters for Storybook
//
// Saved Filters are reusable filter presets that can be applied to views.
// Actions log to console for visibility in Storybook.

import { useState, useCallback, useMemo } from "react";
import { MOCK_USERS } from "../data/users.mock.js";

// =============================================================================
// MOCK SAVED FILTER DATA
// =============================================================================

const MOCK_SAVED_FILTERS = [
  {
    id: "filter-tumor-threshold",
    name: "Tumor Threshold",
    description: "Standard threshold for tumor visualization",
    type: "threshold",
    config: {
      min: 80,
      max: 220,
      dataArray: "intensity",
    },
    datasetTypes: ["nii", "dcm"], // Compatible file types
    tags: ["tumor", "medical", "threshold"],
    isStarred: true,
    isShared: true,
    sharedWith: ["user-smith", "user-jones"],
    usageCount: 47,
    createdBy: MOCK_USERS.current,
    createdAt: "2025-10-15T08:00:00Z",
    updatedAt: "2025-11-20T14:00:00Z",
  },
  {
    id: "filter-bone-window",
    name: "Bone Window",
    description: "CT bone window preset",
    type: "windowLevel",
    config: {
      window: 2000,
      level: 500,
    },
    datasetTypes: ["dcm"],
    tags: ["ct", "bone", "radiology"],
    isStarred: true,
    isShared: false,
    usageCount: 23,
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-01T10:00:00Z",
    updatedAt: "2025-11-01T10:00:00Z",
  },
  {
    id: "filter-soft-tissue",
    name: "Soft Tissue Window",
    description: "CT soft tissue preset",
    type: "windowLevel",
    config: {
      window: 400,
      level: 40,
    },
    datasetTypes: ["dcm"],
    tags: ["ct", "soft-tissue", "radiology"],
    isStarred: false,
    isShared: true,
    sharedWith: ["user-smith"],
    usageCount: 31,
    createdBy: MOCK_USERS.drSmith,
    createdAt: "2025-10-20T11:00:00Z",
    updatedAt: "2025-11-15T09:00:00Z",
  },
  {
    id: "filter-high-curvature",
    name: "High Curvature Regions",
    description: "Highlight areas of high surface curvature",
    type: "curvature",
    config: {
      threshold: 0.5,
      colorMap: "coolwarm",
    },
    datasetTypes: ["vtp", "vtk", "stl"],
    tags: ["surface", "geometry", "analysis"],
    isStarred: false,
    isShared: false,
    usageCount: 8,
    createdBy: MOCK_USERS.alexChen,
    createdAt: "2025-11-25T16:00:00Z",
    updatedAt: "2025-11-25T16:00:00Z",
  },
  {
    id: "filter-point-density",
    name: "Dense Point Regions",
    description: "Filter by point density for point clouds",
    type: "density",
    config: {
      minDensity: 100,
      radius: 5.0,
    },
    datasetTypes: ["vtp", "xyz", "pcd"],
    tags: ["point-cloud", "density"],
    isStarred: false,
    isShared: false,
    usageCount: 3,
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-28T14:00:00Z",
    updatedAt: "2025-11-28T14:00:00Z",
  },
];

// =============================================================================
// FILTER TYPE DEFINITIONS (for UI rendering)
// =============================================================================

export const FILTER_TYPES = {
  threshold: {
    name: "Threshold",
    icon: "filter",
    color: "#60a5fa",
    fields: ["min", "max", "dataArray"],
  },
  windowLevel: {
    name: "Window/Level",
    icon: "slidersHorizontal",
    color: "#34d399",
    fields: ["window", "level"],
  },
  curvature: {
    name: "Curvature",
    icon: "spline",
    color: "#c084fc",
    fields: ["threshold", "colorMap"],
  },
  density: {
    name: "Density",
    icon: "scatterChart",
    color: "#fbbf24",
    fields: ["minDensity", "radius"],
  },
  clip: {
    name: "Clip Plane",
    icon: "scissors",
    color: "#fb7185",
    fields: ["normal", "origin"],
  },
};

// =============================================================================
// MOCK HOOK
// =============================================================================

/**
 * Mock implementation of useFilters hook
 *
 * @param {Object} options - Filter options
 * @param {string} options.datasetType - Filter by compatible dataset type
 * @param {boolean} options.starredOnly - Show only starred
 * @param {boolean} options.sharedOnly - Show only shared
 * @returns {Object} Saved filters data and actions
 */
export function useMockFilters(options = {}) {
  const { datasetType, starredOnly, sharedOnly } = options;
  const [savedFilters, setSavedFilters] = useState(MOCK_SAVED_FILTERS);

  // Filter saved filters
  const filteredFilters = useMemo(() => {
    let result = savedFilters;

    if (datasetType) {
      result = result.filter((f) => f.datasetTypes?.includes(datasetType));
    }
    if (starredOnly) {
      result = result.filter((f) => f.isStarred);
    }
    if (sharedOnly) {
      result = result.filter((f) => f.isShared);
    }

    // Sort by usage count (most used first)
    return result.sort((a, b) => b.usageCount - a.usageCount);
  }, [savedFilters, datasetType, starredOnly, sharedOnly]);

  // Get starred filters
  const starredFilters = useMemo(
    () => savedFilters.filter((f) => f.isStarred),
    [savedFilters]
  );

  // Create saved filter
  const createFilter = useCallback(async (data) => {
    console.log("[Mock useFilters] createFilter:", data);

    const newFilter = {
      id: `filter-${Date.now()}`,
      name: data.name || "Untitled Filter",
      description: data.description || "",
      type: data.type || "threshold",
      config: data.config || {},
      datasetTypes: data.datasetTypes || [],
      tags: data.tags || [],
      isStarred: false,
      isShared: false,
      usageCount: 0,
      createdBy: MOCK_USERS.current,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavedFilters((prev) => [...prev, newFilter]);
    return newFilter;
  }, []);

  // Update saved filter
  const updateFilter = useCallback(async (filterId, updates) => {
    console.log("[Mock useFilters] updateFilter:", { filterId, updates });

    setSavedFilters((prev) =>
      prev.map((f) =>
        f.id === filterId
          ? { ...f, ...updates, updatedAt: new Date().toISOString() }
          : f
      )
    );
    return { success: true };
  }, []);

  // Delete saved filter
  const deleteFilter = useCallback(async (filterId) => {
    console.log("[Mock useFilters] deleteFilter:", filterId);

    setSavedFilters((prev) => prev.filter((f) => f.id !== filterId));
    return { success: true };
  }, []);

  // Toggle starred
  const toggleStarred = useCallback((filterId) => {
    console.log("[Mock useFilters] toggleStarred:", filterId);

    setSavedFilters((prev) =>
      prev.map((f) =>
        f.id === filterId ? { ...f, isStarred: !f.isStarred } : f
      )
    );
  }, []);

  // Apply filter to a view
  const applyFilter = useCallback(
    (filterId, viewConfigId) => {
      console.log("[Mock useFilters] applyFilter:", { filterId, viewConfigId });

      // Increment usage count
      setSavedFilters((prev) =>
        prev.map((f) =>
          f.id === filterId ? { ...f, usageCount: f.usageCount + 1 } : f
        )
      );

      const filter = savedFilters.find((f) => f.id === filterId);
      return filter;
    },
    [savedFilters]
  );

  // Share filter
  const shareFilter = useCallback(async (filterId, userIds) => {
    console.log("[Mock useFilters] shareFilter:", { filterId, userIds });

    setSavedFilters((prev) =>
      prev.map((f) =>
        f.id === filterId ? { ...f, isShared: true, sharedWith: userIds } : f
      )
    );
    return { success: true };
  }, []);

  // Duplicate filter
  const duplicateFilter = useCallback(
    async (filterId, newName) => {
      console.log("[Mock useFilters] duplicateFilter:", { filterId, newName });

      const original = savedFilters.find((f) => f.id === filterId);
      if (!original) return null;

      const duplicate = {
        ...original,
        id: `filter-${Date.now()}`,
        name: newName || `${original.name} (Copy)`,
        isStarred: false,
        isShared: false,
        sharedWith: [],
        usageCount: 0,
        createdBy: MOCK_USERS.current,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSavedFilters((prev) => [...prev, duplicate]);
      return duplicate;
    },
    [savedFilters]
  );

  return {
    savedFilters: filteredFilters,
    starredFilters,
    filterTypes: FILTER_TYPES,
    isLoading: false,
    error: null,
    createFilter,
    updateFilter,
    deleteFilter,
    toggleStarred,
    applyFilter,
    shareFilter,
    duplicateFilter,
  };
}

// Export mock data for direct use in stories
export { MOCK_SAVED_FILTERS };
