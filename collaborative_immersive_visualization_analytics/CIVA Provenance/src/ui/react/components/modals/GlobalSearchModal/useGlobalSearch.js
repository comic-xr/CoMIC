/**
 * @file useGlobalSearch.js
 * @description Custom hook for managing global search state, results, and keyboard navigation.
 * Handles query debouncing, filter management, recent searches, and result selection.
 *
 * Features:
 * - Debounced search queries (300ms)
 * - Filter-based result grouping
 * - Keyboard navigation (up/down/enter)
 * - Recent searches with localStorage persistence
 * - Mock data with simulated API delay
 *
 * @example
 * const {
 *   query,
 *   setQuery,
 *   results,
 *   isLoading,
 *   selectedIndex,
 *   selectNext,
 *   selectPrevious,
 *   selectResult
 * } = useGlobalSearch();
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

/**
 * @typedef {Object} SearchResult
 * @property {string} id - Unique identifier
 * @property {'project'|'dataset'|'view'|'person'|'annotation'|'room'} type - Result type
 * @property {string} name - Display name
 * @property {string} [description] - Secondary text
 * @property {string} [projectName] - Parent project name
 * @property {string} [icon] - Icon name override
 * @property {string} [thumbnail] - Thumbnail URL
 * @property {Object} [metadata] - Additional type-specific data
 */

/**
 * @typedef {Object} UseGlobalSearchReturn
 * @property {string} query - Current search query
 * @property {(query: string) => void} setQuery - Update search query
 * @property {string} activeFilter - Current filter ID
 * @property {(filter: string) => void} setActiveFilter - Update active filter
 * @property {SearchResult[]} results - Search results
 * @property {Object} groupedResults - Results grouped by type
 * @property {Object} filterCounts - Count of results per filter
 * @property {boolean} isLoading - Whether search is in progress
 * @property {Error|null} error - Search error if any
 * @property {string[]} recentSearches - Recent search queries
 * @property {(query: string) => void} addRecentSearch - Add to recent searches
 * @property {() => void} clearRecentSearches - Clear all recent searches
 * @property {number} selectedIndex - Currently selected result index
 * @property {(index: number) => void} setSelectedIndex - Set selected index
 * @property {() => void} selectNext - Select next result
 * @property {() => void} selectPrevious - Select previous result
 * @property {() => SearchResult|null} selectResult - Get currently selected result
 */

// Storage key for recent searches
const RECENT_SEARCHES_KEY = "cia-web-recent-searches";
const MAX_RECENT_SEARCHES = 5;

// Mock data for development
const MOCK_RESULTS = [
  // Projects
  {
    id: "p1",
    type: "project",
    name: "Mars Exploration Dataset",
    description: "NASA Mars rover imagery collection",
  },
  {
    id: "p2",
    type: "project",
    name: "Urban Planning Analysis",
    description: "City infrastructure mapping project",
  },
  {
    id: "p3",
    type: "project",
    name: "Medical Imaging Research",
    description: "Radiology annotation study",
  },

  // Datasets
  {
    id: "d1",
    type: "dataset",
    name: "Training Images 2024",
    projectName: "Mars Exploration Dataset",
    description: "12,450 images",
  },
  {
    id: "d2",
    type: "dataset",
    name: "Validation Set A",
    projectName: "Mars Exploration Dataset",
    description: "2,100 images",
  },
  {
    id: "d3",
    type: "dataset",
    name: "Street View Captures",
    projectName: "Urban Planning Analysis",
    description: "45,000 images",
  },
  {
    id: "d4",
    type: "dataset",
    name: "CT Scans Batch 1",
    projectName: "Medical Imaging Research",
    description: "890 scans",
  },

  // Views
  {
    id: "v1",
    type: "view",
    name: "Crater Detection View",
    projectName: "Mars Exploration Dataset",
  },
  {
    id: "v2",
    type: "view",
    name: "Rock Classification",
    projectName: "Mars Exploration Dataset",
  },
  {
    id: "v3",
    type: "view",
    name: "Building Footprints",
    projectName: "Urban Planning Analysis",
  },
  {
    id: "v4",
    type: "view",
    name: "Tumor Detection",
    projectName: "Medical Imaging Research",
  },

  // People
  {
    id: "u1",
    type: "person",
    name: "Sarah Chen",
    description: "Data Scientist",
  },
  {
    id: "u2",
    type: "person",
    name: "Marcus Johnson",
    description: "ML Engineer",
  },
  {
    id: "u3",
    type: "person",
    name: "Elena Rodriguez",
    description: "Project Lead",
  },
  { id: "u4", type: "person", name: "David Kim", description: "Annotator" },

  // Annotations
  {
    id: "a1",
    type: "annotation",
    name: "Crater boundaries",
    projectName: "Mars Exploration Dataset",
    description: "4,521 annotations",
  },
  {
    id: "a2",
    type: "annotation",
    name: "Vehicle detection boxes",
    projectName: "Urban Planning Analysis",
    description: "12,890 annotations",
  },
  {
    id: "a3",
    type: "annotation",
    name: "Lesion segmentation",
    projectName: "Medical Imaging Research",
    description: "2,340 annotations",
  },

  // Rooms
  {
    id: "r1",
    type: "room",
    name: "Annotation Review Session",
    description: "5 participants",
  },
  {
    id: "r2",
    type: "room",
    name: "Weekly Sync",
    description: "12 participants",
  },
];

/**
 * Load recent searches from localStorage
 * @returns {string[]}
 */
function loadRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save recent searches to localStorage
 * @param {string[]} searches
 */
function saveRecentSearches(searches) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Filter results by search query
 * @param {SearchResult[]} results - All results
 * @param {string} query - Search query
 * @returns {SearchResult[]}
 */
function filterByQuery(results, query) {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  return results.filter((result) => {
    const searchableText = [result.name, result.description, result.projectName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}

/**
 * Filter results by type
 * @param {SearchResult[]} results - Results to filter
 * @param {string} filter - Filter ID ('all' or specific type)
 * @returns {SearchResult[]}
 */
function filterByType(results, filter) {
  if (filter === "all") return results;

  // Map filter ID to type(s)
  const typeMap = {
    projects: ["project"],
    datasets: ["dataset"],
    views: ["view"],
    people: ["person"],
    annotations: ["annotation"],
    rooms: ["room"],
  };

  const types = typeMap[filter] || [filter];
  return results.filter((result) => types.includes(result.type));
}

/**
 * Group results by type
 * @param {SearchResult[]} results - Results to group
 * @returns {Object<string, SearchResult[]>}
 */
function groupByType(results) {
  const groups = {};

  results.forEach((result) => {
    if (!groups[result.type]) {
      groups[result.type] = [];
    }
    groups[result.type].push(result);
  });

  // Sort groups in preferred order
  const order = ["project", "dataset", "view", "person", "annotation", "room"];
  const sorted = {};

  order.forEach((type) => {
    if (groups[type]) {
      sorted[type] = groups[type];
    }
  });

  return sorted;
}

/**
 * Count results by filter type
 * @param {SearchResult[]} results - All matching results
 * @returns {Object<string, number>}
 */
function countByFilter(results) {
  const counts = {
    all: results.length,
    projects: 0,
    datasets: 0,
    views: 0,
    people: 0,
    annotations: 0,
    rooms: 0,
  };

  results.forEach((result) => {
    const filterKey = result.type + "s"; // project -> projects
    if (counts[filterKey] !== undefined) {
      counts[filterKey]++;
    } else if (result.type === "person") {
      counts.people++;
    }
  });

  return counts;
}

/**
 * Custom hook for managing global search state.
 *
 * @param {Object} [options={}] - Hook options
 * @param {string} [options.initialQuery=''] - Initial search query
 * @param {string} [options.initialFilter='all'] - Initial filter
 * @param {number} [options.debounceMs=300] - Debounce delay in ms
 * @returns {UseGlobalSearchReturn}
 */
export function useGlobalSearch(options = {}) {
  const {
    initialQuery = "",
    initialFilter = "all",
    debounceMs = 300,
  } = options;

  // State
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() =>
    loadRecentSearches()
  );
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Refs for cancellation
  const searchTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  /**
   * Debounce query changes
   */
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, debounceMs]);

  /**
   * Perform search when debounced query changes
   */
  useEffect(() => {
    // Cancel any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Clear results if no query
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    // Start loading
    setIsLoading(true);
    setError(null);

    // Simulate API delay (replace with actual API call)
    searchTimeoutRef.current = setTimeout(() => {
      try {
        const filtered = filterByQuery(MOCK_RESULTS, debouncedQuery);
        setResults(filtered);
        setSelectedIndex(filtered.length > 0 ? 0 : -1);
      } catch (err) {
        setError(err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150); // Simulated delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [debouncedQuery]);

  /**
   * Reset selection when filter changes
   */
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeFilter]);

  /**
   * Filter and group results based on active filter
   */
  const filteredResults = useMemo(() => {
    return filterByType(results, activeFilter);
  }, [results, activeFilter]);

  const groupedResults = useMemo(() => {
    if (activeFilter !== "all") return null;
    return groupByType(filteredResults);
  }, [filteredResults, activeFilter]);

  const filterCounts = useMemo(() => {
    return countByFilter(results);
  }, [results]);

  /**
   * Add query to recent searches
   */
  const addRecentSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;

    setRecentSearches((prev) => {
      // Remove if already exists
      const filtered = prev.filter((s) => s !== searchQuery);
      // Add to front, limit to max
      const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  /**
   * Clear all recent searches
   */
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveRecentSearches([]);
  }, []);

  /**
   * Select next result
   */
  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => {
      const max = filteredResults.length - 1;
      return prev >= max ? 0 : prev + 1;
    });
  }, [filteredResults.length]);

  /**
   * Select previous result
   */
  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => {
      const max = filteredResults.length - 1;
      return prev <= 0 ? max : prev - 1;
    });
  }, [filteredResults.length]);

  /**
   * Get currently selected result
   */
  const selectResult = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
      const result = filteredResults[selectedIndex];
      addRecentSearch(query);
      return result;
    }
    return null;
  }, [selectedIndex, filteredResults, query, addRecentSearch]);

  /**
   * Handle query change with selection reset
   */
  const handleSetQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    // Don't reset selection here - let the effect handle it
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    activeFilter,
    setActiveFilter,
    results: filteredResults,
    groupedResults,
    filterCounts,
    isLoading,
    error,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    selectResult,
  };
}

export default useGlobalSearch;
