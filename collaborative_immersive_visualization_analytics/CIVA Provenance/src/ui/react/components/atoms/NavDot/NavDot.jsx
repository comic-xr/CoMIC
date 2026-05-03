// src/ui/react/components/atoms/NavDot/NavDot.jsx
// NavDot atom - Navigation dot for section navigation

import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './NavDot.scss';

// Size mappings
const SIZE_MAP = {
    sm: { collapsed: 8, expanded: 18 },
    md: { collapsed: 10, expanded: 22 },
    lg: { collapsed: 12, expanded: 26 },
};

const SIZE_MAP_VR = {
    sm: { collapsed: 12, expanded: 24 },
    md: { collapsed: 14, expanded: 28 },
    lg: { collapsed: 16, expanded: 32 },
};

/**
 * NavDot - Navigation indicator dot for section navigation
 *
 * Use for:
 * - Section navigation indicators
 * - Progress/position markers
 * - Jump-to navigation
 *
 * @param {string} icon - Icon name to display when expanded
 * @param {string} label - Label for tooltip
 * @param {string} color - CSS color value
 * @param {boolean} isActive - Whether this dot is the current/active section
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export const NavDot = memo(function NavDot({
    icon,
    label,
    color = '#888',
    isActive = false,
    size = 'md',
    onClick,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const [isHovered, setIsHovered] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const dotRef = React.useRef(null);

    // Determine if expanded (active or hovered)
    const isExpanded = isActive || isHovered;

    // Get sizes based on mode
    const sizeMap = isVR ? SIZE_MAP_VR : SIZE_MAP;
    const { collapsed, expanded } = sizeMap[size] ?? sizeMap.md;
    const dotSize = isExpanded ? expanded : collapsed;
    const iconSize = Math.round(expanded * 0.5);

    const handleMouseEnter = () => {
        setIsHovered(true);
        // Calculate tooltip position
        if (dotRef.current) {
            const rect = dotRef.current.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
            });
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const handleClick = (e) => {
        // Remove focus from clicked element to prevent focus ring
        e.currentTarget.blur();
        onClick?.(e);
    };

    const classList = [
        'nav-dot',
        isActive && 'nav-dot--active',
        isExpanded && 'nav-dot--expanded',
        isVR && 'nav-dot--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = {
        width: `${dotSize}px`,
        height: `${dotSize}px`,
        backgroundColor: color,
        '--dot-color': color,
    };

    // Show tooltip when hovered but not active
    const showTooltip = isHovered && !isActive && label;

    return (
        <div
            className="nav-dot__container"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                ref={dotRef}
                type="button"
                className={classList}
                style={style}
                onClick={handleClick}
                tabIndex={-1}
                aria-label={label}
                aria-current={isActive ? 'true' : undefined}
            >
                {isExpanded && icon && (
                    <Icon
                        name={icon}
                        size={iconSize}
                        className="nav-dot__icon"
                    />
                )}
            </button>

            {/* Portal tooltip */}
            {showTooltip && createPortal(
                <div
                    className="nav-dot__tooltip"
                    style={{
                        top: tooltipPosition.top,
                        left: tooltipPosition.left,
                    }}
                >
                    {label}
                    <div className="nav-dot__tooltip-arrow" />
                </div>,
                document.body
            )}
        </div>
    );
});

export default NavDot;
