/**
 * @file VRMinimapGrid.jsx
 * @description Complete minimap grid component for VR canvas navigation.
 */

import React, { memo, useMemo } from 'react';
import { useVRNavigator, NAV_OPERATIONS } from './VRNavigatorContext';
import { VRMinimapCell } from './VRMinimapCell';
import './VRCanvasNavigator.scss';

/**
 * VRMinimapGrid - The complete minimap grid for VR
 */
export const VRMinimapGrid = memo(function VRMinimapGrid({
    viewport,
    homepoint,
    collaborators,
    displayMode = 'names',
}) {
    const { operation, cells, canvasSize } = useVRNavigator();

    // Build grid cells
    const gridCells = useMemo(() => {
        const result = [];
        const processedCells = new Set();

        for (let row = 0; row < canvasSize.rows; row++) {
            for (let col = 0; col < canvasSize.cols; col++) {
                const key = `${row}-${col}`;
                if (processedCells.has(key)) continue;

                const cell = cells?.find((c) => {
                    const rowSpan = c.rowSpan || 1;
                    const colSpan = c.colSpan || 1;
                    return (
                        row >= c.row &&
                        row < c.row + rowSpan &&
                        col >= c.col &&
                        col < c.col + colSpan
                    );
                });

                // Skip non-origin cells of spanning placements
                if (cell && (cell.row !== row || cell.col !== col)) {
                    processedCells.add(key);
                    continue;
                }

                // Mark spanned cells as processed
                if (cell) {
                    for (let r = row; r < row + (cell.rowSpan || 1); r++) {
                        for (let c = col; c < col + (cell.colSpan || 1); c++) {
                            processedCells.add(`${r}-${c}`);
                        }
                    }
                } else {
                    processedCells.add(key);
                }

                // Check viewport
                const inVP =
                    viewport &&
                    row >= viewport.row &&
                    row < viewport.row + viewport.rows &&
                    col >= viewport.col &&
                    col < viewport.col + viewport.cols;

                // Check homepoint
                const isHome =
                    homepoint &&
                    row === homepoint.row &&
                    col === homepoint.col;

                // Get collaborators at cell
                const cellCollabs = collaborators?.filter(
                    (c) =>
                        c.position?.row === row && c.position?.col === col
                );

                // Determine label based on display mode
                let label = '';
                if (cell) {
                    switch (displayMode) {
                        case 'names':
                            label = cell.name || cell.label || '';
                            break;
                        case 'numbers':
                            label = String((cells?.indexOf(cell) || 0) + 1);
                            break;
                        case 'colors':
                            label = '';
                            break;
                        default:
                            break;
                    }
                }

                result.push({
                    row,
                    col,
                    cell,
                    color: cell?.color,
                    label,
                    inVP,
                    isHome,
                    collaborators: cellCollabs,
                    key,
                });
            }
        }

        return result;
    }, [cells, canvasSize, viewport, homepoint, collaborators, displayMode]);

    return (
        <div
            className="vr-minimap-grid"
            style={{
                '--grid-cols': canvasSize.cols,
                '--grid-rows': canvasSize.rows,
            }}
        >
            {gridCells.map((cellData) => (
                <VRMinimapCell
                    key={cellData.key}
                    row={cellData.row}
                    col={cellData.col}
                    cell={cellData.cell}
                    color={cellData.color}
                    label={cellData.label}
                    isInViewport={cellData.inVP}
                    isHome={cellData.isHome}
                    collaborators={cellData.collaborators}
                />
            ))}

            {/* Operation instruction overlay */}
            {operation === NAV_OPERATIONS.MOVING && (
                <div className="vr-minimap-grid__instruction">
                    Tap destination cell &bull; B to cancel
                </div>
            )}
        </div>
    );
});

export default VRMinimapGrid;
