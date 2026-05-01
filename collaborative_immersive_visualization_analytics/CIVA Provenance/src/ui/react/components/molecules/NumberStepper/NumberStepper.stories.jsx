// src/ui/react/components/molecules/NumberStepper/NumberStepper.stories.jsx
// Stories for NumberStepper molecule

import React, { useState } from 'react';
import { NumberStepper } from './NumberStepper';

export default {
    title: 'Molecules/NumberStepper',
    component: NumberStepper,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        onChange: { action: 'changed' },
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
        value: 5,
        label: 'Quantity',
        min: 0,
        max: 10,
    },
};

export const WithUnit = {
    args: {
        value: 100,
        label: 'Width',
        unit: 'px',
        min: 0,
        max: 500,
        step: 10,
    },
};

export const NoLimits = {
    args: {
        value: 0,
        label: 'Value',
    },
};

export const Disabled = {
    args: {
        value: 5,
        label: 'Disabled',
        disabled: true,
    },
};

export const Compact = {
    args: {
        value: 3,
        compact: true,
    },
};

// =============================================================================
// SIZE VARIANTS
// =============================================================================

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            <NumberStepper value={5} label="Small" size="sm" min={0} max={10} />
            <NumberStepper value={5} label="Medium" size="md" min={0} max={10} />
            <NumberStepper value={5} label="Large" size="lg" min={0} max={10} />
        </div>
    ),
};

// =============================================================================
// INTERACTIVE EXAMPLE
// =============================================================================

export const Interactive = {
    render: () => {
        const [value, setValue] = useState(5);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <NumberStepper
                    value={value}
                    onChange={setValue}
                    label="Interactive"
                    min={0}
                    max={20}
                />
                <span style={{ fontSize: '12px', color: '#888' }}>
                    Current value: {value}
                </span>
            </div>
        );
    },
};

// =============================================================================
// GRID SIZE CONTROLS (Real-world example)
// =============================================================================

export const GridSizeControls = {
    render: () => {
        const [rows, setRows] = useState(2);
        const [cols, setCols] = useState(3);

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Grid Size
                </span>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <NumberStepper
                        value={rows}
                        onChange={setRows}
                        label="Rows"
                        min={1}
                        max={10}
                    />
                    <NumberStepper
                        value={cols}
                        onChange={setCols}
                        label="Columns"
                        min={1}
                        max={10}
                    />
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(${rows}, 24px)`,
                    gridTemplateColumns: `repeat(${cols}, 24px)`,
                    gap: '2px',
                    marginTop: '8px'
                }}>
                    {Array.from({ length: rows * cols }).map((_, i) => (
                        <div key={i} style={{
                            background: 'rgba(96, 165, 250, 0.3)',
                            borderRadius: '2px'
                        }} />
                    ))}
                </div>
            </div>
        );
    },
};

// =============================================================================
// VIEWPORT CONTROLS (Real-world example)
// =============================================================================

export const ViewportControls = {
    render: () => {
        const [viewport, setViewport] = useState({ rows: 2, cols: 2 });

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Viewport Size
                </span>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <NumberStepper
                        value={viewport.rows}
                        onChange={(v) => setViewport(s => ({ ...s, rows: v }))}
                        label="Rows"
                        min={1}
                        max={6}
                        size="sm"
                    />
                    <span style={{ color: '#444', alignSelf: 'flex-end', marginBottom: '8px' }}>x</span>
                    <NumberStepper
                        value={viewport.cols}
                        onChange={(v) => setViewport(s => ({ ...s, cols: v }))}
                        label="Cols"
                        min={1}
                        max={6}
                        size="sm"
                    />
                </div>
            </div>
        );
    },
};

// =============================================================================
// WITH CUSTOM STEP
// =============================================================================

export const CustomStep = {
    render: () => (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            <NumberStepper value={0} label="Step: 1" step={1} min={0} max={10} />
            <NumberStepper value={0} label="Step: 5" step={5} min={0} max={50} />
            <NumberStepper value={0} label="Step: 10" step={10} min={0} max={100} />
        </div>
    ),
};

// =============================================================================
// AT LIMITS
// =============================================================================

export const AtLimits = {
    render: () => (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            <NumberStepper value={0} label="At Minimum" min={0} max={10} />
            <NumberStepper value={10} label="At Maximum" min={0} max={10} />
        </div>
    ),
};

// =============================================================================
// WITH COLOR
// =============================================================================

export const WithColor = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <NumberStepper value={5} label="Default" min={0} max={10} />
            <NumberStepper value={5} label="Blue" min={0} max={10} color="#60a5fa" />
            <NumberStepper value={5} label="Green" min={0} max={10} color="#4ade80" />
            <NumberStepper value={5} label="Amber" min={0} max={10} color="#fbbf24" />
        </div>
    ),
};
