// src/ui/react/hooks/useInstances.js
// Hook to track all active instances across the workspace

import { useState, useEffect } from "react";
import { ui as log } from "@Utils/logger.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";

/**
 * Hook to get all active instances
 * Returns array of instance metadata
 */
export function useInstances() {
  const [instances, setInstances] = useState([]);

  useEffect(() => {
    log.debug("useInstances: Setting up subscription");

    const updateInstances = () => {
      log.debug("useInstances: Updating instances");

      // Get all instances from workspaceManager
      const allInstances = workspaceManager
        .getAllInstanceIds()
        .map((instanceId) => {
          const instance = workspaceManager.getInstance(instanceId);

          return {
            id: instance.instanceId,
            datasetId: instance.datasetId,
            createdAt: instance.createdAt,
            lastActive: instance.lastActive,
          };
        });

      setInstances(allInstances);
    };

    // Initial update
    updateInstances();

    // Subscribe to workspace changes
    workspaceManager.addListener(updateInstances);

    return () => {
      log.debug("useInstances: Cleaning up subscription");
      workspaceManager.removeListener(updateInstances);
    };
  }, []);

  return instances;
}
