/**
 * @file CompactFilesPanel.stories.jsx
 * @description Storybook stories for the CompactFilesPanel component
 */

import React, { useState } from 'react';
import { CompactFilesPanel } from './CompactFilesPanel';

export default {
    title: 'FilesTab/CompactFilesPanel',
    component: CompactFilesPanel,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: '320px', height: '280px', background: 'var(--color-bg-secondary, #12121a)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                <Story />
            </div>
        ),
    ],
};

const mockStarredFiles = [
    { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loadState: 'loaded' },
    { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: true, loadState: 'stored' },
];

const mockWorkspaceFiles = [
    { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', loadState: 'loaded' },
    { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', loadState: 'loading' },
    { id: 'f3', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', loadState: 'stored' },
];

const mockAvailableFiles = [
    { id: 'f4', name: 'report.pdf', fileType: 'pdf', size: '2.4 MB', loadState: 'stored' },
    { id: 'f5', name: 'screenshot.png', fileType: 'png', size: '340 KB', loadState: 'stored' },
    { id: 'f6', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', loadState: 'stored' },
    { id: 'f7', name: 'heart_scan.nii.gz', fileType: 'nifti', size: '384 MB', loadState: 'stored' },
];

const Template = (args) => (
    <CompactFilesPanel
        {...args}
        onFileClick={(file) => console.log('File clicked:', file.name)}
        onFileDoubleClick={(file) => console.log('File double-clicked:', file.name)}
        onToggleStar={(fileId) => console.log('Toggle star:', fileId)}
        onAddToWorkspace={(fileId) => console.log('Add to workspace:', fileId)}
        onRemoveFromWorkspace={(fileId) => console.log('Remove from workspace:', fileId)}
    />
);

export const Default = Template.bind({});
Default.args = {
    starredFiles: mockStarredFiles,
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    containerWidth: 320,
};

export const NarrowWidth = Template.bind({});
NarrowWidth.args = {
    starredFiles: mockStarredFiles,
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    containerWidth: 200,
};
NarrowWidth.decorators = [
    (Story) => (
        <div style={{ maxWidth: '200px', height: '280px', background: 'var(--color-bg-secondary, #12121a)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <Story />
        </div>
    ),
];

export const NoStarredFiles = Template.bind({});
NoStarredFiles.args = {
    starredFiles: [],
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    containerWidth: 320,
};

export const EmptyWorkspace = Template.bind({});
EmptyWorkspace.args = {
    starredFiles: mockStarredFiles,
    workspaceFiles: [],
    availableFiles: [...mockWorkspaceFiles, ...mockAvailableFiles],
    containerWidth: 320,
};

export const NoAvailableFiles = Template.bind({});
NoAvailableFiles.args = {
    starredFiles: mockStarredFiles,
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: [],
    containerWidth: 320,
};

export const NoFiles = Template.bind({});
NoFiles.args = {
    starredFiles: [],
    workspaceFiles: [],
    availableFiles: [],
    containerWidth: 320,
};

export const ManyFiles = Template.bind({});
ManyFiles.args = {
    starredFiles: [
        ...mockStarredFiles,
        { id: 'f6', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', starred: true, loadState: 'loaded' },
        { id: 'f7', name: 'heart_scan.nii.gz', fileType: 'nifti', size: '384 MB', starred: true, loadState: 'processing' },
    ],
    workspaceFiles: [
        ...mockWorkspaceFiles,
        { id: 'f8', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', loadState: 'loaded' },
        { id: 'f9', name: 'heart_scan.nii.gz', fileType: 'nifti', size: '384 MB', loadState: 'processing' },
    ],
    availableFiles: [
        ...mockAvailableFiles,
        { id: 'f10', name: 'results.csv', fileType: 'csv', size: '856 KB', loadState: 'stored' },
        { id: 'f11', name: 'archive.zip', fileType: 'zip', size: '1.2 GB', loadState: 'stored' },
    ],
    containerWidth: 320,
};

export const Interactive = () => {
    const [starredIds, setStarredIds] = useState(new Set(['f1', 'f2']));
    const [workspaceIds, setWorkspaceIds] = useState(new Set(['f1', 'f2', 'f3']));

    const allFiles = [
        { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', loadState: 'loaded' },
        { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', loadState: 'loading' },
        { id: 'f3', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', loadState: 'stored' },
        { id: 'f4', name: 'report.pdf', fileType: 'pdf', size: '2.4 MB', loadState: 'stored' },
        { id: 'f5', name: 'screenshot.png', fileType: 'png', size: '340 KB', loadState: 'stored' },
    ];

    const handleToggleStar = (fileId) => {
        setStarredIds(prev => {
            const next = new Set(prev);
            next.has(fileId) ? next.delete(fileId) : next.add(fileId);
            return next;
        });
    };

    const handleAddToWorkspace = (fileId) => {
        setWorkspaceIds(prev => new Set([...prev, fileId]));
    };

    const handleRemoveFromWorkspace = (fileId) => {
        setWorkspaceIds(prev => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
        });
    };

    const starredFiles = allFiles.filter(f => starredIds.has(f.id)).map(f => ({ ...f, starred: true }));
    const workspaceFiles = allFiles.filter(f => workspaceIds.has(f.id));
    const availableFiles = allFiles.filter(f => !workspaceIds.has(f.id));

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '11px', color: '#888', padding: '8px', flexShrink: 0 }}>
                Switch tabs and interact with files. Click star icons or use workspace buttons.
            </p>
            <div style={{ flex: 1, minHeight: 0 }}>
                <CompactFilesPanel
                    starredFiles={starredFiles}
                    workspaceFiles={workspaceFiles}
                    availableFiles={availableFiles}
                    containerWidth={320}
                    onToggleStar={handleToggleStar}
                    onFileClick={(file) => console.log('Selected:', file.name)}
                    onAddToWorkspace={handleAddToWorkspace}
                    onRemoveFromWorkspace={handleRemoveFromWorkspace}
                />
            </div>
        </div>
    );
};

export const WideLayout = Template.bind({});
WideLayout.args = {
    starredFiles: mockStarredFiles,
    workspaceFiles: mockWorkspaceFiles,
    availableFiles: mockAvailableFiles,
    containerWidth: 400,
};
WideLayout.decorators = [
    (Story) => (
        <div style={{ maxWidth: '400px', height: '280px', background: 'var(--color-bg-secondary, #12121a)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <Story />
        </div>
    ),
];
