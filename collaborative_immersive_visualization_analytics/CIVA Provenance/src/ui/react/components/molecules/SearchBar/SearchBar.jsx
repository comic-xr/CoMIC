/**
 * @file SearchBar.jsx
 * @description Reusable search bar component for panel content filtering.
 * Provides consistent styling across all tabs with optional clear button.
 *
 * @example
 * <SearchBar
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search files..."
 * />
 */

import React, { memo } from 'react';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import './SearchBar.scss';

/**
 * SearchBar - Consistent search input for panels and tabs
 *
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {function} props.onChange - Callback when value changes (receives string)
 * @param {string} [props.placeholder='Search...'] - Placeholder text
 * @param {string} [props.className] - Additional CSS class
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {boolean} [props.autoFocus] - Whether to auto-focus on mount
 * @param {number} [props.iconSize=12] - Size of search/clear icons
 * @param {'default' | 'compact' | 'inline'} [props.variant='default'] - Style variant
 */
function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    className = '',
    disabled = false,
    autoFocus = false,
    iconSize = 12,
    variant = 'default',
    style = {},
}) {
    return (
        <div
            className={`search-bar search-bar--${variant} ${className}`}
            style={{ '--search-bar-icon-size': `${iconSize}px`, ...style }}
        >
            <SearchInput
                className="search-bar__input"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                size="sm"
                iconSize={iconSize}
            />
        </div>
    );
}

export default memo(SearchBar);
export { SearchBar };
