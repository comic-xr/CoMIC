// src/ui/react/components/molecules/CanvasSizeDisplay/CanvasSizeDisplay.stories.jsx

import React, { useState } from 'react';
import { CanvasSizeDisplay } from './CanvasSizeDisplay';

export default {
    title: 'Molecules/CanvasSizeDisplay',
    component: CanvasSizeDisplay,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'object',
            description: 'Canvas size {cols, rows}',
        },
        placements: {
            control: 'object',
            description: 'Array of canvas placements to check against',
        },
        onChange: { action: 'changed' },
        onShrinkBlocked: { action: 'shrinkBlocked' },
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
        placements: [],
    },
};

export const LargeCanvas = {
    args: {
        size: { cols: 8, rows: 8 },
        placements: [],
    },
};

export const SmallCanvas = {
    args: {
        size: { cols: 1, rows: 1 },
        placements: [],
    },
};

export const RectangularCanvas = {
    args: {
        size: { cols: 6, rows: 3 },
        placements: [],
    },
};

// =============================================================================
// WITH PLACEMENTS
// =============================================================================

export const WithPlacements = {
    args: {
        size: { cols: 4, rows: 4 },
        placements: [
            { id: '1', row: 0, col: 0, rowSpan: 1, colSpan: 1 },
            { id: '2', row: 0, col: 1, rowSpan: 2, colSpan: 2 },
            { id: '3', row: 2, col: 0, rowSpan: 1, colSpan: 1 },
        ],
    },
};

export const CannotShrink = {
    args: {
        size: { cols: 3, rows: 3 },
        placements: [
            { id: '1', row: 0, col: 0, rowSpan: 1, colSpan: 1 },
            { id: '2', row: 2, col: 2, rowSpan: 1, colSpan: 1 }, // In bottom-right corner
        ],
    },
};

export const PartialShrinkBlocked = {
    args: {
        size: { cols: 4, rows: 4 },
        placements: [
            { id: '1', row: 0, col: 3, rowSpan: 1, colSpan: 1 }, // Blocks column shrink
        ],
    },
};

// =============================================================================
// INTERACTIVE EXAMPLE
// =============================================================================

export const Interactive = {
    render: function InteractiveStory() {
        const [size, setSize] = useState({ cols: 4, rows: 4 });
        const [placements] = useState([
            { id: '1', row: 0, col: 0, rowSpan: 1, colSpan: 1 },
            { id: '2', row: 1, col: 1, rowSpan: 2, colSpan: 2 },
        ]);
        const [blocked, setBlocked] = useState(null);

        const handleShrinkBlocked = (info) => {
            setBlocked(info);
            setTimeout(() => setBlocked(null), 3000);
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <CanvasSizeDisplay
                    size={size}
                    placements={placements}
                    onChange={setSize}
                    onShrinkBlocked={handleShrinkBlocked}
                />

                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    Canvas: {size.rows} rows x {size.cols} columns
                </div>

                {blocked && (
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#ef4444',
                    }}>
                        Cannot shrink {blocked.dimension}: {blocked.affectedPlacements.length} view(s) affected
                    </div>
                )}

                {/* Visual grid representation */}
                <div style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(${size.rows}, 32px)`,
                    gridTemplateColumns: `repeat(${size.cols}, 32px)`,
                    gap: '2px',
                    marginTop: '8px',
                }}>
                    {Array.from({ length: size.rows * size.cols }).map((_, i) => {
                        const row = Math.floor(i / size.cols);
                        const col = i % size.cols;
                        const hasPlacement = placements.some(p =>
                            row >= p.row && row < p.row + (p.rowSpan || 1) &&
                            col >= p.col && col < p.col + (p.colSpan || 1)
                        );
                        return (
                            <div key={i} style={{
                                background: hasPlacement
                                    ? 'rgba(96, 165, 250, 0.4)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '2px',
                            }} />
                        );
                    })}
                </div>
            </div>
        );
    },
};

// =============================================================================
// EDGE CASES
// =============================================================================

export const MaximumSize = {
    args: {
        size: { cols: 10, rows: 10 },
        placements: [],
    },
};

export const EmptyWithNaN = {
    args: {
        size: { cols: NaN, rows: undefined },
        placements: [],
    },
};
