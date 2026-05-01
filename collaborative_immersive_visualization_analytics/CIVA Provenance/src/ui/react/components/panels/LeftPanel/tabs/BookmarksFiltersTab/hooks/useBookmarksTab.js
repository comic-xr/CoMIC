/**
 * @file useBookmarksTab.js
 * @description Tab-specific state management for bookmarks subtab.
 * Wraps the global useBookmarks hook with UI-specific state.
 *
 * @see Left_Panel_Design_Specification.docx - Section 9 Bookmarks
 */

import { useState, useCallback, useMemo } from "react";
import { useBookmarks } from "@UI/react/hooks/useBookmarks.js";
import { ui as log } from "@Utils/logger.js";

/**
 * Bookmark types from spec.
 * - Position: Camera position only
 * - State: Camera + filters + selections
 * - Comparison: Multiple positions for comparison
 */
export const BOOKMARK_TYPES = {
  position: {
    id: "position",
    label: "Position",
    description: "Camera position only",
  },
  state: {
    id: "state",
    label: "State",
    description: "Camera + filters + selections",
  },
  comparison: {
    id: "comparison",
    label: "Comparison",
    description: "Multiple positions",
  },
};

/**
 * Bookmark scopes from spec.
 * - Personal: Private to user
 * - Shared: Visible to team/workspace
 * - Template: Reusable template
 */
export const BOOKMARK_SCOPES = {
  personal: {
    id: "personal",
    label: "Personal",
    description: "Private to you",
  },
  shared: { id: "shared", label: "Shared", description: "Visible to team" },
  template: {
    id: "template",
    label: "Template",
    description: "Reusable template",
  },
};

/**
 * Hook for bookmarks subtab state management.
 *
 * @param {Object} options
 * @param {string[]} options.activeScopes - Active scope filters
 * @param {string} options.searchQuery - Search query string
 * @returns {Object} Bookmarks tab state and actions
 *
 * @example
 * const { bookmarksByScope, handleNavigate, handleDelete } = useBookmarksTab({
 *   activeScopes: ['personal', 'shared'],
 *   searchQuery: 'tumor',
 * });
 */
export function useBookmarksTab({ activeScopes = [], searchQuery = "" } = {}) {
  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    project: true,
    room: true,
    personal: true,
  });

  // Folder expansion state (for nested organization)
  const [expandedFolders, setExpandedFolders] = useState({});

  // Global bookmarks hook
  const {
    bookmarks,
    groupedBookmarks,
    isLoading,
    error,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    togglePin,
    navigateToBookmark,
    getThumbnailUrl,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
  } = useBookmarks();

  // Filter bookmarks by scope and search
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const matchesScope =
        activeScopes.length === 0 ||
        activeScopes.includes(b.scope || "personal");
      const matchesSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.datasetName &&
          b.datasetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.description &&
          b.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.tags &&
          b.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          ));
      return matchesScope && matchesSearch;
    });
  }, [bookmarks, activeScopes, searchQuery]);

  // Group filtered bookmarks by scope
  const bookmarksByScope = useMemo(
    () => ({
      project: filteredBookmarks.filter((b) => b.scope === "project"),
      room: filteredBookmarks.filter(
        (b) =>
          b.scope === "room" || b.scope === "workspace" || b.scope === "shared"
      ),
      personal: filteredBookmarks.filter(
        (b) => b.scope === "personal" || !b.scope
      ),
    }),
    [filteredBookmarks]
  );

  // Counts per scope (unfiltered)
  const scopeCounts = useMemo(
    () => ({
      project: bookmarks.filter((b) => b.scope === "project").length,
      room: bookmarks.filter(
        (b) =>
          b.scope === "room" || b.scope === "workspace" || b.scope === "shared"
      ).length,
      personal: bookmarks.filter((b) => b.scope === "personal" || !b.scope)
        .length,
    }),
    [bookmarks]
  );

  // Pinned bookmarks
  const pinnedBookmarks = useMemo(
    () => filteredBookmarks.filter((b) => b.isPinned),
    [filteredBookmarks]
  );

  // Toggle section expansion
  const toggleSection = useCallback((scope) => {
    setExpandedSections((prev) => ({
      ...prev,
      [scope]: !prev[scope],
    }));
  }, []);

  // Toggle folder expansion
  const toggleFolder = useCallback((folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  }, []);

  // Open editor for new bookmark
  const openNewEditor = useCallback((initialData = {}) => {
    setEditingBookmark(null);
    setEditorOpen(true);
  }, []);

  // Open editor for existing bookmark
  const openEditEditor = useCallback((bookmark) => {
    setEditingBookmark(bookmark);
    setEditorOpen(true);
  }, []);

  // Close editor
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingBookmark(null);
  }, []);

  // Handle navigate with error handling
  const handleNavigate = useCallback(
    async (bookmark) => {
      try {
        await navigateToBookmark(bookmark.id);
        log.info(`Navigated to bookmark: ${bookmark.name}`);
      } catch (err) {
        log.error("Failed to navigate to bookmark:", err);
        throw err;
      }
    },
    [navigateToBookmark]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (bookmarkId) => {
      if (!window.confirm("Delete this bookmark?")) return;

      try {
        await deleteBookmark(bookmarkId);
        log.info(`Deleted bookmark: ${bookmarkId}`);
      } catch (err) {
        log.error("Failed to delete bookmark:", err);
        throw err;
      }
    },
    [deleteBookmark]
  );

  // Handle toggle pin
  const handleTogglePin = useCallback(
    async (bookmarkId) => {
      try {
        await togglePin(bookmarkId);
      } catch (err) {
        log.error("Failed to toggle pin:", err);
        throw err;
      }
    },
    [togglePin]
  );

  // Handle save (create or update)
  const handleSave = useCallback(
    async (bookmarkData) => {
      try {
        if (editingBookmark) {
          await updateBookmark({
            id: editingBookmark.id,
            updates: bookmarkData,
          });
          log.info(`Updated bookmark: ${editingBookmark.id}`);
        } else {
          await createBookmark(bookmarkData);
          log.info("Created new bookmark");
        }
        closeEditor();
      } catch (err) {
        log.error("Failed to save bookmark:", err);
        throw err;
      }
    },
    [editingBookmark, createBookmark, updateBookmark, closeEditor]
  );

  // Quick save current state (B key handler)
  const quickSave = useCallback(
    async (cameraState, filterIds = []) => {
      const name = `Quick Save ${new Date().toLocaleTimeString()}`;
      try {
        await createBookmark({
          name,
          scope: "personal",
          camera_state: cameraState,
          filter_ids: filterIds,
        });
        log.info("Quick saved bookmark");
      } catch (err) {
        log.error("Failed to quick save:", err);
        throw err;
      }
    },
    [createBookmark]
  );

  return {
    // Data
    bookmarks: filteredBookmarks,
    bookmarksByScope,
    pinnedBookmarks,
    scopeCounts,
    isEmpty: filteredBookmarks.length === 0,

    // Loading states
    isLoading,
    error,
    isSaving: isCreating || isUpdating,
    isDeleting,

    // Section states
    expandedSections,
    toggleSection,
    expandedFolders,
    toggleFolder,

    // Editor state
    editorOpen,
    editingBookmark,
    openNewEditor,
    openEditEditor,
    closeEditor,

    // Actions
    handleNavigate,
    handleDelete,
    handleTogglePin,
    handleSave,
    quickSave,
    getThumbnailUrl,
    refetch,
  };
}

export default useBookmarksTab;
