/**
 * @file StackedNavBlock.jsx
 * @description Compact 2-column navigation block for canvas navigation.
 * Lives in shared bars/ folder so it can be used in either header or footer.
 * 
 * Layout:
 * ┌──────┬─────────────────┐
 * │  ⌂   │     12, 34      │  ← Position with background
 * ├──────┤  ◀  ▲  ▼  ▶    │  ← D-pad centered below
 * │  ☆   │                 │
 * └──────┴─────────────────┘
 * 
 * @example
 * <StackedNavBlock
 *   position={{ col: 0, row: 0 }}
 *   isAtOrigin={true}
 *   onNavigate={handleNavigate}
 *   onHome={handleHome}
 *   onBookmark={handleBookmark}
 * />
 */

import React, { useState, useCallback, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';

import './StackedNavBlock.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

export const NAV_DIRECTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Individual navigation button within the block.
 */
const NavButton = memo(function NavButton({
    id,
    icon,
    label,
    active = false,
    accent,
    onClick,
}) {
    const [hovered, setHovered] = useState(false);

    const handleClick = useCallback(() => {
        onClick?.(id);
    }, [id, onClick]);

    return (
        <button
            type="button"
            className={`stacked-nav-block__btn ${active ? 'stacked-nav-block__btn--active' : ''}`}
            style={{ '--btn-accent': accent }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleClick}
            title={label}
            aria-label={label}
            data-hovered={hovered}
        >
            <Icon name={icon} size={14} />
        </button>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Stacked navigation block with quick-jump actions and D-pad controls.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.position] - Current canvas position { col, row }
 * @param {boolean} [props.isAtOrigin] - Whether currently at origin (0,0)
 * @param {Function} [props.onNavigate] - Callback for D-pad navigation (direction)
 * @param {Function} [props.onHome] - Callback for Home button
 * @param {Function} [props.onBookmark] - Callback for Bookmark button
 * @param {string} [props.className] - Additional CSS class
 */
function StackedNavBlock({
    position = { row: 0, col: 0 },
    isAtOrigin = true,
    onNavigate,
    onHome,
    onBookmark,
    className = '',
}) {
    // Format position for display
    const positionText = formatGridPosition(position.col, position.row);

    // Handle D-pad navigation
    const handleNavigate = useCallback((direction) => {
        onNavigate?.(direction);
    }, [onNavigate]);

    return (
        <div className={`stacked-nav-block ${className}`}>
            {/* Left column: Quick Jump (Home & Bookmark stacked) */}
            <div className="stacked-nav-block__quick-jump">
                <NavButton
                    id="home"
                    icon="home"
                    label="Go to Origin (A1)"
                    active={isAtOrigin}
                    accent="var(--color-accent-amber)"
                    onClick={onHome}
                />
                <NavButton
                    id="bookmark"
                    icon="bookmark"
                    label="Saved Positions"
                    onClick={onBookmark}
                />
            </div>

            {/* Right column: Position above D-pad */}
            <div className="stacked-nav-block__navigation">
                {/* Position display */}
                <div className="stacked-nav-block__position">
                    {positionText}
                </div>

                {/* D-pad row */}
                <div className="stacked-nav-block__dpad">
                    <NavButton
                        id={NAV_DIRECTIONS.LEFT}
                        icon="chevronLeft"
                        label="Pan Left"
                        onClick={() => handleNavigate(NAV_DIRECTIONS.LEFT)}
                    />
                    <NavButton
                        id={NAV_DIRECTIONS.UP}
                        icon="chevronUp"
                        label="Pan Up"
                        onClick={() => handleNavigate(NAV_DIRECTIONS.UP)}
                    />
                    <NavButton
                        id={NAV_DIRECTIONS.DOWN}
                        icon="chevronDown"
                        label="Pan Down"
                        onClick={() => handleNavigate(NAV_DIRECTIONS.DOWN)}
                    />
                    <NavButton
                        id={NAV_DIRECTIONS.RIGHT}
                        icon="chevronRight"
                        label="Pan Right"
                        onClick={() => handleNavigate(NAV_DIRECTIONS.RIGHT)}
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(StackedNavBlock);
export { StackedNavBlock };
