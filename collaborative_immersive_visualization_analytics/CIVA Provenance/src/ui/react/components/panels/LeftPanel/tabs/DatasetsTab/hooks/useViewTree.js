// hooks/useViewTree.js
// Hook for managing the view tree state in DatasetsTab

import { useState, useMemo, useCallback } from "react";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";
import { getViewConfigurationManager } from "@Init/appInitializer.js";

/**
 * Hook to manage the datasets/views tree structure
 * Provides filtering, expansion state, and view operations
 */
export function useViewTree({ workspaceId }) {
  const { datasets, isLoading, error, refetch } = useDatasets({ workspaceId });

  // Expansion states for tree nodes
  const [expandedNodes, setExpandedNodes] = useState({});

  // Filter state
  const [filter, setFilter] = useState({
    active: true,
    inactive: true,
    shared: true,
  });

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Toggle node expansion
  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allExpanded = {};
    datasets.forEach((ds) => {
      allExpanded[ds.id] = true;
    });
    setExpandedNodes(allExpanded);
  }, [datasets]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes({});
  }, []);

  // Toggle filter
  const toggleFilter = useCallback((filterKey) => {
    setFilter((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  }, []);

  // Get views for a dataset from ViewConfigurationManager
  const getViewsForDataset = useCallback((datasetId) => {
    try {
      return getViewConfigurationManager()?.getViewsForDataset(datasetId) || [];
    } catch (e) {
      return [];
    }
  }, []);

  // Filtered datasets based on current filters and search
  const filteredDatasets = useMemo(() => {
    if (!datasets) return [];

    return datasets.filter((ds) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = (ds.filename || ds.name || "").toLowerCase();
        if (!name.includes(query)) return false;
      }
      return true;
    });
  }, [datasets, searchQuery]);

  return {
    datasets: filteredDatasets,
    isLoading,
    error,
    refetch,
    expandedNodes,
    toggleNode,
    expandAll,
    collapseAll,
    filter,
    toggleFilter,
    searchQuery,
    setSearchQuery,
    getViewsForDataset,
  };
}

export default useViewTree;
