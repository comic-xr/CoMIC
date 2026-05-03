/**
 * VGEditorContext
 * Location: src/ui/react/context/VGEditorContext.jsx
 *
 * Provides multi-editor state management for ViewGroup editors.
 * Tracks all open VG editor panels and which one is currently active.
 *
 * Features:
 * - Track multiple simultaneous VG editors
 * - Automatic active switching when editors open/close
 * - Context updates when VG properties change
 *
 * @module VGEditorContext
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} EditorInfo
 * @property {string} panelId - Unique panel identifier
 * @property {string} vgId - ViewGroup ID being edited
 * @property {string} vgName - ViewGroup name
 * @property {string} vgColor - ViewGroup accent color
 * @property {boolean} isNew - Whether this is a new unsaved VG
 */

/**
 * @typedef {Object} VGEditorContextValue
 * @property {Map<string, EditorInfo>} openEditors - Map of panel IDs to editor info
 * @property {string|null} activeEditorId - Currently active editor panel ID
 * @property {EditorInfo|null} activeEditor - Info for the active editor
 * @property {number} editorCount - Number of open editors
 * @property {function} registerEditor - Register a new editor
 * @property {function} unregisterEditor - Remove an editor
 * @property {function} updateEditor - Update editor info
 * @property {function} setActive - Set the active editor
 */

// =============================================================================
// CONTEXT
// =============================================================================

const VGEditorContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Provider component for VG Editor context
 * Wrap your panel manager or workspace root with this provider
 */
export function VGEditorProvider({ children }) {
  const [openEditors, setOpenEditors] = useState(new Map());
  const [activeEditorId, setActiveEditorId] = useState(null);

  /**
   * Register a new VG editor panel
   * New editors automatically become active
   */
  const registerEditor = useCallback((panelId, vgData) => {
    setOpenEditors((prev) => {
      const next = new Map(prev);
      next.set(panelId, {
        panelId,
        vgId: vgData.id || vgData.vgId,
        vgName: vgData.name || vgData.vgName || 'Untitled',
        vgColor: vgData.color || vgData.vgColor || '#6366f1',
        isNew: vgData.isNew || false,
      });
      return next;
    });
    // New editor becomes active
    setActiveEditorId(panelId);
  }, []);

  /**
   * Unregister a VG editor panel
   * If it was active, switch to another or null
   */
  const unregisterEditor = useCallback((panelId) => {
    setOpenEditors((prev) => {
      const next = new Map(prev);
      next.delete(panelId);
      return next;
    });

    setActiveEditorId((currentActive) => {
      if (currentActive === panelId) {
        // Find another editor to activate
        setOpenEditors((editors) => {
          const remaining = [...editors.keys()].filter((id) => id !== panelId);
          return editors; // Don't modify, just read
        });
        // We need to get remaining from current state
        return null; // Will be updated by effect
      }
      return currentActive;
    });
  }, []);

  /**
   * Update editor info (e.g., when VG name or color changes)
   */
  const updateEditor = useCallback((panelId, updates) => {
    setOpenEditors((prev) => {
      if (!prev.has(panelId)) return prev;
      const next = new Map(prev);
      const current = prev.get(panelId);
      next.set(panelId, {
        ...current,
        ...(updates.name && { vgName: updates.name }),
        ...(updates.vgName && { vgName: updates.vgName }),
        ...(updates.color && { vgColor: updates.color }),
        ...(updates.vgColor && { vgColor: updates.vgColor }),
        ...(updates.isNew !== undefined && { isNew: updates.isNew }),
      });
      return next;
    });
  }, []);

  /**
   * Set the active editor (e.g., when clicking/focusing a panel)
   * Only succeeds if the editor exists
   */
  const setActive = useCallback((panelId) => {
    setOpenEditors((editors) => {
      if (editors.has(panelId)) {
        setActiveEditorId(panelId);
      }
      return editors;
    });
  }, []);

  // Derive active editor info
  const activeEditor = useMemo(() => {
    if (!activeEditorId) return null;
    return openEditors.get(activeEditorId) || null;
  }, [openEditors, activeEditorId]);

  // Handle active editor cleanup when editors change
  const editorCount = openEditors.size;

  // Fix active editor if it no longer exists
  React.useEffect(() => {
    if (activeEditorId && !openEditors.has(activeEditorId)) {
      const remaining = [...openEditors.keys()];
      setActiveEditorId(remaining[0] || null);
    }
  }, [openEditors, activeEditorId]);

  const value = useMemo(
    () => ({
      openEditors,
      activeEditorId,
      activeEditor,
      editorCount,
      registerEditor,
      unregisterEditor,
      updateEditor,
      setActive,
    }),
    [
      openEditors,
      activeEditorId,
      activeEditor,
      editorCount,
      registerEditor,
      unregisterEditor,
      updateEditor,
      setActive,
    ]
  );

  return (
    <VGEditorContext.Provider value={value}>
      {children}
    </VGEditorContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access VG Editor context
 * @returns {VGEditorContextValue|null} Context value or null if no provider
 */
export function useVGEditor() {
  return useContext(VGEditorContext);
}

/**
 * Hook that requires VG Editor context
 * @throws {Error} If used outside provider
 * @returns {VGEditorContextValue} Context value
 */
export function useVGEditorRequired() {
  const context = useContext(VGEditorContext);
  if (!context) {
    throw new Error('useVGEditorRequired must be used within a VGEditorProvider');
  }
  return context;
}

/**
 * Hook to get active editor info
 * @returns {EditorInfo|null} Active editor or null
 */
export function useActiveVGEditor() {
  const context = useContext(VGEditorContext);
  return context?.activeEditor || null;
}

/**
 * Hook to check if a specific VG is being edited
 * @param {string} vgId - ViewGroup ID to check
 * @returns {boolean} True if the VG is open in an editor
 */
export function useIsVGBeingEdited(vgId) {
  const context = useContext(VGEditorContext);
  if (!context) return false;

  for (const editor of context.openEditors.values()) {
    if (editor.vgId === vgId) return true;
  }
  return false;
}

/**
 * Hook to get the panel ID for a VG being edited
 * @param {string} vgId - ViewGroup ID to check
 * @returns {string|null} Panel ID or null if not being edited
 */
export function useVGEditorPanelId(vgId) {
  const context = useContext(VGEditorContext);
  if (!context) return null;

  for (const [panelId, editor] of context.openEditors.entries()) {
    if (editor.vgId === vgId) return panelId;
  }
  return null;
}

export default VGEditorContext;
