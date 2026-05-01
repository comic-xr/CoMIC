// src/ui/react/components/workspace/Canvas/CanvasInfoFooter/CanvasInfoFooter.stories.jsx
import React from 'react';
import { CanvasInfoFooter } from './CanvasInfoFooter';

export default {
    title: 'Canvas/CanvasInfoFooter',
    component: CanvasInfoFooter,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onOpenNavigator: { action: 'open navigator' },
        syncStatus: {
            control: 'select',
            options: ['synced', 'syncing', 'disconnected'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                background: '#0a0a0f',
                padding: '40px',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        canvasSize: { cols: 10, rows: 10 },
        viewportSize: { cols: 3, rows: 3 },
        cellSize: { width: 300, height: 250 },
        collaboratorCount: 3,
        syncStatus: 'synced',
    },
};

export const Syncing = {
    args: {
        canvasSize: { cols: 10, rows: 10 },
        viewportSize: { cols: 3, rows: 3 },
        cellSize: { width: 300, height: 250 },
        collaboratorCount: 2,
        syncStatus: 'syncing',
    },
};

export const Disconnected = {
    args: {
        canvasSize: { cols: 10, rows: 10 },
        viewportSize: { cols: 3, rows: 3 },
        cellSize: { width: 300, height: 250 },
        collaboratorCount: 0,
        syncStatus: 'disconnected',
    },
};

export const LargeCanvas = {
    args: {
        canvasSize: { cols: 50, rows: 50 },
        viewportSize: { cols: 5, rows: 5 },
        cellSize: { width: 200, height: 150 },
        collaboratorCount: 8,
        syncStatus: 'synced',
    },
};

export const SmallCells = {
    args: {
        canvasSize: { cols: 10, rows: 10 },
        viewportSize: { cols: 6, rows: 4 },
        cellSize: { width: 120, height: 100 },
        collaboratorCount: 1,
        syncStatus: 'synced',
    },
};

export const NoCollaborators = {
    args: {
        canvasSize: { cols: 10, rows: 10 },
        viewportSize: { cols: 3, rows: 3 },
        cellSize: { width: 300, height: 250 },
        collaboratorCount: 0,
        syncStatus: 'synced',
    },
};
