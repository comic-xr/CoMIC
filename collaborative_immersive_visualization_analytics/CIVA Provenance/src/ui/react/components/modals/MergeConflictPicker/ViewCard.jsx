/**
 * @file ViewCard.jsx
 * @description Selectable view card component for the merge conflict picker.
 * Shows thumbnail, name, dataset, type, and color accent.
 *
 * Features:
 * - Thumbnail with placeholder fallback
 * - View name and metadata
 * - Color dot showing view accent
 * - Type badge
 * - Selection state with checkmark
 * - Keyboard navigation support
 *
 * @example
 * <ViewCard
 *   view={view}
 *   isSelected={selectedId === view.id}
 *   onClick={() => setSelectedId(view.id)}
 * />
 */

import React, { memo, forwardRef, useCallback } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} ViewOption
 * @property {string} id - View ID
 * @property {string} name - View name
 * @property {string} [thumbnail] - Thumbnail URL
 * @property {string} datasetName - Parent dataset name
 * @property {string} type - View type (e.g., "Volume", "Surface")
 * @property {string} color - View accent color
 */

/**
 * @typedef {Object} ViewCardProps
 * @property {ViewOption} view - View data
 * @property {boolean} isSelected - Whether this card is selected
 * @property {() => void} onClick - Click handler
 * @property {(event: KeyboardEvent) => void} [onKeyDown] - Keyboard handler
 * @property {string} [className] - Additional CSS class
 */

/**
 * View card component for merge conflict picker.
 *
 * @param {ViewCardProps} props - Component props
 * @param {React.Ref} ref - Forwarded ref
 * @returns {React.ReactElement} The rendered component
 */
const ViewCard = forwardRef(function ViewCard(
    {
        view,
        isSelected,
        onClick,
        onKeyDown,
        className = ''
    },
    ref
) {
    /**
     * Handle click
     */
    const handleClick = useCallback(() => {
        onClick();
    }, [onClick]);

    /**
     * Handle keyboard events
     */
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
        if (onKeyDown) {
            onKeyDown(event);
        }
    }, [onClick, onKeyDown]);

    // Build class names
    const cardClassNames = [
        'view-card',
        isSelected && 'view-card--selected',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={ref}
            className={cardClassNames}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${view.name} - ${view.type} from ${view.datasetName}`}
            tabIndex={0}
        >
            {/* Thumbnail */}
            <div className={`view-card__thumbnail ${!view.thumbnail ? 'view-card__thumbnail--placeholder' : ''}`}>
                {view.thumbnail ? (
                    <img src={view.thumbnail} alt={`${view.name} thumbnail`} />
                ) : (
                    <Image size={24} aria-hidden="true" />
                )}
            </div>

            {/* Name */}
            <div className="view-card__name" title={view.name}>
                {view.name}
            </div>

            {/* Metadata */}
            <div className="view-card__meta">
                <span
                    className="view-card__color-dot"
                    style={{ backgroundColor: view.color }}
                    aria-hidden="true"
                />
                <span className="view-card__dataset" title={view.datasetName}>
                    {view.datasetName}
                </span>
            </div>

            {/* Type badge */}
            <div className="view-card__type-badge">
                {view.type}
            </div>

            {/* Selection checkmark */}
            <span className="view-card__check" aria-hidden="true">
                <Icon name="check" size={12} />
            </span>
        </div>
    );
});

export default memo(ViewCard);
export { ViewCard };