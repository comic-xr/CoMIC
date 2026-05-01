/**
 * @file shortcuts.js
 * @description Keyboard shortcuts data for the KeyboardShortcutsModal.
 * Contains all shortcut categories and their respective key bindings.
 */

import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';

/**
 * Detect if running on Mac platform
 */
export const isMac =
  typeof navigator !== "undefined" && navigator.platform.includes("Mac");

/**
 * Platform-specific key symbol mappings
 */
export const KEY_SYMBOLS = {
  "⌘": isMac ? "⌘" : "Ctrl",
  "⇧": isMac ? "⇧" : "Shift",
  "⌥": isMac ? "⌥" : "Alt",
  "⌃": "Ctrl",
  Esc: "Esc",
  Tab: "Tab",
  Space: "␣",
  Backspace: "⌫",
  Enter: "↵",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

/**
 * Convert key to platform-appropriate symbol
 * @param {string} key - Key to convert
 * @returns {string} Platform-appropriate key symbol
 */
export function getKeySymbol(key) {
  return KEY_SYMBOLS[key] || key;
}

/**
 * Shortcut definition
 * @typedef {Object} Shortcut
 * @property {string} action - Action name
 * @property {string[]} keys - Key combination
 * @property {string} [description] - Optional description
 */

/**
 * Shortcut category definition
 * @typedef {Object} ShortcutCategory
 * @property {string} id - Category identifier
 * @property {string} label - Display label
 * @property {React.ComponentType} icon - Lucide icon component
 * @property {Shortcut[]} shortcuts - List of shortcuts
 */

/**
 * All keyboard shortcut categories
 * @type {ShortcutCategory[]}
 */
export const SHORTCUT_CATEGORIES = [
  {
    id: "general",
    label: "General",
    icon: 'settings',
    shortcuts: [
      {
        action: "Global Search",
        keys: ["⌘", "K"],
        description: "Search everything",
      },
      {
        action: "Close Modal/Panel",
        keys: ["Esc"],
        description: "Close current overlay",
      },
      {
        action: "Show Shortcuts",
        keys: ["?"],
        description: "Show this dialog",
      },
      { action: "Undo", keys: ["⌘", "Z"] },
      { action: "Redo", keys: ["⌘", "⇧", "Z"] },
      {
        action: "Save",
        keys: ["⌘", "S"],
        description: "Save current view state",
      },
      {
        action: "Toggle Help",
        keys: ["⌘", "/"],
        description: "Open help panel",
      },
      {
        action: "Preferences",
        keys: ["⌘", ","],
        description: "Open preferences",
      },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: 'navigation',
    shortcuts: [
      { action: "Toggle Left Panel", keys: ["["] },
      { action: "Toggle Right Panel", keys: ["]"] },
      { action: "Files Tab", keys: ["F"] },
      { action: "Datasets Tab", keys: ["D"] },
      { action: "Views Tab", keys: ["V"] },
      { action: "Instance Tools Tab", keys: ["I"] },
      { action: "Layout Tab", keys: ["L"] },
      { action: "Annotations Tab", keys: ["A"] },
      { action: "Next Tab", keys: ["Tab"], description: "In panel context" },
      {
        action: "Previous Tab",
        keys: ["⇧", "Tab"],
        description: "In panel context",
      },
      {
        action: "Focus Search",
        keys: ["⌘", "F"],
        description: "Focus panel search",
      },
    ],
  },
  {
    id: "canvas",
    label: "Canvas",
    icon: 'layout',
    shortcuts: [
      { action: "Zoom In", keys: ["+"], description: "Show fewer, larger cells" },
      { action: "Zoom Out", keys: ["-"], description: "Show more, smaller cells" },
      { action: "1×1 View", keys: ["1"], description: "Single cell view" },
      { action: "2×2 View", keys: ["2"], description: "Four cells" },
      { action: "3×3 View", keys: ["3"], description: "Nine cells" },
      { action: "10×10 View", keys: ["0"], description: "Bird's eye view" },
      { action: "Reset Viewport", keys: ["Home"] },
      { action: "Toggle Grid", keys: ["G"] },
      { action: "Toggle Edit Mode", keys: ["E"] },
      { action: "Toggle Fullscreen", keys: ["F11"] },
      { action: "Canvas Navigator", keys: ["⌘", "M"] },
      { action: "Instance Tools", keys: ["T"] },
    ],
  },
  {
    id: "selection",
    label: "Selection",
    icon: 'mousePointer',
    shortcuts: [
      { action: "Select Cell", keys: ["Click"], description: "Click on a cell" },
      { action: "Add to Selection", keys: ["⌘", "Click"], description: "Toggle cell in selection" },
      { action: "Range Select", keys: ["⇧", "Click"], description: "Select rectangular region" },
      { action: "Add Range", keys: ["⌘", "⇧", "Click"], description: "Add region to selection" },
      { action: "Select All Views", keys: ["⌘", "⇧", "A"] },
      { action: "Deselect All", keys: ["Esc"] },
      { action: "Move Selection", keys: ["↑", "↓", "←", "→"], description: "Arrow keys" },
      { action: "Extend Selection", keys: ["⇧", "↑", "↓", "←", "→"], description: "Shift+Arrow" },
      { action: "Next Cell", keys: ["Tab"], description: "Cycle through cells" },
      { action: "Previous Cell", keys: ["⇧", "Tab"], description: "Cycle backwards" },
      { action: "Activate Cell", keys: ["Enter"], description: "Focus or isolate cell" },
      { action: "Delete Selected", keys: ["Backspace"], description: "Remove selected views" },
      { action: "Duplicate View", keys: ["⌘", "D"] },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: 'wrench',
    shortcuts: [
      { action: "Pan Tool", keys: ["P"], description: "Click and drag to pan" },
      { action: "Select Tool", keys: ["S"] },
      { action: "Zoom Tool", keys: ["Z"] },
      { action: "Rotate Tool", keys: ["R"] },
      { action: "Measure Tool", keys: ["M"] },
      {
        action: "Annotate Tool",
        keys: ["N"],
        description: "Hold for sub-menu",
      },
      { action: "Slice Tool", keys: ["X"] },
      {
        action: "Quick Measurement",
        keys: ["⌘", "M"],
        description: "Start measurement immediately",
      },
      { action: "Cancel Tool", keys: ["Esc"] },
      {
        action: "Hold to Pan",
        keys: ["Space"],
        description: "Temporary pan mode",
      },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: 'users',
    shortcuts: [
      { action: "Toggle Voice", keys: ["⌘", "⇧", "V"] },
      { action: "Mute/Unmute", keys: ["M"], description: "In voice context" },
      { action: "Push to Talk", keys: ["Space"], description: "Hold to talk" },
      { action: "Open Chat", keys: ["⌘", "⇧", "C"] },
      { action: "Start Recording", keys: ["⌘", "⇧", "R"] },
      { action: "Stop Recording", keys: ["⌘", "⇧", "R"] },
      { action: "Share Screen", keys: ["⌘", "⇧", "S"] },
      { action: "Invite User", keys: ["⌘", "⇧", "I"] },
    ],
  },
];

/**
 * Get category by ID
 * @param {string} id - Category ID
 * @returns {ShortcutCategory|undefined} Category or undefined
 */
export function getCategoryById(id) {
  return SHORTCUT_CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Search shortcuts across all categories
 * @param {string} query - Search query
 * @returns {Array<{category: ShortcutCategory, shortcut: Shortcut}>} Matching shortcuts
 */
export function searchShortcuts(query) {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase();
  const results = [];

  SHORTCUT_CATEGORIES.forEach((category) => {
    category.shortcuts.forEach((shortcut) => {
      const matchesAction = shortcut.action
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesDescription = shortcut.description
        ?.toLowerCase()
        .includes(normalizedQuery);
      const matchesKeys = shortcut.keys.some((key) =>
        getKeySymbol(key).toLowerCase().includes(normalizedQuery)
      );

      if (matchesAction || matchesDescription || matchesKeys) {
        results.push({ category, shortcut });
      }
    });
  });

  return results;
}

export default SHORTCUT_CATEGORIES;
