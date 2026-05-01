/**
 * @file DPadNav.jsx
 * @description D-Pad navigation control for canvas panning
 *
 * Features:
 * - SVG-based interactive navigation pad
 * - Hover and active states with visual feedback
 * - Center button for "go home" action
 * - Adaptive sizing based on sizeMode
 * - VR-compatible with pointer events
 */

import React, { memo, useState } from 'react';
import { tokens } from '@UI/react/styles/tokens';

/**
 * SquareDPad - SVG-based D-Pad navigation control
 *
 * @param {Object} props
 * @param {'minimal' | 'compact' | 'standard'} [props.sizeMode='standard'] - Size variant
 * @param {Function} props.onMove - Called with direction ('up', 'down', 'left', 'right')
 * @param {Function} props.onGoHome - Called when center button is pressed
 * @param {string} [props.centerLabel] - Label for center button (e.g., 'A1' for current position)
 * @param {boolean} [props.isAtHome=false] - Whether current position is home (highlights center)
 */
export const SquareDPad = memo(function SquareDPad({
  sizeMode = 'standard',
  onMove,
  onGoHome,
  centerLabel,
  isAtHome = false,
}) {
  // Balanced sizes - smaller than original but still usable
  const size = sizeMode === 'minimal' ? 64 : sizeMode === 'compact' ? 72 : 84;
  const centerSize = Math.round(size * 0.38);
  const cornerRadius = 6;
  const gap = 2;
  const cx = size / 2;
  const cy = size / 2;

  const [hoveredQuadrant, setHoveredQuadrant] = useState(null);
  const [activeQuadrant, setActiveQuadrant] = useState(null);

  const getQuadrantColor = (quadrant) => {
    if (activeQuadrant === quadrant) return tokens.colors.accent.cyan;
    if (hoveredQuadrant === quadrant) return tokens.colors.accent.blue;
    return tokens.colors.glass.medium;
  };

  const getIconColor = (quadrant) => {
    if (hoveredQuadrant === quadrant || activeQuadrant === quadrant) return 'white';
    return tokens.colors.text.muted;
  };

  const handleClick = (direction) => {
    setActiveQuadrant(direction);
    setTimeout(() => setActiveQuadrant(null), 150);
    onMove?.(direction);
  };

  // Define quadrant polygons
  const quadrants = [
    {
      id: 'up',
      points: `${gap},${gap} ${size - gap},${gap} ${cx + centerSize / 2 + gap},${cy - centerSize / 2 - gap} ${
        cx - centerSize / 2 - gap
      },${cy - centerSize / 2 - gap}`,
      iconX: cx,
      iconY: (gap + cy - centerSize / 2 - gap) / 2 + 2,
    },
    {
      id: 'right',
      points: `${size - gap},${gap} ${size - gap},${size - gap} ${cx + centerSize / 2 + gap},${cy + centerSize / 2 + gap} ${
        cx + centerSize / 2 + gap
      },${cy - centerSize / 2 - gap}`,
      iconX: (size - gap + cx + centerSize / 2 + gap) / 2 - 2,
      iconY: cy,
    },
    {
      id: 'down',
      points: `${size - gap},${size - gap} ${gap},${size - gap} ${cx - centerSize / 2 - gap},${cy + centerSize / 2 + gap} ${
        cx + centerSize / 2 + gap
      },${cy + centerSize / 2 + gap}`,
      iconX: cx,
      iconY: (size - gap + cy + centerSize / 2 + gap) / 2 - 2,
    },
    {
      id: 'left',
      points: `${gap},${size - gap} ${gap},${gap} ${cx - centerSize / 2 - gap},${cy - centerSize / 2 - gap} ${
        cx - centerSize / 2 - gap
      },${cy + centerSize / 2 + gap}`,
      iconX: (gap + cx - centerSize / 2 - gap) / 2 + 2,
      iconY: cy,
    },
  ];

  // Generate chevron path for direction arrows
  const getChevronPath = (direction) => {
    const s = Math.max(6, size * 0.09);
    switch (direction) {
      case 'up':
        return `M ${-s} ${s / 2} L 0 ${-s / 2} L ${s} ${s / 2}`;
      case 'down':
        return `M ${-s} ${-s / 2} L 0 ${s / 2} L ${s} ${-s / 2}`;
      case 'left':
        return `M ${s / 2} ${-s} L ${-s / 2} 0 L ${s / 2} ${s}`;
      case 'right':
        return `M ${-s / 2} ${-s} L ${s / 2} 0 L ${-s / 2} ${s}`;
      default:
        return '';
    }
  };

  return (
    <svg
      width={size}
      height={size}
      style={{ flexShrink: 0, display: 'block' }}
      role="group"
      aria-label="Navigation controls"
    >
      {/* Background */}
      <rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        rx={cornerRadius}
        fill={tokens.colors.bg.tertiary}
        stroke={tokens.colors.border.default}
        strokeWidth={1}
      />

      {/* Directional quadrants */}
      {quadrants.map((q) => (
        <g key={q.id}>
          <polygon
            points={q.points}
            fill={getQuadrantColor(q.id)}
            stroke={tokens.colors.border.subtle}
            strokeWidth={0.5}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredQuadrant(q.id)}
            onMouseLeave={() => setHoveredQuadrant(null)}
            onPointerEnter={() => setHoveredQuadrant(q.id)}
            onPointerLeave={() => setHoveredQuadrant(null)}
            onClick={() => handleClick(q.id)}
            role="button"
            aria-label={`Move ${q.id}`}
          />
          <path
            d={getChevronPath(q.id)}
            transform={`translate(${q.iconX}, ${q.iconY})`}
            fill="none"
            stroke={getIconColor(q.id)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}

      {/* Center button (home) */}
      <rect
        x={cx - centerSize / 2}
        y={cy - centerSize / 2}
        width={centerSize}
        height={centerSize}
        rx={4}
        fill={isAtHome ? `${tokens.colors.accent.amber}30` : tokens.colors.bg.secondary}
        stroke={isAtHome ? tokens.colors.accent.amber : tokens.colors.border.default}
        strokeWidth={1.5}
        style={{ cursor: 'pointer' }}
        onClick={onGoHome}
        role="button"
        aria-label="Go to home position"
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isAtHome ? tokens.colors.accent.amber : tokens.colors.text.primary}
        fontSize={Math.max(11, size * 0.16)}
        fontWeight="700"
        fontFamily="monospace"
        style={{ pointerEvents: 'none' }}
      >
        {centerLabel || 'A1'}
      </text>
    </svg>
  );
});

/**
 * SimpleDPad - Basic D-Pad with button layout
 *
 * @param {Object} props
 * @param {'minimal' | 'compact' | 'standard'} [props.sizeMode='standard'] - Size variant
 * @param {Function} props.onMove - Called with direction
 * @param {Function} props.onGoHome - Called when center button is pressed
 * @param {boolean} [props.isAtHome=false] - Whether current position is home
 */
export const SimpleDPad = memo(function SimpleDPad({
  sizeMode = 'standard',
  onMove,
  onGoHome,
  isAtHome = false,
}) {
  const btnSize = sizeMode === 'minimal' ? 24 : sizeMode === 'compact' ? 28 : 32;
  const iconSize = sizeMode === 'minimal' ? 12 : sizeMode === 'compact' ? 14 : 16;

  const btnStyle = {
    width: btnSize,
    height: btnSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.colors.glass.medium,
    border: `1px solid ${tokens.colors.border.subtle}`,
    borderRadius: tokens.radius.sm,
    color: tokens.colors.text.secondary,
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
  };

  const homeStyle = {
    ...btnStyle,
    background: isAtHome ? `${tokens.colors.accent.amber}30` : tokens.colors.glass.medium,
    color: isAtHome ? tokens.colors.accent.amber : tokens.colors.text.muted,
    border: isAtHome ? `1px solid ${tokens.colors.accent.amber}` : btnStyle.border,
  };

  // Simple chevron SVG paths
  const Chevron = ({ direction }) => {
    const paths = {
      up: 'M6 9L12 3L18 9',
      down: 'M6 9L12 15L18 9',
      left: 'M15 6L9 12L15 18',
      right: 'M9 6L15 12L9 18',
    };
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[direction]} />
      </svg>
    );
  };

  const Home = () => (
    <svg width={iconSize - 2} height={iconSize - 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <button type="button" onClick={() => onMove?.('up')} style={btnStyle} aria-label="Move up">
        <Chevron direction="up" />
      </button>
      <div style={{ display: 'flex', gap: '2px' }}>
        <button type="button" onClick={() => onMove?.('left')} style={btnStyle} aria-label="Move left">
          <Chevron direction="left" />
        </button>
        <button type="button" onClick={onGoHome} style={homeStyle} aria-label="Go home">
          <Home />
        </button>
        <button type="button" onClick={() => onMove?.('right')} style={btnStyle} aria-label="Move right">
          <Chevron direction="right" />
        </button>
      </div>
      <button type="button" onClick={() => onMove?.('down')} style={btnStyle} aria-label="Move down">
        <Chevron direction="down" />
      </button>
    </div>
  );
});

export default SquareDPad;
