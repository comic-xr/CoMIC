/**
 * @file SearchInput.jsx
 * @description Search input component for the GlobalSearchModal.
 * Features auto-focus, clear button, and keyboard shortcut hint.
 *
 * @example
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   onKeyDown={handleKeyDown}
 *   isLoading={isLoading}
 * />
 */

import React, { memo, useEffect, useRef, useCallback } from 'react';
import { SearchInput as BaseSearchInput } from '@UI/react/components/molecules/SearchInput';

/**
 * @typedef {Object} SearchInputProps
 * @property {string} value - Current input value
 * @property {(value: string) => void} onChange - Value change handler
 * @property {(event: React.KeyboardEvent) => void} [onKeyDown] - Keyboard event handler
 * @property {boolean} [isLoading=false] - Show loading indicator
 * @property {boolean} [autoFocus=true] - Auto-focus on mount
 * @property {string} [placeholder] - Input placeholder text
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Search input with icon, loading indicator, and clear button.
 *
 * @param {SearchInputProps} props - Component props
 * @returns {React.ReactElement} The rendered search input
 */
function SearchInput({
    value,
    onChange,
    onKeyDown,
    isLoading = false,
    autoFocus = true,
    placeholder = 'Search projects, datasets, views...',
    testId
}) {
    const inputRef = useRef(null);

    // Auto-focus on mount
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            // Small delay to ensure modal animation is complete
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    /**
     * Handle clear button click
     */
    const handleClear = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    /**
     * Handle keyboard events
     */
    const handleInputKeyDown = useCallback((event) => {
        // Don't propagate Escape if we're going to clear the input
        if (event.key === 'Escape' && value) {
            event.stopPropagation();
            event.preventDefault();
            handleClear();
            onChange('');
            return;
        }

        onKeyDown?.(event);
    }, [value, handleClear, onChange, onKeyDown]);

    return (
        <div className="global-search__input-wrapper">
            <BaseSearchInput
                ref={inputRef}
                className="global-search__input"
                value={value}
                onChange={onChange}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                size="md"
                loading={isLoading}
                onClear={handleClear}
                autoFocus={autoFocus}
                role="combobox"
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-label="Search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid={testId}
            />

            {/* Keyboard shortcut hint */}
            <div className="global-search__shortcut-hint">
                <kbd className="kbd">Esc</kbd>
                <span>to close</span>
            </div>
        </div>
    );
}

export default memo(SearchInput);
export { SearchInput };
