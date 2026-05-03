// src/ui/react/components/workspace/ViewHeader/ViewHeader.stories.jsx
// Stories for unified ViewHeader component

import React, { useState } from 'react';
import { ViewHeader } from './ViewHeader';

// =============================================================================
// META
// =============================================================================

export default {
    title: 'Workspace/ViewHeader',
    component: ViewHeader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Unified header component for view cells. Replaces duplicate InstanceHeader and CanvasCellHeader components.

## Variants
- **active**: Header for mounted views with full menu options
- **cold**: Header for thumbnail-only views (triggers activation on button click)

Both variants have the same 4 buttons: **More menu**, **VR**, **Focus**, **Close**

## Render Modes
- **full**: All elements visible
- **compact**: Reduced padding and smaller elements
- **thumbnail**: Minimal UI (no buttons except close)
- **snapshot**: Header not rendered
                `,
            },
        },
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['active', 'cold'],
        },
        renderMode: {
            control: 'select',
            options: ['full', 'compact', 'thumbnail', 'snapshot'],
        },
        isActive: {
            control: 'boolean',
        },
        isLoading: {
            control: 'boolean',
        },
        isInFocusMode: {
            control: 'boolean',
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '400px',
                background: '#0a0a0f',
                padding: '20px',
                borderRadius: '8px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// INSTANCE COLORS
// =============================================================================

const COLORS = {
    blue: { hex: '#60a5fa', name: 'blue' },
    green: { hex: '#34d399', name: 'green' },
    purple: { hex: '#c084fc', name: 'purple' },
    pink: { hex: '#fb7185', name: 'pink' },
    amber: { hex: '#fbbf24', name: 'amber' },
    teal: { hex: '#7dd3fc', name: 'teal' },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        variant: 'active',
        renderMode: 'full',
        displayName: 'brain_scan_001.nii',
        color: COLORS.blue,
        fileTypeInfo: { icon: 'box' },
        isActive: false,
        onClose: () => console.log('Close clicked'),
        onFocus: () => console.log('Focus clicked'),
        onVRMode: () => console.log('VR clicked'),
    },
};

export const Active = {
    args: {
        ...Default.args,
        isActive: true,
    },
};

export const Loading = {
    args: {
        ...Default.args,
        isLoading: true,
    },
};

export const Cold = {
    args: {
        variant: 'cold',
        renderMode: 'full',
        displayName: 'scatter_plot_data.csv',
        color: COLORS.green,
        fileTypeInfo: { icon: 'chart' },
        onActivate: () => console.log('Activate clicked'),
        onRemove: () => console.log('Remove clicked'),
        onVRMode: () => console.log('VR clicked'),
        onOpenInIsolation: () => console.log('Focus clicked'),
    },
};

// =============================================================================
// VARIANT COMPARISON
// =============================================================================

export const VariantComparison = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Active Variant (mounted view)
                </div>
                <ViewHeader
                    variant="active"
                    displayName="Active View"
                    color={COLORS.blue}
                    fileTypeInfo={{ icon: 'box' }}
                    onClose={() => {}}
                    onFocus={() => {}}
                    onVRMode={() => {}}
                    onOpenInstanceTools={() => {}}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Cold Variant (thumbnail only - same buttons, triggers activation)
                </div>
                <ViewHeader
                    variant="cold"
                    displayName="Cold View"
                    color={COLORS.amber}
                    fileTypeInfo={{ icon: 'chart' }}
                    onActivate={() => console.log('View activated!')}
                    onRemove={() => {}}
                    onVRMode={() => {}}
                    onOpenInIsolation={() => {}}
                />
            </div>
        </div>
    ),
    decorators: [
        (Story) => (
            <div style={{
                width: '400px',
                background: '#0a0a0f',
                padding: '20px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// RENDER MODES
// =============================================================================

export const RenderModes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['full', 'compact', 'thumbnail'].map(mode => (
                <div key={mode}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {mode} mode {mode === 'thumbnail' && '(minimal buttons)'}
                    </div>
                    <ViewHeader
                        variant="active"
                        renderMode={mode}
                        displayName="View Name"
                        color={COLORS.purple}
                        fileTypeInfo={{ icon: 'box' }}
                        onClose={() => {}}
                        onFocus={() => {}}
                        onVRMode={() => {}}
                    />
                </div>
            ))}
        </div>
    ),
    decorators: [
        (Story) => (
            <div style={{
                width: '300px',
                background: '#0a0a0f',
                padding: '20px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// COLOR VARIANTS
// =============================================================================

export const ColorVariants = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {Object.entries(COLORS).map(([name, color]) => (
                <div key={name}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {name}
                    </div>
                    <ViewHeader
                        variant="active"
                        displayName={`${name}_view.vtk`}
                        color={color}
                        fileTypeInfo={{ icon: 'box' }}
                        onClose={() => {}}
                        onFocus={() => {}}
                        onVRMode={() => {}}
                    />
                </div>
            ))}
        </div>
    ),
    decorators: [
        (Story) => (
            <div style={{
                width: '600px',
                background: '#0a0a0f',
                padding: '20px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// STATE COMPARISON
// =============================================================================

export const StateComparison = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Default (not focused)
                </div>
                <ViewHeader
                    variant="active"
                    displayName="Default State"
                    color={COLORS.blue}
                    isActive={false}
                    onClose={() => {}}
                    onFocus={() => {}}
                    onVRMode={() => {}}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Active (focused)
                </div>
                <ViewHeader
                    variant="active"
                    displayName="Active State"
                    color={COLORS.blue}
                    isActive={true}
                    onClose={() => {}}
                    onFocus={() => {}}
                    onVRMode={() => {}}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    In Focus Mode (no focus button)
                </div>
                <ViewHeader
                    variant="active"
                    displayName="Focus Mode"
                    color={COLORS.blue}
                    isActive={true}
                    isInFocusMode={true}
                    onClose={() => {}}
                    onVRMode={() => {}}
                />
            </div>
        </div>
    ),
    decorators: [
        (Story) => (
            <div style={{
                width: '350px',
                background: '#0a0a0f',
                padding: '20px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// WITH COLLABORATORS
// =============================================================================

export const WithCollaborators = {
    args: {
        ...Default.args,
        collaborators: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
        ],
    },
};

// =============================================================================
// INTERACTIVE MENU
// =============================================================================

export const InteractiveMenu = {
    render: () => {
        const [logs, setLogs] = useState([]);
        const addLog = (action) => setLogs(prev => [...prev.slice(-4), action]);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                    Buttons: <strong>More Menu</strong> | <strong>VR</strong> | <strong>Focus</strong> | <strong>Close</strong>
                </div>
                <ViewHeader
                    variant="active"
                    displayName="Click Buttons to Test"
                    color={COLORS.purple}
                    fileTypeInfo={{ icon: 'box' }}
                    onClose={() => addLog('Close')}
                    onFocus={() => addLog('Focus')}
                    onVRMode={() => addLog('VR Mode')}
                    onOpenInstanceTools={() => addLog('Instance Tools')}
                    onFullscreen={() => addLog('Fullscreen')}
                    onResetCamera={() => addLog('Reset Camera')}
                    onFitView={() => addLog('Fit View')}
                    onDuplicate={() => addLog('Duplicate')}
                    onAddToSubset={() => addLog('Add to Subset')}
                    onShare={() => addLog('Share')}
                    onDelete={() => addLog('Delete')}
                />
                <div style={{
                    fontSize: '11px',
                    color: '#666',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    minHeight: '60px',
                }}>
                    <strong>Action Log:</strong><br/>
                    {logs.length ? logs.join(' → ') : 'Click buttons or menu items...'}
                </div>
            </div>
        );
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '400px',
                background: '#0a0a0f',
                padding: '20px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// GRID SIMULATION
// =============================================================================

export const GridSimulation = {
    render: () => {
        const views = [
            { name: 'brain_scan.nii', color: COLORS.blue, variant: 'active' },
            { name: 'heart_model.vtk', color: COLORS.green, variant: 'cold' },
            { name: 'scatter_data.csv', color: COLORS.purple, variant: 'active' },
            { name: 'network_graph.json', color: COLORS.pink, variant: 'cold' },
            { name: 'timeline.csv', color: COLORS.amber, variant: 'active' },
            { name: 'volume_data.nii', color: COLORS.teal, variant: 'cold' },
        ];

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
            }}>
                {views.map((view, i) => (
                    <div
                        key={i}
                        style={{
                            background: '#15151a',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: `2px solid rgba(${view.color.hex.slice(1).match(/.{2}/g).map(h => parseInt(h, 16)).join(', ')}, 0.25)`,
                        }}
                    >
                        <ViewHeader
                            variant={view.variant}
                            renderMode="compact"
                            displayName={view.name}
                            color={view.color}
                            isActive={i === 0}
                            onClose={() => {}}
                            onFocus={() => {}}
                            onVRMode={() => {}}
                            onActivate={() => console.log(`Activating ${view.name}`)}
                            onRemove={() => {}}
                            onOpenInIsolation={() => {}}
                        />
                        <div style={{
                            height: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: '10px',
                        }}>
                            {view.variant === 'cold' ? 'Thumbnail' : 'Content'}
                        </div>
                    </div>
                ))}
            </div>
        );
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '700px',
                background: '#0a0a0f',
                padding: '20px',
            }}>
                <Story />
            </div>
        ),
    ],
};
