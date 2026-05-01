// src/ui/react/components/molecules/EditToolbar/EditToolbar.stories.jsx

import React, { useState } from 'react';
import { EditToolbar } from './EditToolbar';

export default {
    title: 'Molecules/EditToolbar',
    component: EditToolbar,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        isEditMode: {
            control: 'boolean',
            description: 'Whether edit mode is active',
        },
        activeTool: {
            control: 'select',
            options: ['select', 'pan', 'merge'],
            description: 'Currently active tool ID',
        },
        canUndo: {
            control: 'boolean',
            description: 'Whether undo is available',
        },
        canRedo: {
            control: 'boolean',
            description: 'Whether redo is available',
        },
        onToolChange: { action: 'toolChanged' },
        onToggleEditMode: { action: 'toggleEditMode' },
        onUndo: { action: 'undo' },
        onRedo: { action: 'redo' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        isEditMode: true,
        activeTool: 'select',
        canUndo: false,
        canRedo: false,
    },
};

export const NotInEditMode = {
    args: {
        isEditMode: false,
    },
};

export const WithUndoRedo = {
    args: {
        isEditMode: true,
        activeTool: 'select',
        canUndo: true,
        canRedo: true,
    },
};

export const OnlyUndo = {
    args: {
        isEditMode: true,
        activeTool: 'select',
        canUndo: true,
        canRedo: false,
    },
};

export const OnlyRedo = {
    args: {
        isEditMode: true,
        activeTool: 'select',
        canUndo: false,
        canRedo: true,
    },
};

// =============================================================================
// TOOL VARIANTS
// =============================================================================

export const PanToolActive = {
    args: {
        isEditMode: true,
        activeTool: 'pan',
        canUndo: true,
        canRedo: false,
    },
};

export const MergeToolActive = {
    args: {
        isEditMode: true,
        activeTool: 'merge',
        canUndo: true,
        canRedo: true,
    },
};

// =============================================================================
// INTERACTIVE EXAMPLE
// =============================================================================

export const Interactive = {
    render: function InteractiveStory() {
        const [isEditMode, setIsEditMode] = useState(false);
        const [activeTool, setActiveTool] = useState('select');
        const [history, setHistory] = useState({ past: [], future: [] });

        const handleToolChange = (toolId) => {
            // Record the change for undo
            setHistory(h => ({
                past: [...h.past, activeTool],
                future: [],
            }));
            setActiveTool(toolId);
        };

        const handleUndo = () => {
            if (history.past.length > 0) {
                const prev = history.past[history.past.length - 1];
                setHistory(h => ({
                    past: h.past.slice(0, -1),
                    future: [activeTool, ...h.future],
                }));
                setActiveTool(prev);
            }
        };

        const handleRedo = () => {
            if (history.future.length > 0) {
                const next = history.future[0];
                setHistory(h => ({
                    past: [...h.past, activeTool],
                    future: h.future.slice(1),
                }));
                setActiveTool(next);
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <EditToolbar
                    isEditMode={isEditMode}
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                    onToggleEditMode={() => setIsEditMode(!isEditMode)}
                    canUndo={history.past.length > 0}
                    canRedo={history.future.length > 0}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                />
                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    <div>Edit Mode: {isEditMode ? 'ON' : 'OFF'}</div>
                    {isEditMode && <div>Active Tool: {activeTool}</div>}
                </div>
            </div>
        );
    },
};
