/**
 * DwellIndicator - Circular progress indicator for VR dwell hover
 *
 * Shows a circular progress ring during VR dwell interactions.
 * Only renders when in VR mode and actively dwelling.
 *
 * @module DwellIndicator
 */

import React from 'react';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import './DwellIndicator.scss';

/**
 * DwellIndicator Component
 *
 * @param {Object} props
 * @param {number} props.progress - Progress value 0-1
 * @param {number} props.size - Size in pixels (default 40)
 * @param {string} props.color - Stroke color (default accent blue)
 * @param {string} props.backgroundColor - Background stroke color
 * @param {number} props.strokeWidth - Stroke width (default 3)
 */
export function DwellIndicator({
    progress,
    size = 40,
    color = 'var(--color-accent-blue)',
    backgroundColor = 'rgba(255, 255, 255, 0.15)',
    strokeWidth = 3,
}) {
    const { isVR } = useAdaptive();

    // Only render in VR mode when actively dwelling
    if (!isVR || progress === 0 || progress >= 1) {
        return null;
    }

    const radius = (size - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <svg
            className="dwell-indicator"
            width={size}
            height={size}
            aria-hidden="true"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            {/* Background circle */}
            <circle
                className="dwell-indicator__bg"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={backgroundColor}
                strokeWidth={strokeWidth}
            />

            {/* Progress circle */}
            <circle
                className="dwell-indicator__progress"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
            />
        </svg>
    );
}

export default DwellIndicator;
