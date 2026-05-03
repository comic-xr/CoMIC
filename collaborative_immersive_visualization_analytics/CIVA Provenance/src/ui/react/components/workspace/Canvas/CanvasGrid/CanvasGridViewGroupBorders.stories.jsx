// src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasGridViewGroupBorders.stories.jsx
import React from 'react';
import './CanvasGrid.scss';
import { mockViewGroupsWithPositions } from '../__fixtures__/canvasFixtures';

const GRID = {
    rows: 4,
    cols: 5,
    cellSize: { width: 84, height: 64 },
    gap: 8,
    padding: { top: 12, left: 12 },
};

const ViewGroupOverlayPreview = ({ viewGroups = mockViewGroupsWithPositions }) => {
    const { rows, cols, cellSize, gap, padding } = GRID;
    const width = padding.left * 2 + cols * cellSize.width + (cols - 1) * gap;
    const height = padding.top * 2 + rows * cellSize.height + (rows - 1) * gap;

    return (
        <div
            style={{
                width,
                height,
                position: 'relative',
                background: 'rgba(10, 12, 20, 0.9)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                padding: 0,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    padding: `${padding.top}px ${padding.left}px`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${cellSize.width}px)`,
                    gridTemplateRows: `repeat(${rows}, ${cellSize.height}px)`,
                    gap: `${gap}px`,
                }}
            >
                {Array.from({ length: rows * cols }).map((_, index) => (
                    <div
                        key={index}
                        style={{
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}
                    />
                ))}
            </div>

            <div className="canvas-grid__viewgroup-overlay">
                {viewGroups.map((group) => {
                    const { row, col, rowSpan, colSpan } = group.canvasPosition;
                    const left = padding.left + col * (cellSize.width + gap);
                    const top = padding.top + row * (cellSize.height + gap);
                    const width = colSpan * cellSize.width + (colSpan - 1) * gap;
                    const height = rowSpan * cellSize.height + (rowSpan - 1) * gap;

                    return (
                        <div
                            key={group.id}
                            className="canvas-grid__viewgroup-outline"
                            style={{
                                left,
                                top,
                                width,
                                height,
                                '--viewgroup-color': group.color,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default {
    title: 'Canvas/CanvasGrid/ViewGroupBorders',
    component: ViewGroupOverlayPreview,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#05070d', padding: 24 }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        viewGroups: mockViewGroupsWithPositions,
    },
};
