// src/ui/react/components/atoms/Spinner/Spinner.jsx
// Spinner atom - loading indicator

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './Spinner.scss';

// Size mappings
const SIZE_MAP = {
    sm: { desktop: 16, vr: 20 },
    md: { desktop: 24, vr: 32 },
    lg: { desktop: 32, vr: 40 },
};

/**
 * Spinner - Loading indicator
 *
 * Use for:
 * - Loading states
 * - Async operations
 * - Button loading states
 *
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {string} color - Spinner color
 * @param {string} className - Additional CSS classes
 */
export const Spinner = memo(function Spinner({
    size = 'md',
    color,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const spinnerSize = SIZE_MAP[size]?.[isVR ? 'vr' : 'desktop'] ?? SIZE_MAP.md.desktop;

    const classList = [
        'spinner',
        `spinner--${size}`,
        isVR && 'spinner--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = {
        width: `${spinnerSize}px`,
        height: `${spinnerSize}px`,
        ...(color && { borderTopColor: color }),
    };

    return (
        <span
            className={classList}
            style={style}
            role="status"
            aria-label="Loading"
        />
    );
});

export default Spinner;
