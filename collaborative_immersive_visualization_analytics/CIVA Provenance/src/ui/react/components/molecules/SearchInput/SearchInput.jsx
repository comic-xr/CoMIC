// src/ui/react/components/molecules/SearchInput/SearchInput.jsx
// SearchInput molecule - Input with search icon and clear button

import React, { memo, forwardRef, useState, useCallback } from 'react';
import { Icon, Spinner } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './SearchInput.scss';

// Icon sizes by mode
const ICON_SIZES = {
    desktop: { sm: 14, md: 16, lg: 18 },
    vr: { sm: 18, md: 20, lg: 24 },
};

/**
 * SearchInput - Input with search icon and clear button
 *
 * Composed from: Icon atom + Spinner atom
 *
 * Use for:
 * - Search fields
 * - Filter inputs
 * - Command palettes
 * - Quick find inputs
 *
 * @param {string} value - Input value (controlled)
 * @param {function} onChange - Value change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable input
 * @param {boolean} autoFocus - Auto focus on mount
 * @param {string} icon - Custom icon (default: 'search')
 * @param {number} iconSize - Override icon size in pixels
 * @param {boolean} showClear - Show clear button when has value
 * @param {function} onClear - Clear button handler
 * @param {function} onSubmit - Submit handler (Enter key)
 * @param {function} onKeyDown - Keydown handler
 * @param {function} onFocus - Focus handler
 * @param {function} onBlur - Blur handler
 * @param {string} className - Additional CSS classes
 * @param {Object} style - Inline styles for the root element
 */
export const SearchInput = memo(forwardRef(function SearchInput({
    value = '',
    onChange,
    placeholder = 'Search...',
    size = 'md',
    loading = false,
    disabled = false,
    autoFocus = false,
    icon = 'search',
    iconSize,
    showClear = true,
    onClear,
    onSubmit,
    onKeyDown,
    onFocus,
    onBlur,
    className = '',
    style,
    ...props
}, ref) {
    const { isVR, mode } = useAdaptive();
    const [isFocused, setIsFocused] = useState(false);

    const resolvedIconSize = iconSize ?? (ICON_SIZES[mode || 'desktop']?.[size] ?? ICON_SIZES.desktop.md);
    const hasValue = value && value.length > 0;

    const inlineStyle = {
        ...(style || {}),
        ...(resolvedIconSize ? { '--search-input-icon-size': `${resolvedIconSize}px` } : {}),
    };

    const classList = [
        'search-input',
        `search-input--${size}`,
        isFocused && 'search-input--focused',
        disabled && 'search-input--disabled',
        loading && 'search-input--loading',
        isVR && 'search-input--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleChange = useCallback((e) => {
        onChange?.(e.target.value, e);
    }, [onChange]);

    const handleClear = useCallback(() => {
        onChange?.('');
        onClear?.();
    }, [onChange, onClear]);

    const handleKeyDown = useCallback((e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) {
            return;
        }
        if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            onSubmit(value, e);
        }
        if (e.key === 'Escape' && hasValue) {
            e.preventDefault();
            handleClear();
        }
    }, [onKeyDown, onSubmit, value, hasValue, handleClear]);

    const handleFocus = useCallback((e) => {
        setIsFocused(true);
        onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e) => {
        setIsFocused(false);
        onBlur?.(e);
    }, [onBlur]);

    return (
        <div className={classList} style={inlineStyle}>
            <span className="search-input__icon">
                {loading ? (
                    <Spinner size="sm" />
                ) : (
                    <Icon name={icon} size={resolvedIconSize} />
                )}
            </span>

            <input
                ref={ref}
                type="text"
                className="search-input__field"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-label={placeholder}
                {...props}
            />

            {showClear && hasValue && !loading && (
                <button
                    type="button"
                    className="search-input__clear"
                    onClick={handleClear}
                    disabled={disabled}
                    aria-label="Clear search"
                    tabIndex={-1}
                >
                    <Icon name="close" size={resolvedIconSize - 2} />
                </button>
            )}
        </div>
    );
}));

export default SearchInput;
