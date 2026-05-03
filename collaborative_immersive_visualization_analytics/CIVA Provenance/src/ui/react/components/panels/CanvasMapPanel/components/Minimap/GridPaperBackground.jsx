/**
 * @file GridPaperBackground.jsx
 * @description SVG grid-paper background with minor/major lines
 */

import React, { memo, useId } from 'react';

/**
 * GridPaperBackground - SVG pattern grid
 *
 * @param {Object} props
 * @param {number} props.width - Grid width in pixels
 * @param {number} props.height - Grid height in pixels
 * @param {number} props.cellSize - Cell size in pixels
 * @param {number} props.gap - Gap size in pixels
 * @param {number} [props.majorEvery=5] - Major grid interval (in cells)
 * @param {number} [props.offsetX=0] - Pattern offset X
 * @param {number} [props.offsetY=0] - Pattern offset Y
 * @param {string} [props.minorColor] - Minor grid line color
 * @param {string} [props.majorColor] - Major grid line color
 * @param {string} [props.className] - Optional className
 * @param {Object} [props.style] - Optional style
 * @param {boolean} [props.show=true] - Whether to render
 */
export const GridPaperBackground = memo(function GridPaperBackground({
  width,
  height,
  cellSize,
  gap,
  majorEvery = 5,
  offsetX = 0,
  offsetY = 0,
  minorColor = 'rgba(96, 165, 250, 0.14)',
  majorColor = 'rgba(96, 165, 250, 0.26)',
  className = '',
  style,
  show = true,
}) {
  const uid = useId();
  if (!show || width <= 0 || height <= 0) return null;

  const pitch = cellSize + gap;
  const majorPitch = pitch * majorEvery;
  const minorId = `minimap-minor-${uid}`;
  const majorId = `minimap-major-${uid}`;

  return (
    <svg
      className={['minimap__grid-paper', className].filter(Boolean).join(' ')}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      style={style}
    >
      <defs>
        <pattern
          id={minorId}
          width={pitch}
          height={pitch}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY})`}
        >
          <path
            d={`M ${pitch} 0 L 0 0 0 ${pitch}`}
            stroke={minorColor}
            strokeWidth="0.75"
          />
        </pattern>
        <pattern
          id={majorId}
          width={majorPitch}
          height={majorPitch}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY})`}
        >
          <rect width={majorPitch} height={majorPitch} fill={`url(#${minorId})`} />
          <path
            d={`M ${majorPitch} 0 L 0 0 0 ${majorPitch}`}
            stroke={majorColor}
            strokeWidth="1.2"
          />
        </pattern>
        <clipPath id={`${majorId}-clip`}>
          <rect width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${majorId}-clip)`}>
        <rect width={width} height={height} fill={`url(#${majorId})`} />
        <rect width={width} height={height} fill="none" stroke={majorColor} strokeWidth="1.2" />
      </g>
    </svg>
  );
});

export default GridPaperBackground;
