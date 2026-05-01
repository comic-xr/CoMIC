// src/ui/react/components/atoms/Divider/Divider.jsx
// Divider atom - visual separator

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './Divider.scss';

/**
 * Divider - Visual separator
 *
 * Use for:
 * - Section separators
 * - Menu dividers
 * - Content breaks
 *
 * @param {string} orientation - 'horizontal' | 'vertical'
 * @param {string} spacing - Spacing around divider: 'none' | 'sm' | 'md' | 'lg'
 * @param {string} label - Optional centered label text
 * @param {string} className - Additional CSS classes
 */
export const Divider = memo(function Divider({
    orientation = 'horizontal',
    spacing = 'md',
    label,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const classList = [
        'divider',
        `divider--${orientation}`,
        `divider--spacing-${spacing}`,
        label && 'divider--with-label',
        isVR && 'divider--vr',
        className,
    ].filter(Boolean).join(' ');

    if (label) {
        return (
            <div className={classList} role="separator">
                <span className="divider__line" />
                <span className="divider__label">{label}</span>
                <span className="divider__line" />
            </div>
        );
    }

    return (
        <div className={classList} role="separator">
            <span className="divider__line" />
        </div>
    );
});

export default Divider;
