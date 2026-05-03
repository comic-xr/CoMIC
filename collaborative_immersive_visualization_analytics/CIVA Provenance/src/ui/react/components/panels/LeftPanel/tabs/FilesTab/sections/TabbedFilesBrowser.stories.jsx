/**
 * @file TabbedFilesBrowser.stories.jsx
 * @description Storybook stories for the TabbedFilesBrowser component.
 *
 * TabbedFilesBrowser has two tabs:
 * - Workspace: Files added to the current workspace
 * - Available: Project files not yet added to workspace
 */

import React, { useState } from 'react';
import { TabbedFilesBrowser } from './TabbedFilesBrowser';

export default {
    title: 'FilesTab/TabbedFilesBrowser',
    component: TabbedFilesBrowser,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: '360px', height: '500px', background: 'var(--color-bg-secondary, #12121a)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                <Story />
            </div>
        ),
    ],
};

// Mock data for workspace files (files user has added to their workspace)
const mockWorkspaceFiles = [
    { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, folderId: null, loaded: true, loadState: 'loaded' },
    { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: false, folderId: null, loaded: false, loadState: 'stored' },
    { id: 'f3', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', starred: false, folderId: null, loaded: false, loadState: 'stored' },
];

// Mock data for available files (files not yet in workspace)
const mockAvailableFiles = [
    { id: 'f4', name: 'report.pdf', fileType: 'pdf', size: '2.4 MB', starred: false, folderId: 'folder1' },
    { id: 'f5', name: 'screenshot.png', fileType: 'png', size: '340 KB', starred: false, folderId: 'folder1' },
    { id: 'f6', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', starred: false, folderId: 'folder2' },
    { id: 'f7', name: 'heart_data.nii.gz', fileType: 'nifti', size: '384 MB', starred: false, folderId: null },
    { id: 'f8', name: 'results.csv', fileType: 'csv', size: '856 KB', starred: false, folderId: null },
];

// All files combined (for folder navigation context)
const mockAllFiles = [...mockWorkspaceFiles, ...mockAvailableFiles];

const mockFolders = [
    { id: 'folder1', name: 'Raw Scans', parentId: null },
    { id: 'folder2', name: 'Processed', parentId: null },
    { id: 'folder3', name: 'Session 1', parentId: 'folder1' },
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
    const [activeTab, setActiveTab] = useState(args.activeTab || 'workspace');
    const [selectedFileId, setSelectedFileId] = useState(null);

    return (
        <TabbedFilesBrowser
            {...args}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedFileId={selectedFileId}
            onSelect={setSelectedFileId}
            onDoubleClick={(file) => console.log('Double-click:', file.name)}
            onToggleStar={(fileId) => console.log('Toggle star:', fileId)}
            onDragStart={(e, file) => console.log('Drag start:', file.name)}
            onContextMenu={(e, file) => console.log('Context menu:', file.name)}
            onMenuClick={(e, file) => console.log('Menu click:', file.name)}
            onAddToWorkspace={(fileId) => console.log('Add to workspace:', fileId)}
            tags={mockTags}
            getCategoryForTag={getCategoryForTag}
        />
    );
};

export const WorkspaceTab = Template.bind({});
WorkspaceTab.args = {
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'workspace',
};

export const AvailableTab = Template.bind({});
AvailableTab.args = {
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'available',
};

export const EmptyWorkspace = Template.bind({});
EmptyWorkspace.args = {
    workspaceFiles: [],
    availableFiles: mockAvailableFiles,
    allFiles: mockAvailableFiles,
    folders: mockFolders,
    activeTab: 'workspace',
};

export const AllFilesInWorkspace = Template.bind({});
AllFilesInWorkspace.args = {
    workspaceFiles: mockAllFiles,
    availableFiles: [],
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'available',
};

export const WithFolders = Template.bind({});
WithFolders.args = {
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'workspace',
};

export const NoFolders = Template.bind({});
NoFolders.args = {
    workspaceFiles: mockWorkspaceFiles.map(f => ({ ...f, folderId: null })),
    availableFiles: mockAvailableFiles.map(f => ({ ...f, folderId: null })),
    allFiles: mockAllFiles.map(f => ({ ...f, folderId: null })),
    folders: [],
    activeTab: 'workspace',
};

export const ManyWorkspaceFiles = Template.bind({});
ManyWorkspaceFiles.args = {
    workspaceFiles: [
        ...mockWorkspaceFiles,
        { id: 'f9', name: 'patient_notes.md', fileType: 'md', size: '12 KB', starred: false, loaded: false },
        { id: 'f10', name: 'scan_2023.nii.gz', fileType: 'nifti', size: '384 MB', starred: true, loaded: true, loadState: 'loaded' },
        { id: 'f11', name: 'volume_data.vti', fileType: 'vti', size: '128 MB', starred: false, loaded: false },
        { id: 'f12', name: 'documentation.pdf', fileType: 'pdf', size: '4.2 MB', starred: false, loaded: false },
    ],
    availableFiles: mockAvailableFiles,
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'workspace',
};

export const WithLoadingFile = Template.bind({});
WithLoadingFile.args = {
    workspaceFiles: [
        { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: false, loadState: 'loading' },
        { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: false, loaded: true, loadState: 'loaded' },
        { id: 'f3', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', starred: false, loaded: false, loadState: 'stored' },
    ],
    availableFiles: mockAvailableFiles,
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'workspace',
};

export const WithProcessingFile = Template.bind({});
WithProcessingFile.args = {
    workspaceFiles: [
        { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: true, loadState: 'processing' },
        { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: false, loaded: true, loadState: 'loaded' },
    ],
    availableFiles: mockAvailableFiles,
    allFiles: mockAllFiles,
    folders: mockFolders,
    activeTab: 'workspace',
};

export const WithFilters = () => {
    const [activeTab, setActiveTab] = useState('workspace');

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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '11px', color: '#888', padding: '8px', flexShrink: 0 }}>
                Global filter active: searching "brain" in NIfTI files.
            </p>
            <div style={{ flex: 1, minHeight: 0 }}>
                <TabbedFilesBrowser
                    workspaceFiles={mockWorkspaceFiles}
                    availableFiles={mockAvailableFiles}
                    allFiles={mockAllFiles}
                    folders={mockFolders}
                    filters={filters}
                    applyFilters={applyFilters}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onAddToWorkspace={(id) => console.log('Add:', id)}
                    tags={mockTags}
                    getCategoryForTag={getCategoryForTag}
                />
            </div>
        </div>
    );
};

export const Interactive = () => {
    const [activeTab, setActiveTab] = useState('workspace');
    const [workspaceFileIds, setWorkspaceFileIds] = useState(new Set(['f1', 'f2', 'f3']));
    const [selectedFileId, setSelectedFileId] = useState(null);

    const allFiles = mockAllFiles;
    const workspaceFiles = allFiles.filter(f => workspaceFileIds.has(f.id));
    const availableFiles = allFiles.filter(f => !workspaceFileIds.has(f.id));

    const handleAddToWorkspace = (fileId) => {
        setWorkspaceFileIds(prev => new Set([...prev, fileId]));
        console.log('Added to workspace:', fileId);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '11px', color: '#888', padding: '8px', flexShrink: 0 }}>
                Switch between Workspace and Available tabs. Click + to add files to workspace.
            </p>
            <div style={{ flex: 1, minHeight: 0 }}>
                <TabbedFilesBrowser
                    workspaceFiles={workspaceFiles}
                    availableFiles={availableFiles}
                    allFiles={allFiles}
                    folders={mockFolders}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    selectedFileId={selectedFileId}
                    onSelect={setSelectedFileId}
                    onAddToWorkspace={handleAddToWorkspace}
                    onToggleStar={(id) => console.log('Star:', id)}
                    tags={mockTags}
                    getCategoryForTag={getCategoryForTag}
                />
            </div>
        </div>
    );
};
