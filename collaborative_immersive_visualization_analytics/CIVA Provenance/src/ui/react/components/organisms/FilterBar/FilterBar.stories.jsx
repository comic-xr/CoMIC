// src/ui/react/components/organisms/FilterBar/FilterBar.stories.jsx
import React, { useState } from 'react';
import { FilterBar } from './FilterBar';

export default {
    title: 'Organisms/FilterBar',
    component: FilterBar,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onSearchChange: { action: 'search' },
        onFilterChange: { action: 'filter' },
        onViewModeChange: { action: 'viewMode' },
        onSortChange: { action: 'sort' },
        onClearAll: { action: 'clearAll' },
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '20px',
                background: '#0a0a0f',
                width: '700px',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        searchValue: '',
        searchPlaceholder: 'Search files...',
        filters: [
            { id: 'vtk', label: 'VTK', icon: 'box' },
            { id: 'image', label: 'Images', icon: 'image' },
            { id: 'data', label: 'Data', icon: 'database' },
        ],
        activeFilters: [],
        viewModes: [
            { value: 'grid', icon: 'grid' },
            { value: 'list', icon: 'list' },
        ],
        activeViewMode: 'grid',
    },
};

export const WithActiveFilters = {
    args: {
        searchValue: 'brain',
        searchPlaceholder: 'Search files...',
        filters: [
            { id: 'vtk', label: 'VTK', icon: 'box' },
            { id: 'image', label: 'Images', icon: 'image' },
            { id: 'data', label: 'Data', icon: 'database' },
        ],
        activeFilters: ['vtk', 'image'],
        viewModes: [
            { value: 'grid', icon: 'grid' },
            { value: 'list', icon: 'list' },
        ],
        activeViewMode: 'list',
    },
};

export const Interactive = {
    render: function InteractiveStory() {
        const [search, setSearch] = useState('');
        const [filters, setFilters] = useState([]);
        const [viewMode, setViewMode] = useState('grid');
        const [sort, setSort] = useState('name');

        return (
            <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search datasets..."
                filters={[
                    { id: 'vtk', label: 'VTK', icon: 'box', color: '#3b82f6' },
                    { id: 'image', label: 'Images', icon: 'image', color: '#22c55e' },
                    { id: 'csv', label: 'CSV', icon: 'fileText', color: '#f59e0b' },
                ]}
                activeFilters={filters}
                onFilterChange={setFilters}
                sortOptions={[
                    { value: 'name', icon: 'arrowDownAZ', label: 'Name' },
                    { value: 'date', icon: 'clock', label: 'Date' },
                    { value: 'size', icon: 'hardDrive', label: 'Size' },
                ]}
                activeSort={sort}
                onSortChange={setSort}
                viewModes={[
                    { value: 'grid', icon: 'grid' },
                    { value: 'list', icon: 'list' },
                ]}
                activeViewMode={viewMode}
                onViewModeChange={setViewMode}
                onClearAll={() => {
                    setSearch('');
                    setFilters([]);
                }}
            />
        );
    },
};

export const SearchOnly = {
    args: {
        searchValue: '',
        searchPlaceholder: 'Search annotations...',
    },
};

export const FiltersOnly = {
    args: {
        filters: [
            { id: 'pending', label: 'Pending', color: '#f59e0b' },
            { id: 'approved', label: 'Approved', color: '#22c55e' },
            { id: 'rejected', label: 'Rejected', color: '#ef4444' },
        ],
        activeFilters: ['pending'],
    },
};

export const WithActions = {
    args: {
        searchValue: '',
        searchPlaceholder: 'Search...',
        filters: [
            { id: 'all', label: 'All' },
            { id: 'recent', label: 'Recent' },
            { id: 'starred', label: 'Starred', icon: 'star' },
        ],
        activeFilters: [],
        actions: [
            { id: 'refresh', icon: 'refreshCw', tooltip: 'Refresh' },
            { id: 'settings', icon: 'settings', tooltip: 'Settings' },
            { id: 'add', icon: 'plus', tooltip: 'Add New', variant: 'primary' },
        ],
    },
};

export const FileManager = {
    render: function FileManagerStory() {
        const [search, setSearch] = useState('');
        const [filters, setFilters] = useState([]);
        const [viewMode, setViewMode] = useState('grid');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FilterBar
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search files..."
                    filters={[
                        { id: 'vtk', label: '.vtk', color: '#3b82f6' },
                        { id: 'vtp', label: '.vtp', color: '#8b5cf6' },
                        { id: 'stl', label: '.stl', color: '#ec4899' },
                        { id: 'obj', label: '.obj', color: '#f97316' },
                    ]}
                    activeFilters={filters}
                    onFilterChange={setFilters}
                    viewModes={[
                        { value: 'grid', icon: 'grid' },
                        { value: 'list', icon: 'list' },
                    ]}
                    activeViewMode={viewMode}
                    onViewModeChange={setViewMode}
                    actions={[
                        { id: 'upload', icon: 'upload', tooltip: 'Upload Files' },
                        { id: 'newFolder', icon: 'folderPlus', tooltip: 'New Folder' },
                    ]}
                    onClearAll={() => {
                        setSearch('');
                        setFilters([]);
                    }}
                />

                {/* Preview of filtered state */}
                <div style={{
                    padding: '16px',
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    color: '#9ca3af',
                    fontSize: '13px',
                }}>
                    <strong>Current State:</strong><br />
                    Search: "{search}"<br />
                    Filters: [{filters.join(', ')}]<br />
                    View: {viewMode}
                </div>
            </div>
        );
    },
};

export const AnnotationFilter = {
    args: {
        searchValue: '',
        searchPlaceholder: 'Search annotations...',
        filters: [
            { id: 'notes', label: 'Notes', icon: 'messageSquare', color: '#3b82f6' },
            { id: 'measurements', label: 'Measurements', icon: 'ruler', color: '#22c55e' },
            { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark', color: '#f59e0b' },
        ],
        activeFilters: ['notes'],
        sortOptions: [
            { value: 'newest', label: 'Newest', icon: 'arrowDown' },
            { value: 'oldest', label: 'Oldest', icon: 'arrowUp' },
        ],
        activeSort: 'newest',
    },
};
