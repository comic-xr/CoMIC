// src/ui/react/components/workspace/Canvas/CanvasHeaderBar/CanvasHeaderBar.stories.jsx
import React from 'react';
import { CanvasHeaderBar } from './CanvasHeaderBar';

// Mock data
const mockRoom = { id: 'main', name: 'Analytics Hub', type: 'main' };

const mockRoomMembers = [
    { id: '1', name: 'Alice Chen', color: '#2dd4bf' },
    { id: '2', name: 'Bob Smith', color: '#f472b6' },
    { id: '3', name: 'Carol Davis', color: '#60a5fa' },
];

const mockAvailableRooms = [
    { id: 'main', name: 'Analytics Hub', type: 'main', memberCount: 5 },
    { id: 'breakout-1', name: 'Data Review', type: 'breakout', memberCount: 3 },
    { id: 'breakout-2', name: 'Model Testing', type: 'breakout', memberCount: 2 },
];

const mockWorkspace = { id: 'ws1', name: 'Project Alpha', type: 'project' };

const mockWorkspaces = [
    { id: 'ws1', name: 'Project Alpha', type: 'project' },
    { id: 'ws2', name: 'Experiment Beta', type: 'project' },
    { id: 'ws3', name: 'Demo Workspace', type: 'demo' },
];

export default {
    title: 'Canvas/CanvasHeaderBar',
    component: CanvasHeaderBar,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onRoomChange: { action: 'room changed' },
        onOpenRoomsPanel: { action: 'open rooms panel' },
        onCreateRoom: { action: 'create room' },
        onWorkspaceChange: { action: 'workspace changed' },
        onCreateWorkspace: { action: 'create workspace' },
        onToolChange: { action: 'tool changed' },
        onMergeModeChange: { action: 'merge mode changed' },
        onEditModeChange: { action: 'edit mode changed' },
        onFlowDirectionChange: { action: 'flow direction changed' },
        onCanvasSizeClick: { action: 'canvas size clicked' },
        onViewportSizeClick: { action: 'viewport size clicked' },
        onCanvasModeChange: { action: 'canvas mode changed' },
        flowDirection: {
            control: 'select',
            options: ['row', 'column'],
        },
        activeTool: {
            control: 'select',
            options: ['select', 'pan'],
        },
        canvasMode: {
            control: 'select',
            options: ['docked', 'floating', 'fullscreen'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                background: '#0a0a0f',
                minWidth: '900px',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        room: mockRoom,
        roomMembers: mockRoomMembers,
        availableRooms: mockAvailableRooms,
        workspace: mockWorkspace,
        workspaces: mockWorkspaces,
        activeTool: 'select',
        mergeMode: false,
        editMode: false,
        flowDirection: 'row',
        canvasSize: { cols: 10, rows: 10 },
        viewportSize: { cols: 3, rows: 3 },
        canvasMode: 'docked',
        compactMode: false,
    },
};

export const EditModeActive = {
    args: {
        ...Default.args,
        editMode: true,
    },
};

export const MergeModeActive = {
    args: {
        ...Default.args,
        mergeMode: true,
    },
};

export const PanToolSelected = {
    args: {
        ...Default.args,
        activeTool: 'pan',
    },
};

export const ColumnFlow = {
    args: {
        ...Default.args,
        flowDirection: 'column',
    },
};

export const FloatingMode = {
    args: {
        ...Default.args,
        canvasMode: 'floating',
    },
};

export const FullscreenMode = {
    args: {
        ...Default.args,
        canvasMode: 'fullscreen',
    },
};

export const LargeCanvas = {
    args: {
        ...Default.args,
        canvasSize: { cols: 50, rows: 50 },
        viewportSize: { cols: 5, rows: 5 },
    },
};

export const ManyMembers = {
    args: {
        ...Default.args,
        roomMembers: [
            ...mockRoomMembers,
            { id: '4', name: 'David Lee', color: '#a78bfa' },
            { id: '5', name: 'Emma Wilson', color: '#fb923c' },
            { id: '6', name: 'Frank Brown', color: '#22d3ee' },
        ],
    },
};

export const CompactMode = {
    args: {
        ...Default.args,
        compactMode: true,
    },
};

export const PersonalRoom = {
    args: {
        ...Default.args,
        room: { id: 'personal', name: 'My Workspace', type: 'personal' },
        roomMembers: [],
    },
};
