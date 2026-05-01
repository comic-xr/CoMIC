// src/ui/react/components/organisms/ViewContextBlock/ViewContextBlock.stories.jsx
import React from 'react';
import { ViewContextBlock } from './ViewContextBlock';

// Mock data
const mockOnCanvasViews = [
    { id: 'v1', name: 'View of diskout.vtp', type: 'vtk', color: '#60a5fa', position: { row: 0, col: 0 } },
    { id: 'v2', name: 'View of Skull.vtp', type: 'vtk', color: '#34d399', position: { row: 0, col: 1 } },
    { id: 'v3', name: 'Histogram Analysis', type: 'chart', color: '#f472b6', position: { row: 1, col: 0 } },
    { id: 'v4', name: 'Sagittal Slice', type: 'slice', color: '#fbbf24', position: { row: 1, col: 1 } },
];

const mockAvailableViews = [
    { id: 'v5', name: 'Volume Render', type: 'volume', color: '#ec4899' },
    { id: 'v6', name: 'Surface Plot', type: 'mesh', color: '#8b5cf6' },
];

const mockActiveView = {
    ...mockOnCanvasViews[0],
    links: {
        camera: { target: 'v2', direction: 'bidirectional' },
    },
};

export default {
    title: 'Organisms/ViewContextBlock',
    component: ViewContextBlock,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        viewMode: {
            control: 'select',
            options: ['normal', 'focus', 'subset'],
        },
        onModeChange: { action: 'mode changed' },
        onSelectView: { action: 'view selected' },
        onViewAction: { action: 'view action' },
        onUpdateLink: { action: 'link updated' },
        onSubsetChange: { action: 'subset changed' },
        onSnapshot: { action: 'snapshot' },
        onDuplicate: { action: 'duplicate' },
        onOpenSettings: { action: 'open settings' },
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '40px',
                background: '#0a0a0f',
                minWidth: '600px',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const NormalMode = {
    args: {
        viewMode: 'normal',
        activeView: mockActiveView,
        onCanvasViews: mockOnCanvasViews,
        availableViews: mockAvailableViews,
        subsetIds: [],
    },
};

export const FocusMode = {
    args: {
        viewMode: 'focus',
        activeView: mockActiveView,
        onCanvasViews: mockOnCanvasViews,
        availableViews: [],
        subsetIds: [],
    },
};

export const SubsetMode = {
    args: {
        viewMode: 'subset',
        activeView: mockActiveView,
        onCanvasViews: mockOnCanvasViews,
        availableViews: [],
        subsetIds: ['v1', 'v2', 'v3'],
    },
};

export const NoActiveView = {
    args: {
        viewMode: 'normal',
        activeView: null,
        onCanvasViews: mockOnCanvasViews,
        availableViews: mockAvailableViews,
        subsetIds: [],
    },
};

export const WithLinks = {
    args: {
        viewMode: 'normal',
        activeView: {
            ...mockOnCanvasViews[0],
            links: {
                camera: { target: 'v2', direction: 'bidirectional' },
                selection: { target: 'v3', direction: 'parent' },
                filter: { target: 'v4', direction: 'child' },
            },
        },
        onCanvasViews: mockOnCanvasViews,
        availableViews: mockAvailableViews,
        subsetIds: [],
    },
};

export const ManyViews = {
    args: {
        viewMode: 'normal',
        activeView: mockActiveView,
        onCanvasViews: [
            ...mockOnCanvasViews,
            { id: 'v7', name: 'Coronal Slice', type: 'slice', color: '#06b6d4', position: { row: 2, col: 0 } },
            { id: 'v8', name: 'Axial Slice', type: 'slice', color: '#14b8a6', position: { row: 2, col: 1 } },
            { id: 'v9', name: 'Scatter Plot Matrix', type: 'chart', color: '#f59e0b', position: { row: 3, col: 0 } },
            { id: 'v10', name: 'Parallel Coordinates', type: 'chart', color: '#ef4444', position: { row: 3, col: 1 } },
        ],
        availableViews: mockAvailableViews,
        subsetIds: [],
    },
};

export const EmptyCanvas = {
    args: {
        viewMode: 'normal',
        activeView: null,
        onCanvasViews: [],
        availableViews: mockAvailableViews,
        subsetIds: [],
    },
};

export const SubsetWithSelection = {
    args: {
        viewMode: 'subset',
        activeView: mockOnCanvasViews[1],
        onCanvasViews: mockOnCanvasViews,
        availableViews: [],
        subsetIds: ['v1', 'v2'],
    },
};
