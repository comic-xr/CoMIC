// =============================================================================
// ICON COMPONENT
// =============================================================================
//
// Universal icon component using Material Symbols SVG paths
// Source: https://fonts.google.com/icons
//
// Usage:
//   <Icon name="settings" />
//   <Icon name="edit" size={24} />
//   <Icon name="delete" className="text-danger" />
//
// =============================================================================

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ICON_REGISTRY, getSymbolName, hasIcon } from './iconRegistry';
import { ICON_PATHS, ICON_VIEWBOX } from './iconPaths';
import './Icon.scss';

/**
 * Get the SVG path for an icon name
 * @param {string} name - Semantic or Material Symbol name
 * @returns {string|null} SVG path data or null
 */
function getIconPath(name) {
    // First check if it's a semantic name in the registry
    const symbolName = hasIcon(name) ? getSymbolName(name) : name;

    // Then get the path
    return ICON_PATHS[symbolName] || null;
}

/**
 * Icon Component
 * 
 * Renders Material Symbols icons as inline SVGs.
 * Supports semantic naming (e.g., "settings") which maps to Material Symbol names.
 * Falls back to help_outline for unknown icons.
 */
const Icon = memo(function Icon({
    name,
    size = 20,
    className = '',
    color,
    title,
    onClick,
    style,
    'aria-hidden': ariaHidden,
    'aria-label': ariaLabel,
    ...props
}) {
    // Get the path, memoized for performance
    const path = useMemo(() => {
        const iconPath = getIconPath(name);
        if (!iconPath) {
            console.warn(`[Icon] Unknown icon: "${name}"`);
            //return ICON_PATHS.help_outline;
            return ICON_PATHS.frame_bug;
        }
        return iconPath;
    }, [name]);

    // Build className
    const iconClassName = useMemo(() => {
        const classes = ['cia-icon'];
        if (className) classes.push(className);
        if (onClick) classes.push('cia-icon--clickable');
        return classes.join(' ');
    }, [className, onClick]);

    // Build inline styles
    const iconStyle = useMemo(() => ({
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        ...(color && { color }),
        ...style,
    }), [size, color, style]);

    // Accessibility: if there's a title/label, it's not decorative
    const isDecorative = !title && !ariaLabel;

    return (
        <svg
            className={iconClassName}
            viewBox={ICON_VIEWBOX}
            fill="currentColor"
            style={iconStyle}
            onClick={onClick}
            role={isDecorative ? 'presentation' : 'img'}
            aria-hidden={ariaHidden ?? isDecorative}
            aria-label={ariaLabel}
            focusable="false"
            {...props}
        >
            {title && <title>{title}</title>}
            <path d={path} />
        </svg>
    );
});

Icon.propTypes = {
    /** Icon name (semantic or Material Symbol name) */
    name: PropTypes.string.isRequired,
    /** Icon size in pixels */
    size: PropTypes.number,
    /** Additional CSS classes */
    className: PropTypes.string,
    /** Icon color (defaults to currentColor) */
    color: PropTypes.string,
    /** Accessible title for the icon */
    title: PropTypes.string,
    /** Click handler (makes icon interactive) */
    onClick: PropTypes.func,
    /** Additional inline styles */
    style: PropTypes.object,
    /** Override aria-hidden */
    'aria-hidden': PropTypes.bool,
    /** Accessible label for screen readers */
    'aria-label': PropTypes.string,
};

Icon.defaultProps = {
    size: 20,
    className: '',
};

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Check if an icon exists
 */
export { hasIcon } from './iconRegistry';

/**
 * Get all available icon names
 */
export { getAvailableIcons, getUsedSymbols } from './iconRegistry';

export default Icon;