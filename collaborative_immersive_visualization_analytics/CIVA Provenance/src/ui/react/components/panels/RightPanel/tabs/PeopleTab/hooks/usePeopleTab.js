/**
 * @file usePeopleTab.js
 * @description Hook for PeopleTab logic and state management.
 * Follows headless pattern - all logic here, rendering in component.
 *
 * @example
 * const {
 *   activeSubtab,
 *   setActiveSubtab,
 *   searchQuery,
 *   setSearchQuery,
 *   selectedMember,
 *   setSelectedMember,
 *   onlineCount,
 *   isInitialized,
 *   clearSearch,
 * } = usePeopleTab();
 */

import { useState, useCallback } from "react";
import { usePresence } from "@UI/react/hooks/usePresence.js";

/**
 * Sub-tab configuration
 * Uses color names that match SubtabBar component theming
 */
export const SUBTABS = [
  { id: "room", label: "Room", icon: "home", color: "blue" },
  { id: "breakout", label: "Breakout", icon: "layout", color: "teal" },
  { id: "project", label: "Project", icon: "globe", color: "pink" },
];

/**
 * Search placeholder text per subtab
 */
export const SEARCH_PLACEHOLDERS = {
  room: "Search in room...",
  breakout: "Search breakout rooms...",
  project: "Search all members...",
};

/**
 * Hook for PeopleTab state and logic
 *
 * @param {Object} options - Hook options
 * @param {string} [options.defaultSubtab='room'] - Initial subtab
 * @returns {Object} Tab state and handlers
 */
export function usePeopleTab(options = {}) {
  const { defaultSubtab = "room" } = options;

  // Get presence state from system
  const { onlineCount, isInitialized } = usePresence();

  // Local UI state
  const [activeSubtab, setActiveSubtab] = useState(defaultSubtab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Select member handler
  const handleSelectMember = useCallback((memberId) => {
    setSelectedMember((prev) => (prev === memberId ? null : memberId));
  }, []);

  // Toggle settings menu
  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  // Get current search placeholder
  const searchPlaceholder = SEARCH_PLACEHOLDERS[activeSubtab] || "Search...";

  return {
    // Subtab state
    activeSubtab,
    setActiveSubtab,
    subtabs: SUBTABS,

    // Search state
    searchQuery,
    setSearchQuery,
    clearSearch,
    searchPlaceholder,

    // Selection state
    selectedMember,
    setSelectedMember,
    handleSelectMember,

    // Presence state
    onlineCount,
    isInitialized,

    // Settings state
    showSettings,
    setShowSettings,
    toggleSettings,
  };
}

export default usePeopleTab;
