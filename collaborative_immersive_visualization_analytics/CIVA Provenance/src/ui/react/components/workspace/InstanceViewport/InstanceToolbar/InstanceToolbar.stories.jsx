// src/ui/react/components/workspace/InstanceViewport/InstanceToolbar/InstanceToolbar.stories.jsx
// Stories for InstanceToolbar component

import React, { useState } from 'react';
import { InstanceToolbar } from './InstanceToolbar';
import { Icon } from '@UI/react/components/atoms/Icon';

// =============================================================================
// META
// =============================================================================

export default {
    title: 'Workspace/InstanceToolbar',
    component: InstanceToolbar,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Instance-level toolbar that appears when a viewport is focused.

## Features
- Shows instance-specific tools (varies by instance type)
- Global tools section with Instance Tools button and VR button
- Visibility controlled by focus state

## Props
- **tools**: Array of tool objects from the instance handler
- **isFocused**: Whether the viewport is focused (controls visibility)
- **renderTool**: Function to render individual tools
- **onOpenInstanceTools**: Callback to open the Instance Tools panel
- **instanceId**: ID of the current instance

## Tool Object Structure
\`\`\`js
{
  id: string,           // Unique tool identifier
  type: 'button' | 'menu' | 'separator',
  icon: string,         // Icon name
  label: string,        // Display label
  description?: string, // Tooltip description
  shortcut?: string,    // Keyboard shortcut
  active?: boolean,     // Whether tool is active
  disabled?: boolean,   // Whether tool is disabled
  onClick?: function,   // Click handler (for buttons)
  options?: array,      // Menu options (for menus)
}
\`\`\`
                `,
            },
        },
    },
    argTypes: {
        isFocused: {
            control: 'boolean',
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '600px',
                height: '200px',
                background: '#15151a',
                borderRadius: '8px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Simulated header */}
                <div style={{
                    height: '32px',
                    background: '#1a1a1f',
                    borderBottom: '2px solid #60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: '12px',
                    color: '#888',
                }}>
                    Simulated Header
                </div>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK TOOLS
// =============================================================================

const createMockTools = () => [
    {
        id: 'pointer',
        type: 'button',
        icon: 'mousePointer',
        label: 'Select',
        description: 'Select and manipulate objects',
        shortcut: 'V',
        active: true,
        onClick: () => console.log('Pointer tool'),
    },
    {
        id: 'pan',
        type: 'button',
        icon: 'hand',
        label: 'Pan',
        description: 'Pan the view',
        shortcut: 'H',
        onClick: () => console.log('Pan tool'),
    },
    {
        id: 'zoom',
        type: 'button',
        icon: 'zoomIn',
        label: 'Zoom',
        description: 'Zoom in/out',
        shortcut: 'Z',
        onClick: () => console.log('Zoom tool'),
    },
    { type: 'separator' },
    {
        id: 'slice',
        type: 'menu',
        icon: 'scissors',
        label: 'Slice Plane',
        description: 'Configure slice planes',
        options: [
            { id: 'x', label: 'X Plane', icon: 'arrowRight' },
            { id: 'y', label: 'Y Plane', icon: 'arrowUp' },
            { id: 'z', label: 'Z Plane', icon: 'circle' },
        ],
    },
    {
        id: 'measure',
        type: 'button',
        icon: 'ruler',
        label: 'Measure',
        description: 'Measure distances',
        onClick: () => console.log('Measure tool'),
    },
];

// =============================================================================
// RENDER TOOL FUNCTION
// =============================================================================

const defaultRenderTool = (tool, index) => {
    if (tool.type === 'separator') {
        return (
            <div
                key={`separator-${index}`}
                className="instance-toolbar__separator"
            />
        );
    }

    return (
        <button
            key={tool.id || `tool-${index}`}
            className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
            disabled={tool.disabled}
            onClick={tool.onClick}
            title={tool.label}
        >
            <Icon name={tool.icon || 'box'} size={16} />
        </button>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    args: {
        tools: createMockTools(),
        isFocused: true,
        renderTool: defaultRenderTool,
        onOpenInstanceTools: () => console.log('Open Instance Tools'),
        instanceId: 'instance-demo-1',
    },
};

export const Hidden = {
    args: {
        ...Default.args,
        isFocused: false,
    },
};

export const NoTools = {
    args: {
        tools: [],
        isFocused: true,
        renderTool: defaultRenderTool,
        onOpenInstanceTools: () => console.log('Open Instance Tools'),
        instanceId: 'instance-demo-2',
    },
};

// =============================================================================
// INTERACTIVE STORY
// =============================================================================

export const Interactive = {
    render: () => {
        const [isFocused, setIsFocused] = useState(true);
        const [activeTool, setActiveTool] = useState('pointer');

        const tools = [
            {
                id: 'pointer',
                type: 'button',
                icon: 'mousePointer',
                label: 'Select',
                active: activeTool === 'pointer',
                onClick: () => setActiveTool('pointer'),
            },
            {
                id: 'pan',
                type: 'button',
                icon: 'hand',
                label: 'Pan',
                active: activeTool === 'pan',
                onClick: () => setActiveTool('pan'),
            },
            {
                id: 'zoom',
                type: 'button',
                icon: 'zoomIn',
                label: 'Zoom',
                active: activeTool === 'zoom',
                onClick: () => setActiveTool('zoom'),
            },
            { type: 'separator' },
            {
                id: 'rotate',
                type: 'button',
                icon: 'rotateCcw',
                label: 'Rotate',
                active: activeTool === 'rotate',
                onClick: () => setActiveTool('rotate'),
            },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    fontSize: '12px',
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888' }}>
                        <input
                            type="checkbox"
                            checked={isFocused}
                            onChange={(e) => setIsFocused(e.target.checked)}
                        />
                        Focused (shows toolbar)
                    </label>
                    <span style={{ color: '#666' }}>|</span>
                    <span style={{ color: '#888' }}>Active: <strong style={{ color: '#60a5fa' }}>{activeTool}</strong></span>
                </div>

                <div style={{
                    width: '500px',
                    height: '150px',
                    background: '#15151a',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '32px',
                        background: '#1a1a1f',
                        borderBottom: '2px solid #60a5fa',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        fontSize: '12px',
                        color: '#888',
                    }}>
                        Click tools to select them
                    </div>
                    <InstanceToolbar
                        tools={tools}
                        isFocused={isFocused}
                        renderTool={defaultRenderTool}
                        onOpenInstanceTools={() => console.log('Open Instance Tools')}
                        instanceId="instance-interactive"
                    />
                </div>
            </div>
        );
    },
};

// =============================================================================
// DIFFERENT TOOL SETS
// =============================================================================

export const VolumeTools = {
    render: () => {
        const volumeTools = [
            { id: 'pointer', type: 'button', icon: 'mousePointer', label: 'Select', active: true },
            { id: 'window', type: 'button', icon: 'sliders', label: 'Window/Level' },
            { type: 'separator' },
            { id: 'slice-x', type: 'button', icon: 'arrowRight', label: 'X Slice' },
            { id: 'slice-y', type: 'button', icon: 'arrowUp', label: 'Y Slice' },
            { id: 'slice-z', type: 'button', icon: 'circle', label: 'Z Slice' },
            { type: 'separator' },
            { id: 'measure', type: 'button', icon: 'ruler', label: 'Measure' },
            { id: 'annotate', type: 'button', icon: 'edit3', label: 'Annotate' },
        ];

        return (
            <div style={{
                width: '600px',
                height: '150px',
                background: '#15151a',
                borderRadius: '8px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '32px',
                    background: '#1a1a1f',
                    borderBottom: '2px solid #34d399',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: '12px',
                    color: '#888',
                }}>
                    Volume Viewer Tools
                </div>
                <InstanceToolbar
                    tools={volumeTools}
                    isFocused={true}
                    renderTool={defaultRenderTool}
                    onOpenInstanceTools={() => {}}
                    instanceId="instance-volume"
                />
            </div>
        );
    },
};

export const ChartTools = {
    render: () => {
        const chartTools = [
            { id: 'select', type: 'button', icon: 'mousePointer', label: 'Select Points', active: true },
            { id: 'lasso', type: 'button', icon: 'lasso', label: 'Lasso Select' },
            { id: 'brush', type: 'button', icon: 'brush', label: 'Brush Select' },
            { type: 'separator' },
            { id: 'filter', type: 'button', icon: 'filter', label: 'Filter' },
            { id: 'highlight', type: 'button', icon: 'eye', label: 'Highlight' },
        ];

        return (
            <div style={{
                width: '500px',
                height: '150px',
                background: '#15151a',
                borderRadius: '8px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '32px',
                    background: '#1a1a1f',
                    borderBottom: '2px solid #c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: '12px',
                    color: '#888',
                }}>
                    Scatter Plot Tools
                </div>
                <InstanceToolbar
                    tools={chartTools}
                    isFocused={true}
                    renderTool={defaultRenderTool}
                    onOpenInstanceTools={() => {}}
                    instanceId="instance-chart"
                />
            </div>
        );
    },
};
