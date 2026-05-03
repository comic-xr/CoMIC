// src/ui/react/components/workspace/ScratchPad/ScratchPad.logic.js
// Logic hook for ScratchPad component
// Manages clipboard items and quick tools

import { useState, useCallback, useMemo, useEffect } from "react";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("scratchpad");

// Default quick tools
const DEFAULT_QUICK_TOOLS = [
  { id: "measure", icon: "ruler", label: "Measure Distance" },
  { id: "angle", icon: "protractor", label: "Measure Angle" },
  { id: "note", icon: "stickyNote", label: "Add Note" },
  { id: "link", icon: "link2", label: "Link Views" },
  { id: "compare", icon: "gitCompare", label: "Compare" },
  { id: "macro", icon: "zap", label: "Run Macro" },
];

/**
 * useScratchPad - Main hook for ScratchPad state management
 */
export function useScratchPad({
  initialScope = "personal",
  initialExpanded = false,
} = {}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isDetached, setIsDetached] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [scope, setScope] = useState(initialScope);
  const [clipboardItems, setClipboardItems] = useState([]);
  const [quickTools, setQuickTools] = useState(DEFAULT_QUICK_TOOLS);
  const [activeTool, setActiveTool] = useState(null);

  // Load clipboard from localStorage for personal scope
  useEffect(() => {
    if (scope === "personal") {
      try {
        const saved = localStorage.getItem("cia_scratchpad_clipboard");
        if (saved) {
          setClipboardItems(JSON.parse(saved));
        }
      } catch (err) {
        log.warn("Failed to load clipboard from localStorage:", err);
      }
    }
  }, [scope]);

  // Save clipboard to localStorage for personal scope
  useEffect(() => {
    if (scope === "personal") {
      try {
        localStorage.setItem(
          "cia_scratchpad_clipboard",
          JSON.stringify(clipboardItems)
        );
      } catch (err) {
        log.warn("Failed to save clipboard to localStorage:", err);
      }
    }
  }, [clipboardItems, scope]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Toggle detached (floating window)
  const toggleDetached = useCallback(() => {
    setIsDetached((prev) => !prev);
    if (!isDetached) {
      setIsExpanded(true); // Auto-expand when detaching
    }
  }, [isDetached]);

  // Toggle pinned
  const togglePinned = useCallback(() => {
    setIsPinned((prev) => !prev);
  }, []);

  // Add item to clipboard
  const addToClipboard = useCallback((item) => {
    const newItem = {
      id: `clip-${Date.now()}`,
      addedAt: new Date().toISOString(),
      ...item,
    };

    setClipboardItems((prev) => [newItem, ...prev].slice(0, 20)); // Max 20 items
    log.debug("Added to clipboard:", newItem.type, newItem.label);
  }, []);

  // Remove item from clipboard
  const removeFromClipboard = useCallback((itemId) => {
    setClipboardItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Clear clipboard
  const clearClipboard = useCallback(() => {
    setClipboardItems([]);
  }, []);

  // Activate a tool
  const activateTool = useCallback((toolId) => {
    setActiveTool(toolId);
    log.debug("Activated tool:", toolId);
    // TODO: Dispatch event for canvas to pick up
    window.dispatchEvent(
      new CustomEvent("cia:tool-activated", {
        detail: { toolId },
      })
    );
  }, []);

  // Deactivate tool
  const deactivateTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  // Drag start handler for clipboard items
  const handleClipboardDragStart = useCallback((e, item) => {
    const dragData = {
      type: item.type,
      referenceId: item.referenceId,
      label: item.label,
      source: "scratchpad",
    };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "copy";
    document.body.classList.add("dragging-from-scratchpad");
  }, []);

  const handleClipboardDragEnd = useCallback(() => {
    document.body.classList.remove("dragging-from-scratchpad");
  }, []);

  return {
    // State
    isExpanded,
    isDetached,
    isPinned,
    scope,
    clipboardItems,
    quickTools,
    activeTool,

    // Actions
    toggleExpanded,
    toggleDetached,
    togglePinned,
    setScope,
    addToClipboard,
    removeFromClipboard,
    clearClipboard,
    activateTool,
    deactivateTool,
    handleClipboardDragStart,
    handleClipboardDragEnd,
  };
}

/**
 * useScratchPadListener - Listen for "add to scratchpad" events
 */
export function useScratchPadListener(addToClipboard) {
  useEffect(() => {
    const handleAddToScratchpad = (e) => {
      const { type, referenceId, label, metadata } = e.detail;
      addToClipboard({
        type,
        referenceId,
        label,
        metadata,
      });
    };

    window.addEventListener("cia:add-to-scratchpad", handleAddToScratchpad);

    return () => {
      window.removeEventListener(
        "cia:add-to-scratchpad",
        handleAddToScratchpad
      );
    };
  }, [addToClipboard]);
}

export default useScratchPad;
