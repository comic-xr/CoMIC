// src/ui/react/components/molecules/PositionDisplay/PositionDisplay.jsx
// Position Display molecule - shows current position coordinates
//
// Per Atomic Design spec: Composed of Icon, Text (monospace), ColorDot
// Used for: Canvas position indicator, viewport position

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import './PositionDisplay.scss';

/**
 * PositionDisplay - Shows current and optionally home position
 *
 * @param {Object} props
 * @param {Object} props.current - Current position { x, y }
 * @param {Object} [props.home] - Home position { x, y }
 * @param {string} [props.color] - Accent color
 * @param {boolean} [props.showHome] - Show home position
 * @param {boolean} [props.showIcon] - Show position icon
 * @param {string} [props.size='md'] - Size variant
 * @param {string} [props.className] - Additional CSS classes
 */
export const PositionDisplay = memo(function PositionDisplay({
    current,
    home,
    color,
    showHome = false,
    showIcon = true,
    size = 'md',
    className = '',
}) {
    const isAtHome = home && current.x === home.x && current.y === home.y;

    const classList = [
        'position-display',
        `position-display--${size}`,
        isAtHome && 'position-display--at-home',
        className,
    ].filter(Boolean).join(' ');

    const formatCoord = (value) => {
        return String(value).padStart(2, ' ');
    };

    return (
        <div className={classList}>
            {showIcon && (
                <Icon
                    name={isAtHome ? 'home' : 'navigation'}
                    size={size === 'sm' ? 12 : 14}
                    className="position-display__icon"
                />
            )}

            {color && (
                <ColorDot color={color} size={size === 'sm' ? 6 : 8} />
            )}

            <span className="position-display__coords">
                <span className="position-display__value">{formatCoord(current.x)}</span>
                <span className="position-display__separator">,</span>
                <span className="position-display__value">{formatCoord(current.y)}</span>
            </span>

            {showHome && home && !isAtHome && (
                <span className="position-display__home">
                    <Icon name="arrowRight" size={10} />
                    <span className="position-display__home-coords">
                        {home.x},{home.y}
                    </span>
                </span>
            )}

            {isAtHome && (
                <span className="position-display__home-badge">
                    HOME
                </span>
            )}
        </div>
    );
});

export default PositionDisplay;
