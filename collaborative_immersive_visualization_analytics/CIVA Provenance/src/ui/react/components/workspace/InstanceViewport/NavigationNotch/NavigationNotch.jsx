/**
 * @file NavigationNotch.jsx
 * @description Carved-edge navigation control for instance viewports.
 *
 * Features:
 * - 3 positions: left, bottom, right (never top - conflicts with toolbar)
 * - 4 responsive modes: full, compact, mini, icon
 * - Zoom controls with click=dropdown, double-click=edit
 * - Darker background with inset shadow + instance color accent
 *
 * @see Instance_Tools_Canvas_System_Implementation.md - Navigation Notch section
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms/Icon';
import './NavigationNotch.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Zoom presets available in dropdown */
export const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 300, 400];

/** Position configurations */
export const NOTCH_POSITIONS = {
    left: 'left',
    bottom: 'bottom',
    right: 'right',
};

/** Responsive mode thresholds (in pixels) */
export const NOTCH_MODE_THRESHOLDS = {
    full: 280,      // Show all controls with labels
    compact: 200,   // Show controls, hide labels
    mini: 120,      // Show zoom + fit only
    icon: 0,        // Show chevron only (collapsed)
};

/**
 * Determine notch mode based on available space
 * @param {number} availableSpace - Width (for bottom) or height (for left/right)
 * @returns {'full'|'compact'|'mini'|'icon'}
 */
export function getNotchMode(availableSpace) {
    if (availableSpace >= NOTCH_MODE_THRESHOLDS.full) return 'full';
    if (availableSpace >= NOTCH_MODE_THRESHOLDS.compact) return 'compact';
    if (availableSpace >= NOTCH_MODE_THRESHOLDS.mini) return 'mini';
    return 'icon';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * ZoomInput - Editable zoom percentage display
 * Click opens dropdown, double-click enables edit mode
 */
const ZoomInput = memo(function ZoomInput({
    value,
    onChange,
    onFit,
    disabled,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [editValue, setEditValue] = useState(String(Math.round(value)));
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const clickTimeoutRef = useRef(null);

    // Sync edit value when external value changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(String(Math.round(value)));
        }
    }, [value, isEditing]);

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Close dropdown on click outside
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Handle single click (open dropdown) vs double click (edit mode)
    const handleClick = useCallback((e) => {
        if (disabled) return;

        if (clickTimeoutRef.current) {
            // Double click detected
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            setIsDropdownOpen(false);
            setIsEditing(true);
        } else {
            // Wait to see if this is a double click
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                setIsDropdownOpen(prev => !prev);
            }, 200);
        }
    }, [disabled]);

    // Handle edit submission
    const handleSubmit = useCallback(() => {
        const numValue = parseInt(editValue, 10);
        if (!isNaN(numValue) && numValue >= 1) {
            onChange(Math.max(1, numValue));
        }
        setIsEditing(false);
    }, [editValue, onChange]);

    // Handle preset selection
    const handlePresetClick = useCallback((preset) => {
        onChange(preset);
        setIsDropdownOpen(false);
    }, [onChange]);

    // Handle keyboard in edit mode
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setEditValue(String(Math.round(value)));
            setIsEditing(false);
        }
    }, [handleSubmit, value]);

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                className="navigation-notch__zoom-input navigation-notch__zoom-input--editing"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
                disabled={disabled}
            />
        );
    }

    return (
        <div className="navigation-notch__zoom-wrapper" ref={dropdownRef}>
            <button
                className="navigation-notch__zoom-display"
                onClick={handleClick}
                disabled={disabled}
                title="Click for presets, double-click to edit"
            >
                <span className="navigation-notch__zoom-value">{Math.round(value)}%</span>
                <Icon name="chevronDown" size={10} className="navigation-notch__zoom-chevron" />
            </button>

            {isDropdownOpen && (
                <div className="navigation-notch__zoom-dropdown">
                    <div className="navigation-notch__zoom-presets">
                        {ZOOM_PRESETS.map((preset) => (
                            <button
                                key={preset}
                                className={`navigation-notch__zoom-preset ${preset === Math.round(value) ? 'navigation-notch__zoom-preset--active' : ''}`}
                                onClick={() => handlePresetClick(preset)}
                            >
                                {preset}%
                            </button>
                        ))}
                    </div>
                    <div className="navigation-notch__zoom-divider" />
                    <button
                        className="navigation-notch__zoom-fit"
                        onClick={() => {
                            onFit?.();
                            setIsDropdownOpen(false);
                        }}
                    >
                        <Icon name="scan" size={14} />
                        Fit to View
                    </button>
                </div>
            )}
        </div>
    );
});

ZoomInput.propTypes = {
    value: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    onFit: PropTypes.func,
    disabled: PropTypes.bool,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * NavigationNotch - Carved-edge navigation control
 *
 * @example
 * <NavigationNotch
 *   position="bottom"
 *   zoomLevel={100}
 *   onZoomChange={(zoom) => setZoom(zoom)}
 *   onFit={() => fitToView()}
 *   onResetCamera={() => resetCamera()}
 *   instanceColor={{ hex: '#60a5fa' }}
 *   availableSpace={300}
 * />
 */
export const NavigationNotch = memo(function NavigationNotch({
    position = 'bottom',
    zoomLevel = 100,
    onZoomChange,
    onFit,
    onResetCamera,
    onCenterSelection,
    instanceColor,
    availableSpace = 300,
    visible = true,
    disabled = false,
    className = '',
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const notchRef = useRef(null);

    // Determine mode based on available space
    const mode = getNotchMode(availableSpace);

    // Collapse to icon mode
    const handleToggleExpand = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    // Zoom in/out handlers
    const handleZoomIn = useCallback(() => {
        if (onZoomChange) {
            onZoomChange(Math.min(zoomLevel * 1.25, 1000));
        }
    }, [zoomLevel, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        if (onZoomChange) {
            onZoomChange(Math.max(zoomLevel * 0.8, 1));
        }
    }, [zoomLevel, onZoomChange]);

    // Compute CSS custom properties
    const colorHex = instanceColor?.hex || '#60a5fa';
    const style = {
        '--notch-accent-color': colorHex,
    };

    // Don't render if not visible
    if (!visible) return null;

    // Icon-only mode (collapsed or very small)
    if (mode === 'icon' || !isExpanded) {
        return (
            <div
                ref={notchRef}
                className={`navigation-notch navigation-notch--${position} navigation-notch--icon ${className}`}
                style={style}
            >
                <button
                    className="navigation-notch__expand-button"
                    onClick={handleToggleExpand}
                    title={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
                >
                    <Icon
                        name={position === 'bottom' ? 'chevronUp' : (position === 'left' ? 'chevronRight' : 'chevronLeft')}
                        size={14}
                    />
                </button>
            </div>
        );
    }

    // Mini mode - zoom + fit only
    if (mode === 'mini') {
        return (
            <div
                ref={notchRef}
                className={`navigation-notch navigation-notch--${position} navigation-notch--mini ${className}`}
                style={style}
            >
                <div className="navigation-notch__content">
                    <ZoomInput
                        value={zoomLevel}
                        onChange={onZoomChange}
                        onFit={onFit}
                        disabled={disabled}
                    />
                    <button
                        className="navigation-notch__action-button"
                        onClick={onFit}
                        disabled={disabled}
                        title="Fit to view"
                    >
                        <Icon name="scan" size={14} />
                    </button>
                </div>
                <button
                    className="navigation-notch__collapse-button"
                    onClick={handleToggleExpand}
                    title="Collapse"
                >
                    <Icon name="chevronDown" size={10} />
                </button>
            </div>
        );
    }

    // Compact mode - controls without labels
    if (mode === 'compact') {
        return (
            <div
                ref={notchRef}
                className={`navigation-notch navigation-notch--${position} navigation-notch--compact ${className}`}
                style={style}
            >
                <div className="navigation-notch__content">
                    {/* Zoom controls */}
                    <div className="navigation-notch__zoom-section">
                        <button
                            className="navigation-notch__action-button"
                            onClick={handleZoomOut}
                            disabled={disabled || zoomLevel <= 1}
                            title="Zoom out"
                        >
                            <Icon name="remove" size={14} />
                        </button>
                        <ZoomInput
                            value={zoomLevel}
                            onChange={onZoomChange}
                            onFit={onFit}
                            disabled={disabled}
                        />
                        <button
                            className="navigation-notch__action-button"
                            onClick={handleZoomIn}
                            disabled={disabled || zoomLevel >= 1000}
                            title="Zoom in"
                        >
                            <Icon name="add" size={14} />
                        </button>
                    </div>

                    <div className="navigation-notch__divider" />

                    {/* Navigation actions */}
                    <div className="navigation-notch__actions">
                        <button
                            className="navigation-notch__action-button"
                            onClick={onFit}
                            disabled={disabled}
                            title="Fit to view"
                        >
                            <Icon name="scan" size={14} />
                        </button>
                        <button
                            className="navigation-notch__action-button"
                            onClick={onResetCamera}
                            disabled={disabled}
                            title="Reset camera"
                        >
                            <Icon name="rotateCcw" size={14} />
                        </button>
                    </div>
                </div>
                <button
                    className="navigation-notch__collapse-button"
                    onClick={handleToggleExpand}
                    title="Collapse"
                >
                    <Icon name="chevronDown" size={10} />
                </button>
            </div>
        );
    }

    // Full mode - all controls with labels
    return (
        <div
            ref={notchRef}
            className={`navigation-notch navigation-notch--${position} navigation-notch--full ${className}`}
            style={style}
        >
            <div className="navigation-notch__content">
                {/* Zoom controls */}
                <div className="navigation-notch__zoom-section">
                    <button
                        className="navigation-notch__action-button"
                        onClick={handleZoomOut}
                        disabled={disabled || zoomLevel <= 1}
                        title="Zoom out"
                    >
                        <Icon name="remove" size={14} />
                    </button>
                    <ZoomInput
                        value={zoomLevel}
                        onChange={onZoomChange}
                        onFit={onFit}
                        disabled={disabled}
                    />
                    <button
                        className="navigation-notch__action-button"
                        onClick={handleZoomIn}
                        disabled={disabled || zoomLevel >= 1000}
                        title="Zoom in"
                    >
                        <Icon name="add" size={14} />
                    </button>
                </div>

                <div className="navigation-notch__divider" />

                {/* Navigation actions with labels */}
                <div className="navigation-notch__actions">
                    <button
                        className="navigation-notch__action-button navigation-notch__action-button--with-label"
                        onClick={onFit}
                        disabled={disabled}
                        title="Fit data to view (reset to 100%)"
                    >
                        <Icon name="scan" size={14} />
                        <span className="navigation-notch__action-label">Fit</span>
                    </button>
                    <button
                        className="navigation-notch__action-button navigation-notch__action-button--with-label"
                        onClick={onResetCamera}
                        disabled={disabled}
                        title="Reset camera orientation"
                    >
                        <Icon name="rotateCcw" size={14} />
                        <span className="navigation-notch__action-label">Reset</span>
                    </button>
                    {onCenterSelection && (
                        <button
                            className="navigation-notch__action-button navigation-notch__action-button--with-label"
                            onClick={onCenterSelection}
                            disabled={disabled}
                            title="Center on selection"
                        >
                            <Icon name="crosshair" size={14} />
                            <span className="navigation-notch__action-label">Center</span>
                        </button>
                    )}
                </div>
            </div>
            <button
                className="navigation-notch__collapse-button"
                onClick={handleToggleExpand}
                title="Collapse"
            >
                <Icon name="chevronDown" size={10} />
            </button>
        </div>
    );
});

NavigationNotch.propTypes = {
    /** Position of the notch relative to the viewport */
    position: PropTypes.oneOf(['left', 'bottom', 'right']),
    /** Current zoom level as percentage (100 = fit to view) */
    zoomLevel: PropTypes.number,
    /** Callback when zoom changes */
    onZoomChange: PropTypes.func,
    /** Callback to fit view to data */
    onFit: PropTypes.func,
    /** Callback to reset camera orientation */
    onResetCamera: PropTypes.func,
    /** Callback to center on selection */
    onCenterSelection: PropTypes.func,
    /** Instance color for accent */
    instanceColor: PropTypes.shape({
        hex: PropTypes.string,
        name: PropTypes.string,
    }),
    /** Available space in pixels (width for bottom, height for sides) */
    availableSpace: PropTypes.number,
    /** Whether the notch is visible */
    visible: PropTypes.bool,
    /** Whether controls are disabled */
    disabled: PropTypes.bool,
    /** Additional CSS class */
    className: PropTypes.string,
};

export default NavigationNotch;
