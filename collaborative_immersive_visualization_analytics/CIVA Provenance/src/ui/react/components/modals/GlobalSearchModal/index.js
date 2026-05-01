/**
 * @file index.js
 * @description Public exports for the GlobalSearchModal component.
 *
 * GlobalSearchModal provides cross-project search functionality for CIA Web.
 * It's triggered by Cmd/Ctrl+K and supports filter chips, keyboard navigation,
 * and recent search history.
 *
 * @example
 * // Basic usage with global keyboard shortcut
 * import { GlobalSearchModal } from '@UI/react/components/modals/GlobalSearchModal';
 * import { useState, useEffect } from 'react';
 *
 * function App() {
 *   const [searchOpen, setSearchOpen] = useState(false);
 *
 *   // Register global Cmd/Ctrl+K shortcut
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
 *   const handleSelect = (result) => {
 *     setSearchOpen(false);
 *     // Navigate to result based on type
 *     switch (result.type) {
 *       case 'project':
 *         navigateToProject(result.id);
 *         break;
 *       case 'dataset':
 *         navigateToDataset(result.id);
 *         break;
 *       case 'view':
 *         openView(result.id);
 *         break;
 *       case 'person':
 *         openUserProfile(result.id);
 *         break;
 *       default:
 *         break;
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <GlobalSearchModal
 *         isOpen={searchOpen}
 *         onClose={() => setSearchOpen(false)}
 *         onSelect={handleSelect}
 *       />
 *       { // Rest of your app }
 *     </>
 *   );
 * }
 *
 * @example
 * // With initial query and filter
 * <GlobalSearchModal
 *   isOpen={searchOpen}
 *   onClose={() => setSearchOpen(false)}
 *   initialQuery="mars"
 *   initialFilter="datasets"
 *   onSelect={handleSelect}
 * />
 *
 * @example
 * // Using the search hook independently
 * import { useGlobalSearch } from '@UI/react/components/modals/GlobalSearchModal';
 *
 * function CustomSearch() {
 *   const {
 *     query,
 *     setQuery,
 *     results,
 *     isLoading,
 *     activeFilter,
 *     setActiveFilter,
 *     selectNext,
 *     selectPrevious,
 *     selectResult
 *   } = useGlobalSearch();
 *
 *   // Build custom search UI
 * }
 *
 * @example
 * // Search result types
 * // Results have the following structure:
 * const result = {
 *   id: 'p1',                    // Unique identifier
 *   type: 'project',             // 'project'|'dataset'|'view'|'person'|'annotation'|'room'
 *   name: 'Mars Exploration',    // Display name
 *   description: 'NASA imagery', // Optional secondary text
 *   projectName: 'Mars Project', // Parent project (for nested items)
 *   thumbnail: '/images/...'     // Optional thumbnail URL
 * };
 *
 * @example
 * // Available filters
 * // Filter chips support the following types:
 * const filters = [
 *   { id: 'all', label: 'All' },
 *   { id: 'projects', label: 'Projects' },
 *   { id: 'datasets', label: 'Datasets' },
 *   { id: 'views', label: 'Views' },
 *   { id: 'people', label: 'People' },
 *   { id: 'annotations', label: 'Annotations' },
 * ];
 *
 * @example
 * // Keyboard shortcuts within modal
 * // - ↓ / ↑: Navigate results
 * // - Enter: Select focused result
 * // - Escape: Close modal (or clear input if has value)
 * // - Tab: Move between filter chips
 * // - Cmd/Ctrl + 1-6: Jump to specific filter
 */

// Main component
export { GlobalSearchModal, SEARCH_FILTERS } from "./GlobalSearchModal";
export { default } from "./GlobalSearchModal";

// Subcomponents (for custom implementations)
export { SearchInput } from "./SearchInput";
export { SearchResults, RecentSearches, EmptyState } from "./SearchResults";
export {
  SearchResultItem,
  TYPE_ICONS,
  TYPE_LABELS,
  highlightMatch,
} from "./SearchResultItem";

// Hook for custom search UIs
export { useGlobalSearch } from "./useGlobalSearch";
