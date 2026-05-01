// src/core/instances/types/vtk/hooks/useVTKReduction.js

import { useState, useEffect, useCallback } from "react";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { render as log } from "@Utils/logger.js";

/**
 * Hook to control dimensionality reduction for a specific VTK instance
 *
 * @param {string} instanceId - The instance to control
 * @returns {Object} Reduction controls
 */
export function useVTKReduction(instanceId) {
  const [method, setMethod] = useState("pca");
  const [components, setComponents] = useState(3);
  const [isReductionApplied, setIsReductionApplied] = useState(false);
  const [canApplyReduction, setCanApplyReduction] = useState(false);

  // Check if this instance has data loaded
  useEffect(() => {
    const checkReductionReady = () => {
      const instance = workspaceManager.getInstance(instanceId);

      if (!instance) {
        setCanApplyReduction(false);
        return;
      }

      // Check if instance has data
      const hasData = instance.instanceData?.hasData || false;
      setCanApplyReduction(hasData);
    };

    // Initial check
    checkReductionReady();

    // Subscribe to workspace changes
    workspaceManager.addListener(checkReductionReady);

    return () => {
      workspaceManager.removeListener(checkReductionReady);
    };
  }, [instanceId]);

  // Toggle reduction
  const toggleReduction = useCallback(async () => {
    if (!canApplyReduction) {
      log.warn("Cannot apply reduction: No data loaded");
      return false;
    }

    const instance = workspaceManager.getInstance(instanceId);
    if (!instance) return false;

    try {
      // Call the handler's reduction feature
      // This is handler-specific, but we're in VTK hooks so that's OK
      const success = await instance.handler.toggleReduction(
        instance.instanceData,
        method,
        components
      );

      if (success) {
        setIsReductionApplied(!isReductionApplied);
      }

      return success;
    } catch (error) {
      log.error("Reduction failed:", error);
      return false;
    }
  }, [instanceId, method, components, canApplyReduction, isReductionApplied]);

  return {
    method,
    setMethod,
    components,
    setComponents,
    isReductionApplied,
    toggleReduction,
    canApplyReduction,
  };
}
