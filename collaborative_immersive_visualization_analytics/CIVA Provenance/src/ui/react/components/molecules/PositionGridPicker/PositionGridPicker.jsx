// src/ui/react/components/molecules/PositionGridPicker/PositionGridPicker.jsx
// Position grid picker molecule - extracted from workspace/Pickers
//
// Per Atomic Design spec: Composed of Icon, buttons in grid layout
// Used for: Widget positioning, anchor point selection

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './PositionGridPicker.scss';

/**
 * PositionGridPicker - 2x2 grid for selecting corner positions
 *
 * @param {Array} [props.positions=[]] - Array of position objects with id, icon, label
 * @param {string} [props.currentPosition] - Currently selected position id
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {function} props.onPositionChange - Position change handler
 */
export function PositionGridPicker({
    positions = [],
    currentPosition = null,
    disabled = false,
    onPositionChange,
}) {
    const [hoveredCell, setHoveredCell] = useState(null);

    // Map icon strings to icon names
    const iconMap = {
        'corner-up-left': 'arrowUpLeft',
        'corner-up-right': 'arrowUpRight',
        'corner-down-left': 'arrowDownLeft',
        'corner-down-right': 'arrowDownRight',
    };

    // Build map for easy lookup
    const positionsMap = positions.reduce((acc, pos) => {
        acc[pos.id] = pos;
        return acc;
    }, {});

    // Define 2x2 grid layout
    const grid = [
        [positionsMap.TOP_LEFT, positionsMap.TOP_RIGHT],
        [positionsMap.BOTTOM_LEFT, positionsMap.BOTTOM_RIGHT],
    ];

    const handleCellClick = (position) => {
        if (disabled || !position) return;
        if (onPositionChange) {
            onPositionChange(position.id);
        }
    };

    return (
        <div className="position-grid-container">
            <div
                className="position-grid"
                style={{ opacity: disabled ? 0.4 : 1 }}
            >
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="position-grid-row">
                        {row.map((position, colIndex) => {
                            if (!position) {
                                return (
                                    <div
                                        key={`empty-${rowIndex}-${colIndex}`}
                                        className="position-grid-cell empty"
                                    />
                                );
                            }

                            const iconName = iconMap[position.icon] || 'cornerDownRight';
                            const isActive = currentPosition === position.id;
                            const isHovered = hoveredCell === position.id;

                            return (
                                <div
                                    key={position.id}
                                    className={`position-grid-cell ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                                    onClick={() => handleCellClick(position)}
                                    onMouseEnter={() => !disabled && setHoveredCell(position.id)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    title={position.label}
                                >
                                    <Icon name={iconName} size={16} className="position-grid-icon" />
                                    <span className="position-grid-label">{position.label}</span>

                                    {isActive && (
                                        <div className="position-grid-check">
                                            <Icon name="check" size={14} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {hoveredCell && (
                <div className="position-grid-hint">
                    {hoveredCell.toLowerCase().replace('_', ' ')}
                </div>
            )}
        </div>
    );
}

export default PositionGridPicker;
