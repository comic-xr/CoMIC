/**
 * @file GridSizePicker.jsx
 * @description Grid size filter for ViewGroups tab
 *
 * Features:
 * - Two spinner inputs: Rows (1-10) × Cols (1-10)
 * - Mode toggle: ≤ Fits (compatible) vs = Exact (strict)
 * - Clear button to reset
 * - Helper text showing current filter state
 */

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Filter modes
 */
const FILTER_MODES = {
  FITS: 'fits',   // VG fits within specified size (≤)
  EXACT: 'exact', // VG is exactly the specified size (=)
};

/**
 * Spinner Input - Small number input with +/- buttons
 */
const SpinnerInput = memo(function SpinnerInput({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
}) {
  const handleDecrement = useCallback(() => {
    if (value !== null && value > min) {
      onChange(value - 1);
    }
  }, [value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (value === null) {
      onChange(min);
    } else if (value < max) {
      onChange(value + 1);
    }
  }, [value, max, min, onChange]);

  const handleInputChange = useCallback(
    (e) => {
      const newValue = e.target.value === '' ? null : parseInt(e.target.value, 10);
      if (newValue === null) {
        onChange(null);
      } else if (!isNaN(newValue) && newValue >= min && newValue <= max) {
        onChange(newValue);
      }
    },
    [min, max, onChange]
  );

  return (
    <div className="spinner-input" data-disabled={disabled}>
      <span className="spinner-input__label">{label}</span>
      <div className="spinner-input__controls">
        <button
          type="button"
          className="spinner-input__button"
          onClick={handleDecrement}
          disabled={disabled || value === null || value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Icon name="minus" size={10} />
        </button>
        <input
          type="number"
          className="spinner-input__value"
          value={value ?? ''}
          onChange={handleInputChange}
          min={min}
          max={max}
          placeholder="—"
          disabled={disabled}
          aria-label={label}
        />
        <button
          type="button"
          className="spinner-input__button"
          onClick={handleIncrement}
          disabled={disabled || (value !== null && value >= max)}
          aria-label={`Increase ${label}`}
        >
          <Icon name="plus" size={10} />
        </button>
      </div>
    </div>
  );
});

/**
 * GridSizePicker - Filter ViewGroups by grid dimensions
 *
 * @param {Object} props
 * @param {number|null} props.rows - Selected rows (null = any)
 * @param {number|null} props.cols - Selected cols (null = any)
 * @param {string} props.mode - Filter mode ('fits' or 'exact')
 * @param {Function} props.onRowsChange - Rows change handler
 * @param {Function} props.onColsChange - Cols change handler
 * @param {Function} props.onModeChange - Mode change handler
 * @param {Function} props.onClear - Clear all handler
 * @param {boolean} [props.disabled] - Whether picker is disabled
 */
export const GridSizePicker = memo(function GridSizePicker({
  rows,
  cols,
  mode = FILTER_MODES.FITS,
  onRowsChange,
  onColsChange,
  onModeChange,
  onClear,
  disabled = false,
}) {
  const hasValue = rows !== null || cols !== null;
  const isFitsMode = mode === FILTER_MODES.FITS;

  const handleClear = useCallback(() => {
    onClear?.();
  }, [onClear]);

  const toggleMode = useCallback(() => {
    onModeChange?.(isFitsMode ? FILTER_MODES.EXACT : FILTER_MODES.FITS);
  }, [isFitsMode, onModeChange]);

  // Generate helper text
  const getHelperText = () => {
    if (!hasValue) return null;

    const rowText = rows !== null ? rows : 'any';
    const colText = cols !== null ? cols : 'any';

    if (isFitsMode) {
      if (rows !== null && cols !== null) {
        return `Showing layouts that fit within ${rows}×${cols}`;
      } else if (rows !== null) {
        return `Showing layouts with ≤${rows} rows`;
      } else {
        return `Showing layouts with ≤${cols} columns`;
      }
    } else {
      if (rows !== null && cols !== null) {
        return `Showing only ${rows}×${cols} layouts`;
      } else if (rows !== null) {
        return `Showing layouts with exactly ${rows} rows`;
      } else {
        return `Showing layouts with exactly ${cols} columns`;
      }
    }
  };

  return (
    <div className="grid-size-picker" data-disabled={disabled}>
      <div className="grid-size-picker__header">
        <span className="grid-size-picker__title">Grid Size</span>
        {hasValue && (
          <button
            type="button"
            className="grid-size-picker__clear"
            onClick={handleClear}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid-size-picker__inputs">
        <SpinnerInput
          label="Rows"
          value={rows}
          onChange={onRowsChange}
          min={1}
          max={10}
          disabled={disabled}
        />
        <span className="grid-size-picker__separator">×</span>
        <SpinnerInput
          label="Cols"
          value={cols}
          onChange={onColsChange}
          min={1}
          max={10}
          disabled={disabled}
        />
      </div>

      {/* Mode toggle (only show when a value is set) */}
      {hasValue && (
        <div className="grid-size-picker__mode">
          <button
            type="button"
            className={`grid-size-picker__mode-btn ${isFitsMode ? 'grid-size-picker__mode-btn--active' : ''}`}
            onClick={() => onModeChange?.(FILTER_MODES.FITS)}
            disabled={disabled}
            title="Show VGs that fit within this size"
          >
            <span className="grid-size-picker__mode-symbol">≤</span>
            Fits
          </button>
          <button
            type="button"
            className={`grid-size-picker__mode-btn ${!isFitsMode ? 'grid-size-picker__mode-btn--active grid-size-picker__mode-btn--exact' : ''}`}
            onClick={() => onModeChange?.(FILTER_MODES.EXACT)}
            disabled={disabled}
            title="Show only VGs with this exact size"
          >
            <span className="grid-size-picker__mode-symbol">=</span>
            Exact
          </button>
        </div>
      )}

      {/* Helper text */}
      {hasValue && (
        <p className="grid-size-picker__helper">{getHelperText()}</p>
      )}
    </div>
  );
});

// Export filter modes for external use
GridSizePicker.MODES = FILTER_MODES;

export default GridSizePicker;
