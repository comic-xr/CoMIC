/**
 * @file TiledCanvasView.stories.jsx
 * @description Storybook stories for TiledCanvasView component
 */

import React, { useState } from 'react';
import { TiledCanvasView } from './TiledCanvasView';
import { MiniCanvasHeader } from './MiniCanvasHeader';
import { ResizableDivider } from './ResizableDivider';

export default {
    title: 'Organisms/TiledCanvasView',
    component: TiledCanvasView,
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

const mockWorkspaces = [
    { id: 'ws-1', name: 'Main Analysis', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: true, breakoutUsers: 3 },
    { id: 'ws-2', name: 'Tumor Regions', type: 'subset', isOpen: true, hasChanges: true, hasBreakout: false, breakoutUsers: 0 },
    { id: 'ws-3', name: 'Quick Notes', type: 'scratch', isOpen: true, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
    { id: 'ws-4', name: 'Comparison View', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
    { id: 'ws-5', name: 'Archive', type: 'workspace', isOpen: false, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
];

// =============================================================================
// STORIES
// =============================================================================

/**
 * Empty state - no workspaces open
 */
export const Empty = {
    args: {
        workspaces: mockWorkspaces.map(w => ({ ...w, isOpen: false })),
        activeWorkspaceId: null,
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
 * Single canvas view
 */
export const SingleCanvas = {
    args: {
        workspaces: [{ ...mockWorkspaces[0], isOpen: true }, ...mockWorkspaces.slice(1).map(w => ({ ...w, isOpen: false }))],
        activeWorkspaceId: 'ws-1',
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
 * Two canvases - horizontal split
 */
export const TwoCanvases = {
    args: {
        workspaces: [
            { ...mockWorkspaces[0], isOpen: true },
            { ...mockWorkspaces[1], isOpen: true },
            ...mockWorkspaces.slice(2).map(w => ({ ...w, isOpen: false })),
        ],
        activeWorkspaceId: 'ws-1',
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
 * Three canvases - 2×2 grid with empty slot
 */
export const ThreeCanvases = {
    args: {
        workspaces: [
            { ...mockWorkspaces[0], isOpen: true },
            { ...mockWorkspaces[1], isOpen: true },
            { ...mockWorkspaces[2], isOpen: true },
            ...mockWorkspaces.slice(3).map(w => ({ ...w, isOpen: false })),
        ],
        activeWorkspaceId: 'ws-2',
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
 * Four canvases - full 2×2 grid
 */
export const FourCanvases = {
    args: {
        workspaces: mockWorkspaces.map((w, i) => ({ ...w, isOpen: i < 4 })),
        activeWorkspaceId: 'ws-1',
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
 * With active breakout
 */
export const WithBreakout = {
    args: {
        workspaces: mockWorkspaces.map((w, i) => ({ ...w, isOpen: i < 2 })),
        activeWorkspaceId: 'ws-1',
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
 * Interactive story with full state management
 */
export const Interactive = {
    render: function InteractiveStory() {
        const [workspaces, setWorkspaces] = useState(mockWorkspaces.map((w, i) => ({ ...w, isOpen: i < 3 })));
        const [activeId, setActiveId] = useState('ws-1');
        const [breakoutId, setBreakoutId] = useState(null);

        const handleClose = (id) => {
            setWorkspaces(workspaces.map(w =>
                w.id === id ? { ...w, isOpen: false } : w
            ));
            if (activeId === id) {
                const remaining = workspaces.filter(w => w.isOpen && w.id !== id);
                if (remaining.length > 0) {
                    setActiveId(remaining[0].id);
                }
            }
        };

        const handleJoinBreakout = (id) => {
            setBreakoutId(id);
        };

        return (
            <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '12px', color: '#888' }}>
                    <strong>Instructions:</strong> Click headers to select, hover for actions, drag dividers to resize
                    <br />
                    <strong>Active:</strong> {activeId} | <strong>Breakout:</strong> {breakoutId || 'None'}
                </div>
                <TiledCanvasView
                    workspaces={workspaces}
                    activeWorkspaceId={activeId}
                    onSelectWorkspace={setActiveId}
                    onCloseWorkspace={handleClose}
                    currentBreakoutId={breakoutId}
                    onJoinBreakout={handleJoinBreakout}
                />
            </div>
        );
    },
};

// =============================================================================
// SUB-COMPONENT STORIES
// =============================================================================

/**
 * MiniCanvasHeader variants
 */
export const MiniCanvasHeaderVariants = {
    render: function MiniCanvasHeaderDemo() {
        return (
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: '#0a0a0f' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Workspace type (inactive)</p>
                <MiniCanvasHeader
                    workspace={{ id: '1', name: 'Main Analysis', type: 'workspace', hasChanges: false, hasBreakout: false }}
                    isActive={false}
                />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>Workspace type (active)</p>
                <MiniCanvasHeader
                    workspace={{ id: '2', name: 'Main Analysis', type: 'workspace', hasChanges: false, hasBreakout: false }}
                    isActive={true}
                />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>Subset with unsaved changes</p>
                <MiniCanvasHeader
                    workspace={{ id: '3', name: 'Tumor Regions', type: 'subset', hasChanges: true, hasBreakout: false }}
                    isActive={false}
                />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>Scratch with breakout</p>
                <MiniCanvasHeader
                    workspace={{ id: '4', name: 'Quick Notes', type: 'scratch', hasChanges: false, hasBreakout: true, breakoutUsers: 3 }}
                    isActive={false}
                />

                <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', marginBottom: '8px' }}>In breakout (active)</p>
                <MiniCanvasHeader
                    workspace={{ id: '5', name: 'Team Discussion', type: 'workspace', hasChanges: false, hasBreakout: true, breakoutUsers: 2 }}
                    isActive={true}
                    currentBreakoutId="5"
                />
            </div>
        );
    },
};

/**
 * ResizableDivider variants
 */
export const ResizableDividerVariants = {
    render: function DividerDemo() {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', background: '#0a0a0f' }}>
                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Horizontal divider</p>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100px', background: '#1a1a24' }}>
                        <div style={{ flex: 1, background: '#12121a' }} />
                        <ResizableDivider type="horizontal" />
                        <div style={{ flex: 1, background: '#12121a' }} />
                    </div>
                </div>

                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Vertical divider</p>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '150px', background: '#1a1a24' }}>
                        <div style={{ flex: 1, background: '#12121a' }} />
                        <ResizableDivider type="vertical" />
                        <div style={{ flex: 1, background: '#12121a' }} />
                    </div>
                </div>

                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Dragging state</p>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100px', background: '#1a1a24' }}>
                        <div style={{ flex: 1, background: '#12121a' }} />
                        <ResizableDivider type="horizontal" isDragging={true} />
                        <div style={{ flex: 1, background: '#12121a' }} />
                    </div>
                </div>
            </div>
        );
    },
};
