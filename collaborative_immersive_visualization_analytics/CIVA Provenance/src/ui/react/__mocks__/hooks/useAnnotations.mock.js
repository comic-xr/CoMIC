// src/ui/react/__mocks__/hooks/useAnnotations.mock.js
// Mock implementation of useAnnotations for Storybook
//
// Returns static mock annotation data instead of reading from AnnotationManager.
// Actions log to console for visibility in Storybook.

import { useState, useCallback, useMemo } from "react";
import { MOCK_ANNOTATIONS } from "../data/annotations.mock.js";

/**
 * Mock implementation of useAnnotations hook
 *
 * @param {string} datasetId - Optional filter by dataset
 * @returns {Object} Annotations data and actions
 */
export function useMockAnnotations(datasetId = null) {
  const [annotations, setAnnotations] = useState(MOCK_ANNOTATIONS);

  // Filter by dataset if provided
  const filteredAnnotations = useMemo(() => {
    if (!datasetId) return annotations;
    return annotations.filter((a) => a.datasetId === datasetId);
  }, [annotations, datasetId]);

  // Group by type
  const groupedByType = useMemo(() => {
    return filteredAnnotations.reduce((acc, ann) => {
      const type = ann.type || "point";
      if (!acc[type]) acc[type] = [];
      acc[type].push(ann);
      return acc;
    }, {});
  }, [filteredAnnotations]);

  // Create annotation
  const createAnnotation = useCallback(async (datasetId, data) => {
    console.log("[Mock useAnnotations] createAnnotation:", { datasetId, data });

    const newAnnotation = {
      id: `ann-${Date.now()}`,
      datasetId,
      type: data.type || "point",
      position: data.position || [0, 0, 0],
      text: data.text || "",
      tags: data.tags || [],
      color: data.color || "#fbbf24",
      createdBy: "current-user",
      createdByName: "You",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVisible: true,
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    return newAnnotation;
  }, []);

  // Update annotation
  const updateAnnotation = useCallback(async (annotationId, updates) => {
    console.log("[Mock useAnnotations] updateAnnotation:", {
      annotationId,
      updates,
    });

    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === annotationId
          ? { ...a, ...updates, updatedAt: new Date().toISOString() }
          : a
      )
    );
    return { success: true };
  }, []);

  // Delete annotation
  const deleteAnnotation = useCallback(async (annotationId) => {
    console.log("[Mock useAnnotations] deleteAnnotation:", annotationId);

    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    return { success: true };
  }, []);

  // Toggle visibility
  const toggleVisibility = useCallback((annotationId) => {
    console.log("[Mock useAnnotations] toggleVisibility:", annotationId);

    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === annotationId ? { ...a, isVisible: !a.isVisible } : a
      )
    );
  }, []);

  // Filter by tags
  const filterByTags = useCallback(
    (tags) => {
      if (!tags || tags.length === 0) return filteredAnnotations;
      return filteredAnnotations.filter((a) =>
        tags.some((tag) => a.tags?.includes(tag))
      );
    },
    [filteredAnnotations]
  );

  return {
    annotations: filteredAnnotations,
    groupedByType,
    isLoading: false,
    error: null,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toggleVisibility,
    filterByTags,
  };
}
