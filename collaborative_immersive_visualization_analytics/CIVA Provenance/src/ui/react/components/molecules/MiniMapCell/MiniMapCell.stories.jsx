// src/ui/react/components/molecules/MiniMapCell/MiniMapCell.stories.jsx
// Stories for MiniMapCell molecule

import React, { useState } from 'react';
import { MiniMapCell } from './MiniMapCell';

export default {
    title: 'Molecules/MiniMapCell',
    component: MiniMapCell,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <div style={{ position: 'relative', width: '200px', height: '200px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Story />
                </div>
            </div>
        ),
    ],
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Empty = {
    args: {
        cell: { x: 0, y: 0 },
        cellSize: 40,
    },
};

export const WithView = {
    args: {
        cell: {
            x: 0,
            y: 0,
            view: { name: 'Brain Scan', color: '#60a5fa' },
        },
        cellSize: 40,
    },
};

export const Selected = {
    args: {
        cell: {
            x: 0,
            y: 0,
            view: { name: 'Dataset A', color: '#4ade80' },
        },
        cellSize: 40,
        selected: true,
    },
};

export const Locked = {
    args: {
        cell: {
            x: 0,
            y: 0,
            view: { name: 'Locked View', color: '#f472b6' },
            locked: true,
        },
        cellSize: 40,
    },
};

export const InViewport = {
    args: {
        cell: {
            x: 0,
            y: 0,
            view: { name: 'Visible', color: '#fbbf24' },
        },
        cellSize: 40,
        inViewport: true,
    },
};

export const WithLabel = {
    args: {
        cell: {
            x: 0,
            y: 0,
            view: { name: 'Brain Scan', color: '#60a5fa' },
        },
        cellSize: 40,
        showLabel: true,
    },
};

// =============================================================================
// MERGED CELLS
// =============================================================================

export const MergedHorizontal = {
    args: {
        cell: {
            x: 0,
            y: 0,
            width: 2,
            height: 1,
            view: { name: 'Wide View', color: '#a78bfa' },
        },
        cellSize: 40,
        showLabel: true,
    },
};

export const MergedVertical = {
    args: {
        cell: {
            x: 0,
            y: 0,
            width: 1,
            height: 2,
            view: { name: 'Tall View', color: '#2dd4bf' },
        },
        cellSize: 40,
        showLabel: true,
    },
};

export const MergedLarge = {
    args: {
        cell: {
            x: 0,
            y: 0,
            width: 2,
            height: 2,
            view: { name: 'Large View', color: '#fb7185' },
        },
        cellSize: 40,
        showLabel: true,
    },
};

// =============================================================================
// MINIMAP GRID (Real-world example)
// =============================================================================

export const MiniMapGrid = {
    render: () => {
        const [selectedCell, setSelectedCell] = useState(null);

        const cells = [
            { x: 0, y: 0, view: { name: 'Brain MRI', color: '#60a5fa' } },
            { x: 1, y: 0, view: { name: 'Heart CT', color: '#4ade80' } },
            { x: 2, y: 0 },
            { x: 0, y: 1, view: { name: 'Lung X-Ray', color: '#fbbf24' }, locked: true },
            { x: 1, y: 1, width: 2, height: 1, view: { name: 'Wide View', color: '#a78bfa' } },
            { x: 0, y: 2 },
            { x: 1, y: 2 },
            { x: 2, y: 2, view: { name: 'Spine', color: '#fb7185' } },
        ];

        return (
            <div style={{
                position: 'relative',
                width: '180px',
                height: '180px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '8px'
            }}>
                {/* Viewport indicator */}
                <div style={{
                    position: 'absolute',
                    left: 8,
                    top: 8,
                    width: 120,
                    height: 80,
                    border: '2px solid rgba(96, 165, 250, 0.5)',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    zIndex: 10,
                }} />

                {cells.map((cell, i) => (
                    <MiniMapCell
                        key={i}
                        cell={cell}
                        cellSize={40}
                        selected={selectedCell === i}
                        inViewport={cell.x < 2 && cell.y < 2}
                        showLabel
                        onClick={() => setSelectedCell(i)}
                    />
                ))}
            </div>
        );
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
// DRAGGABLE EXAMPLE
// =============================================================================

export const DraggableCells = {
    render: () => {
        const [dragging, setDragging] = useState(null);

        const cells = [
            { x: 0, y: 0, view: { name: 'View A', color: '#60a5fa' } },
            { x: 1, y: 0, view: { name: 'View B', color: '#4ade80' } },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
        ];

        return (
            <div style={{
                position: 'relative',
                width: '160px',
                height: '160px',
            }}>
                {cells.map((cell, i) => (
                    <MiniMapCell
                        key={i}
                        cell={cell}
                        cellSize={40}
                        draggable={!!cell.view}
                        onDragStart={() => setDragging(i)}
                        onDragEnd={() => setDragging(null)}
                        showLabel
                    />
                ))}
                {dragging !== null && (
                    <div style={{
                        position: 'absolute',
                        bottom: '-30px',
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontSize: '10px',
                        color: '#60a5fa'
                    }}>
                        Dragging: {cells[dragging].view?.name}
                    </div>
                )}
            </div>
        );
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '60px 40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// COLOR VARIETY
// =============================================================================

export const ColorVariety = {
    render: () => {
        const colors = [
            '#60a5fa', '#4ade80', '#fbbf24', '#f472b6',
            '#a78bfa', '#2dd4bf', '#fb7185', '#818cf8'
        ];

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 40px)',
                gridTemplateRows: 'repeat(2, 40px)',
                gap: '4px',
            }}>
                {colors.map((color, i) => (
                    <div key={i} style={{ position: 'relative', width: 40, height: 40 }}>
                        <MiniMapCell
                            cell={{
                                x: 0,
                                y: 0,
                                view: { name: `V${i + 1}`, color }
                            }}
                            cellSize={40}
                            showLabel
                        />
                    </div>
                ))}
            </div>
        );
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};
