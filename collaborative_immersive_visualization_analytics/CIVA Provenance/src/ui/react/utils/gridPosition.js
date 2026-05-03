/**
 * @file gridPosition.js
 * @description Utilities for formatting/parsing grid positions (A1, B2, AA10).
 */

// =============================================================================
// COLUMN/ROW FORMATTERS
// =============================================================================

/**
 * Convert a 0-based column index to letters (A, B, ..., Z, AA, AB, ...).
 * @param {number} col
 * @returns {string}
 */
export const columnIndexToLetters = (col) => {
    if (typeof col !== 'number' || Number.isNaN(col) || col < 0) return '';
    let n = Math.floor(col);
    let letters = '';
    while (n >= 0) {
        letters = String.fromCharCode((n % 26) + 65) + letters;
        n = Math.floor(n / 26) - 1;
    }
    return letters;
};

/**
 * Convert column letters (A, B, ..., Z, AA, AB, ...) to 0-based index.
 * @param {string} letters
 * @returns {number|null}
 */
export const lettersToColumnIndex = (letters) => {
    if (!letters || typeof letters !== 'string') return null;
    const normalized = letters.toUpperCase();
    let col = 0;
    for (let i = 0; i < normalized.length; i += 1) {
        const code = normalized.charCodeAt(i);
        if (code < 65 || code > 90) return null;
        col = col * 26 + (code - 64);
    }
    return col - 1;
};

/**
 * Format grid position as "A1".
 * @param {number} col
 * @param {number} row
 * @returns {string}
 */
export const formatGridPosition = (col, row) => {
    if (typeof col !== 'number' || typeof row !== 'number') return '';
    const letters = columnIndexToLetters(col);
    if (!letters) return '';
    return `${letters}${row + 1}`;
};

/**
 * Parse grid position like "A1" into { col, row }.
 * @param {string} position
 * @returns {{col: number, row: number} | null}
 */
export const parseGridPosition = (position) => {
    if (!position || typeof position !== 'string') return null;
    const match = position.trim().match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    const col = lettersToColumnIndex(match[1]);
    const row = parseInt(match[2], 10) - 1;
    if (col === null || Number.isNaN(row) || row < 0) return null;
    return { col, row };
};

export default {
    columnIndexToLetters,
    lettersToColumnIndex,
    formatGridPosition,
    parseGridPosition,
};
