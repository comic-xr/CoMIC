/**
 * @file tokens.js
 * @description Global design tokens for React components
 *
 * These tokens match the SCSS theme system (_colors.scss, _effects.scss, etc.)
 * and are available for inline styles in React components.
 *
 * USAGE: Import these tokens when you need inline JS styles that match the theme.
 * For SCSS-based components, prefer using the SCSS variables via @use "theme" as *.
 */

/**
 * Global design tokens
 * Matches SCSS tokens in src/ui/react/styles/tokens/
 */
export const tokens = {
  colors: {
    bg: {
      base: '#020406',
      primary: '#060a12',
      secondary: '#0c1220',
      tertiary: '#121a2e',
      elevated: '#18223c',
      hover: 'rgba(96, 165, 250, 0.08)',
      active: 'rgba(96, 165, 250, 0.15)',
      canvas: '#030303',
      canvasCell: '#080808',
      canvasEmpty: '#050505',
    },
    glass: {
      subtle: 'rgba(96, 165, 250, 0.03)',
      light: 'rgba(96, 165, 250, 0.05)',
      medium: 'rgba(96, 165, 250, 0.08)',
      strong: 'rgba(96, 165, 250, 0.12)',
      panel: 'rgba(8, 14, 24, 0.88)',
      frosted: 'rgba(12, 18, 32, 0.75)',
      canvas: 'rgba(255, 255, 255, 0.04)',
    },
    border: {
      subtle: 'rgba(96, 165, 250, 0.08)',
      default: 'rgba(96, 165, 250, 0.12)',
      medium: 'rgba(96, 165, 250, 0.18)',
      strong: 'rgba(96, 165, 250, 0.25)',
      accent: 'rgba(96, 165, 250, 0.4)',
      glow: 'rgba(96, 165, 250, 0.25)',
      focus: 'rgba(96, 165, 250, 0.4)',
      canvas: 'rgba(255, 255, 255, 0.06)',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(180, 200, 240, 0.8)',
      tertiary: 'rgba(140, 160, 200, 0.6)',
      muted: 'rgba(120, 150, 210, 0.5)',
      disabled: 'rgba(100, 130, 180, 0.3)',
    },
    accent: {
      primary: '#60a5fa',
      blue: '#60a5fa',
      cyan: '#22d3ee',
      purple: '#c084fc',
      amber: '#fbbf24',
      green: '#34d399',
      red: '#f87171',
      teal: '#7dd3fc',
      pink: '#fb7185',
      indigo: '#a78bfa',
    },
    status: {
      success: '#30d158',
      warning: '#ff9f0a',
      error: '#ff453a',
      info: '#0a84ff',
    },
    canvas: {
      bg: '#030303',
      cell: '#080808',
      cellHover: '#0f0f12',
      gridLine: 'rgba(96, 165, 250, 0.12)',
      gridLineMajor: 'rgba(96, 165, 250, 0.22)',
    },
  },

  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },

  fontSize: {
    xs: '9px',
    sm: '10px',
    md: '11px',
    lg: '12px',
    xl: '13px',
    '2xl': '14px',
    '3xl': '16px',
  },

  spacing: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
  },

  blur: {
    none: 'none',
    subtle: 'blur(8px)',
    medium: 'blur(12px)',
    strong: 'blur(20px)',
    extreme: 'blur(24px)',
  },

  shadow: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 8px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.6)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.7)',
    glass: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)',
    glassLg: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    depth: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },

  transition: {
    instant: '0.1s ease',
    fast: '0.15s ease',
    base: '0.2s ease',
    medium: '0.25s ease',
    slow: '0.3s ease',
  },

  zIndex: {
    base: 0,
    dropdown: 1000,
    floating: 1010,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    notification: 1080,
    maximum: 9999,
  },
};

/**
 * Helper to get accent color with opacity
 * @param {string} accentName - Accent color name (e.g., 'blue', 'purple')
 * @param {number} opacity - Opacity 0-1
 * @returns {string} RGBA color string
 */
export function accentWithOpacity(accentName, opacity = 1) {
  const hex = tokens.colors.accent[accentName];
  if (!hex) return 'transparent';

  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get glassmorphism styles for a panel
 * @param {'subtle' | 'light' | 'medium' | 'strong' | 'panel' | 'frosted'} level
 * @returns {Object} Style object with background, backdrop-filter, border
 */
export function getGlassStyle(level = 'panel') {
  const base = {
    backdropFilter: tokens.blur.strong,
    WebkitBackdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.colors.border.glow}`,
    boxShadow: tokens.shadow.glass,
  };

  switch (level) {
    case 'subtle':
      return {
        ...base,
        background: tokens.colors.glass.subtle,
        backdropFilter: tokens.blur.subtle,
        WebkitBackdropFilter: tokens.blur.subtle,
      };
    case 'light':
      return {
        ...base,
        background: tokens.colors.glass.light,
        backdropFilter: tokens.blur.medium,
        WebkitBackdropFilter: tokens.blur.medium,
      };
    case 'medium':
      return {
        ...base,
        background: tokens.colors.glass.medium,
      };
    case 'strong':
      return {
        ...base,
        background: tokens.colors.glass.strong,
      };
    case 'frosted':
      return {
        ...base,
        background: tokens.colors.glass.frosted,
      };
    case 'panel':
    default:
      return {
        ...base,
        background: tokens.colors.glass.panel,
      };
  }
}

export default tokens;
