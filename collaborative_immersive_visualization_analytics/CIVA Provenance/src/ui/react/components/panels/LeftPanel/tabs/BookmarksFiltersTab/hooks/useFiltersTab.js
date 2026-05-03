/**
 * @file useFiltersTab.js
 * @description Tab-specific state management for filters subtab.
 * Wraps the global useFilters hook with UI-specific state.
 *
 * @see Left_Panel_Design_Specification.docx - Section 10 Filters
 */

import { useState, useCallback, useMemo } from "react";
import { useFilters } from "@UI/react/hooks/useFilters.js";
import { ui as log } from "@Utils/logger.js";

/**
 * Filter scopes from spec.
 * - View: Applies to single view
 * - Dataset: Applies to dataset across views
 * - Workspace: Applies to workspace
 */
export const FILTER_SCOPES = {
  view: { id: "view", label: "View", description: "Single view only" },
  dataset: { id: "dataset", label: "Dataset", description: "Across views" },
  workspace: {
    id: "workspace",
    label: "Workspace",
    description: "Entire workspace",
  },
};

/**
 * Conflict resolution strategies for batch apply.
 */
export const CONFLICT_STRATEGIES = {
  replace: {
    id: "replace",
    label: "Replace",
    description: "Replace existing filters",
  },
  merge: { id: "merge", label: "Merge", description: "Combine with existing" },
  skip: { id: "skip", label: "Skip", description: "Skip if conflicts" },
};

/**
 * Hook for filters subtab state management.
 *
 * @param {Object} options
 * @param {string[]} options.activeScopes - Active scope filters
 * @param {string} options.searchQuery - Search query string
 * @returns {Object} Filters tab state and actions
 *
 * @example
 * const { filtersByScope, handleApply, handleDelete } = useFiltersTab({
 *   activeScopes: ['personal'],
 *   searchQuery: 'cell',
 * });
 */
export function useFiltersTab({ activeScopes = [], searchQuery = "" } = {}) {
  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    project: true,
    room: true,
    personal: true,
  });

  // Import/Export state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState([]);

  // Batch apply state
  const [batchApplyModalOpen, setBatchApplyModalOpen] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState("merge");

  // Global filters hook
  const {
    filters,
    groupedFilters,
    isLoading,
    error,
    createFilter,
    updateFilter,
    deleteFilter,
    togglePin,
    applyFilter,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
  } = useFilters();

  // Filter filters by scope and search
  const filteredFilters = useMemo(() => {
    return filters.filter((f) => {
      const matchesScope =
        activeScopes.length === 0 ||
        activeScopes.includes(f.scope || "personal");
      const matchesSearch =
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description &&
          f.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.tags &&
          f.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          ));
      return matchesScope && matchesSearch;
    });
  }, [filters, activeScopes, searchQuery]);

  // Group filtered filters by scope
  const filtersByScope = useMemo(
    () => ({
      project: filteredFilters.filter((f) => f.scope === "project"),
      room: filteredFilters.filter(
        (f) => f.scope === "room" || f.scope === "workspace"
      ),
      personal: filteredFilters.filter(
        (f) => f.scope === "personal" || !f.scope
      ),
    }),
    [filteredFilters]
  );

  // Counts per scope (unfiltered)
  const scopeCounts = useMemo(
    () => ({
      project: filters.filter((f) => f.scope === "project").length,
      room: filters.filter((f) => f.scope === "room" || f.scope === "workspace")
        .length,
      personal: filters.filter((f) => f.scope === "personal" || !f.scope)
        .length,
    }),
    [filters]
  );

  // Pinned filters
  const pinnedFilters = useMemo(
    () => filteredFilters.filter((f) => f.isPinned),
    [filteredFilters]
  );

  // Toggle section expansion
  const toggleSection = useCallback((scope) => {
    setExpandedSections((prev) => ({
      ...prev,
      [scope]: !prev[scope],
    }));
  }, []);

  // Open editor for new filter
  const openNewEditor = useCallback((initialData = {}) => {
    setEditingFilter(null);
    setEditorOpen(true);
  }, []);

  // Open editor for existing filter
  const openEditEditor = useCallback((filter) => {
    setEditingFilter(filter);
    setEditorOpen(true);
  }, []);

  // Close editor
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingFilter(null);
  }, []);

  // Handle apply filter
  const handleApply = useCallback(
    async (filter) => {
      try {
        const filterConfig = await applyFilter(filter.id);
        if (filterConfig) {
          // Dispatch event for other components to handle filter application
          window.dispatchEvent(
            new CustomEvent("cia:filter-apply", {
              detail: { filterId: filter.id, filterConfig },
            })
          );
          log.info(`Applied filter: ${filter.name}`);
        }
        return filterConfig;
      } catch (err) {
        log.error("Failed to apply filter:", err);
        throw err;
      }
    },
    [applyFilter]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (filterId) => {
      if (!window.confirm("Delete this saved filter?")) return;

      try {
        await deleteFilter(filterId);
        log.info(`Deleted filter: ${filterId}`);
      } catch (err) {
        log.error("Failed to delete filter:", err);
        throw err;
      }
    },
    [deleteFilter]
  );

  // Handle toggle pin
  const handleTogglePin = useCallback(
    async (filterId, currentPinned) => {
      try {
        await togglePin(filterId, currentPinned);
      } catch (err) {
        log.error("Failed to toggle pin:", err);
        throw err;
      }
    },
    [togglePin]
  );

  // Handle save (create or update)
  const handleSave = useCallback(
    async (filterData) => {
      try {
        if (editingFilter) {
          await updateFilter({
            id: editingFilter.id,
            updates: filterData,
          });
          log.info(`Updated filter: ${editingFilter.id}`);
        } else {
          await createFilter(filterData);
          log.info("Created new filter");
        }
        closeEditor();
      } catch (err) {
        log.error("Failed to save filter:", err);
        throw err;
      }
    },
    [editingFilter, createFilter, updateFilter, closeEditor]
  );

  // Save current filter state
  const saveCurrentFilter = useCallback(
    async (currentFilterConfig) => {
      openNewEditor({ filterConfig: currentFilterConfig });
    },
    [openNewEditor]
  );

  // Export filters to JSON
  const exportFilters = useCallback(
    (filterIds) => {
      const toExport = filters.filter((f) => filterIds.includes(f.id));
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        filters: toExport.map((f) => ({
          name: f.name,
          description: f.description,
          filterConfig: f.filterConfig,
          scope: f.scope,
          tags: f.tags,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cia-filters-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      log.info(`Exported ${toExport.length} filters`);
      setExportModalOpen(false);
      setSelectedForExport([]);
    },
    [filters]
  );

  // Import filters from JSON
  const importFilters = useCallback(
    async (importData, options = {}) => {
      const { conflictResolution = "merge" } = options;

      try {
        for (const filterData of importData.filters) {
          // Check for existing filter with same name
          const existing = filters.find((f) => f.name === filterData.name);

          if (existing && conflictResolution === "skip") {
            log.debug(`Skipping existing filter: ${filterData.name}`);
            continue;
          }

          if (existing && conflictResolution === "replace") {
            await updateFilter({
              id: existing.id,
              updates: filterData,
            });
          } else {
            await createFilter(filterData);
          }
        }

        log.info(`Imported ${importData.filters.length} filters`);
        setImportModalOpen(false);
        refetch();
      } catch (err) {
        log.error("Failed to import filters:", err);
        throw err;
      }
    },
    [filters, createFilter, updateFilter, refetch]
  );

  // Batch apply filters
  const batchApplyFilters = useCallback(
    async (filterIds, targetViews, strategy = "merge") => {
      try {
        for (const filterId of filterIds) {
          const filter = filters.find((f) => f.id === filterId);
          if (!filter) continue;

          window.dispatchEvent(
            new CustomEvent("cia:filter-batch-apply", {
              detail: {
                filterId,
                filterConfig: filter.filterConfig,
                targetViews,
                strategy,
              },
            })
          );
        }

        log.info(
          `Batch applied ${filterIds.length} filters to ${targetViews.length} views`
        );
        setBatchApplyModalOpen(false);
      } catch (err) {
        log.error("Failed to batch apply filters:", err);
        throw err;
      }
    },
    [filters]
  );

  return {
    // Data
    filters: filteredFilters,
    filtersByScope,
    pinnedFilters,
    scopeCounts,
    isEmpty: filteredFilters.length === 0,

    // Loading states
    isLoading,
    error,
    isSaving: isCreating || isUpdating,
    isDeleting,

    // Section states
    expandedSections,
    toggleSection,

    // Editor state
    editorOpen,
    editingFilter,
    openNewEditor,
    openEditEditor,
    closeEditor,

    // Import/Export state
    importModalOpen,
    setImportModalOpen,
    exportModalOpen,
    setExportModalOpen,
    selectedForExport,
    setSelectedForExport,

    // Batch apply state
    batchApplyModalOpen,
    setBatchApplyModalOpen,
    conflictStrategy,
    setConflictStrategy,

    // Actions
    handleApply,
    handleDelete,
    handleTogglePin,
    handleSave,
    saveCurrentFilter,
    exportFilters,
    importFilters,
    batchApplyFilters,
    refetch,
  };
}

export default useFiltersTab;
