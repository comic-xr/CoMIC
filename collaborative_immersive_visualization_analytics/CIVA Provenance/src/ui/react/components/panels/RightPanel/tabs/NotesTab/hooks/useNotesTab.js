/**
 * @file useNotesTab.js
 * @description Logic hook for NotesTab component.
 * Separates data management and state from presentation.
 *
 * @example
 * const {
 *   notes,
 *   pinnedNotes,
 *   unpinnedNotes,
 *   selectedNote,
 *   handleTogglePin,
 *   handleCreateNote,
 * } = useNotesTab();
 */

import { useState, useCallback, useMemo } from "react";
import { useSectionStates } from "@UI/react/components/organisms/ResizableSections";

/**
 * Sample notes data (will be replaced with real data source)
 */
const SAMPLE_NOTES = [
  {
    id: "n1",
    title: "Session Summary",
    content:
      "Discussed tumor boundaries and potential surgical approaches. Dr. Smith highlighted the importance of the 2cm margin.",
    createdBy: "You",
    timestamp: "10:45 AM",
    pinned: true,
    shared: true,
    hasImage: false,
  },
  {
    id: "n2",
    title: "Measurement Notes",
    content:
      "Tumor diameter: 24.5mm\nDistance to critical structure: 8.2mm\nMargin assessment: Adequate",
    createdBy: "Dr. Smith",
    timestamp: "10:38 AM",
    pinned: false,
    shared: true,
    hasImage: true,
  },
  {
    id: "n3",
    title: "Follow-up Items",
    content:
      "• Review with radiology\n• Schedule follow-up scan\n• Prepare surgical plan document",
    createdBy: "You",
    timestamp: "10:30 AM",
    pinned: false,
    shared: false,
    hasImage: false,
  },
  {
    id: "n4",
    title: "Quick note",
    content: "Check left hemisphere detail in next session",
    createdBy: "Dr. Jones",
    timestamp: "Yesterday",
    pinned: false,
    shared: true,
    hasImage: false,
  },
];

/**
 * Hook for NotesTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @returns {Object} Notes state and handlers
 */
export function useNotesTab(options = {}) {
  // Notes state
  const [notes, setNotes] = useState(SAMPLE_NOTES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showNewNote, setShowNewNote] = useState(false);

  // Section states
  const { states: sectionStates, toggleSection } = useSectionStates({
    pinned: { expanded: true, flexGrow: 1 },
    all: { expanded: true, flexGrow: 2 },
  });

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.createdBy.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  // Separate pinned and unpinned notes
  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned),
    [filteredNotes]
  );

  const unpinnedNotes = useMemo(
    () => filteredNotes.filter((n) => !n.pinned),
    [filteredNotes]
  );

  // Handlers
  const handleTogglePin = useCallback((noteId) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n))
    );
  }, []);

  const handleEdit = useCallback((note) => {
    setEditingNote(note);
  }, []);

  const handleSaveEdit = useCallback((updatedNote) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
    setEditingNote(null);
  }, []);

  const handleCreateNote = useCallback((newNote) => {
    const note = {
      id: `n${Date.now()}`,
      ...newNote,
      createdBy: "You",
      timestamp: "Just now",
      pinned: false,
      shared: false,
      hasImage: false,
    };
    setNotes((prev) => [note, ...prev]);
    setShowNewNote(false);
  }, []);

  const handleDelete = useCallback((noteId) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSelectedNote(null);
  }, []);

  return {
    // Notes data
    notes,
    pinnedNotes,
    unpinnedNotes,

    // Search state
    searchQuery,
    setSearchQuery,

    // Selection state
    selectedNote,
    setSelectedNote,

    // Edit state
    editingNote,
    setEditingNote,
    showNewNote,
    setShowNewNote,

    // Section state
    sectionStates,
    toggleSection,

    // Handlers
    handleTogglePin,
    handleEdit,
    handleSaveEdit,
    handleCreateNote,
    handleDelete,
  };
}

export default useNotesTab;
