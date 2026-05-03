// src/ui/react/components/workspace/Canvas/CanvasToolbar/CanvasToolbar.stories.jsx
import React from 'react';
import { CanvasToolbar } from './CanvasToolbar';
import { ViewStackProvider } from '@UI/react/hooks/useViewStack.js';

// Mock data
const mockViews = [
    { id: 'v1', name: 'View of diskout.vtp', type: 'vtk', color: '#60a5fa', position: { row: 0, col: 0 }, onCanvas: true },
    { id: 'v2', name: 'View of Skull.vtp', type: 'vtk', color: '#34d399', position: { row: 0, col: 1 }, onCanvas: true },
    { id: 'v3', name: 'Histogram Analysis', type: 'chart', color: '#f472b6', position: { row: 1, col: 0 }, onCanvas: true },
    { id: 'v4', name: 'Sagittal Slice', type: 'slice', color: '#fbbf24', position: { row: 1, col: 1 }, onCanvas: true },
];

const mockOffCanvasViews = [
    { id: 'v5', name: 'Volume Render (available)', type: 'volume', color: '#ec4899' },
    { id: 'v6', name: 'Surface Plot (available)', type: 'mesh', color: '#8b5cf6' },
];

export default {
    title: 'Canvas/CanvasToolbar',
    component: CanvasToolbar,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        viewMode: {
            control: 'select',
            options: ['normal', 'focus', 'subset'],
        },
        onModeChange: { action: 'mode changed' },
        onNavigate: { action: 'navigate' },
        onGoHome: { action: 'go home' },
        onBookmark: { action: 'bookmark' },
        onUndo: { action: 'undo' },
        onRedo: { action: 'redo' },
        onSelectView: { action: 'select view' },
        onViewAction: { action: 'view action' },
        onSubsetChange: { action: 'subset change' },
        onUpdateLink: { action: 'update link' },
        onSnapshot: { action: 'snapshot' },
        onDuplicate: { action: 'duplicate' },
        onSettings: { action: 'settings' },
    },
    decorators: [
        (Story) => (
            <ViewStackProvider>
                <div style={{
                    background: '#0a0a0f',
                    padding: '40px',
                    minHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                }}>
                    <Story />
                </div>
            </ViewStackProvider>
        ),
    ],
};

export const Default = {
    args: {
        viewMode: 'normal',
        viewportPosition: { row: 0, col: 0 },
        homePosition: { row: 0, col: 0 },
        canUndo: true,
        canRedo: false,
        activeView: mockViews[0],
        availableViews: mockViews,
        offCanvasViews: mockOffCanvasViews,
        subsetSelection: [],
    },
};

export const NormalMode = {
    args: {
        ...Default.args,
        viewMode: 'normal',
        activeView: mockViews[1],
    },
};

export const FocusMode = {
    args: {
        ...Default.args,
        viewMode: 'focus',
        activeView: mockViews[0],
    },
};

export const SubsetMode = {
    args: {
        ...Default.args,
        viewMode: 'subset',
        subsetSelection: ['v1', 'v2', 'v3'],
        activeView: mockViews[0],
    },
};

export const NoActiveView = {
    args: {
        ...Default.args,
        activeView: null,
    },
};

export const AwayFromHome = {
    args: {
        ...Default.args,
        viewportPosition: { row: 5, col: 7 },
        homePosition: { row: 0, col: 0 },
    },
};

export const WithHistory = {
    args: {
        ...Default.args,
        canUndo: true,
        canRedo: true,
    },
};

export const NoHistory = {
    args: {
        ...Default.args,
        canUndo: false,
        canRedo: false,
    },
};

export const ManyViews = {
    args: {
        ...Default.args,
        availableViews: [
            ...mockViews,
            { id: 'v7', name: 'Volume Render', type: 'volume', color: '#ec4899', position: { row: 2, col: 0 }, onCanvas: true },
            { id: 'v8', name: 'Surface Plot', type: 'mesh', color: '#8b5cf6', position: { row: 2, col: 1 }, onCanvas: true },
            { id: 'v9', name: 'Scatter Matrix', type: 'chart', color: '#06b6d4', position: { row: 3, col: 0 }, onCanvas: true },
        ],
    },
};

export const WithOffCanvasViews = {
    args: {
        ...Default.args,
        offCanvasViews: [
            { id: 'oc1', name: 'Off-canvas View 1', type: 'vtk', color: '#a78bfa' },
            { id: 'oc2', name: 'Off-canvas View 2', type: 'chart', color: '#fb923c' },
            { id: 'oc3', name: 'Off-canvas View 3', type: 'slice', color: '#22d3ee' },
        ],
    },
};
