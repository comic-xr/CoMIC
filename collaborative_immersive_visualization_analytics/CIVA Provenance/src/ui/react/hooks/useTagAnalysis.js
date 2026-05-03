/**
 * @file useTagAnalysis.js
 * @description Hook for analyzing file tags - counts per tag and grouping by category.
 * Used by the Files Tab V7 for smart tag filtering UI.
 *
 * @example
 * const { tagCounts, tagsByCategory, getTagById } = useTagAnalysis(files, tags, tagCategories);
 */

import { useMemo } from 'react';

/**
 * Default tag categories for research workflows
 */
export const DEFAULT_TAG_CATEGORIES = {
    subject: { id: 'subject', label: 'Subject', color: '#3b82f6', order: 1 },
    phase: { id: 'phase', label: 'Study Phase', color: '#8b5cf6', order: 2 },
    status: { id: 'status', label: 'Status', color: '#f59e0b', order: 3 },
    cohort: { id: 'cohort', label: 'Cohort', color: '#10b981', order: 4 },
    session: { id: 'session', label: 'Session', color: '#ec4899', order: 5 },
    custom: { id: 'custom', label: 'Custom', color: '#6b7280', order: 99 },
};

/**
 * @typedef {Object} Tag
 * @property {string} id - Tag ID
 * @property {string} name - Tag display name
 * @property {string} categoryId - Parent category ID
 */

/**
 * @typedef {Object} TagCategory
 * @property {string} id - Category ID
 * @property {string} label - Display label
 * @property {string} color - Accent color
 * @property {number} order - Sort order
 */

/**
 * @typedef {Object} TagWithCount
 * @property {string} id - Tag ID
 * @property {string} name - Tag display name
 * @property {string} categoryId - Parent category ID
 * @property {number} count - Number of files with this tag
 */

/**
 * @typedef {Object} CategoryWithTags
 * @property {string} id - Category ID
 * @property {string} label - Display label
 * @property {string} color - Accent color
 * @property {number} order - Sort order
 * @property {TagWithCount[]} tags - Tags in this category with counts
 */

/**
 * @typedef {Object} UseTagAnalysisReturn
 * @property {Record<string, number>} tagCounts - Map of tag ID to file count
 * @property {Record<string, CategoryWithTags>} tagsByCategory - Tags grouped by category
 * @property {(tagId: string) => Tag|undefined} getTagById - Get tag by ID
 * @property {(tagId: string) => TagCategory|undefined} getCategoryForTag - Get category for a tag
 * @property {Tag[]} allTags - All available tags
 * @property {TagCategory[]} allCategories - All available categories sorted by order
 */

/**
 * Hook for analyzing file tags
 *
 * @param {Array<{ tagIds?: string[] }>} files - Files with tagIds
 * @param {Tag[]} tags - Available tags
 * @param {Record<string, TagCategory>} [tagCategories] - Tag categories (defaults to DEFAULT_TAG_CATEGORIES)
 * @returns {UseTagAnalysisReturn} Tag analysis results
 */
export function useTagAnalysis(files = [], tags = [], tagCategories = DEFAULT_TAG_CATEGORIES) {
    // Count files per tag
    const tagCounts = useMemo(() => {
        const counts = {};

        files.forEach(file => {
            (file.tagIds || []).forEach(tagId => {
                counts[tagId] = (counts[tagId] || 0) + 1;
            });
        });

        return counts;
    }, [files]);

    // Create tag lookup map
    const tagMap = useMemo(() => {
        const map = new Map();
        tags.forEach(tag => map.set(tag.id, tag));
        return map;
    }, [tags]);

    // Get tag by ID
    const getTagById = useMemo(() => {
        return (tagId) => tagMap.get(tagId);
    }, [tagMap]);

    // Get category for a tag
    const getCategoryForTag = useMemo(() => {
        return (tagId) => {
            const tag = tagMap.get(tagId);
            if (!tag) return undefined;
            return tagCategories[tag.categoryId];
        };
    }, [tagMap, tagCategories]);

    // Group tags by category with counts, sorted by category order
    const tagsByCategory = useMemo(() => {
        const result = {};

        // Initialize all categories
        Object.values(tagCategories)
            .sort((a, b) => a.order - b.order)
            .forEach(category => {
                result[category.id] = {
                    ...category,
                    tags: [],
                };
            });

        // Add tags to their categories with counts
        tags.forEach(tag => {
            const categoryId = tag.categoryId || 'custom';
            if (result[categoryId]) {
                result[categoryId].tags.push({
                    ...tag,
                    count: tagCounts[tag.id] || 0,
                });
            }
        });

        // Sort tags within each category by name
        Object.values(result).forEach(category => {
            category.tags.sort((a, b) => a.name.localeCompare(b.name));
        });

        return result;
    }, [tags, tagCategories, tagCounts]);

    // All categories sorted by order
    const allCategories = useMemo(() => {
        return Object.values(tagCategories).sort((a, b) => a.order - b.order);
    }, [tagCategories]);

    return {
        tagCounts,
        tagsByCategory,
        getTagById,
        getCategoryForTag,
        allTags: tags,
        allCategories,
    };
}

export default useTagAnalysis;
