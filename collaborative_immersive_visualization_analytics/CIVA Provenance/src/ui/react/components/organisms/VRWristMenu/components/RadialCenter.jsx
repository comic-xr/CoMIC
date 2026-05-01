/**
 * @file RadialCenter.jsx
 * @description Center button for radial menu (close/back/settings).
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * RadialCenter - Center button in radial menu
 */
const RadialCenter = memo(function RadialCenter({
    icon = 'x',
    label = 'Close',
    onClick,
    isHovered,
    onHover,
    centerX = 100,
    centerY = 100,
    radius = 30,
}) {
    return (
        <g
            className={`radial-center ${isHovered ? 'radial-center--hovered' : ''}`}
            onClick={onClick}
            onPointerEnter={() => onHover?.(true)}
            onPointerLeave={() => onHover?.(false)}
            style={{ cursor: 'pointer' }}
        >
            {/* Center circle */}
            <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill={isHovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                style={{ transition: 'fill 0.15s ease' }}
            />

            {/* Icon */}
            <foreignObject
                x={centerX - 12}
                y={centerY - 12}
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
                    color: 'var(--color-text-primary)',
                }}>
                    <Icon name={icon} size={20} />
                </div>
            </foreignObject>
        </g>
    );
});

RadialCenter.propTypes = {
    /** Center button icon */
    icon: PropTypes.string,
    /** Center button label (for accessibility) */
    label: PropTypes.string,
    /** Click handler */
    onClick: PropTypes.func,
    /** Whether button is hovered */
    isHovered: PropTypes.bool,
    /** Hover handler */
    onHover: PropTypes.func,
    /** Center X coordinate */
    centerX: PropTypes.number,
    /** Center Y coordinate */
    centerY: PropTypes.number,
    /** Button radius */
    radius: PropTypes.number,
};

export { RadialCenter };
export default RadialCenter;
