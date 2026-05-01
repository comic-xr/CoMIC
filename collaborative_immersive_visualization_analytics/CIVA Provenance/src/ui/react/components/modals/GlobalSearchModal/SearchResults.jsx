/**
 * @file SearchResults.jsx
 * @description Search results container component.
 * Handles result display, grouping, empty states, and recent searches.
 *
 * @example
 * <SearchResults
 *   results={results}
 *   groupedResults={groupedResults}
 *   query={query}
 *   selectedIndex={selectedIndex}
 *   onSelect={handleSelect}
 *   isLoading={isLoading}
 *   recentSearches={recentSearches}
 *   onRecentSelect={setQuery}
 *   onClearRecent={clearRecentSearches}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SearchResultItem, TYPE_LABELS } from './SearchResultItem';
import { EmptyState as CommonEmptyState } from '@UI/react/components/molecules/EmptyState';

/**
 * @typedef {Object} SearchResult
 * @property {string} id - Unique identifier
 * @property {string} type - Result type
 * @property {string} name - Display name
 */

/**
 * @typedef {Object} SearchResultsProps
 * @property {SearchResult[]} results - Flat list of results
 * @property {Object<string, SearchResult[]>} [groupedResults] - Results grouped by type
 * @property {string} query - Current search query
 * @property {number} selectedIndex - Currently selected result index
 * @property {(result: SearchResult) => void} onSelect - Result selection handler
 * @property {boolean} [isLoading=false] - Whether search is in progress
 * @property {string[]} [recentSearches=[]] - Recent search queries
 * @property {(query: string) => void} [onRecentSelect] - Recent search selection handler
 * @property {() => void} [onClearRecent] - Clear recent searches handler
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Group type icon names for headers
 */
const GROUP_ICONS = {
    project: 'folder',
    dataset: 'database',
    view: 'eye',
    person: 'users',
    annotation: 'messageSquare',
    room: 'users',
};

/**
 * Group labels (plural)
 */
const GROUP_LABELS = {
    project: 'Projects',
    dataset: 'Datasets',
    view: 'Views',
    person: 'People',
    annotation: 'Annotations',
    room: 'Rooms',
};

/**
 * Empty state wrapper for backwards compatibility
 * Uses the common EmptyState component internally
 */
const EmptyState = memo(function EmptyState({ query, type = 'no-results' }) {
    if (type === 'no-results') {
        return (
            <div className="global-search__empty">
                <CommonEmptyState
                    icon="help"
                    title={`No results found for "${query}"`}
                    description="Try adjusting your search or filter criteria"
                />
            </div>
        );
    }

    return (
        <div className="global-search__empty">
            <CommonEmptyState
                icon="search"
                title="Start typing to search"
                description="Search across projects, datasets, views, and more"
            />
        </div>
    );
});

/**
 * Recent searches section
 */
const RecentSearches = memo(function RecentSearches({
    searches,
    onSelect,
    onClear
}) {
    if (!searches || searches.length === 0) return null;

    return (
        <div className="global-search__recent">
            <div className="global-search__recent-header">
                <span className="global-search__recent-header__title">
                    Recent Searches
                </span>
                <button
                    type="button"
                    className="global-search__recent-header__clear"
                    onClick={onClear}
                >
                    Clear
                </button>
            </div>
            <div className="global-search__recent-list">
                {searches.map((query, index) => (
                    <button
                        key={`${query}-${index}`}
                        type="button"
                        className="global-search__recent-item"
                        onClick={() => onSelect(query)}
                    >
                        <Icon name="clock" size={14} />
                        <span>{query}</span>
                    </button>
                ))}
            </div>
        </div>
    );
});

/**
 * Result group with header
 */
const ResultGroup = memo(function ResultGroup({
    type,
    items,
    query,
    selectedIndex,
    startIndex,
    onSelect
}) {
    const iconName = GROUP_ICONS[type] || 'folder';
    const label = GROUP_LABELS[type] || type;

    return (
        <div className="global-search__group">
            <div className="global-search__group-header">
                <Icon name={iconName} size={14} />
                <span>{label}</span>
                <span className="global-search__group-count">({items.length})</span>
            </div>
            <div className="global-search__group-items">
                {items.map((result, index) => (
                    <SearchResultItem
                        key={result.id}
                        result={result}
                        query={query}
                        isSelected={startIndex + index === selectedIndex}
                        onClick={() => onSelect(result)}
                    />
                ))}
            </div>
        </div>
    );
});

/**
 * Search results container component.
 *
 * @param {SearchResultsProps} props - Component props
 * @returns {React.ReactElement} The rendered results
 */
function SearchResults({
    results,
    groupedResults,
    query,
    selectedIndex,
    onSelect,
    isLoading = false,
    recentSearches = [],
    onRecentSelect,
    onClearRecent,
    testId
}) {
    // Show loading state
    if (isLoading) {
        return (
            <div
                className="global-search__results global-search__results--loading"
                data-testid={testId}
            >
                <div className="global-search__loading">
                    <div className="global-search__loading-spinner" />
                    <span>Searching...</span>
                </div>
            </div>
        );
    }

    // No query - show recent searches or initial state
    if (!query.trim()) {
        return (
            <div className="global-search__results" data-testid={testId}>
                {recentSearches.length > 0 ? (
                    <RecentSearches
                        searches={recentSearches}
                        onSelect={onRecentSelect}
                        onClear={onClearRecent}
                    />
                ) : (
                    <EmptyState type="initial" />
                )}
            </div>
        );
    }

    // No results
    if (results.length === 0) {
        return (
            <div className="global-search__results" data-testid={testId}>
                <EmptyState query={query} type="no-results" />
            </div>
        );
    }

    // Grouped results (when filter is "all")
    if (groupedResults) {
        let currentIndex = 0;

        return (
            <div
                className="global-search__results"
                role="listbox"
                id="search-results"
                aria-label={`${results.length} results`}
                data-testid={testId}
            >
                {Object.entries(groupedResults).map(([type, items]) => {
                    const startIndex = currentIndex;
                    currentIndex += items.length;

                    return (
                        <ResultGroup
                            key={type}
                            type={type}
                            items={items}
                            query={query}
                            selectedIndex={selectedIndex}
                            startIndex={startIndex}
                            onSelect={onSelect}
                        />
                    );
                })}
            </div>
        );
    }

    // Flat list (when specific filter is active)
    return (
        <div
            className="global-search__results"
            role="listbox"
            id="search-results"
            aria-label={`${results.length} results`}
            data-testid={testId}
        >
            <div className="global-search__flat-list">
                {results.map((result, index) => (
                    <SearchResultItem
                        key={result.id}
                        result={result}
                        query={query}
                        isSelected={index === selectedIndex}
                        onClick={() => onSelect(result)}
                    />
                ))}
            </div>
        </div>
    );
}

export default memo(SearchResults);
export { SearchResults, RecentSearches, EmptyState, ResultGroup };