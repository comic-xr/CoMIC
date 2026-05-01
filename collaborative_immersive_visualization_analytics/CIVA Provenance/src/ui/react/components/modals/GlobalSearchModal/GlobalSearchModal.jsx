/**
 * @file GlobalSearchModal.jsx
 * @description Global search modal component for cross-project search.
 * Triggered by Cmd/Ctrl+K, provides filter chips, keyboard navigation, and recent searches.
 *
 * Features:
 * - Cross-project search functionality
 * - Filter chips for result types (Projects, Datasets, Views, etc.)
 * - Full keyboard navigation (arrows, enter, escape)
 * - Recent searches with localStorage persistence
 * - Text highlighting in results
 * - Accessible with ARIA attributes
 *
 * @example
 * import { GlobalSearchModal } from '@UI/react/components/modals/GlobalSearchModal';
 *
 * function App() {
 *   const [searchOpen, setSearchOpen] = useState(false);
 *
 *   // Register global shortcut
 *   useEffect(() => {
 *     const handleKeyDown = (e) => {
 *       if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
 *         e.preventDefault();
 *         setSearchOpen(true);
 *       }
 *     };
 *     document.addEventListener('keydown', handleKeyDown);
 *     return () => document.removeEventListener('keydown', handleKeyDown);
 *   }, []);
 *
 *   return (
 *     <GlobalSearchModal
 *       isOpen={searchOpen}
 *       onClose={() => setSearchOpen(false)}
 *       onSelect={(result) => {
 *         setSearchOpen(false);
 *         navigateTo(result);
 *       }}
 *     />
 *   );
 * }
 */

import React, { memo, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { SearchInput } from './SearchInput';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { SearchResults } from './SearchResults';
import { useGlobalSearch } from './useGlobalSearch';
import './GlobalSearchModal.scss';

/**
 * Available search filters configuration
 */
const SEARCH_FILTERS = [
    { id: 'all', label: 'All', icon: 'search' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'datasets', label: 'Datasets', icon: 'database' },
    { id: 'views', label: 'Views', icon: 'eye' },
    { id: 'people', label: 'People', icon: 'users' },
    { id: 'annotations', label: 'Annotations', icon: 'messageSquare' },
];

/**
 * @typedef {Object} SearchResult
 * @property {string} id - Unique identifier
 * @property {'project'|'dataset'|'view'|'person'|'annotation'|'room'} type - Result type
 * @property {string} name - Display name
 * @property {string} [description] - Secondary text
 * @property {string} [projectName] - Parent project name
 */

/**
 * @typedef {Object} GlobalSearchModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {(result: SearchResult) => void} [onSelect] - Called when result selected
 * @property {string} [initialQuery=''] - Pre-fill search query
 * @property {string} [initialFilter='all'] - Pre-select filter
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Global search modal for cross-project search.
 *
 * @param {GlobalSearchModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function GlobalSearchModal({
    isOpen,
    onClose,
    onSelect,
    initialQuery = '',
    initialFilter = 'all',
    testId
}) {
    // Search state management
    const {
        query,
        setQuery,
        activeFilter,
        setActiveFilter,
        results,
        groupedResults,
        filterCounts,
        isLoading,
        error,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        selectedIndex,
        setSelectedIndex,
        selectNext,
        selectPrevious,
        selectResult
    } = useGlobalSearch({
        initialQuery,
        initialFilter
    });

    /**
     * Handle result selection
     */
    const handleSelect = useCallback((result) => {
        addRecentSearch(query);
        onSelect?.(result);
        onClose();
    }, [query, addRecentSearch, onSelect, onClose]);

    /**
     * Handle selecting the currently focused result
     */
    const handleSelectCurrent = useCallback(() => {
        const result = selectResult();
        if (result) {
            handleSelect(result);
        }
    }, [selectResult, handleSelect]);

    /**
     * Handle recent search selection
     */
    const handleRecentSelect = useCallback((recentQuery) => {
        setQuery(recentQuery);
    }, [setQuery]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((event) => {
        const { key, metaKey, ctrlKey } = event;

        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                selectNext();
                break;

            case 'ArrowUp':
                event.preventDefault();
                selectPrevious();
                break;

            case 'Enter':
                event.preventDefault();
                handleSelectCurrent();
                break;

            case 'Tab':
                // Allow Tab to move to filter chips
                // Don't prevent default
                break;

            // Number shortcuts for filters (Cmd/Ctrl + 1-6)
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                if (metaKey || ctrlKey) {
                    event.preventDefault();
                    const index = parseInt(key) - 1;
                    if (SEARCH_FILTERS[index]) {
                        setActiveFilter(SEARCH_FILTERS[index].id);
                    }
                }
                break;

            default:
                break;
        }
    }, [selectNext, selectPrevious, handleSelectCurrent, setActiveFilter]);

    /**
     * Reset search state when modal closes
     */
    useEffect(() => {
        if (!isOpen) {
            // Optionally reset query on close
            // setQuery('');
            // setActiveFilter('all');
        }
    }, [isOpen]);

    /**
     * Announce result count to screen readers
     */
    useEffect(() => {
        if (!isLoading && query && results.length > 0) {
            // This would be announced by a live region
            const message = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
            // Could use an aria-live region here
        }
    }, [isLoading, query, results.length]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            className="global-search-modal"
            showHeader={false}
            showFooter={false}
            closeOnOverlayClick={true}
            closeOnEscape={true}
            testId={testId}
        >
            <div
                className="global-search"
                role="dialog"
                aria-label="Global search"
                onKeyDown={handleKeyDown}
            >
                {/* Search Input */}
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    isLoading={isLoading}
                    testId={testId ? `${testId}-input` : undefined}
                />

                {/* Filter Chips */}
                <div className="global-search__filters" data-testid={testId ? `${testId}-filters` : undefined}>
                    <ChipGroup
                        chips={SEARCH_FILTERS.map(filter => ({
                            ...filter,
                            count: query.trim().length > 0 ? (filterCounts[filter.id] || 0) : undefined,
                        }))}
                        activeChips={[activeFilter]}
                        onToggle={(filterId) => setActiveFilter(filterId)}
                        size="sm"
                        allowEmpty={false}
                    />
                </div>

                {/* Results */}
                <SearchResults
                    results={results}
                    groupedResults={activeFilter === 'all' ? groupedResults : null}
                    query={query}
                    selectedIndex={selectedIndex}
                    onSelect={handleSelect}
                    isLoading={isLoading}
                    recentSearches={recentSearches}
                    onRecentSelect={handleRecentSelect}
                    onClearRecent={clearRecentSearches}
                    testId={testId ? `${testId}-results` : undefined}
                />

                {/* Screen reader announcements */}
                <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {!isLoading && query && results.length > 0 && (
                        `${results.length} result${results.length !== 1 ? 's' : ''} found`
                    )}
                    {!isLoading && query && results.length === 0 && (
                        'No results found'
                    )}
                </div>
            </div>
        </Modal>
    );
}

// Memoize to prevent unnecessary re-renders
export default memo(GlobalSearchModal);
export { GlobalSearchModal, SEARCH_FILTERS };