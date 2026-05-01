// src/ui/react/components/atoms/ColorDot/ColorDot.jsx
// ColorDot atom - arbitrary color indicator

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './ColorDot.scss';

// Size mappings
const SIZE_MAP = {
    sm: { desktop: 8, vr: 10 },
    md: { desktop: 10, vr: 14 },
    lg: { desktop: 12, vr: 18 },
};

/**
 * ColorDot - Arbitrary color indicator dot
 *
 * Use for:
 * - Dataset color indicators
 * - View color markers
 * - Category indicators
 *
 * @param {string} color - CSS color value
 * @param {string|number} size - Size: 'sm' | 'md' | 'lg' or number in pixels
 * @param {boolean} glow - Add glow effect
 * @param {boolean} border - Add border
 * @param {string} className - Additional CSS classes
 */
export const ColorDot = memo(function ColorDot({
    color = '#888',
    size = 'md',
    glow = false,
    border = false,
    className = '',
}) {
    const { isVR } = useAdaptive();

    // Get size - either from map or use number directly
    let dotSize;
    if (typeof size === 'number') {
        dotSize = size;
    } else {
        dotSize = SIZE_MAP[size]?.[isVR ? 'vr' : 'desktop'] ?? SIZE_MAP.md.desktop;
    }

    const classList = [
        'color-dot',
        glow && 'color-dot--glow',
        border && 'color-dot--border',
        isVR && 'color-dot--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = {
        width: `${dotSize}px`,
        height: `${dotSize}px`,
        backgroundColor: color,
        '--dot-color': color,
    };

    return (
        <span
            className={classList}
            style={style}
            aria-hidden="true"
        />
    );
});

export default ColorDot;
