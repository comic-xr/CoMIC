/**
 * @file DropdownMenu.jsx
 * @description Menu component for rendering dropdown menu items with keyboard navigation.
 * Supports items, separators, headers, checkboxes, radios, and nested submenus.
 *
 * Features:
 * - Multiple item types (item, separator, header, checkbox, radio)
 * - Icons and keyboard shortcuts display
 * - Keyboard navigation (Arrow keys, Enter, Home/End)
 * - Typeahead character matching
 * - Nested submenu support with hover delay
 * - Active/selected item highlighting
 * - Danger styling for destructive actions
 *
 * @example
 * // Basic menu
 * <DropdownMenu
 *   items={[
 *     { id: 'edit', label: 'Edit', icon: Edit },
 *     { id: 'copy', label: 'Copy', icon: Copy, shortcut: '⌘C' },
 *     { type: 'separator' },
 *     { id: 'delete', label: 'Delete', icon: Trash2, danger: true }
 *   ]}
 *   onSelect={(item) => handleAction(item.id)}
 * />
 *
 * @example
 * // With sections
 * <DropdownMenu
 *   items={[
 *     { type: 'header', label: 'File' },
 *     { id: 'new', label: 'New File', icon: FilePlus },
 *     { id: 'open', label: 'Open...', icon: FolderOpen },
 *     { type: 'separator' },
 *     { type: 'header', label: 'Edit' },
 *     { id: 'undo', label: 'Undo', icon: Undo, shortcut: '⌘Z' }
 *   ]}
 * />
 *
 * @example
 * // Checkbox items
 * <DropdownMenu
 *   items={[
 *     { id: 'bold', label: 'Bold', type: 'checkbox', checked: isBold },
 *     { id: 'italic', label: 'Italic', type: 'checkbox', checked: isItalic }
 *   ]}
 *   onSelect={(item) => toggleFormat(item.id)}
 * />
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useDropdownContext } from './Dropdown';
import './Dropdown.scss';

/**
 * @typedef {Object} DropdownMenuItem
 * @property {string} id - Unique item identifier
 * @property {string} [label] - Display label
 * @property {React.ComponentType} [icon] - Lucide icon component
 * @property {string} [shortcut] - Keyboard shortcut text (e.g., "⌘K")
 * @property {boolean} [disabled=false] - Disable item
 * @property {boolean} [danger=false] - Show in danger/red style
 * @property {'item'|'separator'|'header'|'checkbox'|'radio'} [type='item'] - Item type
 * @property {boolean} [checked] - For checkbox/radio types
 * @property {() => void} [onClick] - Click handler (alternative to onSelect)
 * @property {DropdownMenuItem[]} [submenu] - Nested submenu items
 */

/**
 * @typedef {Object} DropdownMenuProps
 * @property {DropdownMenuItem[]} items - Menu items to render
 * @property {(item: DropdownMenuItem) => void} [onSelect] - Item selection handler
 * @property {string} [activeId] - Currently active/selected item ID
 * @property {boolean} [showIcons=true] - Show icons in menu items
 * @property {boolean} [showShortcuts=true] - Show keyboard shortcuts
 * @property {'sm'|'md'} [size='md'] - Menu item size
 * @property {string} [className] - Additional CSS classes
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Individual menu item component
 */
const MenuItem = memo(function MenuItem({
    item,
    index,
    onSelect,
    activeId,
    showIcons,
    showShortcuts,
    size,
    isFocused,
    onFocus,
    onMouseEnter,
    onMouseLeave
}) {
    const { close } = useDropdownContext();
    const itemRef = useRef(null);
    const [showSubmenu, setShowSubmenu] = useState(false);
    const submenuTimeoutRef = useRef(null);

    const {
        id,
        label,
        icon: ItemIcon,
        shortcut,
        disabled = false,
        danger = false,
        type = 'item',
        checked,
        onClick,
        submenu
    } = item;

    const hasSubmenu = submenu && submenu.length > 0;
    const isActive = activeId === id;
    const isCheckable = type === 'checkbox' || type === 'radio';

    // Focus item when keyboard navigating
    useEffect(() => {
        if (isFocused && itemRef.current) {
            itemRef.current.focus();
        }
    }, [isFocused]);

    /**
     * Handle item click
     */
    const handleClick = useCallback((event) => {
        if (disabled) return;

        // Don't close if has submenu
        if (hasSubmenu) {
            setShowSubmenu(true);
            return;
        }

        // Call handlers
        onClick?.();
        onSelect?.(item);

        // Close dropdown
        close();
    }, [disabled, hasSubmenu, onClick, onSelect, item, close]);

    /**
     * Handle keyboard events
     */
    const handleKeyDown = useCallback((event) => {
        if (disabled) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                handleClick(event);
                break;
            case 'ArrowRight':
                if (hasSubmenu) {
                    event.preventDefault();
                    setShowSubmenu(true);
                }
                break;
            case 'ArrowLeft':
                if (showSubmenu) {
                    event.preventDefault();
                    setShowSubmenu(false);
                }
                break;
            default:
                break;
        }
    }, [disabled, handleClick, hasSubmenu, showSubmenu]);

    /**
     * Handle mouse enter for submenu
     */
    const handleMouseEnter = useCallback(() => {
        onMouseEnter?.(index);

        if (hasSubmenu) {
            // Delay before showing submenu
            submenuTimeoutRef.current = setTimeout(() => {
                setShowSubmenu(true);
            }, 150);
        }
    }, [hasSubmenu, index, onMouseEnter]);

    /**
     * Handle mouse leave for submenu
     */
    const handleMouseLeave = useCallback(() => {
        onMouseLeave?.();

        if (submenuTimeoutRef.current) {
            clearTimeout(submenuTimeoutRef.current);
        }

        // Delay before hiding submenu
        submenuTimeoutRef.current = setTimeout(() => {
            setShowSubmenu(false);
        }, 100);
    }, [onMouseLeave]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (submenuTimeoutRef.current) {
                clearTimeout(submenuTimeoutRef.current);
            }
        };
    }, []);

    // Determine ARIA role
    let role = 'menuitem';
    if (type === 'checkbox') role = 'menuitemcheckbox';
    if (type === 'radio') role = 'menuitemradio';

    // Build class names
    const classNames = [
        'dropdown-item',
        `dropdown-item--${size}`,
        isActive && 'dropdown-item--active',
        danger && 'dropdown-item--danger',
        disabled && 'dropdown-item--disabled',
        isFocused && 'dropdown-item--focused'
    ].filter(Boolean).join(' ');

    return (
        <div className="dropdown-item-wrapper">
            <button
                ref={itemRef}
                type="button"
                role={role}
                className={classNames}
                disabled={disabled}
                tabIndex={isFocused ? 0 : -1}
                aria-checked={isCheckable ? checked : undefined}
                aria-disabled={disabled}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={() => onFocus?.(index)}
            >
                {/* Checkbox/Radio check mark */}
                {isCheckable && (
                    <span className="dropdown-item__check">
                        {checked && <Icon name="check" size={14} />}
                    </span>
                )}

                {/* Item Icon */}
                {showIcons && ItemIcon && !isCheckable && (
                    <span className="dropdown-item__icon">
                        <ItemIcon size={16} />
                    </span>
                )}

                {/* Label */}
                <span className="dropdown-item__label">{label}</span>

                {/* Shortcut */}
                {showShortcuts && shortcut && (
                    <span className="dropdown-item__shortcut">{shortcut}</span>
                )}

                {/* Submenu arrow */}
                {hasSubmenu && (
                    <span className="dropdown-item__submenu-arrow">
                        <Icon name="chevronRight" size={14} />
                    </span>
                )}
            </button>

            {/* Submenu */}
            {hasSubmenu && showSubmenu && (
                <div
                    className="dropdown-submenu"
                    onMouseEnter={() => {
                        if (submenuTimeoutRef.current) {
                            clearTimeout(submenuTimeoutRef.current);
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                >
                    <DropdownMenu
                        items={submenu}
                        onSelect={onSelect}
                        activeId={activeId}
                        showIcons={showIcons}
                        showShortcuts={showShortcuts}
                        size={size}
                    />
                </div>
            )}
        </div>
    );
});

/**
 * Dropdown menu component with keyboard navigation.
 *
 * @param {DropdownMenuProps} props - Component props
 * @returns {React.ReactElement} The rendered menu
 */
function DropdownMenu({
    items = [],
    onSelect,
    activeId,
    showIcons = true,
    showShortcuts = true,
    size = 'md',
    className = '',
    testId
}) {
    const menuRef = useRef(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const typeaheadRef = useRef('');
    const typeaheadTimeoutRef = useRef(null);

    // Filter items that can receive focus (not separators or headers)
    const focusableItems = items.filter(item =>
        item.type !== 'separator' && item.type !== 'header'
    );

    /**
     * Get index in focusable items array
     */
    const getFocusableIndex = useCallback((itemIndex) => {
        let focusableIndex = 0;
        for (let i = 0; i < itemIndex; i++) {
            if (items[i].type !== 'separator' && items[i].type !== 'header') {
                focusableIndex++;
            }
        }
        return focusableIndex;
    }, [items]);

    /**
     * Get original item index from focusable index
     */
    const getItemIndex = useCallback((focusableIndex) => {
        let count = 0;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type !== 'separator' && items[i].type !== 'header') {
                if (count === focusableIndex) return i;
                count++;
            }
        }
        return -1;
    }, [items]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((event) => {
        const { key } = event;

        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev + 1;
                    return next >= focusableItems.length ? 0 : next;
                });
                break;

            case 'ArrowUp':
                event.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev - 1;
                    return next < 0 ? focusableItems.length - 1 : next;
                });
                break;

            case 'Home':
                event.preventDefault();
                setFocusedIndex(0);
                break;

            case 'End':
                event.preventDefault();
                setFocusedIndex(focusableItems.length - 1);
                break;

            case 'Tab':
                // Move focus to next focusable item or close
                event.preventDefault();
                if (event.shiftKey) {
                    setFocusedIndex(prev => {
                        const next = prev - 1;
                        return next < 0 ? focusableItems.length - 1 : next;
                    });
                } else {
                    setFocusedIndex(prev => {
                        const next = prev + 1;
                        return next >= focusableItems.length ? 0 : next;
                    });
                }
                break;

            default:
                // Typeahead: jump to item starting with typed character
                if (key.length === 1 && key.match(/[a-zA-Z0-9]/)) {
                    event.preventDefault();

                    // Clear previous timeout
                    if (typeaheadTimeoutRef.current) {
                        clearTimeout(typeaheadTimeoutRef.current);
                    }

                    // Append to typeahead string
                    typeaheadRef.current += key.toLowerCase();

                    // Find matching item
                    const matchIndex = focusableItems.findIndex((item, idx) =>
                        idx > focusedIndex &&
                        item.label?.toLowerCase().startsWith(typeaheadRef.current)
                    );

                    if (matchIndex !== -1) {
                        setFocusedIndex(matchIndex);
                    } else {
                        // Try from beginning
                        const matchFromStart = focusableItems.findIndex(item =>
                            item.label?.toLowerCase().startsWith(typeaheadRef.current)
                        );
                        if (matchFromStart !== -1) {
                            setFocusedIndex(matchFromStart);
                        }
                    }

                    // Clear typeahead after delay
                    typeaheadTimeoutRef.current = setTimeout(() => {
                        typeaheadRef.current = '';
                    }, 500);
                }
                break;
        }
    }, [focusableItems]);

    // Focus first item on mount
    useEffect(() => {
        if (focusableItems.length > 0 && focusedIndex === -1) {
            setFocusedIndex(0);
        }
    }, [focusableItems.length, focusedIndex]);

    // Cleanup typeahead timeout
    useEffect(() => {
        return () => {
            if (typeaheadTimeoutRef.current) {
                clearTimeout(typeaheadTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Render menu item based on type
     */
    const renderItem = (item, index) => {
        const { type = 'item', label, id } = item;

        // Separator
        if (type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}
                    className="dropdown-separator"
                    role="separator"
                />
            );
        }

        // Header
        if (type === 'header') {
            return (
                <div
                    key={`header-${index}`}
                    className="dropdown-header"
                    role="presentation"
                >
                    {label}
                </div>
            );
        }

        // Regular item
        const focusableIndex = getFocusableIndex(index);

        return (
            <MenuItem
                key={id || index}
                item={item}
                index={focusableIndex}
                onSelect={onSelect}
                activeId={activeId}
                showIcons={showIcons}
                showShortcuts={showShortcuts}
                size={size}
                isFocused={focusableIndex === focusedIndex}
                onFocus={setFocusedIndex}
                onMouseEnter={setFocusedIndex}
            />
        );
    };

    const classNames = [
        'dropdown-menu',
        `dropdown-menu--${size}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={menuRef}
            className={classNames}
            role="menu"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            data-testid={testId}
        >
            {items.map(renderItem)}
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export default memo(DropdownMenu);
export { DropdownMenu, MenuItem };