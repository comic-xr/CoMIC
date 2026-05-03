/**
 * @file index.js
 * @description Exports for the KeyboardShortcutsModal component.
 */

export { default, KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
export { ShortcutCategory } from "./ShortcutCategory";
export { ShortcutItem, KeyBadge, KeyCombo } from "./ShortcutItem";
export {
  SHORTCUT_CATEGORIES,
  KEY_SYMBOLS,
  isMac,
  getKeySymbol,
  getCategoryById,
  searchShortcuts,
} from "./shortcuts";
