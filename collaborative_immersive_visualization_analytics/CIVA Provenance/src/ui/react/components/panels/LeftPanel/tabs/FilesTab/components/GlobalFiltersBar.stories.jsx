import React, { useState } from 'react';
import { GlobalFiltersBar } from './GlobalFiltersBar';

export default {
    title: 'FilesTab/GlobalFiltersBar',
    component: GlobalFiltersBar,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '16px',
                background: '#0f0f0f',
                borderRadius: '8px',
                minWidth: '360px',
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}>
                    <Story />
                </div>
            </div>
        ),
    ],
};

// Sample data
const SAMPLE_TAGS = [
    { id: 'pre-op', name: 'Pre-op', categoryId: 'phase' },
    { id: 'post-op', name: 'Post-op', categoryId: 'phase' },
    { id: 'baseline', name: 'Baseline', categoryId: 'phase' },
    { id: 'pending', name: 'Pending Review', categoryId: 'status' },
    { id: 'approved', name: 'Approved', categoryId: 'status' },
    { id: 'control', name: 'Control', categoryId: 'cohort' },
    { id: 'treatment', name: 'Treatment', categoryId: 'cohort' },
];

const SAMPLE_TAGS_BY_CATEGORY = {
    phase: {
        id: 'phase',
        label: 'Study Phase',
        color: '#8b5cf6',
        order: 1,
        tags: [
            { id: 'pre-op', name: 'Pre-op', categoryId: 'phase', count: 12 },
            { id: 'post-op', name: 'Post-op', categoryId: 'phase', count: 8 },
            { id: 'baseline', name: 'Baseline', categoryId: 'phase', count: 15 },
        ],
    },
    status: {
        id: 'status',
        label: 'Status',
        color: '#f59e0b',
        order: 2,
        tags: [
            { id: 'pending', name: 'Pending Review', categoryId: 'status', count: 5 },
            { id: 'approved', name: 'Approved', categoryId: 'status', count: 20 },
        ],
    },
    cohort: {
        id: 'cohort',
        label: 'Cohort',
        color: '#10b981',
        order: 3,
        tags: [
            { id: 'control', name: 'Control', categoryId: 'cohort', count: 10 },
            { id: 'treatment', name: 'Treatment', categoryId: 'cohort', count: 14 },
        ],
    },
};

// Default state
export const Default = () => {
    const [filters, setFilters] = useState({
        searchQuery: '',
        typeFilters: [],
        tagFilters: [],
        sortBy: 'name',
    });

    const handleFiltersChange = (updates) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    const hasActiveFilters = filters.searchQuery.length > 0 ||
        filters.typeFilters.length > 0 ||
        filters.tagFilters.length > 0;

    const activeFilterCount = (filters.searchQuery ? 1 : 0) +
        filters.typeFilters.length +
        filters.tagFilters.length;

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => setFilters({
                searchQuery: '',
                typeFilters: [],
                tagFilters: [],
                sortBy: filters.sortBy,
            })}
            tags={SAMPLE_TAGS}
            tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
        />
    );
};

// With search query
export const WithSearch = () => {
    const [filters, setFilters] = useState({
        searchQuery: 'brain scan',
        typeFilters: [],
        tagFilters: [],
        sortBy: 'name',
    });

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
            hasActiveFilters={true}
            activeFilterCount={1}
            onClearFilters={() => {}}
            tags={SAMPLE_TAGS}
            tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
        />
    );
};

// With type filters
export const WithTypeFilters = () => {
    const [filters, setFilters] = useState({
        searchQuery: '',
        typeFilters: ['nifti', 'dicom'],
        tagFilters: [],
        sortBy: 'name',
    });

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
            hasActiveFilters={true}
            activeFilterCount={2}
            onClearFilters={() => {}}
            tags={SAMPLE_TAGS}
            tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
        />
    );
};

// With tag filters
export const WithTagFilters = () => {
    const [filters, setFilters] = useState({
        searchQuery: '',
        typeFilters: [],
        tagFilters: ['pre-op', 'approved'],
        sortBy: 'name',
    });

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
            hasActiveFilters={true}
            activeFilterCount={2}
            onClearFilters={() => {}}
            tags={SAMPLE_TAGS}
            tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
        />
    );
};

// Fully loaded with all filters
export const FullyLoaded = () => {
    const [filters, setFilters] = useState({
        searchQuery: 'patient',
        typeFilters: ['nifti'],
        tagFilters: ['pre-op', 'control', 'pending'],
        sortBy: 'date',
    });

    const handleFiltersChange = (updates) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    const activeFilterCount = 1 + filters.typeFilters.length + filters.tagFilters.length;

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            hasActiveFilters={true}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => setFilters({
                searchQuery: '',
                typeFilters: [],
                tagFilters: [],
                sortBy: filters.sortBy,
            })}
            tags={SAMPLE_TAGS}
            tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
        />
    );
};

// With tag creation enabled
export const WithTagCreation = () => {
    const [filters, setFilters] = useState({
        searchQuery: '',
        typeFilters: [],
        tagFilters: [],
        sortBy: 'name',
    });
    const [tags, setTags] = useState(SAMPLE_TAGS);
    const [tagsByCategory, setTagsByCategory] = useState(SAMPLE_TAGS_BY_CATEGORY);

    const handleCreateTag = ({ name, categoryId }) => {
        const newTag = {
            id: `custom-${Date.now()}`,
            name,
            categoryId,
            count: 0,
        };
        setTags(prev => [...prev, newTag]);
        setTagsByCategory(prev => ({
            ...prev,
            [categoryId]: {
                ...prev[categoryId],
                tags: [...prev[categoryId].tags, newTag],
            },
        }));
        // Auto-select new tag
        setFilters(prev => ({
            ...prev,
            tagFilters: [...prev.tagFilters, newTag.id],
        }));
    };

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
            hasActiveFilters={filters.tagFilters.length > 0}
            activeFilterCount={filters.tagFilters.length}
            onClearFilters={() => setFilters(prev => ({ ...prev, tagFilters: [] }))}
            tags={tags}
            tagsByCategory={tagsByCategory}
            allowTagCreation={true}
            onCreateTag={handleCreateTag}
        />
    );
};

// No tags available
export const NoTags = () => {
    const [filters, setFilters] = useState({
        searchQuery: '',
        typeFilters: [],
        tagFilters: [],
        sortBy: 'name',
    });

    return (
        <GlobalFiltersBar
            filters={filters}
            onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
            hasActiveFilters={false}
            activeFilterCount={0}
            onClearFilters={() => {}}
            tags={[]}
            tagsByCategory={{}}
        />
    );
};
