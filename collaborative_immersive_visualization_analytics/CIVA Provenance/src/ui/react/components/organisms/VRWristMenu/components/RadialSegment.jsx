/**
 * @file RadialSegment.jsx
 * @description Individual radial menu segment component.
 *
 * Renders as a pie slice in the radial menu with icon and optional label.
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Calculate SVG path for a pie slice
 */
function calculateSlicePath(centerX, centerY, radius, startAngle, endAngle, innerRadius = 0) {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    if (innerRadius === 0) {
        return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    return `M ${x4} ${y4} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

/**
 * RadialSegment - Individual pie slice in radial menu
 */
const RadialSegment = memo(function RadialSegment({
    segment,
    index,
    totalSegments,
    isActive,
    isHovered,
    onSelect,
    onHover,
    centerX = 100,
    centerY = 100,
    outerRadius = 90,
    innerRadius = 35,
    showLabels = true,
}) {
    // Calculate segment angles
    const segmentAngle = 360 / totalSegments;
    const startAngle = index * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const midAngle = startAngle + segmentAngle / 2;

    // Calculate icon position (center of segment)
    const iconRadius = (outerRadius + innerRadius) / 2;
    const iconAngleRad = (midAngle - 90) * (Math.PI / 180);
    const iconX = centerX + iconRadius * Math.cos(iconAngleRad);
    const iconY = centerY + iconRadius * Math.sin(iconAngleRad);

    // Calculate label position (outside the segment)
    const labelRadius = outerRadius + 15;
    const labelX = centerX + labelRadius * Math.cos(iconAngleRad);
    const labelY = centerY + labelRadius * Math.sin(iconAngleRad);

    // Generate SVG path
    const path = useMemo(() => {
        return calculateSlicePath(centerX, centerY, outerRadius, startAngle, endAngle, innerRadius);
    }, [centerX, centerY, outerRadius, innerRadius, startAngle, endAngle]);

    // Determine fill color based on state
    const fillColor = useMemo(() => {
        if (isActive) return `var(--color-accent-${segment.color || 'teal'})`;
        if (isHovered) return 'rgba(255, 255, 255, 0.15)';
        return 'rgba(255, 255, 255, 0.05)';
    }, [isActive, isHovered, segment.color]);

    const textColor = isActive ? '#000' : 'var(--color-text-primary)';

    return (
        <g
            className={`radial-segment ${isActive ? 'radial-segment--active' : ''} ${isHovered ? 'radial-segment--hovered' : ''}`}
            onClick={() => onSelect?.(segment.id)}
            onPointerEnter={() => onHover?.(segment.id)}
            onPointerLeave={() => onHover?.(null)}
            style={{ cursor: 'pointer' }}
        >
            {/* Segment slice */}
            <path
                d={path}
                fill={fillColor}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
                style={{ transition: 'fill 0.15s ease' }}
            />

            {/* Icon */}
            <foreignObject
                x={iconX - 12}
                y={iconY - 12}
                width={24}
                height={24}
                style={{ pointerEvents: 'none' }}
            >
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: textColor,
                }}>
                    <Icon name={segment.icon} size={20} />
                </div>
            </foreignObject>

            {/* Label (outside segment) */}
            {showLabels && (
                <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--color-text-secondary)"
                    fontSize="10"
                    fontWeight="500"
                    style={{ pointerEvents: 'none' }}
                >
                    {segment.label}
                </text>
            )}
        </g>
    );
});

RadialSegment.propTypes = {
    /** Segment configuration */
    segment: PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        icon: PropTypes.string.isRequired,
        color: PropTypes.string,
    }).isRequired,
    /** Segment index (0-based) */
    index: PropTypes.number.isRequired,
    /** Total number of segments */
    totalSegments: PropTypes.number.isRequired,
    /** Whether segment is active/selected */
    isActive: PropTypes.bool,
    /** Whether segment is hovered */
    isHovered: PropTypes.bool,
    /** Selection handler */
    onSelect: PropTypes.func,
    /** Hover handler */
    onHover: PropTypes.func,
    /** Center X coordinate */
    centerX: PropTypes.number,
    /** Center Y coordinate */
    centerY: PropTypes.number,
    /** Outer radius */
    outerRadius: PropTypes.number,
    /** Inner radius (hole size) */
    innerRadius: PropTypes.number,
    /** Show labels outside segments */
    showLabels: PropTypes.bool,
};

export { RadialSegment };
export default RadialSegment;
