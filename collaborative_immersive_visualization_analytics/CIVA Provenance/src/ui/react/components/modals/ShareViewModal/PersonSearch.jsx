/**
 * @file PersonSearch.jsx
 * @description Autocomplete search input for finding and adding people to share with.
 * Filters project members, shows avatar/name/email, and supports keyboard navigation.
 *
 * Features:
 * - Debounced search input (300ms)
 * - Filters out already-shared users
 * - Shows avatar with initials fallback
 * - Full keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close results
 *
 * @example
 * <PersonSearch
 *   users={projectMembers}
 *   excludeIds={currentSharees.map(s => s.id)}
 *   onSelect={(user, permission) => addSharee(user, permission)}
 *   placeholder="Add people or groups..."
 * />
 */

import React, { memo, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} [avatar] - Avatar URL
 */

/**
 * @typedef {Object} PersonSearchProps
 * @property {User[]} users - Available users to search
 * @property {string[]} excludeIds - User IDs to exclude from results
 * @property {(user: User, permission: string) => void} onSelect - Called when user selected
 * @property {string} [placeholder] - Search placeholder
 * @property {boolean} [disabled] - Disable the search input
 * @property {string} [className] - Additional CSS class
 */

/**
 * Get user initials from name
 * @param {string} name - User name
 * @returns {string} Initials (1-2 characters)
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Debounce hook
 * @param {string} value - Value to debounce
 * @param {number} delay - Delay in ms
 * @returns {string} Debounced value
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Person search autocomplete component.
 *
 * @param {PersonSearchProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
function PersonSearch({
    users = [],
    excludeIds = [],
    onSelect,
    placeholder = 'Add people or groups...',
    disabled = false,
    className = ''
}) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const resultsRef = useRef(null);

    // Debounce the search query
    const debouncedQuery = useDebounce(query, 300);

    /**
     * Filter users based on query and exclusions
     */
    const filteredUsers = useMemo(() => {
        // Filter out excluded users
        const available = users.filter(user => !excludeIds.includes(user.id));

        // If no query, return all available
        if (!debouncedQuery.trim()) {
            return available;
        }

        // Filter by query
        const lowerQuery = debouncedQuery.toLowerCase();
        return available.filter(user =>
            user.name.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery)
        );
    }, [users, excludeIds, debouncedQuery]);

    /**
     * Handle input change
     */
    const handleInputChange = useCallback((event) => {
        setQuery(event.target.value);
        setIsOpen(true);
        setFocusedIndex(-1);
    }, []);

    /**
     * Handle input focus
     */
    const handleInputFocus = useCallback(() => {
        setIsOpen(true);
    }, []);

    /**
     * Handle user selection
     */
    const handleSelect = useCallback((user) => {
        onSelect(user, 'viewer'); // Default permission
        setQuery('');
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.focus();
    }, [onSelect]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((event) => {
        if (!isOpen) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev + 1;
                    return next >= filteredUsers.length ? 0 : next;
                });
                break;

            case 'ArrowUp':
                event.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev - 1;
                    return next < 0 ? filteredUsers.length - 1 : next;
                });
                break;

            case 'Enter':
                event.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredUsers.length) {
                    handleSelect(filteredUsers[focusedIndex]);
                }
                break;

            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                setFocusedIndex(-1);
                break;

            case 'Tab':
                setIsOpen(false);
                break;

            default:
                break;
        }
    }, [isOpen, focusedIndex, filteredUsers, handleSelect]);

    /**
     * Click outside handler
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setFocusedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    /**
     * Scroll focused option into view
     */
    useEffect(() => {
        if (focusedIndex >= 0 && resultsRef.current) {
            const focusedElement = resultsRef.current.children[focusedIndex];
            if (focusedElement) {
                focusedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedIndex]);

    // Show results dropdown when open and there are users to show or a query
    const showResults = isOpen && (filteredUsers.length > 0 || debouncedQuery.trim());

    // Build class names
    const containerClassNames = [
        'person-search',
        disabled && 'person-search--disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <div ref={containerRef} className={containerClassNames}>
            {/* Search input */}
            <div className="person-search__input-wrapper">
                <Search size={16} className="person-search__icon" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    className="person-search__input"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showResults}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-label="Search for people to add"
                />
            </div>

            {/* Results dropdown */}
            {showResults && (
                <div
                    ref={resultsRef}
                    className="person-search__results"
                    role="listbox"
                    aria-label="Search results"
                >
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user, index) => (
                            <div
                                key={user.id}
                                className={`person-search__result ${index === focusedIndex ? 'person-search__result--focused' : ''}`}
                                role="option"
                                aria-selected={index === focusedIndex}
                                onClick={() => handleSelect(user)}
                                onMouseEnter={() => setFocusedIndex(index)}
                            >
                                <div className="person-search__result__avatar">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="" />
                                    ) : (
                                        getInitials(user.name)
                                    )}
                                </div>
                                <div className="person-search__result__info">
                                    <div className="person-search__result__name">{user.name}</div>
                                    <div className="person-search__result__email">{user.email}</div>
                                </div>
                                <UserPlus size={16} className="person-search__result__add-icon" />
                            </div>
                        ))
                    ) : (
                        <div className="person-search__no-results">
                            No matching people found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default memo(PersonSearch);
export { PersonSearch, getInitials };