// src/ui/react/components/molecules/AnnotationToolButton/AnnotationToolButton.jsx
// Annotation Tool Button molecule - tool selection button for annotation palette
//
// Per Atomic Design spec: Composed of Icon (tool-specific), Text (label)
// Used for: Annotation tool palette, measurement tools

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './AnnotationToolButton.scss';

/**
 * Tool definitions with icons and colors
 */
const TOOL_CONFIG = {
    // Selection tools
    select: { icon: 'mousePointer', label: 'Select', color: '#60a5fa' },

    // Point tools
    point: { icon: 'mapPin', label: 'Point', color: '#f472b6' },
    marker: { icon: 'mapPin', label: 'Marker', color: '#f472b6' },

    // Region tools
    region: { icon: 'square', label: 'Region', color: '#a78bfa' },
    rectangle: { icon: 'square', label: 'Rectangle', color: '#a78bfa' },
    freehand: { icon: 'penTool', label: 'Freehand', color: '#a78bfa' },

    // Measurement tools
    measure: { icon: 'ruler', label: 'Measure', color: '#fbbf24' },
    ruler: { icon: 'ruler', label: 'Ruler', color: '#fbbf24' },
    angle: { icon: 'corner-up-right', label: 'Angle', color: '#fbbf24' },
    distance: { icon: 'move', label: 'Distance', color: '#fbbf24' },

    // Text tools
    text: { icon: 'type', label: 'Text', color: '#4ade80' },
    label: { icon: 'tag', label: 'Label', color: '#4ade80' },

    // Other tools
    eraser: { icon: 'eraser', label: 'Eraser', color: '#6b7280' },
    arrow: { icon: 'arrowUpRight', label: 'Arrow', color: '#2dd4bf' },
    line: { icon: 'minus', label: 'Line', color: '#2dd4bf' },
};

/**
 * AnnotationToolButton - A button for selecting annotation tools
 *
 * @param {Object} props
 * @param {string} props.tool - Tool type (from TOOL_CONFIG keys)
 * @param {boolean} [props.active] - Whether tool is currently selected
 * @param {boolean} [props.disabled] - Disable the button
 * @param {string} [props.size='md'] - Size variant
 * @param {boolean} [props.showLabel] - Show label text
 * @param {function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 */
export const AnnotationToolButton = memo(function AnnotationToolButton({
    tool,
    active = false,
    disabled = false,
    size = 'md',
    showLabel = true,
    onClick,
    className = '',
}) {
    const config = TOOL_CONFIG[tool] || { icon: 'circle', label: tool, color: '#888' };

    const handleClick = useCallback(() => {
        if (!disabled) {
            onClick?.(tool);
        }
    }, [disabled, onClick, tool]);

    const classList = [
        'annotation-tool-btn',
        `annotation-tool-btn--${size}`,
        active && 'annotation-tool-btn--active',
        disabled && 'annotation-tool-btn--disabled',
        className,
    ].filter(Boolean).join(' ');

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

    return (
        <button
            className={classList}
            onClick={handleClick}
            disabled={disabled}
            title={config.label}
            style={{ '--tool-color': config.color }}
        >
            <Icon name={config.icon} size={iconSize} />
            {showLabel && (
                <span className="annotation-tool-btn__label">{config.label}</span>
            )}
        </button>
    );
});

/**
 * Get available tool types
 */
export const getToolTypes = () => Object.keys(TOOL_CONFIG);

/**
 * Get tool configuration
 */
export const getToolConfig = (tool) => TOOL_CONFIG[tool];

export default AnnotationToolButton;
