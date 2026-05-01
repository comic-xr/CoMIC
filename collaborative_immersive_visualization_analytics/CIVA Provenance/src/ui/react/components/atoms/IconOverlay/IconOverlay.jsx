// =============================================================================
// ICON OVERLAY COMPONENT
// =============================================================================
// Reusable component to overlay two icons to create composite icons
// like "disabled" states (icon with slash through it).
//
// MIGRATED: Now uses centralized Icon system instead of lucide-react
// =============================================================================

import React from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import './IconOverlay.scss';

/**
 * IconOverlay
 * 
 * Overlays two icons to create composite icons like "disabled" states.
 * Useful for showing "icon with slash" without needing separate off-state icons.
 * 
 * @param {string} baseIcon - Base icon name (e.g., "mic", "video", "compass")
 * @param {string} overlayIcon - Overlay icon name (e.g., "slash", "close")
 * @param {number} size - Icon size in pixels
 * @param {string} className - Additional CSS classes
 * @param {string} overlayColor - Color for the overlay icon
 * @param {number} baseOpacity - Opacity for the base icon (0-1)
 */
export function IconOverlay({
    baseIcon,
    overlayIcon = 'slash',
    size = 18,
    className = '',
    overlayColor = 'currentColor',
    baseOpacity = 0.5,
}) {
    return (
        <span
            className={`icon-overlay ${className}`}
            style={{
                width: size,
                height: size,
                fontSize: size,
            }}
        >
            <Icon
                name={baseIcon}
                size={size}
                style={{ opacity: baseOpacity }}
            />
            <span className="overlay-icon" style={{ color: overlayColor }}>
                <Icon name={overlayIcon} size={size} />
            </span>
        </span>
    );
}

/**
 * SlashedIcon
 * 
 * Pre-built slash overlay for common "disabled" state.
 * Shows an icon with a diagonal slash through it.
 * 
 * @param {string} icon - Icon name to slash (e.g., "mic", "video", "compass")
 * @param {number} size - Icon size in pixels
 * @param {string} className - Additional CSS classes
 * 
 * @example
 * <SlashedIcon icon="mic" size={18} />
 * <SlashedIcon icon="compass" size={24} />
 * <SlashedIcon icon="wifi" size={16} />
 */
export function SlashedIcon({
    icon,
    size = 18,
    className = ''
}) {
    return (
        <IconOverlay
            baseIcon={icon}
            overlayIcon="slash"
            size={size}
            className={className}
            baseOpacity={0.5}
        />
    );
}

/**
 * createSlashedIcon
 * 
 * Factory function to create a slashed version of any icon.
 * Returns a component that can be used in icon registries.
 * 
 * @param {string} iconName - Icon name to create slashed version of
 * @returns {React.Component} A component that renders the slashed icon
 * 
 * @example
 * const SlashedCompass = createSlashedIcon('compass');
 * const SlashedGrid = createSlashedIcon('grid');
 * 
 * // Use in ToolbarIconRegistry:
 * 'compass-off': SlashedCompass,
 * 'grid-off': SlashedGrid,
 * 
 * // Use in JSX:
 * <SlashedCompass size={24} />
 */
export function createSlashedIcon(iconName) {
    // Handle both string names and component references
    const name = typeof iconName === 'string' ? iconName : null;

    return function SlashedIconComponent({ size = 18, className = '', ...props }) {
        if (!name) {
            // If passed a component (legacy), try to extract name or show warning
            console.warn('[createSlashedIcon] Expected icon name string, got component. Use icon name instead.');
            return null;
        }

        return (
            <SlashedIcon
                icon={name}
                size={size}
                className={className}
                {...props}
            />
        );
    };
}

/**
 * DisabledIcon
 * 
 * Alternative to SlashedIcon using "disabled" indicator (circle with line).
 * More subtle than a full slash.
 * 
 * @param {string} icon - Icon name
 * @param {number} size - Icon size in pixels
 * @param {string} className - Additional CSS classes
 */
export function DisabledIcon({
    icon,
    size = 18,
    className = ''
}) {
    return (
        <IconOverlay
            baseIcon={icon}
            overlayIcon="disabled"
            size={size}
            className={className}
            baseOpacity={0.4}
        />
    );
}

export default IconOverlay;