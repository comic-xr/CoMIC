/**
 * @file KeyboardShortcutsModal.jsx
 * @description Modal component displaying all keyboard shortcuts organized by category.
 * Features tabbed navigation, search functionality, and platform-aware key symbols.
 *
 * Features:
 * - Category tabs for organized shortcut display
 * - Optional search/filter functionality
 * - Platform-specific key symbols (Mac vs Windows/Linux)
 * - Keyboard navigation between categories
 * - ARIA tab list pattern for accessibility
 *
 * @example
 * import { KeyboardShortcutsModal } from '@UI/react/components/modals/KeyboardShortcutsModal';
 *
 * function App() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   // Register ? key to open
 *   useEffect(() => {
 *     const handleKey = (e) => {
 *       if (e.key === '?' && !e.target.matches('input, textarea')) {
 *         e.preventDefault();
 *         setIsOpen(true);
 *       }
 *     };
 *     document.addEventListener('keydown', handleKey);
 *     return () => document.removeEventListener('keydown', handleKey);
 *   }, []);
 *
 *   return (
 *     <KeyboardShortcutsModal
 *       isOpen={isOpen}
 *       onClose={() => setIsOpen(false)}
 *     />
 *   );
 * }
 */

import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import Modal from '../Modal/Modal';
import ShortcutCategory from './ShortcutCategory';
import ShortcutItem from './ShortcutItem';
import { SHORTCUT_CATEGORIES, searchShortcuts, getCategoryById } from './shortcuts';
import './KeyboardShortcutsModal.scss';

/**
 * @typedef {Object} KeyboardShortcutsModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {string} [initialCategory='general'] - Initially selected category
 * @property {boolean} [searchable=true] - Show search input
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Modal displaying all keyboard shortcuts organized by category.
 *
 * @param {KeyboardShortcutsModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function KeyboardShortcutsModal({
    isOpen,
    onClose,
    initialCategory = 'general',
    searchable = true,
    className = '',
    testId
}) {
    // State
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [searchQuery, setSearchQuery] = useState('');

    // Refs for keyboard navigation
    const categoryRefs = useRef([]);
    const searchInputRef = useRef(null);

    // Get current category data
    const currentCategory = useMemo(() => {
        return getCategoryById(activeCategory);
    }, [activeCategory]);

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        return searchShortcuts(searchQuery);
    }, [searchQuery]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveCategory(initialCategory);
            setSearchQuery('');
        }
    }, [isOpen, initialCategory]);

    // Focus search input when modal opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen, searchable]);

    /**
     * Handle category selection
     */
    const handleCategoryChange = useCallback((categoryId) => {
        setActiveCategory(categoryId);
        setSearchQuery(''); // Clear search when changing category
    }, []);

    /**
     * Handle keyboard navigation between categories
     */
    const handleCategoryKeyDown = useCallback((event, index) => {
        const categories = SHORTCUT_CATEGORIES;
        let nextIndex = index;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                nextIndex = (index + 1) % categories.length;
                break;
            case 'ArrowUp':
                event.preventDefault();
                nextIndex = index - 1;
                if (nextIndex < 0) nextIndex = categories.length - 1;
                break;
            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                nextIndex = categories.length - 1;
                break;
            default:
                return;
        }

        const nextCategory = categories[nextIndex];
        setActiveCategory(nextCategory.id);
        categoryRefs.current[nextIndex]?.focus();
    }, []);

    /**
     * Handle search input change
     */
    const handleSearchChange = useCallback((value) => {
        setSearchQuery(value);
    }, []);

    /**
     * Clear search
     */
    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        searchInputRef.current?.focus();
    }, []);

    // Build class names
    const contentClassNames = [
        'shortcuts-modal',
        className
    ].filter(Boolean).join(' ');

    /**
     * Render shortcuts list
     */
    const renderShortcuts = () => {
        // If searching, show search results
        if (searchResults) {
            if (searchResults.length === 0) {
                return (
                    <div className="shortcuts-modal__empty">
                        <p>No shortcuts found for "{searchQuery}"</p>
                    </div>
                );
            }

            // Group results by category
            const groupedResults = searchResults.reduce((acc, { category, shortcut }) => {
                if (!acc[category.id]) {
                    acc[category.id] = {
                        category,
                        shortcuts: []
                    };
                }
                acc[category.id].shortcuts.push(shortcut);
                return acc;
            }, {});

            return Object.values(groupedResults).map(({ category, shortcuts }) => (
                <div key={category.id} className="shortcuts-modal__search-group">
                    <h4 className="shortcuts-modal__section-title">{category.label}</h4>
                    {shortcuts.map((shortcut, index) => (
                        <ShortcutItem
                            key={`${category.id}-${index}`}
                            action={shortcut.action}
                            keys={shortcut.keys}
                            description={shortcut.description}
                        />
                    ))}
                </div>
            ));
        }

        // Show current category shortcuts
        if (!currentCategory) return null;

        return (
            <>
                <h3 className="shortcuts-modal__section-title">
                    {currentCategory.label}
                </h3>
                {currentCategory.shortcuts.map((shortcut, index) => (
                    <ShortcutItem
                        key={index}
                        action={shortcut.action}
                        keys={shortcut.keys}
                        description={shortcut.description}
                    />
                ))}
            </>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Keyboard Shortcuts"
            icon="keyboard"
            severity="info"
            size="lg"
            testId={testId}
        >
            <div className={contentClassNames}>
                {/* Category tabs (left side) */}
                <div
                    className="shortcuts-modal__categories"
                    role="tablist"
                    aria-label="Shortcut categories"
                    aria-orientation="vertical"
                >
                    {SHORTCUT_CATEGORIES.map((category, index) => (
                        <ShortcutCategory
                            key={category.id}
                            ref={el => categoryRefs.current[index] = el}
                            id={category.id}
                            label={category.label}
                            icon={category.icon}
                            isActive={activeCategory === category.id && !searchQuery}
                            onClick={() => handleCategoryChange(category.id)}
                            onKeyDown={(e) => handleCategoryKeyDown(e, index)}
                        />
                    ))}
                </div>

                {/* Shortcuts list (right side) */}
                <div className="shortcuts-modal__content">
                    {/* Search input */}
                    {searchable && (
                        <SearchInput
                            ref={searchInputRef}
                            className="shortcuts-modal__search"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search shortcuts..."
                            size="md"
                            onClear={handleClearSearch}
                            aria-label="Search shortcuts"
                        />
                    )}

                    {/* Shortcuts list */}
                    <div
                        className="shortcuts-modal__list"
                        role="tabpanel"
                        id={`shortcuts-panel-${activeCategory}`}
                        aria-labelledby={`shortcuts-tab-${activeCategory}`}
                    >
                        {renderShortcuts()}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default memo(KeyboardShortcutsModal);
export { KeyboardShortcutsModal };
