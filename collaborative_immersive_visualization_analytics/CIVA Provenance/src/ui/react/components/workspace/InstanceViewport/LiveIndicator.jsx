// src/ui/react/components/workspace/InstanceViewport/LiveIndicator.jsx
// Shows when collaborators are viewing/working on an instance
//
// Based on canvas-floating-architecture-prototype.jsx
// Features:
// - Pulsing green dot
// - Shows collaborator count
// - Visible on snapshot mode views

import React, { memo } from 'react';
import './LiveIndicator.scss';

/**
 * LiveIndicator - Shows collaborator presence on a view
 *
 * Props:
 * - collaborators: Array of collaborator objects [{ name, id, color }]
 * - position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
 * - showCount: Whether to show the count number
 * - size: 'sm' | 'md' | 'lg'
 */
export function LiveIndicator({
    collaborators = [],
    position = 'top-left',
    showCount = true,
    size = 'sm',
}) {
    if (collaborators.length === 0) return null;

    const count = collaborators.length;
    const label = count === 1 ? '1 viewing' : `${count} viewing`;

    return (
        <div className={`live-indicator live-indicator--${position} live-indicator--${size}`}>
            <div className="live-indicator__pulse" />
            {showCount && (
                <span className="live-indicator__text">
                    {size === 'sm' ? count : label}
                </span>
            )}
        </div>
    );
}

/**
 * LiveIndicatorCompact - Minimal version just showing pulse + number
 */
export function LiveIndicatorCompact({ count = 0 }) {
    if (count === 0) return null;

    return (
        <div className="live-indicator live-indicator--compact">
            <div className="live-indicator__pulse live-indicator__pulse--sm" />
            <span className="live-indicator__count">{count}</span>
        </div>
    );
}

export default memo(LiveIndicator);
