/**
 * @file SearchResultItem.jsx
 * @description Individual search result item component.
 * Displays result with type-specific icon, name, description, and project context.
 *
 * @example
 * <SearchResultItem
 *   result={result}
 *   query="mars"
 *   isSelected={index === selectedIndex}
 *   onClick={() => onSelect(result)}
 * />
 */

import React, { memo, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} SearchResult
 * @property {string} id - Unique identifier
 * @property {'project'|'dataset'|'view'|'person'|'annotation'|'room'} type - Result type
 * @property {string} name - Display name
 * @property {string} [description] - Secondary text
 * @property {string} [projectName] - Parent project name
 */

/**
 * @typedef {Object} SearchResultItemProps
 * @property {SearchResult} result - Result data
 * @property {string} [query=''] - Search query for highlighting
 * @property {boolean} [isSelected=false] - Whether item is keyboard-selected
 * @property {() => void} onClick - Click handler
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Type to icon name mapping
 */
const TYPE_ICONS = {
    project: 'folder',
    dataset: 'database',
    view: 'eye',
    person: 'user',
    annotation: 'messageSquare',
    room: 'users',
};

/**
 * Type labels for badge display
 */
const TYPE_LABELS = {
    project: 'Project',
    dataset: 'Dataset',
    view: 'View',
    person: 'Person',
    annotation: 'Annotation',
    room: 'Room',
};

/**
 * Highlight matching text in a string
 * @param {string} text - Text to process
 * @param {string} query - Query to highlight
 * @returns {React.ReactNode}
 */
function highlightMatch(text, query) {
    if (!query || !text) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
        <>
            {before}
            <mark>{match}</mark>
            {after}
        </>
    );
}

/**
 * Individual search result item.
 *
 * @param {SearchResultItemProps} props - Component props
 * @returns {React.ReactElement} The rendered result item
 */
function SearchResultItem({
    result,
    query = '',
    isSelected = false,
    onClick,
    testId
}) {
    const itemRef = useRef(null);
    const iconName = TYPE_ICONS[result.type] || 'folder';

    // Scroll into view when selected via keyboard
    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [isSelected]);

    /**
     * Handle click
     */
    const handleClick = () => {
        onClick();
    };

    /**
     * Handle keyboard selection
     */
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    };

    const classNames = [
        'search-result-item',
        isSelected && 'search-result-item--selected'
    ].filter(Boolean).join(' ');

    const iconClassNames = [
        'search-result-item__icon',
        `search-result-item__icon--${result.type}`
    ].join(' ');

    return (
        <div
            ref={itemRef}
            className={classNames}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            data-result-id={result.id}
            data-testid={testId}
        >
            {/* Type icon */}
            <div className={iconClassNames}>
                <Icon name={iconName} size={18} />
            </div>

            {/* Content */}
            <div className="search-result-item__content">
                {/* Name with highlight */}
                <div className="search-result-item__name">
                    {highlightMatch(result.name, query)}
                </div>

                {/* Meta information */}
                <div className="search-result-item__meta">
                    {/* Type badge */}
                    <span className="search-result-item__type-badge">
                        {TYPE_LABELS[result.type]}
                    </span>

                    {/* Project name (if available) */}
                    {result.projectName && (
                        <>
                            <span className="search-result-item__separator">•</span>
                            <span className="search-result-item__project">
                                {result.projectName}
                            </span>
                        </>
                    )}

                    {/* Description (if available and no project) */}
                    {result.description && !result.projectName && (
                        <>
                            <span className="search-result-item__separator">•</span>
                            <span className="search-result-item__description">
                                {result.description}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Thumbnail (if available) */}
            {result.thumbnail && (
                <div className="search-result-item__thumbnail">
                    <img src={result.thumbnail} alt="" />
                </div>
            )}
        </div>
    );
}

export default memo(SearchResultItem);
export { SearchResultItem, TYPE_ICONS, TYPE_LABELS, highlightMatch };