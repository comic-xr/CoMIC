/**
 * @file SortDropdown.jsx
 * @description Lightweight sort option dropdown for file lists.
 * Designed for compact display in panel toolbars.
 *
 * @example
 * <SortDropdown
 *   value="name"
 *   onChange={setSortBy}
 *   options={SORT_OPTIONS}
 * />
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './SortDropdown.scss';

/**
 * @typedef {Object} SortOption
 * @property {string} id - Option identifier
 * @property {string} label - Display label
 * @property {string} [icon] - Icon name
 */

/**
 * @typedef {Object} SortDropdownProps
 * @property {string} value - Currently selected sort option id
 * @property {(value: string) => void} onChange - Change handler
 * @property {SortOption[]} options - Available sort options
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [showLabel=true] - Show the selected label
 * @property {boolean} [showOrder=false] - Show asc/desc toggle
 * @property {'asc'|'desc'} [order='asc'] - Current sort order
 * @property {(order: 'asc'|'desc') => void} [onOrderChange] - Order change handler
 */

/**
 * SortDropdown - Compact sort selector for file lists
 *
 * @param {SortDropdownProps} props - Component props
 * @returns {React.ReactElement} The rendered dropdown
 */
export const SortDropdown = memo(function SortDropdown({
    value,
    onChange,
    options = [],
    className = '',
    showLabel = true,
    showOrder = false,
    order = 'asc',
    onOrderChange,
}) {
    const { isVR } = useAdaptive();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const currentOption = options.find(opt => opt.id === value) || options[0];

    // Calculate position when opening
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
            x: rect.right - 120, // Align right
            y: rect.bottom + 4,
        });
    }, []);

    // Handle opening
    const handleToggle = useCallback(() => {
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen(prev => !prev);
    }, [isOpen, updatePosition]);

    // Handle selection
    const handleSelect = useCallback((optionId) => {
        onChange(optionId);
        setIsOpen(false);
    }, [onChange]);

    // Handle order toggle
    const handleOrderToggle = useCallback((e) => {
        e.stopPropagation();
        onOrderChange?.(order === 'asc' ? 'desc' : 'asc');
    }, [order, onOrderChange]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (
                triggerRef.current?.contains(event.target) ||
                dropdownRef.current?.contains(event.target)
            ) {
                return;
            }
            setIsOpen(false);
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const classList = [
        'sort-dropdown',
        isOpen && 'sort-dropdown--open',
        isVR && 'sort-dropdown--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={classList}
                onClick={handleToggle}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <Icon name="arrowUpDown" size={10} className="sort-dropdown__icon" />
                {showLabel && (
                    <span className="sort-dropdown__label">
                        {currentOption?.label || 'Sort'}
                    </span>
                )}
                <Icon
                    name="chevronDown"
                    size={10}
                    className={`sort-dropdown__chevron ${isOpen ? 'sort-dropdown__chevron--open' : ''}`}
                />
            </button>

            {showOrder && (
                <button
                    type="button"
                    className="sort-dropdown__order-toggle"
                    onClick={handleOrderToggle}
                    title={order === 'asc' ? 'Ascending' : 'Descending'}
                >
                    <Icon
                        name={order === 'asc' ? 'arrowUp' : 'arrowDown'}
                        size={10}
                    />
                </button>
            )}

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="sort-dropdown__panel"
                    role="listbox"
                    style={{
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                    }}
                >
                    {options.map(option => (
                        <button
                            key={option.id}
                            type="button"
                            className={`sort-dropdown__option ${value === option.id ? 'sort-dropdown__option--selected' : ''}`}
                            role="option"
                            aria-selected={value === option.id}
                            onClick={() => handleSelect(option.id)}
                        >
                            {option.icon && (
                                <Icon name={option.icon} size={12} className="sort-dropdown__option-icon" />
                            )}
                            <span className="sort-dropdown__option-label">{option.label}</span>
                            {value === option.id && (
                                <Icon name="check" size={12} className="sort-dropdown__option-check" />
                            )}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
});

export default SortDropdown;
