/**
 * @file LinkLines.jsx
 * @description SVG link lines connecting VGs on minimap
 */

import React, { memo, useMemo } from 'react';

/**
 * LinkLines - SVG overlay for VG link visualization
 *
 * @param {Object} props
 * @param {Array} props.links - VG link data
 * @param {Function} props.getVGCenter - Function to get VG center position
 * @param {string} props.highlightedLinkId - Currently highlighted link ID
 * @param {Function} props.onLinkClick - Link click handler
 * @param {boolean} props.showLabels - Whether grid labels are shown (affects offset)
 * @param {number} props.labelOffset - Offset for grid labels
 */
export const LinkLines = memo(function LinkLines({
  links,
  getVGCenter,
  highlightedLinkId,
  onLinkClick,
  showLabels,
  labelOffset = 24,
}) {
  // Calculate offset for labels
  const offset = showLabels ? labelOffset : 0;

  return (
    <svg className="link-lines">
      {links.map(link => {
        const from = getVGCenter(link.from);
        const to = getVGCenter(link.to);
        if (!from || !to) return null;

        const isHighlighted = highlightedLinkId === link.id;
        const linkColor = link.type === 'camera' ? 'var(--accent-cyan)' : 'var(--accent-purple)';

        // Calculate midpoint for directional arrow
        const midX = (from.x + to.x) / 2 + offset;
        const midY = (from.y + to.y) / 2 + offset;

        // Calculate arrow angle
        const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

        return (
          <g
            key={link.id}
            className={`link-lines__link ${isHighlighted ? 'link-lines__link--highlighted' : ''}`}
            onClick={() => onLinkClick(link.id)}
          >
            {/* Main line */}
            <line
              x1={from.x + offset}
              y1={from.y + offset}
              x2={to.x + offset}
              y2={to.y + offset}
              stroke={linkColor}
              strokeWidth={isHighlighted ? 4 : 2}
              strokeOpacity={isHighlighted ? 1 : 0.5}
              strokeDasharray={link.mode === 'unidirectional' ? '6,4' : 'none'}
            />

            {/* Direction indicator for unidirectional links */}
            {link.mode === 'unidirectional' && (
              <g transform={`translate(${to.x + offset}, ${to.y + offset})`}>
                <circle
                  r={5}
                  fill={linkColor}
                  opacity={isHighlighted ? 1 : 0.5}
                />
              </g>
            )}

            {/* Bidirectional indicator */}
            {link.mode === 'bidirectional' && isHighlighted && (
              <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                <path
                  d="M-4,-4 L4,0 L-4,4 M4,-4 L-4,0 L4,4"
                  fill="none"
                  stroke={linkColor}
                  strokeWidth={2}
                />
              </g>
            )}

            {/* Hit area for easier clicking */}
            <line
              x1={from.x + offset}
              y1={from.y + offset}
              x2={to.x + offset}
              y2={to.y + offset}
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'pointer' }}
            />
          </g>
        );
      })}
    </svg>
  );
});

export default LinkLines;
