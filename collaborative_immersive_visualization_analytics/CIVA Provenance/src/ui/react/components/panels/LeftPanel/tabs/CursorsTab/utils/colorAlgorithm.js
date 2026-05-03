/**
 * @file colorAlgorithm.js
 * @description Accessible color assignment algorithm for cursor differentiation.
 * Uses CIEDE2000 color distance for perceptual differentiation.
 *
 * @see Left_Panel_Design_Specification.docx - Section 8.4 Cursor Colors
 */

// =============================================================================
// CURSOR PALETTE
// =============================================================================

/**
 * Perceptually distinct cursor color palette.
 * Colors optimized for:
 * - High contrast against dark backgrounds
 * - Color blindness accessibility (deuteranopia, protanopia, tritanopia)
 * - Sufficient CIEDE2000 distance between colors (>15)
 */
export const CURSOR_PALETTE = [
  { hex: "#2dd4bf", name: "Teal", lab: null }, // Default for self
  { hex: "#fb7185", name: "Rose", lab: null },
  { hex: "#60a5fa", name: "Blue", lab: null },
  { hex: "#fbbf24", name: "Amber", lab: null },
  { hex: "#c084fc", name: "Purple", lab: null },
  { hex: "#4ade80", name: "Green", lab: null },
  { hex: "#f472b6", name: "Pink", lab: null },
  { hex: "#38bdf8", name: "Sky", lab: null },
];

// Pre-compute LAB values on module load
CURSOR_PALETTE.forEach((color) => {
  color.lab = rgbToLab(hexToRgb(color.hex));
});

// =============================================================================
// COLOR CONVERSION UTILITIES
// =============================================================================

/**
 * Convert hex color to RGB.
 *
 * @param {string} hex - Hex color string (e.g., '#60a5fa' or '60a5fa')
 * @returns {{ r: number, g: number, b: number }} RGB values (0-255)
 *
 * @example
 * hexToRgb('#60a5fa') // { r: 96, g: 165, b: 250 }
 */
export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Convert RGB to XYZ color space.
 *
 * @param {{ r: number, g: number, b: number }} rgb - RGB values (0-255)
 * @returns {{ x: number, y: number, z: number }} XYZ values
 */
function rgbToXyz(rgb) {
  // Normalize RGB to 0-1
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Apply gamma correction (sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Scale to 100
  r *= 100;
  g *= 100;
  b *= 100;

  // Convert to XYZ using D65 illuminant matrix
  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    z: r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  };
}

/**
 * Convert RGB to CIELAB color space.
 *
 * @param {{ r: number, g: number, b: number }} rgb - RGB values (0-255)
 * @returns {{ L: number, a: number, b: number }} LAB values
 *
 * @example
 * rgbToLab({ r: 96, g: 165, b: 250 }) // { L: 66.57, a: 5.23, b: -52.14 }
 */
export function rgbToLab(rgb) {
  const xyz = rgbToXyz(rgb);

  // D65 reference white
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;

  // Apply f(t) function
  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.pow(x, 1 / 3) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.pow(y, 1 / 3) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.pow(z, 1 / 3) : (kappa * z + 16) / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

// =============================================================================
// CIEDE2000 COLOR DISTANCE
// =============================================================================

/**
 * Calculate CIEDE2000 color difference.
 * This is the most perceptually uniform color difference formula.
 *
 * @param {{ L: number, a: number, b: number }} lab1 - First color in LAB
 * @param {{ L: number, a: number, b: number }} lab2 - Second color in LAB
 * @returns {number} Color difference (0 = identical, >15 = easily distinguishable)
 *
 * @see https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
 *
 * @example
 * const blue = rgbToLab({ r: 96, g: 165, b: 250 });
 * const teal = rgbToLab({ r: 45, g: 212, b: 191 });
 * ciede2000(blue, teal) // ~25 (easily distinguishable)
 */
export function ciede2000(lab1, lab2) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  // Calculate C'
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));

  const a1Prime = a1 * (1 + G);
  const a2Prime = a2 * (1 + G);

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  // Calculate h'
  let h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI);
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI);
  if (h2Prime < 0) h2Prime += 360;

  // Calculate delta values
  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltahPrime;
  if (C1Prime * C2Prime === 0) {
    deltahPrime = 0;
  } else {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) {
      deltahPrime = diff;
    } else if (diff > 180) {
      deltahPrime = diff - 360;
    } else {
      deltahPrime = diff + 360;
    }
  }

  const deltaHPrime =
    2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((deltahPrime * Math.PI) / 360);

  // Calculate CIEDE2000
  const LPrimeAvg = (L1 + L2) / 2;
  const CPrimeAvg = (C1Prime + C2Prime) / 2;

  let hPrimeAvg;
  if (C1Prime * C2Prime === 0) {
    hPrimeAvg = h1Prime + h2Prime;
  } else {
    const diff = Math.abs(h1Prime - h2Prime);
    if (diff <= 180) {
      hPrimeAvg = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      hPrimeAvg = (h1Prime + h2Prime + 360) / 2;
    } else {
      hPrimeAvg = (h1Prime + h2Prime - 360) / 2;
    }
  }

  const T =
    1 -
    0.17 * Math.cos(((hPrimeAvg - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hPrimeAvg * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hPrimeAvg + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hPrimeAvg - 63) * Math.PI) / 180);

  const deltaTheta = 30 * Math.exp(-Math.pow((hPrimeAvg - 275) / 25, 2));
  const RC =
    2 *
    Math.sqrt(
      Math.pow(CPrimeAvg, 7) / (Math.pow(CPrimeAvg, 7) + Math.pow(25, 7))
    );
  const SL =
    1 +
    (0.015 * Math.pow(LPrimeAvg - 50, 2)) /
      Math.sqrt(20 + Math.pow(LPrimeAvg - 50, 2));
  const SC = 1 + 0.045 * CPrimeAvg;
  const SH = 1 + 0.015 * CPrimeAvg * T;
  const RT = -Math.sin((2 * deltaTheta * Math.PI) / 180) * RC;

  // Weighting factors (kL = kC = kH = 1 for standard conditions)
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const deltaE = Math.sqrt(
    Math.pow(deltaLPrime / (kL * SL), 2) +
      Math.pow(deltaCPrime / (kC * SC), 2) +
      Math.pow(deltaHPrime / (kH * SH), 2) +
      RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH))
  );

  return deltaE;
}

/**
 * Calculate minimum color distance from a color to a set of colors.
 *
 * @param {{ L: number, a: number, b: number }} targetLab - Target color in LAB
 * @param {Array<{ L: number, a: number, b: number }>} usedLabs - Array of used colors in LAB
 * @returns {number} Minimum CIEDE2000 distance
 */
export function minColorDistance(targetLab, usedLabs) {
  if (usedLabs.length === 0) return Infinity;
  return Math.min(...usedLabs.map((lab) => ciede2000(targetLab, lab)));
}

// =============================================================================
// COLOR ASSIGNMENT
// =============================================================================

/**
 * Minimum acceptable color distance for cursor differentiation.
 * Values below this threshold may be confused by users.
 */
export const MIN_COLOR_DISTANCE = 15;

/**
 * Assign a color to a user based on availability and preferences.
 *
 * Assignment hierarchy:
 * 1. Admin-assigned color (if set)
 * 2. User preference (if set and available)
 * 3. Best available from palette (maximizes distance from used colors)
 * 4. Generated color (if palette exhausted)
 *
 * @param {Object} options - Assignment options
 * @param {string} [options.adminColor] - Admin-assigned hex color
 * @param {string} [options.preferredColor] - User's preferred hex color
 * @param {string[]} options.usedColors - Array of hex colors already in use
 * @param {boolean} [options.isSelf] - Whether this is the current user
 * @returns {{ hex: string, name: string, generated: boolean }} Assigned color
 *
 * @example
 * assignUserColor({
 *   usedColors: ['#2dd4bf', '#fb7185'],
 *   preferredColor: '#60a5fa'
 * }) // { hex: '#60a5fa', name: 'Blue', generated: false }
 */
export function assignUserColor({
  adminColor = null,
  preferredColor = null,
  usedColors = [],
  isSelf = false,
}) {
  // Convert used colors to LAB
  const usedLabs = usedColors.map((hex) => rgbToLab(hexToRgb(hex)));

  // 1. Admin-assigned color takes precedence
  if (adminColor) {
    const paletteColor = CURSOR_PALETTE.find(
      (c) => c.hex.toLowerCase() === adminColor.toLowerCase()
    );
    return {
      hex: adminColor,
      name: paletteColor?.name || "Custom",
      generated: false,
    };
  }

  // 2. Check user preference
  if (preferredColor) {
    const prefLab = rgbToLab(hexToRgb(preferredColor));
    const distance = minColorDistance(prefLab, usedLabs);

    // Use preference if it has sufficient distance
    if (distance >= MIN_COLOR_DISTANCE || usedColors.length === 0) {
      const paletteColor = CURSOR_PALETTE.find(
        (c) => c.hex.toLowerCase() === preferredColor.toLowerCase()
      );
      return {
        hex: preferredColor,
        name: paletteColor?.name || "Custom",
        generated: false,
      };
    }
  }

  // 3. Find best available color from palette
  const availableColors = CURSOR_PALETTE.filter(
    (color) =>
      !usedColors.some((used) => used.toLowerCase() === color.hex.toLowerCase())
  );

  if (availableColors.length > 0) {
    // Pick the color with maximum distance from all used colors
    let bestColor = availableColors[0];
    let bestDistance =
      usedLabs.length > 0
        ? minColorDistance(bestColor.lab, usedLabs)
        : Infinity;

    for (const color of availableColors.slice(1)) {
      const distance =
        usedLabs.length > 0 ? minColorDistance(color.lab, usedLabs) : Infinity;
      if (distance > bestDistance) {
        bestDistance = distance;
        bestColor = color;
      }
    }

    return {
      hex: bestColor.hex,
      name: bestColor.name,
      generated: false,
    };
  }

  // 4. Generate a new color (palette exhausted)
  const generatedColor = generateDistinctColor(usedLabs);
  return {
    hex: generatedColor,
    name: "Generated",
    generated: true,
  };
}

/**
 * Generate a color distinct from all used colors.
 * Uses golden angle hue rotation for even distribution.
 *
 * @param {Array<{ L: number, a: number, b: number }>} usedLabs - Used colors in LAB
 * @returns {string} Generated hex color
 */
function generateDistinctColor(usedLabs) {
  // Golden angle in degrees for optimal distribution
  const goldenAngle = 137.508;
  const baseHue = (usedLabs.length * goldenAngle) % 360;

  // HSL to RGB conversion
  const h = baseHue / 360;
  const s = 0.7; // 70% saturation
  const l = 0.6; // 60% lightness

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  // Convert to hex
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get color assignment for multiple users at once.
 * Ensures optimal distribution of colors across all users.
 *
 * @param {Array<{ id: string, adminColor?: string, preferredColor?: string, isSelf?: boolean }>} users - User list
 * @returns {Map<string, { hex: string, name: string, generated: boolean }>} User ID to color mapping
 *
 * @example
 * const colors = assignColorsToUsers([
 *   { id: 'user-1', isSelf: true },
 *   { id: 'user-2' },
 *   { id: 'user-3', preferredColor: '#fb7185' }
 * ]);
 * colors.get('user-1') // { hex: '#2dd4bf', name: 'Teal', generated: false }
 */
export function assignColorsToUsers(users) {
  const assignments = new Map();
  const usedColors = [];

  // Sort to process self first, then admin-assigned, then preferences
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isSelf && !b.isSelf) return -1;
    if (!a.isSelf && b.isSelf) return 1;
    if (a.adminColor && !b.adminColor) return -1;
    if (!a.adminColor && b.adminColor) return 1;
    if (a.preferredColor && !b.preferredColor) return -1;
    if (!a.preferredColor && b.preferredColor) return 1;
    return 0;
  });

  for (const user of sortedUsers) {
    const color = assignUserColor({
      adminColor: user.adminColor,
      preferredColor: user.preferredColor,
      usedColors,
      isSelf: user.isSelf,
    });

    assignments.set(user.id, color);
    usedColors.push(color.hex);
  }

  return assignments;
}
