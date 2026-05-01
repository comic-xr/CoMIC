// src/ui/react/components/molecules/LabeledButton/LabeledButton.jsx
// LabeledButton molecule - Icon button with visible text label

import React, { memo, forwardRef } from 'react';
import { Button } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './LabeledButton.scss';

/**
 * LabeledButton - Button with icon and visible label
 *
 * Composed from: Button atom
 *
 * Use for:
 * - Footer action buttons
 * - Toolbar buttons with labels
 * - ScratchPad controls
 * - Any action that benefits from a visible label
 *
 * @param {string} icon - Icon name from registry
 * @param {string} label - Button label text
 * @param {boolean} active - Active/selected state
 * @param {string} accent - Accent color override
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {string} variant - Button variant: 'ghost' | 'secondary' | 'primary'
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export const LabeledButton = memo(forwardRef(function LabeledButton({
    icon,
    label,
    active = false,
    accent,
    size = 'md',
    variant = 'ghost',
    disabled = false,
    loading = false,
    onClick,
    className = '',
    ...props
}, ref) {
    const { isVR } = useAdaptive();

    const classList = [
        'labeled-button',
        `labeled-button--${size}`,
        active && 'labeled-button--active',
        isVR && 'labeled-button--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = accent ? { '--labeled-button-accent': accent } : undefined;

    return (
        <Button
            ref={ref}
            icon={icon}
            variant={variant}
            size={size}
            disabled={disabled}
            loading={loading}
            onClick={onClick}
            className={classList}
            style={style}
            {...props}
        >
            {label}
        </Button>
    );
}));

export default LabeledButton;
