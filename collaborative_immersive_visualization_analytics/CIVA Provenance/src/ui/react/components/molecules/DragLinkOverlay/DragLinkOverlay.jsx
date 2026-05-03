// src/ui/react/components/molecules/DragLinkOverlay/DragLinkOverlay.jsx
// SVG overlay showing connection line during drag-to-link

import React, { memo } from 'react';
import './DragLinkOverlay.scss';

/**
 * DragLinkOverlay - SVG overlay showing connection line during drag
 *
 * @param {object} sourceRect - Bounding rect of source element
 * @param {object} currentPosition - Current mouse position { x, y }
 * @param {boolean} isValidTarget - Whether current target is valid
 * @param {object} targetView - Current target view (for display)
 */
export const DragLinkOverlay = memo(function DragLinkOverlay({
    sourceRect,
    currentPosition,
    isValidTarget,
    targetView,
}) {
    if (!sourceRect) return null;

    // Calculate source center point
    const sourceX = sourceRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.top + sourceRect.height / 2;

    // Line color based on validity
    const lineColor = isValidTarget
        ? 'var(--color-accent-teal, #2dd4bf)'
        : 'var(--color-text-muted, rgba(255,255,255,0.35))';

    return (
        <svg className="drag-link-overlay" aria-hidden="true">
            <defs>
                {/* Glow filter */}
                <filter
                    id="dragLineGlow"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                >
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Connection line */}
            <line
                className="drag-link-overlay__line"
                x1={sourceX}
                y1={sourceY}
                x2={currentPosition.x}
                y2={currentPosition.y}
                stroke={lineColor}
                strokeWidth="2"
                strokeDasharray="8 4"
                strokeLinecap="round"
                filter={isValidTarget ? 'url(#dragLineGlow)' : undefined}
            />

            {/* Source indicator (circle) */}
            <circle
                className="drag-link-overlay__source"
                cx={sourceX}
                cy={sourceY}
                r="6"
                fill="var(--color-accent-teal, #2dd4bf)"
                stroke="#fff"
                strokeWidth="2"
            />

            {/* Target indicator (when valid) */}
            {isValidTarget && (
                <circle
                    className="drag-link-overlay__target-ring"
                    cx={currentPosition.x}
                    cy={currentPosition.y}
                    r="8"
                    fill="none"
                    stroke="var(--color-accent-teal, #2dd4bf)"
                    strokeWidth="2"
                />
            )}

            {/* Link icon following cursor */}
            <g
                transform={`translate(${currentPosition.x + 14}, ${currentPosition.y - 14})`}
            >
                <circle
                    r="12"
                    fill="var(--color-bg-elevated, #18223c)"
                    stroke={lineColor}
                    strokeWidth="1"
                />
                <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="11"
                    fill={lineColor}
                >
                    🔗
                </text>
            </g>

            {/* Target name tooltip */}
            {isValidTarget && targetView && (
                <g
                    transform={`translate(${currentPosition.x + 20}, ${currentPosition.y + 20})`}
                >
                    <rect
                        x="0"
                        y="-10"
                        width={Math.min(targetView.name.length * 6 + 16, 140)}
                        height="20"
                        rx="4"
                        fill="var(--color-bg-secondary, #0c1220)"
                        stroke="var(--color-accent-teal, #2dd4bf)"
                        strokeWidth="1"
                    />
                    <text
                        x="8"
                        y="0"
                        dominantBaseline="central"
                        fontSize="10"
                        fill="var(--color-text-primary, #fff)"
                    >
                        {targetView.name.length > 20
                            ? targetView.name.slice(0, 18) + '...'
                            : targetView.name}
                    </text>
                </g>
            )}
        </svg>
    );
});

export default DragLinkOverlay;
