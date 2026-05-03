/**
 * @file DropdownSelect.jsx
 * @description Select input component with dropdown options.
 * Supports single/multi-select, search filtering, and clearable values.
 *
 * Features:
 * - Single and multiple selection modes
 * - Searchable/filterable options
 * - Clearable selected values
 * - Grouped options support
 * - Tag display for multi-select
 * - Full keyboard navigation
 * - Form field styling integration
 *
 * @example
 * // Single select
 * <DropdownSelect
 *   options={[
 *     { value: 'viewer', label: 'Viewer' },
 *     { value: 'member', label: 'Member' },
 *     { value: 'admin', label: 'Admin' }
 *   ]}
 *   value={role}
 *   onChange={setRole}
 *   placeholder="Select role..."
 * />
 *
 * @example
 * // Multi-select with search
 * <DropdownSelect
 *   options={users}
 *   value={selectedUsers}
 *   onChange={setSelectedUsers}
 *   multiple
 *   searchable
 *   clearable
 *   placeholder="Add users..."
 * />
 *
 * @example
 * // With icons and groups
 * <DropdownSelect
 *   options={[
 *     { value: 'bug', label: 'Bug', icon: Bug, group: 'Issue Type' },
 *     { value: 'feature', label: 'Feature', icon: Sparkles, group: 'Issue Type' },
 *     { value: 'high', label: 'High', group: 'Priority' },
 *     { value: 'low', label: 'Low', group: 'Priority' }
 *   ]}
 *   value={type}
 *   onChange={setType}
 * />
 */

import React, {
    memo,
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
    isValidElement
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, IconChevronDown, IconClose, IconCheck } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { useDropdown } from './useDropdown';
import './Dropdown.scss';

/**
 * @typedef {Object} SelectOption
 * @property {string} value - Option value
 * @property {string} label - Display label
 * @property {React.ComponentType} [icon] - Optional icon component
 * @property {boolean} [disabled=false] - Disable option
 * @property {string} [group] - Group name for grouped options
 */

/**
 * @typedef {Object} DropdownSelectProps
 * @property {SelectOption[]} options - Available options
 * @property {string|string[]} [value] - Selected value(s)
 * @property {(value: string|string[]) => void} onChange - Value change handler
 * @property {string} [placeholder='Select...'] - Placeholder text
 * @property {boolean} [multiple=false] - Allow multiple selection
 * @property {boolean} [searchable=false] - Show search input
 * @property {boolean} [clearable=false] - Show clear button
 * @property {boolean} [disabled=false] - Disable select
 * @property {string} [error] - Error message
 * @property {'sm'|'md'|'lg'} [size='md'] - Select size
 * @property {boolean} [fullWidth=false] - Expand to full width
 * @property {string} [className] - Additional CSS classes
 * @property {string} [testId] - Data-testid for testing
 * @property {string} [name] - Form field name
 * @property {string} [id] - Element ID
 */

/**
 * Dropdown select input component.
 *
 * @param {DropdownSelectProps} props - Component props
 * @returns {React.ReactElement} The rendered select
 */
function DropdownSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    multiple = false,
    searchable = false,
    clearable = false,
    disabled = false,
    error,
    size = 'md',
    fullWidth = false,
    className = '',
    testId,
    name,
    id
}) {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Animation state
    const [isExiting, setIsExiting] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const exitTimeoutRef = useRef(null);

    // Refs
    const searchInputRef = useRef(null);
    const optionsRef = useRef([]);

    // Use dropdown hook
    const {
        isOpen,
        isPositioned,
        open,
        close: hookClose,
        toggle,
        triggerRef,
        dropdownRef,
        position,
        triggerWidth,
        dropdownId
    } = useDropdown({
        placement: 'bottom-start',
        offset: 4,
        matchTriggerWidth: true,
        closeOnClickOutside: true,
        closeOnEscape: true
    });

    /**
     * Close with exit animation
     */
    const close = useCallback(() => {
        setIsExiting(true);
        exitTimeoutRef.current = setTimeout(() => {
            setIsExiting(false);
            hookClose();
            setSearchQuery('');
            setFocusedIndex(-1);
        }, 75);
    }, [hookClose]);

    // Handle render state based on isOpen
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
                exitTimeoutRef.current = null;
            }
            setIsExiting(false);
        } else if (!isExiting) {
            setShouldRender(false);
        }
    }, [isOpen, isExiting]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen, searchable]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Get selected values as array
     */
    const selectedValues = useMemo(() => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }, [value]);

    /**
     * Get selected options
     */
    const selectedOptions = useMemo(() => {
        return options.filter(opt => selectedValues.includes(opt.value));
    }, [options, selectedValues]);

    /**
     * Filter options by search query
     */
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;

        const query = searchQuery.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(query) ||
            opt.value.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

    /**
     * Group filtered options
     */
    const groupedOptions = useMemo(() => {
        const groups = new Map();
        const ungrouped = [];

        filteredOptions.forEach(option => {
            if (option.group) {
                if (!groups.has(option.group)) {
                    groups.set(option.group, []);
                }
                groups.get(option.group).push(option);
            } else {
                ungrouped.push(option);
            }
        });

        return { groups, ungrouped };
    }, [filteredOptions]);

    /**
     * Flat list of focusable options
     */
    const focusableOptions = useMemo(() => {
        return filteredOptions.filter(opt => !opt.disabled);
    }, [filteredOptions]);

    /**
     * Check if option is selected
     */
    const isSelected = useCallback((optionValue) => {
        return selectedValues.includes(optionValue);
    }, [selectedValues]);

    /**
     * Handle option selection
     */
    const handleSelect = useCallback((option) => {
        if (option.disabled) return;

        if (multiple) {
            const newValues = isSelected(option.value)
                ? selectedValues.filter(v => v !== option.value)
                : [...selectedValues, option.value];
            onChange(newValues);
        } else {
            onChange(option.value);
            close();
        }

        // Clear search after selection
        setSearchQuery('');
    }, [multiple, isSelected, selectedValues, onChange, close]);

    /**
     * Handle removing a tag in multi-select
     */
    const handleRemoveTag = useCallback((optionValue, event) => {
        event.stopPropagation();
        const newValues = selectedValues.filter(v => v !== optionValue);
        onChange(newValues);
    }, [selectedValues, onChange]);

    /**
     * Handle clear all
     */
    const handleClear = useCallback((event) => {
        event.stopPropagation();
        onChange(multiple ? [] : '');
        setSearchQuery('');
    }, [multiple, onChange]);

    /**
     * Handle trigger click
     */
    const handleTriggerClick = useCallback((event) => {
        if (disabled) return;
        toggle();
    }, [disabled, toggle]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((event) => {
        if (disabled) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    open();
                } else {
                    setFocusedIndex(prev => {
                        const next = prev + 1;
                        return next >= focusableOptions.length ? 0 : next;
                    });
                }
                break;

            case 'ArrowUp':
                event.preventDefault();
                if (!isOpen) {
                    open();
                } else {
                    setFocusedIndex(prev => {
                        const next = prev - 1;
                        return next < 0 ? focusableOptions.length - 1 : next;
                    });
                }
                break;

            case 'Enter':
            case ' ':
                event.preventDefault();
                if (!isOpen) {
                    open();
                } else if (focusedIndex >= 0 && focusedIndex < focusableOptions.length) {
                    handleSelect(focusableOptions[focusedIndex]);
                }
                break;

            case 'Escape':
                if (isOpen) {
                    event.preventDefault();
                    close();
                    triggerRef.current?.focus();
                }
                break;

            case 'Backspace':
                if (searchable && !searchQuery && multiple && selectedValues.length > 0) {
                    // Remove last selected tag
                    const lastValue = selectedValues[selectedValues.length - 1];
                    onChange(selectedValues.filter(v => v !== lastValue));
                }
                break;

            case 'Home':
                if (isOpen) {
                    event.preventDefault();
                    setFocusedIndex(0);
                }
                break;

            case 'End':
                if (isOpen) {
                    event.preventDefault();
                    setFocusedIndex(focusableOptions.length - 1);
                }
                break;

            case 'Tab':
                if (isOpen) {
                    close();
                }
                break;

            default:
                break;
        }
    }, [
        disabled, isOpen, open, close, focusableOptions, focusedIndex,
        handleSelect, searchable, searchQuery, multiple, selectedValues, onChange, triggerRef
    ]);

    /**
     * Scroll focused option into view
     */
    useEffect(() => {
        if (focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
            optionsRef.current[focusedIndex].scrollIntoView({
                block: 'nearest'
            });
        }
    }, [focusedIndex]);

    // Build trigger class names
    const triggerClassNames = [
        'dropdown-select__trigger',
        `dropdown-select__trigger--${size}`,
        isOpen && 'dropdown-select__trigger--open',
        disabled && 'dropdown-select__trigger--disabled',
        error && 'dropdown-select__trigger--error',
        fullWidth && 'dropdown-select__trigger--full-width'
    ].filter(Boolean).join(' ');

    // Build panel class names
    const panelClassNames = [
        'dropdown-panel',
        'dropdown-select__panel',
        isExiting && 'dropdown-panel--exiting',
        !isPositioned && 'dropdown-panel--positioning'
    ].filter(Boolean).join(' ');

    // Build container class names
    const containerClassNames = [
        'dropdown-select',
        fullWidth && 'dropdown-select--full-width',
        className
    ].filter(Boolean).join(' ');

    /**
     * Render icon - handles string names and component elements
     */
    const renderIcon = (icon, size = 16) => {
        if (!icon) return null;
        // If it's a string, use the Icon component
        if (typeof icon === 'string') {
            return <Icon name={icon} size={size} />;
        }
        // If it's a React element, render it directly
        if (isValidElement(icon)) {
            return icon;
        }
        // If it's a component class/function, render it
        if (typeof icon === 'function') {
            const IconComponent = icon;
            return <IconComponent sx={{ fontSize: size }} />;
        }
        return null;
    };

    /**
     * Render option item
     */
    const renderOption = (option, index) => {
        const { value: optValue, label, icon, disabled: optDisabled } = option;
        const selected = isSelected(optValue);
        const focused = focusableOptions[focusedIndex]?.value === optValue;

        const optionClassNames = [
            'dropdown-select__option',
            selected && 'dropdown-select__option--selected',
            focused && 'dropdown-select__option--focused',
            optDisabled && 'dropdown-select__option--disabled'
        ].filter(Boolean).join(' ');

        return (
            <div
                key={optValue}
                ref={el => optionsRef.current[focusableOptions.indexOf(option)] = el}
                className={optionClassNames}
                role="option"
                aria-selected={selected}
                aria-disabled={optDisabled}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(focusableOptions.indexOf(option))}
            >
                {icon && (
                    <span className="dropdown-select__option-icon">
                        {renderIcon(icon, 16)}
                    </span>
                )}
                <span className="dropdown-select__option-label">{label}</span>
                {selected && (
                    <span className="dropdown-select__option-check">
                        <IconCheck sx={{ fontSize: 16 }} />
                    </span>
                )}
            </div>
        );
    };

    /**
     * Render grouped options
     */
    const renderOptions = () => {
        const { groups, ungrouped } = groupedOptions;
        const elements = [];

        // Render ungrouped options first
        ungrouped.forEach((option, index) => {
            elements.push(renderOption(option, index));
        });

        // Render grouped options
        groups.forEach((groupOptions, groupName) => {
            elements.push(
                <div key={`group-${groupName}`} className="dropdown-select__group">
                    <div className="dropdown-select__group-label">{groupName}</div>
                    {groupOptions.map((option, index) => renderOption(option, index))}
                </div>
            );
        });

        return elements;
    };

    // Dropdown panel content
    const dropdownContent = shouldRender && (
        <div
            ref={dropdownRef}
            id={dropdownId}
            className={panelClassNames}
            role="listbox"
            aria-multiselectable={multiple}
            aria-labelledby={id}
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                minWidth: triggerWidth ? `${triggerWidth}px` : '180px',
                visibility: isPositioned ? 'visible' : 'hidden'
            }}
            data-testid={testId ? `${testId}-panel` : undefined}
        >
            {/* Search input */}
            {searchable && (
                <div className="dropdown-select__search">
                    <SearchInput
                        ref={searchInputRef}
                        className="dropdown-select__search-input"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search..."
                        size="sm"
                        onKeyDown={handleKeyDown}
                        aria-label="Search options"
                    />
                </div>
            )}

            {/* Options list */}
            <div className="dropdown-select__options">
                {filteredOptions.length > 0 ? (
                    renderOptions()
                ) : (
                    <div className="dropdown-select__no-results">
                        No results found
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className={containerClassNames}>
            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                id={id}
                name={name}
                className={triggerClassNames}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? dropdownId : undefined}
                aria-invalid={!!error}
                onClick={handleTriggerClick}
                onKeyDown={handleKeyDown}
                data-testid={testId}
            >
                {/* Value display */}
                <div className="dropdown-select__value">
                    {multiple && selectedOptions.length > 0 ? (
                        <div className="dropdown-select__tags">
                            {selectedOptions.map(opt => (
                                <span key={opt.value} className="dropdown-select__tag">
                                    {opt.icon && renderIcon(opt.icon, 12)}
                                    <span>{opt.label}</span>
                                    <button
                                        type="button"
                                        className="dropdown-select__tag-remove"
                                        onClick={(e) => handleRemoveTag(opt.value, e)}
                                        aria-label={`Remove ${opt.label}`}
                                    >
                                        <IconClose sx={{ fontSize: 12 }} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    ) : selectedOptions.length > 0 ? (
                        <span className="dropdown-select__selected">
                            {selectedOptions[0].icon && renderIcon(selectedOptions[0].icon, 16)}
                            <span>{selectedOptions[0].label}</span>
                        </span>
                    ) : (
                        <span className="dropdown-select__placeholder">{placeholder}</span>
                    )}
                </div>

                {/* Actions */}
                <div className="dropdown-select__actions">
                    {/* Clear button */}
                    {clearable && selectedValues.length > 0 && !disabled && (
                        <button
                            type="button"
                            className="dropdown-select__clear"
                            onClick={handleClear}
                            aria-label="Clear selection"
                            tabIndex={-1}
                        >
                            <IconClose sx={{ fontSize: 16 }} />
                        </button>
                    )}

                    {/* Arrow icon */}
                    <span className={`dropdown-select__arrow ${isOpen ? 'dropdown-select__arrow--open' : ''}`}>
                        <IconChevronDown sx={{ fontSize: 18 }} />
                    </span>
                </div>
            </button>

            {/* Error message */}
            {error && (
                <div className="dropdown-select__error">{error}</div>
            )}

            {/* Portal dropdown */}
            {shouldRender && createPortal(dropdownContent, document.body)}
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export default memo(DropdownSelect);
export { DropdownSelect };
