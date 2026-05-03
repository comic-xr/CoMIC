// src/ui/react/components/organisms/ActiveViewSelector/ActiveViewSelector.stories.jsx
import React from 'react';
import { ActiveViewSelector } from './ActiveViewSelector';

// Mock data
const mockOnCanvasViews = [
    { id: 'v1', name: 'View of diskout.vtp', position: { row: 0, col: 0 } },
    { id: 'v2', name: 'View of Skull.vtp', position: { row: 0, col: 1 } },
    { id: 'v3', name: 'Histogram Analysis', position: { row: 1, col: 0 } },
    { id: 'v4', name: 'Sagittal Slice View', position: { row: 1, col: 1 } },
];

const mockAvailableViews = [
    { id: 'v5', name: 'Volume Render (off canvas)' },
    { id: 'v6', name: 'Surface Plot (off canvas)' },
];

const manyViews = [
    ...mockOnCanvasViews,
    { id: 'v7', name: 'Coronal Slice', position: { row: 2, col: 0 } },
    { id: 'v8', name: 'Axial Slice', position: { row: 2, col: 1 } },
    { id: 'v9', name: 'Scatter Plot Matrix', position: { row: 3, col: 0 } },
    { id: 'v10', name: 'Parallel Coordinates', position: { row: 3, col: 1 } },
    { id: 'v11', name: 'Treemap Visualization', position: { row: 4, col: 0 } },
    { id: 'v12', name: 'Network Graph', position: { row: 4, col: 1 } },
];

export default {
    title: 'Organisms/ActiveViewSelector',
    component: ActiveViewSelector,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onSelect: { action: 'view selected' },
        onPlace: { action: 'view placed' },
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '120px 40px 40px',
                background: '#0a0a0f',
                minHeight: '400px',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const WithActiveView = {
    args: {
        activeView: { id: 'v1', name: 'View of diskout.vtp', position: { row: 0, col: 0 } },
        onCanvasViews: mockOnCanvasViews,
        availableViews: [],
    },
};

export const NoActiveView = {
    args: {
        activeView: null,
        onCanvasViews: mockOnCanvasViews,
        availableViews: [],
    },
};

export const WithAvailableViews = {
    args: {
        activeView: mockOnCanvasViews[0],
        onCanvasViews: mockOnCanvasViews,
        availableViews: mockAvailableViews,
    },
};

export const ManyViews = {
    args: {
        activeView: manyViews[0],
        onCanvasViews: manyViews,
        availableViews: mockAvailableViews,
    },
};

export const OnlyAvailableViews = {
    args: {
        activeView: null,
        onCanvasViews: [],
        availableViews: mockAvailableViews,
    },
};

export const EmptyState = {
    args: {
        activeView: null,
        onCanvasViews: [],
        availableViews: [],
    },
};

export const LongViewName = {
    args: {
        activeView: {
            id: 'v-long',
            name: 'Very Long View Name That Should Be Truncated With Ellipsis',
            position: { row: 0, col: 0 },
        },
        onCanvasViews: [
            {
                id: 'v-long',
                name: 'Very Long View Name That Should Be Truncated With Ellipsis',
                position: { row: 0, col: 0 },
            },
            {
                id: 'v-long-2',
                name: 'Another Extremely Long View Name for Testing Purposes',
                position: { row: 0, col: 1 },
            },
        ],
        availableViews: [],
    },
};

export const SingleView = {
    args: {
        activeView: mockOnCanvasViews[0],
        onCanvasViews: [mockOnCanvasViews[0]],
        availableViews: [],
    },
};
