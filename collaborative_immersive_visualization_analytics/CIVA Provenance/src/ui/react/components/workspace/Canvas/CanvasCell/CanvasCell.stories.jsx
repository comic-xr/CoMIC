// src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.stories.jsx
// Stories for CanvasCell organism

import React, { useState } from 'react';
import { CanvasCell } from './CanvasCell';
import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
import { RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';

// =============================================================================
// META
// =============================================================================

export default {
    title: 'Organisms/CanvasCell',
    component: CanvasCell,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A single cell in the canvas grid that supports:
- Multiple content types (view, notes, image, empty)
- Progressive UI degradation (full, compact, thumbnail, snapshot)
- Drag and drop with zone detection
- Selection mode for batch operations

## Render Modes
- **Full**: All UI elements visible
- **Compact**: Toolbar and header, no coordinates/size badge
- **Thumbnail**: Minimal UI, static preview
- **Snapshot**: Smallest, dot indicator only
                `,
            },
        },
    },
    argTypes: {
        renderMode: {
            control: 'select',
            options: Object.values(RENDER_MODES),
        },
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
// MOCK DATA
// =============================================================================

const mockEmptyPlacement = null;

const mockViewPlacement = {
    id: 'placement-1',
    row: 0,
    col: 0,
    rowSpan: 1,
    colSpan: 1,
    content: {
        type: PlacementContentType.VIEW,
        viewConfigurationId: 'view-demo-1',
        name: 'Scatter Plot',
        colorHex: '#60a5fa',
    },
};

const mockNotesPlacement = {
    id: 'placement-2',
    row: 0,
    col: 1,
    rowSpan: 1,
    colSpan: 1,
    content: {
        type: PlacementContentType.NOTES,
        notesBlockId: 'notes-1',
    },
};

const mockImagePlacement = {
    id: 'placement-3',
    row: 1,
    col: 0,
    rowSpan: 1,
    colSpan: 1,
    content: {
        type: PlacementContentType.IMAGE,
        imageBlockId: 'image-1',
    },
};

// =============================================================================
// EMPTY CELL STORIES
// =============================================================================

export const Empty = {
    args: {
        placement: mockEmptyPlacement,
        row: 0,
        col: 0,
        renderMode: RENDER_MODES.FULL,
        cellSize: { width: 400, height: 300 },
    },
};

export const EmptyWithAddMenu = {
    render: () => {
        const [logs, setLogs] = useState([]);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <CanvasCell
                    placement={null}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 400, height: 300 }}
                    onAddContent={(type) => setLogs(prev => [...prev.slice(-2), `Added: ${type}`])}
                />
                <div style={{ fontSize: '11px', color: '#666' }}>
                    Click the + button to see radial menu. Logs: {logs.join(', ') || 'none'}
                </div>
            </div>
        );
    },
};

// =============================================================================
// CONTENT TYPE STORIES
// =============================================================================

export const WithViewContent = {
    args: {
        placement: mockViewPlacement,
        row: 0,
        col: 0,
        renderMode: RENDER_MODES.FULL,
        cellSize: { width: 400, height: 300 },
    },
};

export const WithNotesContent = {
    args: {
        placement: mockNotesPlacement,
        row: 0,
        col: 1,
        renderMode: RENDER_MODES.FULL,
        cellSize: { width: 400, height: 300 },
    },
};

export const WithImageContent = {
    args: {
        placement: mockImagePlacement,
        row: 1,
        col: 0,
        renderMode: RENDER_MODES.FULL,
        cellSize: { width: 400, height: 300 },
    },
};

// =============================================================================
// RENDER MODE STORIES
// =============================================================================

export const RenderModes = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Full Mode
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 300, height: 200 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Compact Mode
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.COMPACT}
                    cellSize={{ width: 300, height: 200 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Thumbnail Mode
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.THUMBNAIL}
                    cellSize={{ width: 150, height: 100 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Snapshot Mode
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.SNAPSHOT}
                    cellSize={{ width: 80, height: 60 }}
                />
            </div>
        </div>
    ),
};

// =============================================================================
// SELECTION STATES
// =============================================================================

export const Selected = {
    args: {
        placement: mockViewPlacement,
        row: 0,
        col: 0,
        renderMode: RENDER_MODES.FULL,
        cellSize: { width: 400, height: 300 },
        isSelected: true,
    },
};

export const Highlighted = {
    args: {
        placement: mockViewPlacement,
        row: 0,
        col: 0,
        renderMode: RENDER_MODES.FULL,
        cellSize: { width: 400, height: 300 },
        isHighlighted: true,
    },
};

export const SelectionMode = {
    render: () => {
        const [selected, setSelected] = useState([]);

        const toggleSelection = (row, col) => {
            const key = `${row}-${col}`;
            setSelected(prev =>
                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            );
        };

        const cells = [
            { row: 0, col: 0, placement: mockViewPlacement },
            { row: 0, col: 1, placement: mockNotesPlacement },
            { row: 1, col: 0, placement: null },
            { row: 1, col: 1, placement: mockImagePlacement },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 200px)',
                    gap: '8px',
                }}>
                    {cells.map(({ row, col, placement }) => (
                        <CanvasCell
                            key={`${row}-${col}`}
                            placement={placement}
                            row={row}
                            col={col}
                            renderMode={RENDER_MODES.COMPACT}
                            cellSize={{ width: 200, height: 150 }}
                            selectionMode={true}
                            isSelected={selected.includes(`${row}-${col}`)}
                            onSelect={() => toggleSelection(row, col)}
                        />
                    ))}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                    Selected: {selected.length ? selected.join(', ') : 'none'}
                </div>
            </div>
        );
    },
};

// =============================================================================
// SPANNING CELLS
// =============================================================================

export const SpanningCells = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>
                    2x1 Span
                </div>
                <CanvasCell
                    placement={{
                        ...mockViewPlacement,
                        colSpan: 2,
                        rowSpan: 1,
                    }}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 500, height: 200 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>
                    1x2 Span
                </div>
                <CanvasCell
                    placement={{
                        ...mockViewPlacement,
                        colSpan: 1,
                        rowSpan: 2,
                    }}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 250, height: 400 }}
                />
            </div>
        </div>
    ),
};

// =============================================================================
// EMPTY CELLS AT DIFFERENT SIZES
// =============================================================================

export const EmptyCellModes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>Full</div>
                <CanvasCell
                    placement={null}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 200, height: 150 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>Thumbnail</div>
                <CanvasCell
                    placement={null}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.THUMBNAIL}
                    cellSize={{ width: 100, height: 75 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>Snapshot</div>
                <CanvasCell
                    placement={null}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.SNAPSHOT}
                    cellSize={{ width: 60, height: 45 }}
                />
            </div>
        </div>
    ),
};

// =============================================================================
// GRID LAYOUT EXAMPLE
// =============================================================================

export const GridLayout = {
    render: () => {
        const grid = [
            [mockViewPlacement, null, mockNotesPlacement],
            [null, mockImagePlacement, null],
            [mockViewPlacement, mockViewPlacement, null],
        ];

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 150px)',
                gridTemplateRows: 'repeat(3, 100px)',
                gap: '4px',
            }}>
                {grid.flatMap((row, rowIdx) =>
                    row.map((placement, colIdx) => (
                        <CanvasCell
                            key={`${rowIdx}-${colIdx}`}
                            placement={placement}
                            row={rowIdx}
                            col={colIdx}
                            renderMode={RENDER_MODES.THUMBNAIL}
                            cellSize={{ width: 150, height: 100 }}
                        />
                    ))
                )}
            </div>
        );
    },
};

// =============================================================================
// COLOR VARIANTS - Test different position-based colors
// =============================================================================

const CELL_COLORS = [
    { name: 'Blue', hex: '#60a5fa', rgb: '96, 165, 250' },
    { name: 'Green', hex: '#34d399', rgb: '52, 211, 153' },
    { name: 'Purple', hex: '#c084fc', rgb: '192, 132, 252' },
    { name: 'Pink', hex: '#fb7185', rgb: '251, 113, 133' },
    { name: 'Amber', hex: '#fbbf24', rgb: '251, 191, 36' },
    { name: 'Teal', hex: '#7dd3fc', rgb: '125, 211, 252' },
];

export const ColorVariants = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {CELL_COLORS.map((color, index) => {
                const placement = {
                    ...mockViewPlacement,
                    id: `placement-${color.name}`,
                    content: {
                        ...mockViewPlacement.content,
                        name: `View ${color.name}`,
                        colorHex: color.hex,
                    },
                };
                return (
                    <div key={color.name}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                            {color.name}
                        </div>
                        <CanvasCell
                            placement={placement}
                            row={Math.floor(index / 3)}
                            col={index % 3}
                            renderMode={RENDER_MODES.FULL}
                            cellSize={{ width: 250, height: 180 }}
                            positionColor={color}
                        />
                    </div>
                );
            })}
        </div>
    ),
};

export const BorderStates = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Default
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={0}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 250, height: 180 }}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Hover (simulated)
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={1}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 250, height: 180 }}
                    isHighlighted={true}
                />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Selected
                </div>
                <CanvasCell
                    placement={mockViewPlacement}
                    row={0}
                    col={2}
                    renderMode={RENDER_MODES.FULL}
                    cellSize={{ width: 250, height: 180 }}
                    isSelected={true}
                />
            </div>
        </div>
    ),
};
