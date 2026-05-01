// src/ui/react/components/workspace/InstanceToolsNotch/InstanceToolsNotch.stories.jsx
// Stories for the InstanceToolsNotch component

import React, { useState } from 'react';
import { InstanceToolsNotch } from './InstanceToolsNotch';

// =============================================================================
// META
// =============================================================================

export default {
    title: 'Workspace/InstanceToolsNotch',
    component: InstanceToolsNotch,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'canvas',
            values: [
                { name: 'canvas', value: '#030303' },
                { name: 'dark', value: '#0a0a0f' },
            ],
        },
        docs: {
            description: {
                component: `
A full-width toolbar bar that displays instance-specific tools when a view is active.

## Purpose
- Replaces the need for toolbar overlays directly on viewports
- Provides a unified location for instance tools above the canvas toolbar
- Color-coded left accent matches the active view's accent color

## Layout Position
\`\`\`
┌─────────────────────────────────────────────────────┐
│                    Canvas Grid                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │  View 1 │  │  View 2 │  │  View 3 │  ← Clean!   │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                      │
├─────────────────────────────────────────────────────┤
│ ● View Name      │ Tools...                  │  ⋯  │ ← This
├─────────────────────────────────────────────────────┤
│  Navigation  │  History  │    View Context          │
└─────────────────────────────────────────────────────┘
\`\`\`

## Tool Structure
Tools can be flat arrays or grouped (arrays of arrays):

\`\`\`js
// Flat tools
const tools = [
  { id: 'pan', icon: 'hand', label: 'Pan' },
  { id: 'zoom', icon: 'zoomIn', label: 'Zoom' },
];

// Grouped tools (with visual separators between groups)
const groupedTools = [
  [{ id: 'pan', ... }, { id: 'zoom', ... }],
  [{ id: 'slice', type: 'menu', options: [...] }],
];
\`\`\`
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '100%',
                maxWidth: '900px',
                margin: '40px auto',
                padding: '0 20px',
                background: '#030303',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK DATA
// =============================================================================

const COLORS = {
    blue: '#60a5fa',
    green: '#34d399',
    purple: '#c084fc',
    pink: '#fb7185',
    amber: '#fbbf24',
    cyan: '#22d3ee',
};

const createMockView = (name, color) => ({
    id: `view-${name.toLowerCase().replace(/\s/g, '-')}`,
    name,
    color,
});

// Basic flat tools
const basicTools = [
    { id: 'pointer', icon: 'mousePointer', label: 'Select', description: 'Select and manipulate', active: true },
    { id: 'pan', icon: 'hand', label: 'Pan', description: 'Pan the view' },
    { id: 'zoom', icon: 'zoomIn', label: 'Zoom', description: 'Zoom in/out' },
    { id: 'rotate', icon: 'rotateCcw', label: 'Rotate', description: 'Rotate view' },
];

// Tools with menu
const toolsWithMenu = [
    { id: 'pointer', icon: 'mousePointer', label: 'Select', active: true },
    { id: 'pan', icon: 'hand', label: 'Pan' },
    { type: 'separator' },
    {
        id: 'slice',
        icon: 'scissors',
        label: 'Slice Plane',
        type: 'menu',
        options: [
            { id: 'slice-x', icon: 'arrowRight', label: 'X Plane', shortcut: 'X' },
            { id: 'slice-y', icon: 'arrowUp', label: 'Y Plane', shortcut: 'Y' },
            { id: 'slice-z', icon: 'circle', label: 'Z Plane', shortcut: 'Z', active: true },
        ],
    },
    { id: 'measure', icon: 'ruler', label: 'Measure' },
];

// Grouped tools (volume viewer style)
const volumeToolsGrouped = [
    // Navigation group
    [
        { id: 'pointer', icon: 'mousePointer', label: 'Select', active: true },
        { id: 'pan', icon: 'hand', label: 'Pan' },
        { id: 'zoom', icon: 'zoomIn', label: 'Zoom' },
        { id: 'rotate', icon: 'rotateCcw', label: 'Rotate' },
    ],
    // Slice group
    [
        {
            id: 'slice',
            icon: 'scissors',
            label: 'Slice',
            type: 'menu',
            options: [
                { id: 'x', icon: 'arrowRight', label: 'X Plane' },
                { id: 'y', icon: 'arrowUp', label: 'Y Plane' },
                { id: 'z', icon: 'circle', label: 'Z Plane' },
            ],
        },
        { id: 'window', icon: 'sliders', label: 'Window/Level' },
    ],
    // Annotation group
    [
        { id: 'measure', icon: 'ruler', label: 'Measure' },
        { id: 'annotate', icon: 'edit3', label: 'Annotate' },
    ],
];

// Chart tools (scatter plot style)
const chartToolsGrouped = [
    [
        { id: 'select', icon: 'mousePointer', label: 'Point Select', active: true },
        { id: 'lasso', icon: 'lasso', label: 'Lasso Select' },
        { id: 'brush', icon: 'brush', label: 'Brush Select' },
    ],
    [
        { id: 'filter', icon: 'filter', label: 'Filter' },
        { id: 'highlight', icon: 'eye', label: 'Highlight' },
    ],
];

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    args: {
        activeView: createMockView('Brain Scan Volume', COLORS.green),
        tools: basicTools,
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        // Navigation controls
        zoomLevel: 100,
        onZoomIn: () => console.log('Zoom in'),
        onZoomOut: () => console.log('Zoom out'),
        onFit: () => console.log('Fit'),
        onResetCamera: () => console.log('Reset camera'),
    },
};

export const Inactive = {
    args: {
        activeView: null,
        tools: [],
    },
};

export const WithMenuTool = {
    args: {
        activeView: createMockView('CT Volume Data', COLORS.cyan),
        tools: toolsWithMenu,
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        zoomLevel: 150,
        onZoomIn: () => console.log('Zoom in'),
        onZoomOut: () => console.log('Zoom out'),
        onFit: () => console.log('Fit'),
        onResetCamera: () => console.log('Reset camera'),
    },
};

export const GroupedTools = {
    args: {
        activeView: createMockView('MRI Brain Scan', COLORS.purple),
        tools: volumeToolsGrouped,
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        zoomLevel: 75,
        onZoomIn: () => console.log('Zoom in'),
        onZoomOut: () => console.log('Zoom out'),
        onFit: () => console.log('Fit'),
        onResetCamera: () => console.log('Reset camera'),
    },
};

export const ChartTools = {
    args: {
        activeView: createMockView('Scatter Plot Analysis', COLORS.amber),
        tools: chartToolsGrouped,
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        zoomLevel: 200,
        onZoomIn: () => console.log('Zoom in'),
        onZoomOut: () => console.log('Zoom out'),
        onFit: () => console.log('Fit'),
        onResetCamera: () => console.log('Reset camera'),
    },
};

// =============================================================================
// COLOR VARIANTS
// =============================================================================

export const ColorVariants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(COLORS).map(([name, hex]) => (
                <div key={name}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {name}
                    </div>
                    <InstanceToolsNotch
                        activeView={createMockView(`View with ${name}`, hex)}
                        tools={basicTools}
                        onSelectTool={() => {}}
                    />
                </div>
            ))}
        </div>
    ),
};

// =============================================================================
// INTERACTIVE DEMO
// =============================================================================

export const Interactive = {
    render: () => {
        const [activeViewIndex, setActiveViewIndex] = useState(0);
        const [activeTool, setActiveTool] = useState('pointer');
        const [zoom, setZoom] = useState(100);

        const views = [
            null, // No view selected
            createMockView('Brain Volume', COLORS.green),
            createMockView('Scatter Plot', COLORS.purple),
            createMockView('Network Graph', COLORS.cyan),
        ];

        const currentView = views[activeViewIndex];

        const tools = currentView ? [
            { id: 'pointer', icon: 'mousePointer', label: 'Select', active: activeTool === 'pointer' },
            { id: 'pan', icon: 'hand', label: 'Pan', active: activeTool === 'pan' },
            { type: 'separator' },
            { id: 'rotate', icon: 'rotateCcw', label: 'Rotate', active: activeTool === 'rotate' },
            { id: 'measure', icon: 'ruler', label: 'Measure', active: activeTool === 'measure' },
        ] : [];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Controls */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                }}>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                        <strong>Active View:</strong>
                    </div>
                    {views.map((view, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveViewIndex(index)}
                            style={{
                                padding: '4px 12px',
                                background: activeViewIndex === index ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: activeViewIndex === index ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: activeViewIndex === index ? '#60a5fa' : '#888',
                                cursor: 'pointer',
                                fontSize: '11px',
                            }}
                        >
                            {view ? view.name : 'None'}
                        </button>
                    ))}
                </div>

                {/* Notch */}
                <InstanceToolsNotch
                    activeView={currentView}
                    tools={tools}
                    onSelectTool={(tool) => setActiveTool(tool.id)}
                    onOpenFullTools={() => alert('Open full Instance Tools panel')}
                    zoomLevel={zoom}
                    onZoomIn={() => setZoom(Math.min(zoom * 1.25, 400))}
                    onZoomOut={() => setZoom(Math.max(zoom * 0.8, 25))}
                    onFit={() => setZoom(100)}
                    onResetCamera={() => console.log('Reset camera')}
                />

                {/* Status */}
                <div style={{
                    fontSize: '11px',
                    color: '#666',
                    textAlign: 'center',
                }}>
                    {currentView ? (
                        <>Zoom: <strong style={{ color: currentView.color }}>{Math.round(zoom)}%</strong> | Tool: <strong style={{ color: currentView.color }}>{activeTool}</strong></>
                    ) : (
                        'Select a view above to see tools'
                    )}
                </div>
            </div>
        );
    },
};

// =============================================================================
// LAYOUT SIMULATION - Shows notch in context
// =============================================================================

export const InContext = {
    render: () => {
        const [activeView, setActiveView] = useState(createMockView('Volume Data', COLORS.green));
        const [zoom, setZoom] = useState(100);

        const views = [
            { id: 'v1', name: 'View 1', color: COLORS.blue },
            { id: 'v2', name: 'View 2', color: COLORS.green },
            { id: 'v3', name: 'View 3', color: COLORS.purple },
        ];

        return (
            <div style={{
                width: '100%',
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                background: '#030303',
                borderRadius: '12px',
                overflow: 'hidden',
            }}>
                {/* Simulated canvas grid */}
                <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    padding: '6px',
                }}>
                    {views.map((view) => (
                        <div
                            key={view.id}
                            onClick={() => setActiveView(view)}
                            style={{
                                background: '#0a0a0f',
                                borderRadius: '8px',
                                border: activeView?.id === view.id
                                    ? `2px solid ${view.color}`
                                    : '2px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s ease',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: view.color,
                                }} />
                                <span style={{ fontSize: '12px', color: '#888' }}>{view.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Instance Tools Notch */}
                <InstanceToolsNotch
                    activeView={activeView}
                    tools={volumeToolsGrouped}
                    onSelectTool={(tool) => console.log('Tool:', tool)}
                    onOpenFullTools={() => console.log('Open full tools')}
                    zoomLevel={zoom}
                    onZoomIn={() => setZoom(Math.min(zoom * 1.25, 400))}
                    onZoomOut={() => setZoom(Math.max(zoom * 0.8, 25))}
                    onFit={() => setZoom(100)}
                    onResetCamera={() => console.log('Reset camera')}
                />

                {/* Simulated Canvas Toolbar */}
                <div style={{
                    height: '50px',
                    margin: '0 6px 6px',
                    background: 'rgba(12, 18, 32, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '11px',
                }}>
                    Canvas Toolbar (Navigation, History, View Context)
                </div>
            </div>
        );
    },
    decorators: [
        (Story) => (
            <div style={{ width: '800px', padding: '20px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// RESPONSIVE DEMO
// =============================================================================

export const ResponsiveWidths = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>Wide (700px)</div>
                <div style={{ width: '700px' }}>
                    <InstanceToolsNotch
                        activeView={createMockView('Long View Name Here', COLORS.blue)}
                        tools={volumeToolsGrouped}
                        onSelectTool={() => {}}
                        onOpenFullTools={() => {}}
                    />
                </div>
            </div>

            <div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>Medium (500px)</div>
                <div style={{ width: '500px' }}>
                    <InstanceToolsNotch
                        activeView={createMockView('Medium Name', COLORS.green)}
                        tools={basicTools}
                        onSelectTool={() => {}}
                        onOpenFullTools={() => {}}
                    />
                </div>
            </div>

            <div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>Narrow (350px)</div>
                <div style={{ width: '350px' }}>
                    <InstanceToolsNotch
                        activeView={createMockView('Short', COLORS.purple)}
                        tools={[basicTools[0], basicTools[1]]}
                        onSelectTool={() => {}}
                    />
                </div>
            </div>
        </div>
    ),
    decorators: [
        (Story) => (
            <div style={{ padding: '20px', background: '#030303' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MINIMAL - Just view indicator, no tools
// =============================================================================

export const MinimalNoTools = {
    args: {
        activeView: createMockView('Data Visualization', COLORS.pink),
        tools: [],
        onOpenFullTools: () => console.log('Open full tools'),
    },
};

// =============================================================================
// DISABLED TOOLS
// =============================================================================

export const WithDisabledTools = {
    args: {
        activeView: createMockView('Read-only View', COLORS.amber),
        tools: [
            { id: 'pointer', icon: 'mousePointer', label: 'Select', active: true },
            { id: 'pan', icon: 'hand', label: 'Pan' },
            { type: 'separator' },
            { id: 'edit', icon: 'edit', label: 'Edit', disabled: true },
            { id: 'delete', icon: 'trash', label: 'Delete', disabled: true },
        ],
        onSelectTool: (tool) => console.log('Selected:', tool),
    },
};

// =============================================================================
// VTK CAMERA VIEWS (with camera-grid)
// =============================================================================

const vtkTools = [
    {
        id: 'views',
        type: 'menu',
        icon: 'camera',
        label: 'Views',
        description: 'Standard camera views',
        options: [
            {
                type: 'camera-grid',
                id: 'camera-grid-main',
                views: [
                    { id: 'top', label: 'Top' },
                    { id: 'isometric', label: 'ISO', special: true },
                    { id: 'left', label: 'Left' },
                    { id: 'bottom', label: 'Bottom' },
                    { id: 'front', label: 'Front' },
                    { id: 'back', label: 'Back' },
                ],
                onViewSelect: (viewId) => console.log('Camera view selected:', viewId),
            },
            { type: 'separator' },
            { id: 'reset', icon: 'rotateCcw', label: 'Reset Camera', shortcut: 'R' },
        ],
    },
    {
        id: 'representation',
        type: 'menu',
        icon: 'box',
        label: 'Representation',
        description: 'Surface representation',
        options: [
            { id: 'surface', icon: 'box', label: 'Surface', active: true },
            { id: 'wireframe', icon: 'grid', label: 'Wireframe' },
            { id: 'points', icon: 'scatter', label: 'Points' },
        ],
    },
    { type: 'separator' },
    { id: 'colormap', icon: 'palette', label: 'Colormap' },
    { id: 'clip', icon: 'scissors', label: 'Clip Plane' },
];

export const VTKCameraViews = {
    args: {
        activeView: createMockView('3D Volume', COLORS.green),
        tools: vtkTools,
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        zoomLevel: 100,
        onZoomIn: () => console.log('Zoom in'),
        onZoomOut: () => console.log('Zoom out'),
        onFit: () => console.log('Fit'),
        onResetCamera: () => console.log('Reset camera'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Demonstrates the camera-grid feature used for VTK 3D views.
Click the camera icon to see the grid of standard views:

- **Top/Bottom** - View from above/below
- **Front/Back** - View from front/rear
- **Left** - View from side
- **ISO** - Isometric view (highlighted as special)

The camera-grid renders as a compact 3-column grid of buttons.
                `,
            },
        },
    },
};

// =============================================================================
// ACCENT POSITION VARIANTS
// =============================================================================

export const AccentTop = {
    args: {
        activeView: createMockView('Volume Data', COLORS.blue),
        tools: basicTools,
        accentPosition: 'top',
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        zoomLevel: 100,
    },
};

export const AccentBottom = {
    args: {
        activeView: createMockView('Chart Data', COLORS.purple),
        tools: basicTools,
        accentPosition: 'bottom',
        onSelectTool: (tool) => console.log('Selected:', tool),
        onOpenFullTools: () => console.log('Open full tools'),
        zoomLevel: 100,
    },
};
