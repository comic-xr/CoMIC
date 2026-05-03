/**
 * @file TabbedCanvasView.stories.jsx
 * @description Storybook stories for TabbedCanvasView component
 */

import React, { useState } from 'react';
import { TabbedCanvasView } from './TabbedCanvasView';
import { FullCanvasHeader } from './FullCanvasHeader';

export default {
    title: 'Organisms/TabbedCanvasView',
    component: TabbedCanvasView,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
        },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockWorkspaces = {
    workspace: {
        id: 'ws-1',
        name: 'Main Analysis',
        type: 'workspace',
        hasChanges: false,
        hasBreakout: true,
        breakoutUsers: 3,
    },
    subset: {
        id: 'ws-2',
        name: 'Tumor Regions',
        type: 'subset',
        hasChanges: true,
        hasBreakout: false,
        breakoutUsers: 0,
    },
    scratch: {
        id: 'ws-3',
        name: 'Quick Notes',
        type: 'scratch',
        hasChanges: false,
        hasBreakout: true,
        breakoutUsers: 1,
    },
};

// =============================================================================
// STORIES
// =============================================================================

/**
 * Empty state - no workspace selected
 */
export const Empty = {
    args: {
        workspace: null,
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', display: 'flex' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * Standard workspace type
 */
export const WorkspaceType = {
    args: {
        workspace: mockWorkspaces.workspace,
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', display: 'flex' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * Subset workspace type with unsaved changes
 */
export const SubsetType = {
    args: {
        workspace: mockWorkspaces.subset,
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', display: 'flex' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * Scratch workspace type
 */
export const ScratchType = {
    args: {
        workspace: mockWorkspaces.scratch,
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', display: 'flex' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * With user in breakout
 */
export const InBreakout = {
    args: {
        workspace: mockWorkspaces.workspace,
        currentBreakoutId: 'ws-1',
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', display: 'flex' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * Interactive story with state management
 */
export const Interactive = {
    render: function InteractiveStory() {
        const [workspace, setWorkspace] = useState(mockWorkspaces.workspace);
        const [breakoutId, setBreakoutId] = useState(null);

        const handleJoinBreakout = (id) => {
            setBreakoutId(id);
        };

        const handleLeaveBreakout = () => {
            setBreakoutId(null);
        };

        const handleClose = () => {
            setWorkspace(null);
        };

        const switchWorkspace = (type) => {
            setWorkspace(mockWorkspaces[type]);
            setBreakoutId(null);
        };

        return (
            <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '12px', color: '#888', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span><strong>Switch:</strong></span>
                    <button
                        onClick={() => switchWorkspace('workspace')}
                        style={{ padding: '4px 8px', background: workspace?.type === 'workspace' ? '#3b82f6' : '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                    >
                        Workspace
                    </button>
                    <button
                        onClick={() => switchWorkspace('subset')}
                        style={{ padding: '4px 8px', background: workspace?.type === 'subset' ? '#f59e0b' : '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                    >
                        Subset
                    </button>
                    <button
                        onClick={() => switchWorkspace('scratch')}
                        style={{ padding: '4px 8px', background: workspace?.type === 'scratch' ? '#22c55e' : '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                    >
                        Scratch
                    </button>
                    <span style={{ marginLeft: 'auto' }}><strong>Breakout:</strong> {breakoutId || 'None'}</span>
                </div>
                <TabbedCanvasView
                    workspace={workspace}
                    currentBreakoutId={breakoutId}
                    onJoinBreakout={handleJoinBreakout}
                    onLeaveBreakout={handleLeaveBreakout}
                    onClose={handleClose}
                />
            </div>
        );
    },
};

// =============================================================================
// SUB-COMPONENT STORIES
// =============================================================================

/**
 * FullCanvasHeader variants
 */
export const FullCanvasHeaderVariants = {
    render: function HeaderDemo() {
        return (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: '#0a0a0f' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Workspace type</p>
                <FullCanvasHeader workspace={mockWorkspaces.workspace} />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>Subset with unsaved changes</p>
                <FullCanvasHeader workspace={mockWorkspaces.subset} />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>Scratch type</p>
                <FullCanvasHeader workspace={mockWorkspaces.scratch} />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>In breakout session</p>
                <FullCanvasHeader workspace={mockWorkspaces.workspace} currentBreakoutId="ws-1" />
            </div>
        );
    },
};
