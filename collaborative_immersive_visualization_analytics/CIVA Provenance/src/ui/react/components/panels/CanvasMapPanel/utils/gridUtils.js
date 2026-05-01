/**
 * @file gridUtils.js
 * @description Grid utility functions for Canvas Map Panel V2
 */

/**
 * Convert column index to Excel-style letter (0->A, 25->Z, 26->AA)
 * @param {number} col - Zero-based column index
 * @returns {string} Excel-style column letter(s)
 */
export function colToLetter(col) {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

/**
 * Format cell position as Excel-style (row, col) -> "A1"
 * @param {number} row - Zero-based row index
 * @param {number} col - Zero-based column index
 * @returns {string} Excel-style cell reference
 */
export function formatCellRef(row, col) {
  return `${colToLetter(col)}${row + 1}`;
}

/**
 * Format range as Excel-style "A1:B2"
 * @param {number} row - Starting row (zero-based)
 * @param {number} col - Starting column (zero-based)
 * @param {number} rowSpan - Number of rows
 * @param {number} colSpan - Number of columns
 * @returns {string} Excel-style range reference
 */
export function formatRangeRef(row, col, rowSpan, colSpan) {
  const start = formatCellRef(row, col);
  if (rowSpan === 1 && colSpan === 1) return start;
  const end = formatCellRef(row + rowSpan - 1, col + colSpan - 1);
  return `${start}:${end}`;
}

/**
 * Get display name for a ViewGroup
 * Implicit VGs show view name (if single) or "Group (n views)"
 * @param {Object} vg - ViewGroup object
 * @returns {string} Display name
 */
export function getVGDisplayName(vg) {
  if (vg.isExplicit && vg.name) return vg.name;
  if (vg.views?.length === 1) return vg.views[0].name;
  return `Group (${vg.views?.length || 0} views)`;
}

/**
 * Calculate grid position for minimap elements
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @param {number} cellSize - Cell size in pixels
 * @param {number} gap - Gap between cells
 * @returns {Object} { x, y } pixel position
 */
export function getGridPosition(row, col, cellSize, gap) {
  return {
    x: col * (cellSize + gap),
    y: row * (cellSize + gap),
  };
}

/**
 * Calculate center position of a grid cell or span
 * @param {number} row - Starting row
 * @param {number} col - Starting column
 * @param {number} rowSpan - Number of rows
 * @param {number} colSpan - Number of columns
 * @param {number} cellSize - Cell size in pixels
 * @param {number} gap - Gap between cells
 * @returns {Object} { x, y } center pixel position
 */
export function getGridCenter(row, col, rowSpan, colSpan, cellSize, gap) {
  const x = col * (cellSize + gap) + (colSpan * cellSize + (colSpan - 1) * gap) / 2;
  const y = row * (cellSize + gap) + (rowSpan * cellSize + (rowSpan - 1) * gap) / 2;
  return { x, y };
}

/**
 * Calculate grid dimensions in pixels
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @param {number} cellSize - Cell size in pixels
 * @param {number} gap - Gap between cells
 * @returns {Object} { width, height } in pixels
 */
export function getGridDimensions(rows, cols, cellSize, gap) {
  return {
    width: cols * cellSize + (cols - 1) * gap,
    height: rows * cellSize + (rows - 1) * gap,
  };
}

/**
 * Convert pixel position to grid cell
 * @param {number} x - X pixel position
 * @param {number} y - Y pixel position
 * @param {number} cellSize - Cell size in pixels
 * @param {number} gap - Gap between cells
 * @returns {Object} { row, col } grid position
 */
export function pixelToGrid(x, y, cellSize, gap) {
  const col = Math.floor(x / (cellSize + gap));
  const row = Math.floor(y / (cellSize + gap));
  return { row, col };
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
