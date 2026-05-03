// src/ui/react/components/molecules/DirectionalButton/DirectionalButton.jsx
// DirectionalButton molecule - Navigation button for D-pads and navigators

import React, { memo, forwardRef, useRef, useCallback, useEffect } from 'react';
import { IconButton } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './DirectionalButton.scss';

// Direction to icon mapping
const DIRECTION_ICONS = {
    up: 'chevronUp',
    down: 'chevronDown',
    left: 'chevronLeft',
    right: 'chevronRight',
    center: 'home',
};

// Long press delay in ms
const LONG_PRESS_DELAY = 500;

/**
 * DirectionalButton - Navigation button for D-pads and navigators
 *
 * Composed from: IconButton atom
 *
 * Use for:
 * - D-pad controllers
 * - Viewport navigators
 * - Canvas navigators
 * - Any directional navigation control
 *
 * @param {string} direction - Direction: 'up' | 'down' | 'left' | 'right' | 'center'
 * @param {string} icon - Custom icon override (optional)
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {boolean} active - Active/pressed state
 * @param {boolean} disabled - Disabled state
 * @param {function} onClick - Click handler
 * @param {function} onLongPress - Long press handler (optional)
 * @param {string} tooltip - Tooltip text
 * @param {string} className - Additional CSS classes
 */
export const DirectionalButton = memo(forwardRef(function DirectionalButton({
    direction,
    icon,
    size = 'md',
    active = false,
    disabled = false,
    onClick,
    onLongPress,
    tooltip,
    className = '',
    ...props
}, ref) {
    const { isVR } = useAdaptive();
    const longPressTimer = useRef(null);
    const isLongPressing = useRef(false);

    const resolvedIcon = icon || DIRECTION_ICONS[direction] || DIRECTION_ICONS.center;

    const classList = [
        'directional-button',
        `directional-button--${direction}`,
        `directional-button--${size}`,
        active && 'directional-button--active',
        isVR && 'directional-button--vr',
        className,
    ].filter(Boolean).join(' ');

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
            }
        };
    }, []);

    const handleMouseDown = useCallback(() => {
        if (disabled || !onLongPress) return;

        isLongPressing.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressing.current = true;
            onLongPress();
        }, LONG_PRESS_DELAY);
    }, [disabled, onLongPress]);

    const handleMouseUp = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleClick = useCallback((e) => {
        // Don't trigger click if we just did a long press
        if (isLongPressing.current) {
            isLongPressing.current = false;
            return;
        }
        onClick?.(e);
    }, [onClick]);

    return (
        <IconButton
            ref={ref}
            icon={resolvedIcon}
            size={size}
            variant="ghost"
            disabled={disabled}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            tooltip={tooltip || direction}
            className={classList}
            aria-label={tooltip || `Navigate ${direction}`}
            {...props}
        />
    );
}));

export default DirectionalButton;
