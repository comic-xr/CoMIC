/**
 * @file FilesTabV2.stories.jsx
 * @description Storybook stories for the FilesTabV2 component.
 *
 * FilesTabV2 features:
 * - Global search and type filters
 * - Resizable Starred section
 * - Tabbed browser (Workspace/Available tabs)
 * - Folder navigation with breadcrumbs
 * - Compact mode for small containers
 * - File load states (stored, loading, loaded, processing)
 */

import React from 'react';
import { FilesTabV2 } from './FilesTabV2';

export default {
    title: 'FilesTab/FilesTabV2',
    component: FilesTabV2,
    parameters: {
        layout: 'fullscreen',
    },
};

// Mock files with load states and folder assignments
const mockFiles = [
    // Workspace files (already added to workspace)
    { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, folderId: null, loaded: true, loadState: 'loaded' },
    { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: true, folderId: null, loaded: false, loadState: 'stored' },
    { id: 'f3', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', starred: false, folderId: null, loaded: false, loadState: 'stored' },
    // Available files (not in workspace)
    { id: 'f4', name: 'report.pdf', fileType: 'pdf', size: '2.4 MB', starred: false, folderId: 'folder1' },
    { id: 'f5', name: 'screenshot.png', fileType: 'png', size: '340 KB', starred: false, folderId: 'folder1' },
    { id: 'f6', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', starred: false, folderId: 'folder2' },
    { id: 'f7', name: 'heart_scan.nii.gz', fileType: 'nifti', size: '384 MB', starred: true, folderId: null },
    { id: 'f8', name: 'results.csv', fileType: 'csv', size: '856 KB', starred: false, folderId: null },
];

const mockStarredIds = new Set(['f1', 'f2', 'f7']);

const Template = (args) => (
    <div style={{
        width: args.width || '320px',
        height: args.height || '600px',
        background: 'var(--color-bg-primary, #0a0a0f)',
        padding: '8px',
    }}>
        <FilesTabV2 {...args} />
    </div>
);

export const Default = Template.bind({});
Default.args = {
    workspaceId: 'ws-1',
    mockFiles: mockFiles,
    mockStarredIds: mockStarredIds,
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const Loading = Template.bind({});
Loading.args = {
    workspaceId: 'ws-1',
    mockFiles: [],
    mockStarredIds: new Set(),
    mockIsLoading: true,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const Error = Template.bind({});
Error.args = {
    workspaceId: 'ws-1',
    mockFiles: [],
    mockStarredIds: new Set(),
    mockIsLoading: false,
    mockError: 'Network error: Unable to fetch files',
    width: '320px',
    height: '600px',
};

export const EmptyState = Template.bind({});
EmptyState.args = {
    workspaceId: 'ws-1',
    mockFiles: [],
    mockStarredIds: new Set(),
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const NoStarredFiles = Template.bind({});
NoStarredFiles.args = {
    workspaceId: 'ws-1',
    mockFiles: mockFiles.map(f => ({ ...f, starred: false })),
    mockStarredIds: new Set(),
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const WithLoadingFiles = Template.bind({});
WithLoadingFiles.args = {
    workspaceId: 'ws-1',
    mockFiles: [
        { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: false, loadState: 'loading' },
        { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: false, loaded: true, loadState: 'loaded' },
        { id: 'f3', name: 'analysis_data.csv', fileType: 'csv', size: '1.2 MB', starred: false, loaded: false, loadState: 'stored' },
    ],
    mockStarredIds: new Set(['f1']),
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const WithProcessingFiles = Template.bind({});
WithProcessingFiles.args = {
    workspaceId: 'ws-1',
    mockFiles: [
        { id: 'f1', name: 'brain_scan.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: true, loadState: 'processing' },
        { id: 'f2', name: 'ct_chest.dcm', fileType: 'dicom', size: '512 MB', starred: false, loaded: true, loadState: 'loaded' },
        { id: 'f3', name: 'spine_model.vtp', fileType: 'vtp', size: '64 MB', starred: false, loaded: false, loadState: 'stored' },
    ],
    mockStarredIds: new Set(['f1']),
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const CompactMode = Template.bind({});
CompactMode.args = {
    workspaceId: 'ws-1',
    mockFiles: mockFiles,
    mockStarredIds: mockStarredIds,
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '280px',
};

export const NarrowWidth = Template.bind({});
NarrowWidth.args = {
    workspaceId: 'ws-1',
    mockFiles: mockFiles,
    mockStarredIds: mockStarredIds,
    mockIsLoading: false,
    mockError: null,
    width: '240px',
    height: '500px',
};

export const WideLayout = Template.bind({});
WideLayout.args = {
    workspaceId: 'ws-1',
    mockFiles: mockFiles,
    mockStarredIds: mockStarredIds,
    mockIsLoading: false,
    mockError: null,
    width: '400px',
    height: '700px',
};

export const ManyFiles = Template.bind({});
ManyFiles.args = {
    workspaceId: 'ws-1',
    mockFiles: [
        ...mockFiles,
        { id: 'f9', name: 'volume_data.vti', fileType: 'vti', size: '128 MB', starred: false, folderId: null, loadState: 'stored' },
        { id: 'f10', name: 'documentation.pdf', fileType: 'pdf', size: '4.2 MB', starred: true, folderId: null, loadState: 'stored' },
        { id: 'f11', name: 'patient_notes.md', fileType: 'md', size: '12 KB', starred: false, folderId: null, loadState: 'stored' },
        { id: 'f12', name: 'scan_2023.nii.gz', fileType: 'nifti', size: '384 MB', starred: false, folderId: 'folder1', loaded: true, loadState: 'loaded' },
        { id: 'f13', name: 'measurements.csv', fileType: 'csv', size: '2.1 MB', starred: false, folderId: null, loadState: 'stored' },
        { id: 'f14', name: 'diagram.png', fileType: 'png', size: '1.8 MB', starred: false, folderId: 'folder2', loadState: 'stored' },
        { id: 'f15', name: 'model_final.vtp', fileType: 'vtp', size: '96 MB', starred: true, folderId: null, loaded: true, loadState: 'loaded' },
    ],
    mockStarredIds: new Set(['f1', 'f2', 'f7', 'f10', 'f15']),
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const MixedLoadStates = Template.bind({});
MixedLoadStates.args = {
    workspaceId: 'ws-1',
    mockFiles: [
        { id: 'f1', name: 'stored_file.nii.gz', fileType: 'nifti', size: '256 MB', starred: false, loaded: false, loadState: 'stored' },
        { id: 'f2', name: 'loading_file.dcm', fileType: 'dicom', size: '512 MB', starred: false, loaded: false, loadState: 'loading' },
        { id: 'f3', name: 'loaded_file.csv', fileType: 'csv', size: '1.2 MB', starred: true, loaded: true, loadState: 'loaded' },
        { id: 'f4', name: 'processing_file.vtp', fileType: 'vtp', size: '64 MB', starred: false, loaded: true, loadState: 'processing' },
    ],
    mockStarredIds: new Set(['f3']),
    mockIsLoading: false,
    mockError: null,
    width: '320px',
    height: '600px',
};

export const InPanel = () => (
    <div style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--color-bg-primary, #0a0a0f)',
    }}>
        {/* Simulated left panel */}
        <div style={{
            width: '320px',
            height: '100%',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <FilesTabV2
                workspaceId="ws-1"
                mockFiles={mockFiles}
                mockStarredIds={mockStarredIds}
            />
        </div>

        {/* Simulated main content */}
        <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted, #666)',
            fontSize: '14px',
        }}>
            Main viewport area
        </div>
    </div>
);
InPanel.parameters = {
    layout: 'fullscreen',
};

export const SideBySideComparison = () => (
    <div style={{
        display: 'flex',
        gap: '24px',
        padding: '24px',
        background: 'var(--color-bg-primary, #0a0a0f)',
        minHeight: '100vh',
    }}>
        <div>
            <h3 style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Full Mode (600px height)</h3>
            <div style={{ width: '320px', height: '600px', background: '#12121a', borderRadius: '8px' }}>
                <FilesTabV2
                    workspaceId="ws-1"
                    mockFiles={mockFiles}
                    mockStarredIds={mockStarredIds}
                />
            </div>
        </div>
        <div>
            <h3 style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Compact Mode (280px height)</h3>
            <div style={{ width: '320px', height: '280px', background: '#12121a', borderRadius: '8px' }}>
                <FilesTabV2
                    workspaceId="ws-1"
                    mockFiles={mockFiles}
                    mockStarredIds={mockStarredIds}
                />
            </div>
        </div>
    </div>
);
SideBySideComparison.parameters = {
    layout: 'fullscreen',
};

export const LoadStateComparison = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        background: 'var(--color-bg-primary, #0a0a0f)',
        minHeight: '100vh',
    }}>
        <h2 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>File Load States</h2>
        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
            Files show different indicators based on their load state: stored (on server), loading, loaded (in memory), or processing.
        </p>
        <div style={{ width: '320px', height: '500px', background: '#12121a', borderRadius: '8px' }}>
            <FilesTabV2
                workspaceId="ws-1"
                mockFiles={[
                    { id: 'f1', name: 'stored_file.nii.gz', fileType: 'nifti', size: '256 MB', starred: true, loaded: false, loadState: 'stored' },
                    { id: 'f2', name: 'loading_file.dcm', fileType: 'dicom', size: '512 MB', starred: false, loaded: false, loadState: 'loading' },
                    { id: 'f3', name: 'loaded_file.csv', fileType: 'csv', size: '1.2 MB', starred: true, loaded: true, loadState: 'loaded' },
                    { id: 'f4', name: 'processing_file.vtp', fileType: 'vtp', size: '64 MB', starred: false, loaded: true, loadState: 'processing' },
                ]}
                mockStarredIds={new Set(['f1', 'f3'])}
            />
        </div>
    </div>
);
LoadStateComparison.parameters = {
    layout: 'fullscreen',
};
