/**
 * @file colorUtils.js
 * @description Shared color conversion utilities
 *
 * This is the single source of truth for color conversion functions.
 * Import from here instead of defining hexToRgb in individual components.
 */

// =============================================================================
// HEX TO RGB CONVERSIONS
// =============================================================================

/**
 * Convert hex color to RGB object.
 * For use in color calculations and algorithms.
 *
 * @param {string} hex - Hex color string (e.g., '#60a5fa' or '60a5fa')
 * @returns {{ r: number, g: number, b: number }} RGB values (0-255)
 *
 * @example
 * hexToRgb('#60a5fa') // { r: 96, g: 165, b: 250 }
 */
export function hexToRgb(hex) {
    if (!hex) return { r: 96, g: 165, b: 250 }; // Default blue
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return { r: 96, g: 165, b: 250 };
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
    };
}

/**
 * Convert hex color to RGB string for CSS rgba() usage.
 * For use in CSS custom properties and inline styles.
 *
 * @param {string} hex - Hex color string (e.g., '#60a5fa')
 * @returns {string} RGB values as comma-separated string (e.g., '96, 165, 250')
 *
 * @example
 * hexToRgbString('#60a5fa') // '96, 165, 250'
 * // Usage in CSS: rgba(${hexToRgbString('#60a5fa')}, 0.5)
 */
export function hexToRgbString(hex) {
    const rgb = hexToRgb(hex);
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

// =============================================================================
// RGB TO HEX CONVERSION
// =============================================================================

/**
 * Convert RGB values to hex color string.
 *
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color string (e.g., '#60a5fa')
 *
 * @example
 * rgbToHex(96, 165, 250) // '#60a5fa'
 */
export function rgbToHex(r, g, b) {
    const toHex = (c) => {
        const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// =============================================================================
// COLOR MANIPULATION
// =============================================================================

/**
 * Lighten a hex color by a percentage.
 *
 * @param {string} hex - Hex color string
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {string} Lightened hex color
 *
 * @example
 * lightenColor('#60a5fa', 20) // Lighter blue
 */
export function lightenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const factor = percent / 100;
    return rgbToHex(
        rgb.r + (255 - rgb.r) * factor,
        rgb.g + (255 - rgb.g) * factor,
        rgb.b + (255 - rgb.b) * factor
    );
}

/**
 * Darken a hex color by a percentage.
 *
 * @param {string} hex - Hex color string
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} Darkened hex color
 *
 * @example
 * darkenColor('#60a5fa', 20) // Darker blue
 */
export function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const factor = 1 - percent / 100;
    return rgbToHex(
        rgb.r * factor,
        rgb.g * factor,
        rgb.b * factor
    );
}

/**
 * Calculate relative luminance of a color (for contrast calculations).
 *
 * @param {string} hex - Hex color string
 * @returns {number} Relative luminance (0-1)
 */
export function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determine if text should be light or dark based on background color.
 *
 * @param {string} backgroundHex - Background hex color
 * @returns {'light' | 'dark'} Recommended text color variant
 *
 * @example
 * getContrastTextColor('#60a5fa') // 'dark' (use dark text on light blue)
 * getContrastTextColor('#1e3a5f') // 'light' (use light text on dark blue)
 */
export function getContrastTextColor(backgroundHex) {
    const luminance = getLuminance(backgroundHex);
    return luminance > 0.179 ? 'dark' : 'light';
}
