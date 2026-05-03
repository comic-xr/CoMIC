// src/ui/react/hooks/viewportState.js
// Centralized viewport size state management
//
// This module owns all viewport size persistence and validation logic.
// It provides a single source of truth for:
// - Storage key and defaults
// - Loading/saving from localStorage
// - Validation and clamping
//
// USAGE:
// ```javascript
// import { loadViewportSize, saveViewportSize, DEFAULT_VIEWPORT_SIZE } from './viewportState';
//
// // Load saved size (returns null if nothing saved or invalid)
// const saved = loadViewportSize();
// const size = saved ?? DEFAULT_VIEWPORT_SIZE;
//
// // Save new size
// saveViewportSize({ rows: 3, cols: 4 });
//
// // Validate user input
// if (isValidViewportSize(userInput)) { ... }
//
// // Clamp to valid range
// const clamped = clampViewportSize(rawRows, rawCols);
// ```

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * LocalStorage key for persisting viewport size
 * @constant {string}
 */
export const VIEWPORT_STORAGE_KEY = "cia-viewport-size";

/**
 * Custom event name for viewport size changes
 * Dispatched when viewport size changes so other components can sync
 * @constant {string}
 */
export const VIEWPORT_SIZE_EVENT = "cia:viewport-size-changed";

/**
 * Default viewport size (2 rows × 3 columns = 6 cells visible)
 * Used when no saved preference exists
 * @constant {{ rows: number, cols: number }}
 */
export const DEFAULT_VIEWPORT_SIZE = Object.freeze({
  rows: 2,
  cols: 3,
});

/**
 * Minimum viewport size (1×1 = single cell focus mode)
 * @constant {{ rows: number, cols: number }}
 */
export const MIN_VIEWPORT_SIZE = Object.freeze({
  rows: 1,
  cols: 1,
});

/**
 * Maximum viewport size (10×10 = 100 cells overview mode)
 * @constant {{ rows: number, cols: number }}
 */
export const MAX_VIEWPORT_SIZE = Object.freeze({
  rows: 10,
  cols: 10,
});

/**
 * Preset sizes for increment/decrement controls
 * Each preset roughly doubles the cell count from the previous
 * @constant {Array<{ rows: number, cols: number }>}
 */
export const VIEWPORT_SIZE_PRESETS = Object.freeze([
  { rows: 1, cols: 1 }, // 1 cell - Focus mode
  { rows: 1, cols: 2 }, // 2 cells - Side-by-side
  { rows: 2, cols: 2 }, // 4 cells
  { rows: 2, cols: 3 }, // 6 cells - Default
  { rows: 3, cols: 3 }, // 9 cells
  { rows: 3, cols: 4 }, // 12 cells
  { rows: 4, cols: 4 }, // 16 cells
  { rows: 4, cols: 5 }, // 20 cells
  { rows: 5, cols: 5 }, // 25 cells
  { rows: 5, cols: 6 }, // 30 cells
  { rows: 6, cols: 6 }, // 36 cells
  { rows: 6, cols: 7 }, // 42 cells
  { rows: 7, cols: 7 }, // 49 cells
  { rows: 7, cols: 8 }, // 56 cells
  { rows: 8, cols: 8 }, // 64 cells
  { rows: 8, cols: 9 }, // 72 cells
  { rows: 9, cols: 9 }, // 81 cells
  { rows: 9, cols: 10 }, // 90 cells
  { rows: 10, cols: 10 }, // 100 cells - Full overview
]);

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a viewport size object is valid
 * @param {any} size - Value to validate
 * @returns {boolean} True if valid viewport size
 */
export function isValidViewportSize(size) {
  return (
    size !== null &&
    typeof size === "object" &&
    typeof size.rows === "number" &&
    typeof size.cols === "number" &&
    !isNaN(size.rows) &&
    !isNaN(size.cols) &&
    size.rows >= MIN_VIEWPORT_SIZE.rows &&
    size.rows <= MAX_VIEWPORT_SIZE.rows &&
    size.cols >= MIN_VIEWPORT_SIZE.cols &&
    size.cols <= MAX_VIEWPORT_SIZE.cols &&
    Number.isInteger(size.rows) &&
    Number.isInteger(size.cols)
  );
}

/**
 * Clamp viewport size to valid range
 * @param {number} rows - Desired rows
 * @param {number} cols - Desired columns
 * @param {{ rows: number, cols: number }} [maxSize] - Optional custom max (e.g., canvas dimensions)
 * @returns {{ rows: number, cols: number }} Clamped size
 */
export function clampViewportSize(rows, cols, maxSize = MAX_VIEWPORT_SIZE) {
  // CRITICAL: Handle NaN values - Math.floor(NaN) = NaN which propagates
  // Fall back to default values if input is invalid
  const safeRows = typeof rows === 'number' && !isNaN(rows) && rows > 0
    ? Math.floor(rows)
    : DEFAULT_VIEWPORT_SIZE.rows;
  const safeCols = typeof cols === 'number' && !isNaN(cols) && cols > 0
    ? Math.floor(cols)
    : DEFAULT_VIEWPORT_SIZE.cols;

  // Also validate maxSize to prevent NaN propagation from there
  const safeMaxRows = typeof maxSize?.rows === 'number' && !isNaN(maxSize.rows) && maxSize.rows > 0
    ? maxSize.rows
    : MAX_VIEWPORT_SIZE.rows;
  const safeMaxCols = typeof maxSize?.cols === 'number' && !isNaN(maxSize.cols) && maxSize.cols > 0
    ? maxSize.cols
    : MAX_VIEWPORT_SIZE.cols;

  return {
    rows: Math.max(MIN_VIEWPORT_SIZE.rows, Math.min(safeMaxRows, safeRows)),
    cols: Math.max(MIN_VIEWPORT_SIZE.cols, Math.min(safeMaxCols, safeCols)),
  };
}

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Load saved viewport size from localStorage
 * @returns {{ rows: number, cols: number } | null} Saved size or null if none/invalid
 */
export function loadViewportSize() {
  try {
    const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (isValidViewportSize(parsed)) {
        return { rows: parsed.rows, cols: parsed.cols };
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[viewportState] Failed to load saved viewport size:", e);
    }
  }
  return null;
}

/**
 * Save viewport size to localStorage
 * @param {{ rows: number, cols: number }} size - Size to save
 * @returns {boolean} True if saved successfully
 */
export function saveViewportSize(size) {
  if (!isValidViewportSize(size)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[viewportState] Attempted to save invalid viewport size:",
        size
      );
    }
    return false;
  }

  try {
    localStorage.setItem(
      VIEWPORT_STORAGE_KEY,
      JSON.stringify({
        rows: size.rows,
        cols: size.cols,
      })
    );
    return true;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[viewportState] Failed to save viewport size:", e);
    }
    return false;
  }
}

/**
 * Clear saved viewport size from localStorage
 * @returns {boolean} True if cleared successfully
 */
export function clearViewportSize() {
  try {
    localStorage.removeItem(VIEWPORT_STORAGE_KEY);
    return true;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[viewportState] Failed to clear viewport size:", e);
    }
    return false;
  }
}

// =============================================================================
// EVENT HELPERS
// =============================================================================

/**
 * Dispatch viewport size changed event
 * @param {{ rows: number, cols: number }} size - New size
 * @param {{ rows: number, cols: number }} previousSize - Previous size
 */
export function dispatchViewportSizeChanged(size, previousSize) {
  const event = new CustomEvent(VIEWPORT_SIZE_EVENT, {
    detail: {
      size,
      previousSize,
      cellCount: size.rows * size.cols,
      previousCellCount: previousSize.rows * previousSize.cols,
    },
    bubbles: true,
  });
  window.dispatchEvent(event);
}

// =============================================================================
// PRESET HELPERS
// =============================================================================

/**
 * Find the closest preset index for a given size
 * @param {{ rows: number, cols: number }} size - Current size
 * @returns {number} Index into VIEWPORT_SIZE_PRESETS
 */
export function findPresetIndex(size) {
  const cellCount = size.rows * size.cols;

  let closestIndex = 0;
  let closestDiff = Infinity;

  VIEWPORT_SIZE_PRESETS.forEach((preset, index) => {
    const presetCount = preset.rows * preset.cols;
    const diff = Math.abs(presetCount - cellCount);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Get the next larger preset (for zoom out / show more cells)
 * @param {{ rows: number, cols: number }} currentSize - Current size
 * @param {{ rows: number, cols: number }} [maxSize] - Optional max bounds
 * @returns {{ rows: number, cols: number }} Next preset or current if at max
 */
export function getNextLargerPreset(currentSize, maxSize = MAX_VIEWPORT_SIZE) {
  const currentIndex = findPresetIndex(currentSize);
  const nextIndex = Math.min(
    currentIndex + 1,
    VIEWPORT_SIZE_PRESETS.length - 1
  );
  const nextPreset = VIEWPORT_SIZE_PRESETS[nextIndex];

  return clampViewportSize(nextPreset.rows, nextPreset.cols, maxSize);
}

/**
 * Get the next smaller preset (for zoom in / focus)
 * @param {{ rows: number, cols: number }} currentSize - Current size
 * @returns {{ rows: number, cols: number }} Previous preset or current if at min
 */
export function getNextSmallerPreset(currentSize) {
  const currentIndex = findPresetIndex(currentSize);
  const prevIndex = Math.max(currentIndex - 1, 0);
  const prevPreset = VIEWPORT_SIZE_PRESETS[prevIndex];

  return { rows: prevPreset.rows, cols: prevPreset.cols };
}

// =============================================================================
// CONVENIENCE: Get initial viewport size (for useState initializers)
// =============================================================================

/**
 * Get the initial viewport size for React state
 * Loads from localStorage or falls back to default
 *
 * Usage in hooks:
 * ```javascript
 * const [viewportSize, setViewportSize] = useState(getInitialViewportSize);
 * ```
 *
 * @returns {{ rows: number, cols: number }} Initial viewport size
 */
export function getInitialViewportSize() {
  return loadViewportSize() ?? { ...DEFAULT_VIEWPORT_SIZE };
}

/**
 * Get initial viewport state including position
 * For useCanvas hook which tracks both position and size
 *
 * @returns {{ row: number, col: number, rows: number, cols: number }}
 */
export function getInitialViewportState() {
  const size = loadViewportSize() ?? DEFAULT_VIEWPORT_SIZE;
  return {
    row: 0,
    col: 0,
    rows: size.rows,
    cols: size.cols,
  };
}

// =============================================================================
// CANVAS SIZE PERSISTENCE (Grid dimensions, not viewport)
// =============================================================================
// Canvas size = how big the grid is (e.g., 10×10)
// Viewport size = how many cells are visible (e.g., 3×4)

/**
 * LocalStorage key for canvas size
 */
export const CANVAS_SIZE_STORAGE_KEY = "cia-canvas-size";

/**
 * Default canvas size for new canvases
 */
export const DEFAULT_CANVAS_SIZE = Object.freeze({
  rows: 3,
  cols: 3,
});

/**
 * Min/max canvas dimensions
 */
export const MIN_CANVAS_SIZE = Object.freeze({ rows: 1, cols: 1 });
export const MAX_CANVAS_SIZE = Object.freeze({ rows: 50, cols: 50 });

/**
 * Load saved canvas size from localStorage
 * @returns {{ rows: number, cols: number } | null}
 */
export function loadCanvasSize() {
  try {
    const saved = localStorage.getItem(CANVAS_SIZE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.rows === "number" &&
        typeof parsed.cols === "number" &&
        parsed.rows >= MIN_CANVAS_SIZE.rows &&
        parsed.rows <= MAX_CANVAS_SIZE.rows &&
        parsed.cols >= MIN_CANVAS_SIZE.cols &&
        parsed.cols <= MAX_CANVAS_SIZE.cols
      ) {
        return { rows: parsed.rows, cols: parsed.cols };
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[viewportState] Failed to load canvas size:", e);
    }
  }
  return null;
}

/**
 * Save canvas size to localStorage
 * @param {{ rows: number, cols: number }} size
 * @returns {boolean}
 */
export function saveCanvasSize(size) {
  if (
    !size ||
    typeof size.rows !== "number" ||
    typeof size.cols !== "number" ||
    size.rows < MIN_CANVAS_SIZE.rows ||
    size.rows > MAX_CANVAS_SIZE.rows ||
    size.cols < MIN_CANVAS_SIZE.cols ||
    size.cols > MAX_CANVAS_SIZE.cols
  ) {
    return false;
  }

  try {
    localStorage.setItem(
      CANVAS_SIZE_STORAGE_KEY,
      JSON.stringify({
        rows: size.rows,
        cols: size.cols,
      })
    );
    return true;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[viewportState] Failed to save canvas size:", e);
    }
    return false;
  }
}

/**
 * Get initial canvas size for React state
 * @returns {{ rows: number, cols: number }}
 */
export function getInitialCanvasSize() {
  return loadCanvasSize() ?? { ...DEFAULT_CANVAS_SIZE };
}
