// src/ui/react/components/molecules/ViewportSizeDisplay/ViewportSizeDisplay.stories.jsx

import React, { useState } from 'react';
import { ViewportSizeDisplay } from './ViewportSizeDisplay';

export default {
    title: 'Molecules/ViewportSizeDisplay',
    component: ViewportSizeDisplay,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'object',
            description: 'Viewport size {cols, rows}',
        },
        maxSize: {
            control: 'object',
            description: 'Maximum size {cols, rows} - typically canvas dimensions',
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
        size: { cols: 3, rows: 3 },
        maxSize: { cols: 10, rows: 10 },
    },
};

export const SmallViewport = {
    args: {
        size: { cols: 1, rows: 1 },
        maxSize: { cols: 10, rows: 10 },
    },
};

export const LargeViewport = {
    args: {
        size: { cols: 4, rows: 4 },
        maxSize: { cols: 10, rows: 10 },
    },
};

export const RectangularViewport = {
    args: {
        size: { cols: 3, rows: 2 },
        maxSize: { cols: 10, rows: 10 },
    },
};

// =============================================================================
// CONSTRAINED BY CANVAS
// =============================================================================

export const ConstrainedBySmallCanvas = {
    args: {
        size: { cols: 2, rows: 2 },
        maxSize: { cols: 3, rows: 3 },
    },
};

export const AtMaximumSize = {
    args: {
        size: { cols: 4, rows: 4 },
        maxSize: { cols: 4, rows: 4 },
    },
};

export const WideCanvas = {
    args: {
        size: { cols: 3, rows: 2 },
        maxSize: { cols: 8, rows: 3 },
    },
};

// =============================================================================
// INTERACTIVE EXAMPLE
// =============================================================================

export const Interactive = {
    render: function InteractiveStory() {
        const [viewport, setViewport] = useState({ cols: 2, rows: 2 });
        const [canvas, setCanvas] = useState({ cols: 6, rows: 6 });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <ViewportSizeDisplay
                    size={viewport}
                    maxSize={canvas}
                    onChange={setViewport}
                />

                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    <div>Viewport: {viewport.rows} x {viewport.cols}</div>
                    <div>Canvas Max: {canvas.rows} x {canvas.cols}</div>
                </div>

                {/* Canvas size controls */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '8px',
                }}>
                    <button
                        onClick={() => setCanvas(c => ({ ...c, cols: Math.max(1, c.cols - 1), rows: Math.max(1, c.rows - 1) }))}
                        style={{
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '11px',
                            cursor: 'pointer',
                        }}
                    >
                        Shrink Canvas
                    </button>
                    <button
                        onClick={() => setCanvas(c => ({ ...c, cols: c.cols + 1, rows: c.rows + 1 }))}
                        style={{
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '11px',
                            cursor: 'pointer',
                        }}
                    >
                        Grow Canvas
                    </button>
                </div>

                {/* Visual representation */}
                <div style={{
                    position: 'relative',
                    marginTop: '8px',
                }}>
                    {/* Canvas grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateRows: `repeat(${canvas.rows}, 24px)`,
                        gridTemplateColumns: `repeat(${canvas.cols}, 24px)`,
                        gap: '2px',
                    }}>
                        {Array.from({ length: canvas.rows * canvas.cols }).map((_, i) => {
                            const row = Math.floor(i / canvas.cols);
                            const col = i % canvas.cols;
                            const inViewport = row < viewport.rows && col < viewport.cols;
                            return (
                                <div key={i} style={{
                                    background: inViewport
                                        ? 'rgba(96, 165, 250, 0.4)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '2px',
                                }} />
                            );
                        })}
                    </div>
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                    Blue = visible viewport area
                </div>
            </div>
        );
    },
};

// =============================================================================
// EDGE CASES
// =============================================================================

export const MinimumViewport = {
    args: {
        size: { cols: 1, rows: 1 },
        maxSize: { cols: 1, rows: 1 },
    },
};

export const WithNaNValues = {
    args: {
        size: { cols: NaN, rows: undefined },
        maxSize: { cols: 10, rows: 10 },
    },
};

// =============================================================================
// COMPARISON VIEW
// =============================================================================

export const PresetComparison = {
    render: function PresetComparisonStory() {
        const presets = [
            { label: '1x1', size: { cols: 1, rows: 1 } },
            { label: '2x2', size: { cols: 2, rows: 2 } },
            { label: '3x3', size: { cols: 3, rows: 3 } },
            { label: '2x1 (wide)', size: { cols: 2, rows: 1 } },
            { label: '1x2 (tall)', size: { cols: 1, rows: 2 } },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {presets.map(preset => (
                    <div key={preset.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{
                            width: '80px',
                            fontSize: '12px',
                            color: '#888',
                        }}>
                            {preset.label}
                        </span>
                        <ViewportSizeDisplay
                            size={preset.size}
                            maxSize={{ cols: 10, rows: 10 }}
                        />
                        <div style={{
                            display: 'grid',
                            gridTemplateRows: `repeat(${preset.size.rows}, 16px)`,
                            gridTemplateColumns: `repeat(${preset.size.cols}, 16px)`,
                            gap: '1px',
                        }}>
                            {Array.from({ length: preset.size.rows * preset.size.cols }).map((_, i) => (
                                <div key={i} style={{
                                    background: 'rgba(96, 165, 250, 0.4)',
                                    borderRadius: '1px',
                                }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    },
};
