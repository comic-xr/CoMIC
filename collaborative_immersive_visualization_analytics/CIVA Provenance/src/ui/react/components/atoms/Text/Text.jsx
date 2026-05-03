// src/ui/react/components/atoms/Text/Text.jsx
// Text atom - typography component

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import './Text.scss';

/**
 * Text - Typography component
 *
 * Use for:
 * - Consistent text styling
 * - Labels, titles, captions
 * - Body text
 *
 * @param {React.ReactNode} children - Text content
 * @param {string} variant - Style variant: 'label' | 'body' | 'caption' | 'title' | 'mono'
 * @param {string} color - Color: 'primary' | 'secondary' | 'muted' | 'accent' | CSS color
 * @param {string} weight - Font weight: 'normal' | 'medium' | 'semibold' | 'bold'
 * @param {string} size - Size override: 'sm' | 'md' | 'lg'
 * @param {boolean} uppercase - Transform to uppercase
 * @param {boolean} truncate - Truncate with ellipsis
 * @param {string} as - HTML element to render as
 * @param {string} className - Additional CSS classes
 */
export const Text = memo(function Text({
    children,
    variant = 'body',
    color = 'primary',
    weight,
    size,
    uppercase = false,
    truncate = false,
    as: Component = 'span',
    className = '',
    ...props
}) {
    const { isVR } = useAdaptive();

    // Color mapping
    const colorClass = ['primary', 'secondary', 'muted', 'accent'].includes(color)
        ? `text--color-${color}`
        : '';

    const customColor = colorClass ? undefined : color;

    const classList = [
        'text',
        `text--${variant}`,
        colorClass,
        weight && `text--weight-${weight}`,
        size && `text--size-${size}`,
        uppercase && 'text--uppercase',
        truncate && 'text--truncate',
        isVR && 'text--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = customColor ? { color: customColor } : undefined;

    return (
        <Component className={classList} style={style} {...props}>
            {children}
        </Component>
    );
});

export default Text;
