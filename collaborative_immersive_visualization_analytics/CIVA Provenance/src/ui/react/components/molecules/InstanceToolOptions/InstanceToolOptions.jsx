// InstanceToolOptions.jsx
// Shared option renderer for instance tool menus (toolbar + panel).

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { hexToRgb, rgbToHex } from '@Utils/colorHelpers.js';
import './InstanceToolOptions.scss';

// =============================================================================
// CAMERA GRID
// =============================================================================

export function CameraGridMenu({ views, onViewSelect, disabled }) {
    if (!views || views.length === 0) return null;

    const gridViews = [
        views.find(v => v?.id === 'top'),
        views.find(v => v?.id === 'isometric'),
        null,
        views.find(v => v?.id === 'left'),
        views.find(v => v?.id === 'reset'),
        views.find(v => v?.id === 'right'),
        views.find(v => v?.id === 'bottom'),
        views.find(v => v?.id === 'front'),
        views.find(v => v?.id === 'back'),
    ];

    return (
        <div className="camera-grid">
            {gridViews.map((view, index) => {
                if (!view) {
                    return <div key={index} className="camera-grid__cell camera-grid__cell--empty" />;
                }

                return (
                    <button
                        key={view.id}
                        className={`camera-grid__cell ${view.special ? 'camera-grid__cell--special' : ''}`}
                        onClick={() => !disabled && onViewSelect?.(view.id)}
                        title={view.label}
                        disabled={disabled}
                    >
                        <Icon name={view.icon || 'camera'} size={14} />
                        <span>{view.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// SLIDER WITH PRESETS
// =============================================================================

export function SliderWithPresets({
    icon,
    label,
    value,
    min,
    max,
    step,
    presets,
    formatValue,
    disabled,
    disabledReason,
    onChange,
}) {
    const displayValue = formatValue ? formatValue(value) : value;

    return (
        <div className={`slider-control ${disabled ? 'slider-control--disabled' : ''}`}>
            <div className="slider-control__header">
                <Icon name={icon || 'sliders'} size={12} />
                <span className="slider-control__label">{label}</span>
                <span className="slider-control__value">{displayValue}</span>
            </div>
            <input
                type="range"
                className="slider-control__slider"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange?.(parseFloat(e.target.value))}
            />
            {presets && presets.length > 0 && (
                <div className="slider-control__presets">
                    {presets.map((preset, index) => (
                        <button
                            key={index}
                            className={`slider-control__preset ${value === preset ? 'slider-control__preset--active' : ''}`}
                            onClick={() => !disabled && onChange?.(preset)}
                            disabled={disabled}
                        >
                            {formatValue ? formatValue(preset) : preset}
                        </button>
                    ))}
                </div>
            )}
            {disabled && disabledReason && (
                <div className="slider-control__disabled-reason">{disabledReason}</div>
            )}
        </div>
    );
}

// =============================================================================
// COLORMAP GRID
// =============================================================================

export function ColormapGrid({ colormaps, currentColormap, onColormapChange, disabled }) {
    if (!colormaps || colormaps.length === 0) return null;

    return (
        <div className="colormap-grid">
            {colormaps.map(cmap => (
                <button
                    key={cmap.id}
                    className={`colormap-grid__item ${currentColormap === cmap.id ? 'colormap-grid__item--active' : ''}`}
                    onClick={() => !disabled && onColormapChange?.(cmap.id)}
                    disabled={disabled}
                    title={cmap.name}
                >
                    <div
                        className="colormap-grid__swatch"
                        style={{ background: cmap.gradient }}
                    />
                    <span className="colormap-grid__name">{cmap.name}</span>
                </button>
            ))}
        </div>
    );
}

// =============================================================================
// TOOL OPTION ITEM
// =============================================================================

export function ToolOptionItem({ option, onClose, onSelectOption }) {
    const isActive = option.active || false;
    const isDisabled = option.disabled || false;

    const handleClick = () => {
        if (isDisabled) return;
        option.onClick?.();
        onSelectOption?.(option);
        onClose?.();
    };

    if (option.type === 'separator') {
        return <div className="tool-option__separator" />;
    }

    if (option.type === 'header') {
        return <div className="tool-option__header">{option.label}</div>;
    }

    if (option.type === 'camera-grid') {
        return (
            <CameraGridMenu
                views={option.views}
                onViewSelect={(viewId) => {
                    option.onViewSelect?.(viewId);
                    onSelectOption?.(option);
                    onClose?.();
                }}
                disabled={option.disabled}
            />
        );
    }

    if (option.type === 'slider-with-presets' || option.type === 'slider') {
        return (
            <SliderWithPresets
                icon={option.icon}
                label={option.label}
                value={option.value}
                min={option.min}
                max={option.max}
                step={option.step}
                presets={option.presets}
                formatValue={option.formatValue}
                disabled={option.disabled}
                disabledReason={option.disabledReason}
                onChange={option.onChange}
            />
        );
    }

    if (option.type === 'color-swatch-grid') {
        return (
            <ColormapGrid
                colormaps={option.colormaps}
                currentColormap={option.currentColormap}
                onColormapChange={option.onColormapChange}
                disabled={option.disabled}
            />
        );
    }

    if (option.type === 'color-picker') {
        return (
            <div className="tool-option tool-option--color-picker">
                <Icon name={option.icon || 'palette'} size={14} />
                <div className="tool-option__content">
                    <span className="tool-option__label">{option.label}</span>
                </div>
                <input
                    type="color"
                    className="tool-option__color-input"
                    value={rgbToHex(option.value)}
                    onChange={(e) => option.onChange?.(hexToRgb(e.target.value))}
                    disabled={option.disabled}
                />
            </div>
        );
    }

    return (
        <button
            className={`tool-option ${isActive ? 'tool-option--active' : ''} ${isDisabled ? 'tool-option--disabled' : ''}`}
            onClick={handleClick}
            disabled={isDisabled}
        >
            <Icon name={option.icon || 'circle'} size={14} />
            <div className="tool-option__content">
                <span className="tool-option__label">{option.label}</span>
                {option.description && (
                    <span className="tool-option__desc">{option.description}</span>
                )}
            </div>
            {isActive && <span className="tool-option__active-dot" />}
        </button>
    );
}

export default ToolOptionItem;
