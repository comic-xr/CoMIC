/**
 * @file ViewsTab.stories.jsx
 * @description Storybook stories for ViewsTab component.
 */

import React from 'react';
import { ViewsPanelContent } from './ViewsTab';

// Mock the hooks and managers
const mockViews = {
    onCanvas: [
        {
            id: 'view-1',
            name: 'Brain Segmentation',
            datasetName: 'brain_scan.nii',
            status: 'active',
            viewType: '3D Volume',
            position: { row: 0, col: 0 },
            isShared: true,
            linkedCount: 2,
        },
        {
            id: 'view-2',
            name: 'Heart Model',
            datasetName: 'heart_model.vtk',
            status: 'active',
            viewType: 'Surface Mesh',
            position: { row: 0, col: 1 },
            isShared: false,
            linkedCount: 0,
        },
    ],
    notPlaced: [
        {
            id: 'view-3',
            name: 'CT Slice View',
            datasetName: 'ct_scan.dcm',
            status: 'inactive',
            viewType: '2D Slice',
            isShared: false,
            linkedCount: 1,
        },
        {
            id: 'view-4',
            name: 'Fiber Tracts',
            datasetName: 'dti_fibers.vtk',
            status: 'inactive',
            viewType: 'Streamlines',
            isShared: true,
            linkedCount: 0,
        },
    ],
    deleted: [
        {
            id: 'view-5',
            name: 'Old Analysis',
            datasetName: 'analysis_v1.csv',
            status: 'trashed',
            viewType: 'Chart',
            deletedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            isShared: false,
            linkedCount: 0,
        },
    ],
};

export default {
    title: 'Panels/LeftPanel/ViewsTab',
    component: ViewsPanelContent,
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
    },
    parameters: {
        docs: {
            description: {
                story: 'Views tab showing all sections with views in various states.',
            },
        },
    },
};

export const Empty = {
    args: {
        workspaceId: 'ws-empty',
    },
    parameters: {
        docs: {
            description: {
                story: 'Views tab with no views created yet.',
            },
        },
    },
};

export const AllOnCanvas = {
    args: {
        workspaceId: 'ws-all-placed',
    },
    parameters: {
        docs: {
            description: {
                story: 'All views are placed on the canvas.',
            },
        },
    },
};

export const WithDeletedViews = {
    args: {
        workspaceId: 'ws-with-deleted',
    },
    parameters: {
        docs: {
            description: {
                story: 'Views tab with items in the Recently Deleted section.',
            },
        },
    },
};

export const Searching = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Views tab with active search filter.',
            },
        },
    },
};