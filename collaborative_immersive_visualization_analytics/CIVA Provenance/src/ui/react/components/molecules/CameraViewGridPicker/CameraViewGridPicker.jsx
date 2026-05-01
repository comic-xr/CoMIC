// src/ui/react/components/molecules/CameraViewGridPicker/CameraViewGridPicker.jsx
// Camera view grid picker molecule - extracted from workspace/Pickers
//
// Per Atomic Design spec: Composed of Icon, buttons in 3x3 grid layout
// Used for: Camera preset selection, 3D view orientation

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './CameraViewGridPicker.scss';

/**
 * CameraViewGridPicker - 3x3 grid for selecting camera view presets
 *
 * @param {Array} [props.views=[]] - Array of view objects with id, icon, label, special
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {function} props.onViewChange - View change handler
 */
export function CameraViewGridPicker({
    views = [],
    disabled = false,
    onViewChange,
}) {
    const [hoveredCell, setHoveredCell] = useState(null);

    // Map icon strings to Icon system names
    const iconMap = {
        'camera': 'camera',
        'box': 'box',
        'square': 'box',
        'triangle': 'triangle',
        'maximize-2': 'maximize',
    };

    // Build map for easy lookup
    const viewsMap = views.reduce((acc, view) => {
        acc[view.id] = view;
        return acc;
    }, {});

    // Define 3x3 grid layout
    const grid = [
        [viewsMap.top, viewsMap.isometric, null],
        [viewsMap.left, viewsMap.reset, viewsMap.right],
        [viewsMap.bottom, viewsMap.front, viewsMap.back],
    ];

    const handleCellClick = (view) => {
        if (disabled || !view) return;
        if (onViewChange) {
            onViewChange(view.id);
        }
    };

    return (
        <div className="camera-view-grid-container">
            <div
                className="camera-view-grid"
                style={{ opacity: disabled ? 0.4 : 1 }}
            >
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="camera-view-row">
                        {row.map((view, colIndex) => {
                            if (!view) {
                                return (
                                    <div
                                        key={`empty-${rowIndex}-${colIndex}`}
                                        className="camera-view-cell empty"
                                    />
                                );
                            }

                            const iconName = iconMap[view.icon] || 'camera';
                            const isHovered = hoveredCell === view.id;

                            return (
                                <div
                                    key={view.id}
                                    className={`camera-view-cell ${view.special ? 'special' : ''} ${isHovered ? 'hovered' : ''}`}
                                    onClick={() => handleCellClick(view)}
                                    onMouseEnter={() => !disabled && setHoveredCell(view.id)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    title={view.label}
                                >
                                    <Icon name={iconName} size={16} className="camera-view-icon" />
                                    <span className="camera-view-label">{view.label}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {hoveredCell && (
                <div className="camera-view-hint">
                    Switch to {hoveredCell} view
                </div>
            )}
        </div>
    );
}

export default CameraViewGridPicker;
