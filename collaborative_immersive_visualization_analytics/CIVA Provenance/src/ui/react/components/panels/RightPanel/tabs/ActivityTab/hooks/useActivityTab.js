/**
 * @file useActivityTab.js
 * @description Logic hook for ActivityTab component.
 * Separates filtering and state management from presentation.
 *
 * @example
 * const {
 *   activities,
 *   filters,
 *   activeFilter,
 *   filteredActivities,
 * } = useActivityTab({ activities, filters });
 */

import { useState, useMemo } from "react";

/**
 * Default filters
 */
export const DEFAULT_FILTERS = [
  { id: "all", label: "All Activity" },
  { id: "views", label: "Views" },
  { id: "datasets", label: "Datasets" },
  { id: "annotations", label: "Annotations" },
  { id: "system", label: "System" },
];

/**
 * Default empty activities
 */
const DEFAULT_ACTIVITIES = [];

/**
 * Hook for ActivityTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {Array} [options.activities] - Activity items
 * @param {Array} [options.filters] - Available filters
 * @returns {Object} Activity state and handlers
 */
export function useActivityTab(options = {}) {
  const { activities: propActivities, filters: propFilters } = options;

  // Use props or defaults
  const activities = propActivities || DEFAULT_ACTIVITIES;
  const filters = propFilters || DEFAULT_FILTERS;

  // Filter state
  const [activeFilter, setActiveFilter] = useState("all");

  // Filter activities based on active filter
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "views") return activity.type === "view";
      if (activeFilter === "datasets") return activity.type === "dataset";
      if (activeFilter === "annotations") return activity.type === "annotation";
      if (activeFilter === "system")
        return activity.type === "system" || activity.type === "join";
      return true;
    });
  }, [activities, activeFilter]);

  return {
    // Data
    activities,
    filters,

    // Filter state
    activeFilter,
    setActiveFilter,

    // Derived
    filteredActivities,
  };
}

export default useActivityTab;
