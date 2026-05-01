/**
 * @file GazeIndicator.jsx
 * @description Visual indicator for gaze dwell progress.
 *
 * Shows a circular progress ring that fills as user gazes at target.
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * GazeIndicator - Circular progress ring for dwell activation
 */
const GazeIndicator = memo(function GazeIndicator({
    progress = 0,
    size = 60,
    strokeWidth = 4,
    color = 'var(--color-accent-teal)',
    backgroundColor = 'rgba(255, 255, 255, 0.2)',
    showPulse = true,
    className = '',
}) {
    // Calculate circle dimensions
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    // Animation for pulse effect
    const pulseAnimation = showPulse && progress > 0 && progress < 1;

    return (
        <div
            className={`gaze-indicator ${className}`}
            style={{
                width: size,
                height: size,
                position: 'relative',
            }}
        >
            <svg
                width={size}
                height={size}
                style={{
                    transform: 'rotate(-90deg)',
                    animation: pulseAnimation ? 'gaze-pulse 1s ease-in-out infinite' : 'none',
                }}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                />

                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                        transition: 'stroke-dashoffset 0.05s linear',
                    }}
                />
            </svg>

            {/* Center dot */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: progress > 0 ? color : backgroundColor,
                    transition: 'background 0.15s ease',
                }}
            />

            {/* Pulse animation keyframes */}
            <style>{`
                @keyframes gaze-pulse {
                    0%, 100% { transform: rotate(-90deg) scale(1); }
                    50% { transform: rotate(-90deg) scale(1.05); }
                }
            `}</style>
        </div>
    );
});

GazeIndicator.propTypes = {
    /** Progress value from 0 to 1 */
    progress: PropTypes.number,
    /** Size in pixels */
    size: PropTypes.number,
    /** Stroke width in pixels */
    strokeWidth: PropTypes.number,
    /** Progress color */
    color: PropTypes.string,
    /** Background color */
    backgroundColor: PropTypes.string,
    /** Show pulse animation */
    showPulse: PropTypes.bool,
    /** Additional CSS classes */
    className: PropTypes.string,
};

export { GazeIndicator };
export default GazeIndicator;
