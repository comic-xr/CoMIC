/**
 * @file useGlobalFilters.js
 * @description Hook for managing global file filtering state in the Files Tab.
 * Provides search, type filtering, tag filtering (with hybrid AND/OR logic), and sorting.
 *
 * Tag Filter Logic (V7):
 * - OR within same tag category (Pre-op OR Post-op)
 * - AND between different tag categories (Pre-op AND Control)
 * - AND with file type categories (Volumetric AND Pre-op)
 *
 * @example
 * const { filters, setFilters, applyFilters, hasActiveFilters } = useGlobalFilters({ tags });
 */

import { useState, useMemo, useCallback } from 'react';
import { getFileTypeByExtension } from '@UI/react/constants/filesTabConfig.js';

/**
 * @typedef {Object} FilterState
 * @property {string} searchQuery - Search query string
 * @property {string[]} categoryFilters - Active file category filters (volumetric, documents, etc.)
 * @property {string[]} typeFilters - Active specific file type filters (nifti, dicom, etc.)
 * @property {string[]} tagFilters - Active tag ID filters
 * @property {string} sortBy - Sort field (name, date, size, type)
 * @property {'asc'|'desc'} sortOrder - Sort direction
 */

/**
 * @typedef {Object} Tag
 * @property {string} id - Tag ID
 * @property {string} name - Tag display name
 * @property {string} categoryId - Parent category ID
 */

/**
 * @typedef {Object} UseGlobalFiltersReturn
 * @property {FilterState} filters - Current filter state
 * @property {(updates: Partial<FilterState>) => void} setFilters - Update filter state
 * @property {(items: Array, tags?: Tag[]) => Array} applyFilters - Apply filters to items
 * @property {boolean} hasActiveFilters - Whether any filters are active
 * @property {number} activeFilterCount - Count of active filters
 * @property {() => void} clearFilters - Clear all filters
 * @property {(query: string) => void} setSearchQuery - Set search query
 * @property {(category: string) => void} toggleCategoryFilter - Toggle a category filter
 * @property {(type: string) => void} toggleTypeFilter - Toggle a type filter
 * @property {(tagId: string) => void} toggleTagFilter - Toggle a tag filter
 * @property {(sortBy: string) => void} setSortBy - Set sort field
 * @property {(order: 'asc'|'desc') => void} setSortOrder - Set sort order
 */

/**
 * Hook for managing global file filters
 *
 * @param {Object} options - Hook options
 * @param {FilterState} [options.initialFilters] - Initial filter state
 * @param {Tag[]} [options.tags] - Available tags for hybrid AND/OR filtering
 * @returns {UseGlobalFiltersReturn} Filter state and methods
 */
export function useGlobalFilters(options = {}) {
    const {
        initialFilters = {
            searchQuery: '',
            categoryFilters: [],
            typeFilters: [],
            tagFilters: [],
            sortBy: 'name',
            sortOrder: 'asc',
        },
        tags = [],
    } = options;

    const [filters, setFiltersState] = useState(initialFilters);

    /**
     * Update filters with partial state
     */
    const setFilters = useCallback((updates) => {
        setFiltersState(prev => ({ ...prev, ...updates }));
    }, []);

    /**
     * Set search query
     */
    const setSearchQuery = useCallback((searchQuery) => {
        setFiltersState(prev => ({ ...prev, searchQuery }));
    }, []);

    /**
     * Toggle a category filter (e.g., 'volumetric', 'documents')
     */
    const toggleCategoryFilter = useCallback((category) => {
        setFiltersState(prev => ({
            ...prev,
            categoryFilters: prev.categoryFilters.includes(category)
                ? prev.categoryFilters.filter(c => c !== category)
                : [...prev.categoryFilters, category],
        }));
    }, []);

    /**
     * Toggle a type filter (e.g., 'nifti', 'dicom')
     */
    const toggleTypeFilter = useCallback((type) => {
        setFiltersState(prev => ({
            ...prev,
            typeFilters: prev.typeFilters.includes(type)
                ? prev.typeFilters.filter(t => t !== type)
                : [...prev.typeFilters, type],
        }));
    }, []);

    /**
     * Toggle a tag filter
     */
    const toggleTagFilter = useCallback((tagId) => {
        setFiltersState(prev => ({
            ...prev,
            tagFilters: prev.tagFilters.includes(tagId)
                ? prev.tagFilters.filter(t => t !== tagId)
                : [...prev.tagFilters, tagId],
        }));
    }, []);

    /**
     * Set sort field
     */
    const setSortBy = useCallback((sortBy) => {
        setFiltersState(prev => ({ ...prev, sortBy }));
    }, []);

    /**
     * Set sort order
     */
    const setSortOrder = useCallback((sortOrder) => {
        setFiltersState(prev => ({ ...prev, sortOrder }));
    }, []);

    /**
     * Clear all filters
     */
    const clearFilters = useCallback(() => {
        setFiltersState({
            searchQuery: '',
            categoryFilters: [],
            typeFilters: [],
            tagFilters: [],
            sortBy: filters.sortBy, // Keep sort preference
            sortOrder: filters.sortOrder,
        });
    }, [filters.sortBy, filters.sortOrder]);

    /**
     * Check if any filters are active
     */
    const hasActiveFilters = useMemo(() => {
        return (
            filters.searchQuery.trim().length > 0 ||
            filters.categoryFilters.length > 0 ||
            filters.typeFilters.length > 0 ||
            filters.tagFilters.length > 0
        );
    }, [filters.searchQuery, filters.categoryFilters, filters.typeFilters, filters.tagFilters]);

    /**
     * Count of active filters
     */
    const activeFilterCount = useMemo(() => {
        return (
            (filters.searchQuery.trim() ? 1 : 0) +
            filters.categoryFilters.length +
            filters.typeFilters.length +
            filters.tagFilters.length
        );
    }, [filters.searchQuery, filters.categoryFilters, filters.typeFilters, filters.tagFilters]);

    /**
     * Apply filters to an array of items
     * @param {Array} items - Items to filter
     * @param {Tag[]} [tagsOverride] - Optional tags override for hybrid filter logic
     */
    const applyFilters = useCallback((items, tagsOverride) => {
        if (!items || items.length === 0) return [];

        const activeTags = tagsOverride || tags;
        let result = [...items];

        // Search filter
        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(item => {
                const name = item.name || item.filename || '';
                return name.toLowerCase().includes(query);
            });
        }

        // Category filter (OR within - e.g., volumetric OR documents)
        if (filters.categoryFilters.length > 0) {
            result = result.filter(item => {
                const category = item.category || getCategoryForType(item.fileType || item.type);
                return filters.categoryFilters.includes(category);
            });
        }

        // Type filter (OR within - specific types like nifti, dicom)
        if (filters.typeFilters.length > 0) {
            result = result.filter(item => {
                // Try multiple ways to determine file type
                let typeConfig = null;

                // Method 1: Use fileType property directly
                const fileType = item.fileType || item.type;
                if (fileType) {
                    typeConfig = getFileTypeByExtension(`.${fileType}`);
                    // Direct ID match (e.g., if fileType is already 'nifti')
                    if (!typeConfig && filters.typeFilters.includes(fileType)) {
                        return true;
                    }
                }

                // Method 2: Extract extension from filename
                if (!typeConfig) {
                    const name = item.name || item.filename || '';
                    const match = name.match(/\.([^.]+)$/);
                    if (match) {
                        typeConfig = getFileTypeByExtension(`.${match[1]}`);
                    }
                    // Handle compound extensions like .nii.gz
                    if (!typeConfig) {
                        const compoundMatch = name.match(/\.([^.]+\.[^.]+)$/);
                        if (compoundMatch) {
                            typeConfig = getFileTypeByExtension(`.${compoundMatch[1]}`);
                        }
                    }
                }

                // Check if file type matches any active filter
                if (typeConfig) {
                    return filters.typeFilters.includes(typeConfig.id);
                }

                return false;
            });
        }

        // Tag filter - Hybrid AND/OR logic
        // - OR within same tag category (Pre-op OR Post-op)
        // - AND between different tag categories (Pre-op AND Control)
        if (filters.tagFilters.length > 0 && activeTags.length > 0) {
            // Group selected tags by their category
            const selectedByCategory = {};
            filters.tagFilters.forEach(tagId => {
                const tag = activeTags.find(t => t.id === tagId);
                if (tag) {
                    if (!selectedByCategory[tag.categoryId]) {
                        selectedByCategory[tag.categoryId] = [];
                    }
                    selectedByCategory[tag.categoryId].push(tagId);
                }
            });

            // Filter: file must match ALL categories (AND)
            // Within each category, file must match ANY selected tag (OR)
            result = result.filter(item => {
                const fileTags = item.tagIds || [];

                return Object.entries(selectedByCategory).every(([categoryId, categoryTagIds]) => {
                    // OR within category: file must have at least one of these tags
                    return categoryTagIds.some(tagId => fileTags.includes(tagId));
                });
            });
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;

            switch (filters.sortBy) {
                case 'date':
                    const dateA = new Date(a.modifiedAt || a.uploadedAt || a.date || 0);
                    const dateB = new Date(b.modifiedAt || b.uploadedAt || b.date || 0);
                    comparison = dateB - dateA;
                    break;

                case 'size':
                    // Parse size strings like "45 MB" to numbers
                    const sizeA = parseFileSize(a.size);
                    const sizeB = parseFileSize(b.size);
                    comparison = sizeB - sizeA;
                    break;

                case 'type':
                    const typeA = a.fileType || a.type || '';
                    const typeB = b.fileType || b.type || '';
                    comparison = typeA.localeCompare(typeB);
                    break;

                case 'name':
                default:
                    const nameA = a.name || a.filename || '';
                    const nameB = b.name || b.filename || '';
                    comparison = nameA.localeCompare(nameB);
                    break;
            }

            return filters.sortOrder === 'desc' ? -comparison : comparison;
        });

        return result;
    }, [filters, tags]);

    return {
        filters,
        setFilters,
        applyFilters,
        hasActiveFilters,
        activeFilterCount,
        clearFilters,
        setSearchQuery,
        toggleCategoryFilter,
        toggleTypeFilter,
        toggleTagFilter,
        setSortBy,
        setSortOrder,
    };
}

/**
 * File type to category mapping
 */
const FILE_TYPE_CATEGORIES = {
    volumetric: ['nifti', 'dicom', 'nrrd', 'stl'],
    models: ['obj', 'ply', 'gltf', 'glb'],
    documents: ['pdf', 'markdown', 'md', 'document', 'doc', 'docx', 'txt'],
    images: ['image', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'],
    data: ['csv', 'json', 'spreadsheet', 'xlsx', 'xls'],
    code: ['python', 'py', 'notebook', 'ipynb', 'js', 'jsx', 'ts', 'tsx'],
};

/**
 * Get category for a file type
 * @param {string} type - File type
 * @returns {string} Category ID
 */
function getCategoryForType(type) {
    if (!type) return 'other';
    const lowerType = type.toLowerCase();

    for (const [categoryId, types] of Object.entries(FILE_TYPE_CATEGORIES)) {
        if (types.includes(lowerType)) {
            return categoryId;
        }
    }
    return 'other';
}

/**
 * Parse file size string to bytes
 * @param {string|number} size - Size string (e.g., "45 MB") or number
 * @returns {number} Size in bytes
 */
function parseFileSize(size) {
    if (typeof size === 'number') return size;
    if (!size || typeof size !== 'string') return 0;

    const match = size.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024,
    };

    return value * (multipliers[unit] || 1);
}

export default useGlobalFilters;
