/**
 * @file Button.jsx
 * @description Adaptive button component for CIA Web.
 * Provides consistent button styling across the entire application,
 * supporting both desktop and VR modes.
 *
 * Features:
 * - Adaptive sizing for desktop/VR modes
 * - Multiple variants: primary, secondary, danger, ghost, link
 * - Three sizes: sm, md, lg (scaled for VR)
 * - Loading state with spinner
 * - Icon support (left and right positions)
 * - VR mode: larger touch targets, always-visible labels
 * - Full accessibility support
 *
 * @example
 * // Primary button with icon
 * <Button variant="primary" icon="save" onClick={handleSave}>
 *   Save Changes
 * </Button>
 *
 * @example
 * // VR mode button
 * <Button mode="vr" variant="primary" icon="save">
 *   Save
 * </Button>
 */

import React, { forwardRef, memo, useCallback } from 'react';
import { Icon, IconLoader } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './Button.scss';

/**
 * Icon sizes mapped to button sizes and modes
 */
const BUTTON_ICON_SIZES = {
    desktop: { sm: 14, md: 16, lg: 18 },
    vr: { sm: 20, md: 24, lg: 28 },
};

/**
 * Adaptive Button component with VR support.
 * Uses forwardRef for focus management integration.
 */
const Button = forwardRef(function Button(
    {
        children,
        variant = 'primary',
        size = 'md',
        mode: modeProp,  // Optional override for context
        icon,
        iconRight,
        iconOnly = false,
        loading = false,
        disabled = false,
        fullWidth = false,
        type = 'button',
        className = '',
        onClick,
        tooltip,
        testId,
        ...props
    },
    ref
) {
    // Get adaptive context (with fallback)
    const adaptive = useAdaptive();
    const mode = modeProp || adaptive.mode || 'desktop';
    const isVR = mode === 'vr';

    // Determine if button should be disabled
    const isDisabled = disabled || loading;

    // Get icon size based on button size and mode
    const iconSize = BUTTON_ICON_SIZES[mode]?.[size] || BUTTON_ICON_SIZES.desktop[size];

    // Build class names
    const classNames = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        isVR && 'btn--vr',
        fullWidth && 'btn--full-width',
        loading && 'btn--loading',
        isDisabled && 'btn--disabled',
        iconOnly && !isVR && 'btn--icon-only',  // VR always shows labels
        className
    ].filter(Boolean).join(' ');

    /**
     * Handle click events.
     * Prevents click when loading or disabled.
     */
    const handleClick = useCallback((event) => {
        if (isDisabled) {
            event.preventDefault();
            return;
        }
        if (onClick) {
            onClick(event);
        }
    }, [isDisabled, onClick]);

    /**
     * Handle keyboard events for accessibility.
     */
    const handleKeyDown = useCallback((event) => {
        if (isDisabled) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (onClick) {
                onClick(event);
            }
        }
    }, [isDisabled, onClick]);

    // In VR mode, always show label if we have an icon and children
    const showLabel = !iconOnly || isVR;

    return (
        <button
            ref={ref}
            type={type}
            className={classNames}
            disabled={isDisabled}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-busy={loading}
            aria-disabled={isDisabled}
            title={tooltip}
            data-testid={testId}
            {...props}
        >
            {/* Loading spinner */}
            {loading && (
                <IconLoader className="btn__spinner" size={iconSize} aria-hidden={true} />
            )}

            {/* Left icon */}
            {!loading && icon && (
                <Icon name={icon} size={iconSize} className="btn__icon btn__icon--left" aria-hidden={true} />
            )}

            {/* Button label */}
            {children && showLabel && (
                <span className="btn__label">{children}</span>
            )}

            {/* Right icon */}
            {!loading && iconRight && (
                <Icon name={iconRight} size={iconSize} className="btn__icon btn__icon--right" aria-hidden={true} />
            )}
        </button>
    );
});

// Memoize to prevent unnecessary re-renders
export default memo(Button);
export { Button };
