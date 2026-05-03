/**
 * @file StarredSection.stories.jsx
 * @description Storybook stories for the StarredSection component.
 *
 * StarredSection features:
 * - Resizable height with drag handle
 * - Local filter chips (All/Datasets/Files)
 * - Sort options (Recently Starred/Name/Modified)
 * - Filter bypass capability (show all when global filters active)
 * - Load state indicators (stored, loading, loaded, processing)
 * - Tag display support
 */

import React, { useState } from 'react';
import { StarredSection } from './StarredSection';

export default {
    title: 'FilesTab/StarredSection',
    component: StarredSection,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: '320px', background: 'var(--color-bg-secondary, #12121a)', borderRadius: '8px' }}>
                <Story />
            </div>
        ),
    ],
};

// Mock starred files with load states
const mockStarredFiles = [
    { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: true, loadState: 'loaded' },
    { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: true, loaded: false, loadState: 'stored' },
    { id: 'f3', name: 'report.pdf', fileType: 'pdf', type: 'document', size: '2.4 MB', starred: true, loaded: false, loadState: 'stored' },
    { id: 'f4', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', starred: true, loaded: false, loadState: 'loading' },
    { id: 'f5', name: 'screenshot.png', fileType: 'png', type: 'image', size: '340 KB', starred: true, loaded: false, loadState: 'stored' },
];

// Sample tags for tag display
const mockTags = [
    { id: 'pre-op', name: 'Pre-op', categoryId: 'phase' },
    { id: 'baseline', name: 'Baseline', categoryId: 'phase' },
    { id: 'approved', name: 'Approved', categoryId: 'status' },
];

const mockTagCategories = {
    phase: { id: 'phase', name: 'Phase', color: '#3b82f6' },
    status: { id: 'status', name: 'Status', color: '#10b981' },
};

const getCategoryForTag = (tag) => mockTagCategories[tag?.categoryId] || null;

const Template = (args) => {
    const [expanded, setExpanded] = useState(args.expanded ?? true);
    const [height, setHeight] = useState(args.height ?? 180);
    const [selectedFileId, setSelectedFileId] = useState(null);

    return (
        <StarredSection
            {...args}
            expanded={expanded}
            onToggle={() => setExpanded(!expanded)}
            height={height}
            selectedFileId={selectedFileId}
            onSelect={setSelectedFileId}
            onDoubleClick={(file) => console.log('Double-click:', file.name)}
            onToggleStar={(fileId) => console.log('Toggle star:', fileId)}
            onDragStart={(e, file) => console.log('Drag start:', file.name)}
            onContextMenu={(e, file) => console.log('Context menu:', file.name)}
            onMenuClick={(e, file) => console.log('Menu click:', file.name)}
            tags={mockTags}
            getCategoryForTag={getCategoryForTag}
        />
    );
};

export const Default = Template.bind({});
Default.args = {
    items: mockStarredFiles,
    expanded: true,
    height: 180,
};

export const Collapsed = Template.bind({});
Collapsed.args = {
    items: mockStarredFiles,
    expanded: false,
};

export const Empty = Template.bind({});
Empty.args = {
    items: [],
    expanded: false,
};

export const SingleItem = Template.bind({});
SingleItem.args = {
    items: [mockStarredFiles[0]],
    expanded: true,
};

export const ManyItems = Template.bind({});
ManyItems.args = {
    items: [
        ...mockStarredFiles,
        { id: 'f6', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', starred: true, loaded: true, loadState: 'loaded' },
        { id: 'f7', name: 'patient_notes.md', fileType: 'md', type: 'document', size: '12 KB', starred: true, loaded: false, loadState: 'stored' },
        { id: 'f8', name: 'scan_2023.nii.gz', fileType: 'nifti', size: '384 MB', starred: true, loaded: false, loadState: 'loading' },
    ],
    expanded: true,
    height: 220,
};

export const WithLoadStates = Template.bind({});
WithLoadStates.args = {
    items: [
        { id: 'f1', name: 'stored_file.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: false, loadState: 'stored' },
        { id: 'f2', name: 'loading_file.dcm', fileType: 'dicom', size: '512 MB', starred: true, loaded: false, loadState: 'loading' },
        { id: 'f3', name: 'loaded_file.csv', fileType: 'csv', size: '1.2 MB', starred: true, loaded: true, loadState: 'loaded' },
        { id: 'f4', name: 'processing_file.vtp', fileType: 'vtp', size: '64 MB', starred: true, loaded: true, loadState: 'processing' },
    ],
    expanded: true,
    height: 180,
};

export const WithActiveFilters = () => {
    const [expanded, setExpanded] = useState(true);
    const [selectedFileId, setSelectedFileId] = useState(null);

    const filters = {
        searchQuery: 'brain',
        typeFilters: ['nifti'],
        tagFilters: [],
    };

    const applyFilters = (items) => {
        return items.filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(filters.searchQuery.toLowerCase());
            const matchesType = filters.typeFilters.length === 0 || filters.typeFilters.includes(item.fileType);
            return matchesSearch && matchesType;
        });
    };

    return (
        <div>
            <p style={{ fontSize: '11px', color: '#888', padding: '8px', marginBottom: '8px' }}>
                Global filter active: searching "brain" in NIfTI files.
                Some starred items may be hidden. Click "Show all" to bypass.
            </p>
            <StarredSection
                items={mockStarredFiles}
                filters={filters}
                applyFilters={applyFilters}
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
                height={180}
                selectedFileId={selectedFileId}
                onSelect={setSelectedFileId}
                onDoubleClick={(file) => console.log('Double-click:', file.name)}
                onToggleStar={(fileId) => console.log('Toggle star:', fileId)}
                tags={mockTags}
                getCategoryForTag={getCategoryForTag}
            />
        </div>
    );
};

export const OnlyDatasets = Template.bind({});
OnlyDatasets.args = {
    items: mockStarredFiles.filter(f => f.fileType === 'nifti' || f.fileType === 'dicom' || f.fileType === 'csv'),
    expanded: true,
};

export const OnlyDocuments = Template.bind({});
OnlyDocuments.args = {
    items: mockStarredFiles.filter(f => f.type === 'document' || f.type === 'image'),
    expanded: true,
};

export const Interactive = () => {
    const [items, setItems] = useState(mockStarredFiles);
    const [expanded, setExpanded] = useState(true);
    const [height, setHeight] = useState(180);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isResizing, setIsResizing] = useState(false);

    const handleResizeStart = (e) => {
        e.preventDefault();
        setIsResizing(true);
        const startY = e.clientY;
        const startHeight = height;

        const handleMouseMove = (moveEvent) => {
            const delta = moveEvent.clientY - startY;
            setHeight(Math.max(80, Math.min(300, startHeight + delta)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleToggleStar = (fileId) => {
        setItems(prev => prev.filter(f => f.id !== fileId));
    };

    return (
        <div>
            <p style={{ fontSize: '11px', color: '#888', padding: '8px', marginBottom: '8px' }}>
                Drag the resize handle to adjust height. Click star icon to unstar files.
                Right-click for context menu.
            </p>
            <StarredSection
                items={items}
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
                height={height}
                onResizeStart={handleResizeStart}
                selectedFileId={selectedFileId}
                onSelect={setSelectedFileId}
                onToggleStar={handleToggleStar}
                onDoubleClick={(file) => console.log('Open file:', file.name)}
                onDragStart={(e, file) => console.log('Drag start:', file.name)}
                onContextMenu={(e, file) => {
                    e.preventDefault();
                    console.log('Context menu:', file.name);
                }}
                onMenuClick={(e, file) => console.log('Menu click:', file.name)}
                tags={mockTags}
                getCategoryForTag={getCategoryForTag}
            />
        </div>
    );
};

export const LoadStateComparison = () => (
    <div style={{ padding: '16px' }}>
        <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px' }}>File Load States in Starred Section</h3>
        <p style={{ color: '#888', fontSize: '11px', marginBottom: '16px' }}>
            Files show different indicators: stored (server), loading, loaded (memory), processing.
        </p>
        <StarredSection
            items={[
                { id: 'f1', name: 'stored_file.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: false, loadState: 'stored' },
                { id: 'f2', name: 'loading_file.dcm', fileType: 'dicom', size: '512 MB', starred: true, loaded: false, loadState: 'loading' },
                { id: 'f3', name: 'loaded_file.csv', fileType: 'csv', size: '1.2 MB', starred: true, loaded: true, loadState: 'loaded' },
                { id: 'f4', name: 'processing_file.vtp', fileType: 'vtp', size: '64 MB', starred: true, loaded: true, loadState: 'processing' },
            ]}
            expanded={true}
            onToggle={() => {}}
            height={180}
            onDoubleClick={(file) => console.log('Open:', file.name)}
            onToggleStar={(id) => console.log('Toggle star:', id)}
            tags={mockTags}
            getCategoryForTag={getCategoryForTag}
        />
    </div>
);
