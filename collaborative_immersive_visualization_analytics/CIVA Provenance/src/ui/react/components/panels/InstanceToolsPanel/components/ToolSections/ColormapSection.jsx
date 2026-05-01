/**
 * @file ColormapSection.jsx
 * @description Colormap selection with visual swatches
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Colormap definitions with gradients
 */
const COLORMAPS = [
  { id: 'viridis', name: 'Viridis', gradient: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde724)' },
  { id: 'plasma', name: 'Plasma', gradient: 'linear-gradient(90deg, #0d0887, #7e03a8, #cc4778, #f89540, #f0f921)' },
  { id: 'inferno', name: 'Inferno', gradient: 'linear-gradient(90deg, #000004, #57106e, #f98e09, #fcffa4)' },
  { id: 'magma', name: 'Magma', gradient: 'linear-gradient(90deg, #000004, #731f57, #f1605d, #fcfdbf)' },
  { id: 'rainbow', name: 'Rainbow', gradient: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)' },
  { id: 'coolToWarm', name: 'Cool-Warm', gradient: 'linear-gradient(90deg, #3b4cc0, #dddddd, #b40426)' },
  { id: 'grayscale', name: 'Gray', gradient: 'linear-gradient(90deg, #000000, #ffffff)' },
  { id: 'hot', name: 'Hot', gradient: 'linear-gradient(90deg, #000000, #ff0000, #ffff00, #ffffff)' },
  { id: 'turbo', name: 'Turbo', gradient: 'linear-gradient(90deg, #30123b, #1ae4b6, #faba39, #7a0403)' },
];

/**
 * ColormapSwatch - Individual colormap button with gradient preview
 */
const ColormapSwatch = memo(function ColormapSwatch({
  colormap,
  isActive,
  onClick,
}) {
  return (
    <button
      className={`colormap-section__swatch ${isActive ? 'colormap-section__swatch--active' : ''}`}
      onClick={() => onClick(colormap.id)}
      title={colormap.name}
    >
      <div
        className="colormap-section__swatch-gradient"
        style={{ background: colormap.gradient }}
      />
      <span className="colormap-section__swatch-label">{colormap.name}</span>
      {isActive && (
        <span className="colormap-section__swatch-check">
          <Icon name="check" size={10} />
        </span>
      )}
    </button>
  );
});

/**
 * ColormapSection - Color transfer function selection
 */
export const ColormapSection = memo(function ColormapSection({
  currentColormap = 'viridis',
  disabled = false,
  onColormapChange,
}) {
  return (
    <div className="colormap-section">
      {/* Colormap Grid */}
      <div className="colormap-section__grid">
        {COLORMAPS.map((cm) => (
          <ColormapSwatch
            key={cm.id}
            colormap={cm}
            isActive={currentColormap === cm.id}
            onClick={onColormapChange}
          />
        ))}
      </div>

      {/* Current Selection */}
      <div className="colormap-section__current">
        <span className="colormap-section__current-label">Active:</span>
        <span className="colormap-section__current-value">
          {COLORMAPS.find(c => c.id === currentColormap)?.name || currentColormap}
        </span>
      </div>
    </div>
  );
});

export default ColormapSection;
