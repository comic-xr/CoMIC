/**
 * Color utility functions
 * Extracted from components to be reusable across the app
 */

import { hexToRgb as hexToRgb255, rgbToHex as rgbToHex255 } from './colorUtils.js';

const DEFAULT_RGB_NORMALIZED = [96 / 255, 165 / 255, 250 / 255];

/**
 * Parse hex color to RGB array [0-1]
 * @param {string} hexColor - Color in hex format (#RRGGBB)
 * @returns {[number, number, number]} RGB array with values 0-1
 */
export function hexToRgb(hexColor) {
  const { r, g, b } = hexToRgb255(hexColor);
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return DEFAULT_RGB_NORMALIZED;
  }
  return [r / 255, g / 255, b / 255];
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert RGB array [0-1] to hex color
 * @param {[number, number, number]} rgb - RGB array with values 0-1
 * @returns {string} Hex color (#RRGGBB)
 */
export function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) {
    return rgbToHex255(96, 165, 250);
  }

  const [r, g, b] = rgb;
  return rgbToHex255(
    clamp(r, 0, 1) * 255,
    clamp(g, 0, 1) * 255,
    clamp(b, 0, 1) * 255
  );
}

/**
 * Linear interpolation between two colors
 * @param {[number, number, number]} colorA - RGB array A
 * @param {[number, number, number]} colorB - RGB array B
 * @param {number} t - Interpolation factor (0-1)
 * @returns {[number, number, number]} Interpolated RGB
 */
export function lerpColor(colorA, colorB, t) {
  return [
    colorA[0] + (colorB[0] - colorA[0]) * t,
    colorA[1] + (colorB[1] - colorA[1]) * t,
    colorA[2] + (colorB[2] - colorA[2]) * t,
  ];
}
