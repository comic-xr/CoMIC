// src/ui/react/components/molecules/ColorSwatchGrid/ColorSwatchGrid.jsx
// Color swatch grid molecule - extracted from workspace/Pickers
//
// Per Atomic Design spec: Composed of color swatches with Icon (checkmark)
// Used for: Colormap selection, theme picker

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './ColorSwatchGrid.scss';

/**
 * Default colormaps for visualization
 */
const DEFAULT_COLORMAPS = [
    {
        id: 'rainbow',
        name: 'Rainbow',
        gradient: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)',
    },
    {
        id: 'viridis',
        name: 'Viridis',
        gradient: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde724)',
    },
    {
        id: 'plasma',
        name: 'Plasma',
        gradient: 'linear-gradient(90deg, #0d0887, #7e03a8, #cc4778, #f89540, #f0f921)',
    },
    {
        id: 'hot',
        name: 'Hot',
        gradient: 'linear-gradient(90deg, #000000, #ff0000, #ffff00, #ffffff)',
    },
    {
        id: 'cool',
        name: 'Cool',
        gradient: 'linear-gradient(90deg, #00ffff, #0000ff, #ff00ff)',
    },
    {
        id: 'grayscale',
        name: 'Grayscale',
        gradient: 'linear-gradient(90deg, #000000, #ffffff)',
    },
    {
        id: 'turbo',
        name: 'Turbo',
        gradient: 'linear-gradient(90deg, #30123b, #1ae4b6, #faba39, #7a0403)',
    },
    {
        id: 'magma',
        name: 'Magma',
        gradient: 'linear-gradient(90deg, #000004, #731f57, #f1605d, #fcfdbf)',
    },
    {
        id: 'inferno',
        name: 'Inferno',
        gradient: 'linear-gradient(90deg, #000004, #57106e, #f98e09, #fcffa4)',
    },
];

/**
 * ColorSwatchGrid - Visual grid of color swatches for colormap selection
 *
 * @param {string} [props.currentColormap] - Currently selected colormap id
 * @param {function} props.onColormapChange - Colormap change handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {Array} [props.colormaps] - Custom colormaps array (defaults to DEFAULT_COLORMAPS)
 */
export function ColorSwatchGrid({
    currentColormap = null,
    onColormapChange,
    disabled = false,
    colormaps = DEFAULT_COLORMAPS,
}) {
    const [hoveredSwatch, setHoveredSwatch] = useState(null);

    const handleSwatchClick = (colormap) => {
        if (disabled) return;
        if (onColormapChange) {
            onColormapChange(colormap.id);
        }
    };

    return (
        <div className="color-swatch-grid-container">
            <div
                className="color-swatch-grid"
                style={{ opacity: disabled ? 0.4 : 1 }}
            >
                {colormaps.map((colormap) => {
                    const isActive = currentColormap === colormap.id;
                    const isHovered = hoveredSwatch === colormap.id;

                    return (
                        <div
                            key={colormap.id}
                            className={`color-swatch ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                            onClick={() => handleSwatchClick(colormap)}
                            onMouseEnter={() => !disabled && setHoveredSwatch(colormap.id)}
                            onMouseLeave={() => setHoveredSwatch(null)}
                            title={colormap.name}
                        >
                            <div
                                className="swatch-gradient"
                                style={{ background: colormap.gradient }}
                            />
                            <div className="swatch-label">{colormap.name}</div>
                            {isActive && (
                                <div className="swatch-check">
                                    <Icon name="check" size={14} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {hoveredSwatch && (
                <div className="color-swatch-hint">
                    Click to apply {colormaps.find(c => c.id === hoveredSwatch)?.name || hoveredSwatch} colormap
                </div>
            )}
        </div>
    );
}

export { DEFAULT_COLORMAPS };
export default ColorSwatchGrid;
