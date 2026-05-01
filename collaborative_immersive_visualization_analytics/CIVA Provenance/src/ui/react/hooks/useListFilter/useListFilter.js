/**
 * @file useListFilter.js
 * @description Headless hook for list filtering, sorting, and search.
 *
 * FEATURES:
 * - Search across configurable fields
 * - Type filtering (multi-select with categories)
 * - Tag filtering (multi-select)
 * - Quick filters (predicate-based toggles)
 * - Sorting with configurable comparators
 * - Multi-section filtering (e.g., Starred + All Files)
 * - Optional localStorage persistence
 *
 * @example
 * const filter = useListFilter({
 *   searchFields: (file) => [file.name, file.type],
 *   quickFilterDefs: FILES_QUICK_FILTERS,
 *   typeCategories: FILE_TYPE_CATEGORIES,
 *   sortOptions: FILE_SORT_OPTIONS,
 *   persistKey: 'files-tab-filters',
 * });
 *
 * const filtered = filter.applyFilters(files);
 * // or for multiple sections:
 * const { results, counts } = filter.applyToSections({
 *   starred: starredFiles,
 *   all: allFiles,
 * });
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * @typedef {Object} QuickFilterDef
 * @property {string} id - Unique identifier
 * @property {string} label - Display label
 * @property {string} icon - Icon name from registry
 * @property {Function} predicate - (item) => boolean
 */

/**
 * @typedef {Object} TypeCategory
 * @property {string} id - Category identifier
 * @property {string} label - Display label
 * @property {string} icon - Icon name
 * @property {Array<{id: string, label: string}>} types - Types in category
 */

/**
 * @typedef {Object} SortOption
 * @property {string} value - Sort value (e.g., 'name-asc')
 * @property {string} label - Full label (e.g., 'Name (A→Z)')
 * @property {string} shortLabel - Compact label (e.g., 'Name')
 * @property {string} icon - Icon name
 * @property {Function} comparator - (a, b) => number
 */

/**
 * @typedef {Object} UseListFilterOptions
 * @property {Function} searchFields - (item) => string[] of searchable fields
 * @property {QuickFilterDef[]} quickFilterDefs - Quick filter definitions
 * @property {TypeCategory[]} typeCategories - Type category definitions
 * @property {SortOption[]} sortOptions - Sort option definitions
 * @property {string} [persistKey] - localStorage key for persistence
 * @property {Object} [initialState] - Initial filter state
 */

/**
 * @typedef {Object} UseListFilterReturn
 * @property {string} searchQuery - Current search query
 * @property {string[]} selectedTypes - Selected type IDs
 * @property {string[]} selectedTags - Selected tag IDs
 * @property {string[]} quickFilters - Active quick filter IDs
 * @property {string} sortBy - Current sort value
 * @property {boolean} hasActiveFilters - Whether any filters are active
 * @property {number} activeFilterCount - Count of active filters
 * @property {Function} setSearchQuery - Set search query
 * @property {Function} toggleType - Toggle a type filter
 * @property {Function} toggleTag - Toggle a tag filter
 * @property {Function} toggleQuickFilter - Toggle a quick filter
 * @property {Function} selectAllTypes - Select all types
 * @property {Function} clearAllTypes - Clear all type selections
 * @property {Function} setSortBy - Set sort option
 * @property {Function} clearAll - Clear all filters
 * @property {Function} applyFilters - Apply filters to item array
 * @property {Function} applyToSections - Apply filters to multiple sections
 */

/**
 * Headless hook for list filtering, sorting, and search.
 *
 * @param {UseListFilterOptions} options
 * @returns {UseListFilterReturn}
 */
export function useListFilter({
  searchFields = (item) => [item.name || ''],
  quickFilterDefs = [],
  typeCategories = [],
  sortOptions = [],
  persistKey = null,
  initialState = {},
}) {
  // ===========================================================================
  // PERSISTENCE HELPERS
  // ===========================================================================

  const loadPersistedState = useCallback(() => {
    if (!persistKey) return {};
    try {
      const stored = localStorage.getItem(persistKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn(`Failed to load filter state from ${persistKey}:`, e);
      return {};
    }
  }, [persistKey]);

  const persistState = useCallback(
    (state) => {
      if (!persistKey) return;
      try {
        localStorage.setItem(persistKey, JSON.stringify(state));
      } catch (e) {
        console.warn(`Failed to persist filter state to ${persistKey}:`, e);
      }
    },
    [persistKey]
  );

  // ===========================================================================
  // STATE
  // ===========================================================================

  // Memoize persisted state to avoid reloading on every render
  const [persisted] = useState(() => loadPersistedState());
  const defaultSort = sortOptions[0]?.value || 'name-asc';

  const [searchQuery, setSearchQuery] = useState(
    initialState.search ?? persisted.search ?? ''
  );
  const [selectedTypes, setSelectedTypes] = useState(
    initialState.types ?? persisted.types ?? []
  );
  const [selectedTags, setSelectedTags] = useState(
    initialState.tags ?? persisted.tags ?? []
  );
  const [quickFilters, setQuickFilters] = useState(
    initialState.quickFilters ?? persisted.quickFilters ?? []
  );
  const [sortBy, setSortBy] = useState(
    initialState.sortBy ?? persisted.sortBy ?? defaultSort
  );

  // ===========================================================================
  // PERSIST ON CHANGE
  // ===========================================================================

  useEffect(() => {
    if (!persistKey) return;
    persistState({
      search: searchQuery,
      types: selectedTypes,
      tags: selectedTags,
      quickFilters,
      sortBy,
    });
  }, [
    searchQuery,
    selectedTypes,
    selectedTags,
    quickFilters,
    sortBy,
    persistKey,
    persistState,
  ]);

  // ===========================================================================
  // ACTIONS
  // ===========================================================================

  const toggleType = useCallback((typeId) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  }, []);

  const toggleTag = useCallback((tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  }, []);

  const toggleQuickFilter = useCallback((filterId) => {
    setQuickFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const selectAllTypes = useCallback(() => {
    const allTypeIds = typeCategories.flatMap((cat) =>
      cat.types.map((t) => t.id)
    );
    setSelectedTypes(allTypeIds);
  }, [typeCategories]);

  const clearAllTypes = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  const clearAllTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedTags([]);
    setQuickFilters([]);
    // Note: Don't reset sortBy - users typically want to keep their sort preference
  }, []);

  // ===========================================================================
  // FILTER APPLICATION
  // ===========================================================================

  const applyFilters = useCallback(
    (items) => {
      if (!items || !Array.isArray(items)) return [];

      let result = [...items];

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter((item) =>
          searchFields(item).some(
            (field) => field?.toLowerCase().includes(query)
          )
        );
      }

      // Type filter
      if (selectedTypes.length > 0) {
        result = result.filter((item) => {
          // Support both item.type and item.fileType
          const itemType = item.type || item.fileType;
          return selectedTypes.includes(itemType);
        });
      }

      // Tag filter
      if (selectedTags.length > 0) {
        result = result.filter((item) =>
          item.tags?.some((tag) => selectedTags.includes(tag))
        );
      }

      // Quick filters (AND logic - all active filters must pass)
      if (quickFilters.length > 0) {
        result = result.filter((item) =>
          quickFilters.every((filterId) => {
            const def = quickFilterDefs.find((d) => d.id === filterId);
            return def ? def.predicate(item) : true;
          })
        );
      }

      // Sort
      if (sortBy) {
        const sortDef = sortOptions.find((s) => s.value === sortBy);
        if (sortDef?.comparator) {
          result.sort(sortDef.comparator);
        }
      }

      return result;
    },
    [
      searchQuery,
      selectedTypes,
      selectedTags,
      quickFilters,
      sortBy,
      searchFields,
      quickFilterDefs,
      sortOptions,
    ]
  );

  const applyToSections = useCallback(
    (sections) => {
      const results = {};
      const counts = {
        total: 0,
        matched: 0,
        bySection: {},
      };

      Object.entries(sections).forEach(([key, sectionItems]) => {
        const filtered = applyFilters(sectionItems);
        results[key] = filtered;
        counts.bySection[key] = {
          total: sectionItems.length,
          matched: filtered.length,
        };
        counts.total += sectionItems.length;
        counts.matched += filtered.length;
      });

      return { results, counts };
    },
    [applyFilters]
  );

  // ===========================================================================
  // COMPUTED
  // ===========================================================================

  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedTypes.length > 0 ||
    selectedTags.length > 0 ||
    quickFilters.length > 0;

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedTypes.length +
    selectedTags.length +
    quickFilters.length;

  // Get the current sort definition
  const currentSortOption = useMemo(
    () => sortOptions.find((s) => s.value === sortBy),
    [sortOptions, sortBy]
  );

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // State
    searchQuery,
    selectedTypes,
    selectedTags,
    quickFilters,
    sortBy,
    hasActiveFilters,
    activeFilterCount,
    currentSortOption,

    // Actions
    setSearchQuery,
    toggleType,
    toggleTag,
    toggleQuickFilter,
    selectAllTypes,
    clearAllTypes,
    clearAllTags,
    setSortBy,
    clearAll,

    // Filter functions
    applyFilters,
    applyToSections,
  };
}

export default useListFilter;
