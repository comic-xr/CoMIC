// src/ui/react/components/workspace/Canvas/EdgePanels/EdgeTrigger.jsx
// Edge trigger component for revealing floating panels
//
// Thin strip at canvas edges that reveals panel on hover/click

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import './EdgePanels.scss';

/**
 * EdgeTrigger - Hover zone at canvas edges to reveal panels
 *
 * Props:
 * - side: 'left' | 'right'
 * - onClick: Called when trigger is clicked
 * - active: Whether the associated panel is currently visible
 */
export function EdgeTrigger({
    side = 'left',
    onClick,
    active = false,
    className = '',
}) {
    const [hovering, setHovering] = useState(false);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        onClick?.();
    }, [onClick]);

    const isLeft = side === 'left';

    return (
        <div
            className={`edge-trigger edge-trigger--${side} ${hovering ? 'edge-trigger--hovering' : ''} ${active ? 'edge-trigger--active' : ''} ${className}`}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onClick={handleClick}
        >
            <div className="edge-trigger__indicator">
                {hovering && (
                    <Icon
                        name={isLeft ? 'dock_to_right' : 'dock_to_left'}
                        size={14}
                        className="edge-trigger__icon"
                    />
                )}
            </div>
        </div>
    );
}

export default memo(EdgeTrigger);
