/**
 * @file FilesTab.stories.jsx
 * @description Storybook stories for FilesTab component.
 */

import React from 'react';
import { FilesPanelContent } from './FilesTab';

// Mock files data
const mockFiles = [
    {
        id: 'file-1',
        name: 'brain_scan.nii',
        fileType: 'nii',
        size: '24.5 MB',
        starred: true,
        loaded: true,
        thumbnail: true,
        uploadedAt: '2024-01-15T10:00:00Z',
    },
    {
        id: 'file-2',
        name: 'heart_model.vtk',
        fileType: 'vtk',
        size: '12.3 MB',
        starred: false,
        loaded: false,
        thumbnail: true,
        uploadedAt: '2024-01-14T14:30:00Z',
    },
    {
        id: 'file-3',
        name: 'ct_scan.dcm',
        fileType: 'dcm',
        size: '156.8 MB',
        starred: true,
        loaded: false,
        thumbnail: true,
        uploadedAt: '2024-01-13T09:15:00Z',
    },
    {
        id: 'file-4',
        name: 'fiber_tracts.vtp',
        fileType: 'vtp',
        size: '8.7 MB',
        starred: false,
        loaded: true,
        thumbnail: true,
        uploadedAt: '2024-01-12T16:45:00Z',
    },
    {
        id: 'file-5',
        name: 'analysis_report.csv',
        fileType: 'csv',
        size: '1.2 MB',
        starred: false,
        loaded: false,
        thumbnail: false,
        uploadedAt: '2024-01-11T11:20:00Z',
    },
];

export default {
    title: 'Panels/LeftPanel/FilesTab',
    component: FilesPanelContent,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    width: 280,
                    height: 600,
                    background: 'var(--color-bg-secondary, #1e1e1e)',
                    borderRadius: 8,
                    overflow: 'hidden',
                }}
            >
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        workspaceId: 'ws-1',
        mockFiles: mockFiles,
        mockStarredIds: new Set(['file-1', 'file-3']),
        mockIsLoading: false,
        mockError: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Files tab with sample files in list view.',
            },
        },
    },
};

export const Empty = {
    args: {
        workspaceId: 'ws-1',
        mockFiles: [],
        mockStarredIds: new Set(),
        mockIsLoading: false,
        mockError: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Files tab with no files uploaded.',
            },
        },
    },
};

export const Loading = {
    args: {
        workspaceId: 'ws-1',
        mockFiles: [],
        mockStarredIds: new Set(),
        mockIsLoading: true,
        mockError: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Files tab in loading state.',
            },
        },
    },
};

export const WithError = {
    args: {
        workspaceId: 'ws-1',
        mockFiles: [],
        mockStarredIds: new Set(),
        mockIsLoading: false,
        mockError: 'Network error: Unable to fetch files',
    },
    parameters: {
        docs: {
            description: {
                story: 'Files tab showing error state.',
            },
        },
    },
};

export const ManyFiles = {
    args: {
        workspaceId: 'ws-1',
        mockFiles: [
            ...mockFiles,
            { id: 'file-6', name: 'model_v2.vtk', fileType: 'vtk', size: '45.2 MB', starred: false, loaded: false },
            { id: 'file-7', name: 'scan_001.nii', fileType: 'nii', size: '128 MB', starred: false, loaded: true },
            { id: 'file-8', name: 'segmentation.vtp', fileType: 'vtp', size: '22.1 MB', starred: true, loaded: false },
            { id: 'file-9', name: 'atlas.nii.gz', fileType: 'nii', size: '256 MB', starred: false, loaded: false },
            { id: 'file-10', name: 'mesh_final.vtk', fileType: 'vtk', size: '18.5 MB', starred: false, loaded: true },
        ],
        mockStarredIds: new Set(['file-1', 'file-3', 'file-8']),
        mockIsLoading: false,
        mockError: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Files tab with many files showing scroll behavior.',
            },
        },
    },
};

export const AllStarred = {
    args: {
        workspaceId: 'ws-1',
        mockFiles: mockFiles,
        mockStarredIds: new Set(mockFiles.map(f => f.id)),
        mockIsLoading: false,
        mockError: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Files tab with all files starred.',
            },
        },
    },
};