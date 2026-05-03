// src/ui/react/components/workspace/Canvas/GridEditOverlay/GridEditOverlay.jsx
// Overlay controls for editing the canvas grid
//
// Features:
// - Add rows/columns buttons on edges
// - Cell merge controls
// - Edit mode toggle
// - Grid size display

import React, { useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useCanvas } from '@UI/react/hooks/useCanvas.js';
import './GridEditOverlay.scss';

/**
 * GridEditOverlay - Controls for editing the canvas grid
 */
export function GridEditOverlay({
    canvasId,
    editMode,
    onToggleEditMode,
    selectedCells = [],
    onMergeCells,
    onSplitCell,
    onClearSelection,
    onAddRow,
    onAddColumn,
}) {
    const {
        canvas,
        viewport,
    } = useCanvas(canvasId);

    if (!canvas) return null;

    const { rows, cols } = canvas.dimensions;
    const canAddRow = rows < 20;
    const canAddCol = cols < 20;

    const handleAddRow = async () => {
        if (canAddRow && onAddRow) {
            await onAddRow();
        }
    };

    const handleAddColumn = async () => {
        if (canAddCol && onAddColumn) {
            await onAddColumn();
        }
    };

    return (
        <div className={`grid-edit-overlay ${editMode ? 'grid-edit-overlay--active' : ''}`}>
            {/* Edit Mode Toggle Button */}
            <button
                className={`grid-edit-overlay__toggle ${editMode ? 'active' : ''}`}
                onClick={onToggleEditMode}
                title={editMode ? 'Exit edit mode' : 'Edit grid layout'}
            >
                <Icon name="grid3x3" size={16} />
            </button>

            {/* Edit Mode Controls */}
            {editMode && (
                <>
                    {/* Top edge - Add row above */}
                    <div className="grid-edit-overlay__edge grid-edit-overlay__edge--top">
                        <button
                            className="grid-edit-overlay__add-btn"
                            onClick={handleAddRow}
                            disabled={!canAddRow}
                            title="Add row"
                        >
                            <Icon name="add" size={14} />
                            <span>Row</span>
                        </button>
                    </div>

                    {/* Bottom edge - Add row below */}
                    <div className="grid-edit-overlay__edge grid-edit-overlay__edge--bottom">
                        <button
                            className="grid-edit-overlay__add-btn"
                            onClick={handleAddRow}
                            disabled={!canAddRow}
                            title="Add row"
                        >
                            <Icon name="add" size={14} />
                            <span>Row</span>
                        </button>
                    </div>

                    {/* Left edge - Add column left */}
                    <div className="grid-edit-overlay__edge grid-edit-overlay__edge--left">
                        <button
                            className="grid-edit-overlay__add-btn grid-edit-overlay__add-btn--vertical"
                            onClick={handleAddColumn}
                            disabled={!canAddCol}
                            title="Add column"
                        >
                            <Icon name="add" size={14} />
                            <span>Col</span>
                        </button>
                    </div>

                    {/* Right edge - Add column right */}
                    <div className="grid-edit-overlay__edge grid-edit-overlay__edge--right">
                        <button
                            className="grid-edit-overlay__add-btn grid-edit-overlay__add-btn--vertical"
                            onClick={handleAddColumn}
                            disabled={!canAddCol}
                            title="Add column"
                        >
                            <Icon name="add" size={14} />
                            <span>Col</span>
                        </button>
                    </div>

                    {/* Selection Controls (when cells are selected) */}
                    {selectedCells.length > 0 && (
                        <div className="grid-edit-overlay__selection-controls">
                            <div className="grid-edit-overlay__selection-info">
                                {selectedCells.length} cell{selectedCells.length > 1 ? 's' : ''} selected
                            </div>
                            {selectedCells.length > 1 && (
                                <button
                                    className="grid-edit-overlay__action-btn"
                                    onClick={() => onMergeCells?.(selectedCells)}
                                    title="Merge selected cells"
                                >
                                    <Icon name="combine" size={14} />
                                    <span>Merge</span>
                                </button>
                            )}
                            <button
                                className="grid-edit-overlay__action-btn grid-edit-overlay__action-btn--secondary"
                                onClick={onClearSelection}
                                title="Clear selection"
                            >
                                <Icon name="close" size={14} />
                            </button>
                        </div>
                    )}

                    {/* Grid Info Panel */}
                    <div className="grid-edit-overlay__info-panel">
                        <div className="grid-edit-overlay__grid-size">
                            <Icon name="grid3x3" size={12} />
                            <span>{cols} × {rows}</span>
                        </div>
                        <div className="grid-edit-overlay__viewport-info">
                            Viewing ({viewport.col}, {viewport.row})
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default GridEditOverlay;