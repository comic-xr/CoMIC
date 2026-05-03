// src/ui/react/components/workspace/Canvas/ToolbarZone/ToolbarZone.jsx
// Generic toolbar zone wrapper that includes label and content
//
// Creates a self-contained zone with:
// - Label bar (18px) on top
// - Content bar (44px) below
// Ensures perfect alignment since label width matches content width

import React, { memo } from 'react';
import './ToolbarZone.scss';

/**
 * ToolbarZone - Wrapper for toolbar zones with integrated labels
 *
 * @param {string} label - Zone label text (displayed in uppercase)
 * @param {React.ReactNode} children - Zone content
 * @param {number|string} width - Optional fixed width (number for px, string for CSS value)
 * @param {number|string} minWidth - Optional minimum width
 * @param {boolean} flex - If true, zone grows to fill available space
 * @param {string} labelColor - Optional color variant for the label (blue, purple, amber, teal, green)
 * @param {string} className - Additional CSS classes
 */
export function ToolbarZone({
    label,
    children,
    width,
    minWidth,
    flex = false,
    labelColor,
    className = '',
}) {
    const style = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (minWidth) style.minWidth = typeof minWidth === 'number' ? `${minWidth}px` : minWidth;
    if (flex) style.flex = 1;

    const labelColorClass = labelColor ? `toolbar-zone__label--${labelColor}` : '';

    return (
        <div
            className={`toolbar-zone ${flex ? 'toolbar-zone--flex' : ''} ${className}`}
            style={style}
        >
            <div className={`toolbar-zone__label ${labelColorClass}`}>
                {label}
            </div>
            <div className="toolbar-zone__content">
                {children}
            </div>
        </div>
    );
}

/**
 * ToolbarDivider - Vertical divider between zones
 * Spans both label and content rows
 */
export function ToolbarDivider() {
    return (
        <div className="toolbar-divider">
            <div className="toolbar-divider__label" />
            <div className="toolbar-divider__content" />
        </div>
    );
}

/**
 * ToolbarSpacer - Flexible spacer between zones
 * Spans both label and content rows
 */
export function ToolbarSpacer() {
    return (
        <div className="toolbar-spacer">
            <div className="toolbar-spacer__label" />
            <div className="toolbar-spacer__content" />
        </div>
    );
}

/**
 * ToolbarContainer - Container for toolbar zones
 * Creates the horizontal layout with aligned rows
 */
export function ToolbarContainer({
    children,
    className = '',
}) {
    return (
        <div className={`toolbar-container ${className}`}>
            {children}
        </div>
    );
}

export default memo(ToolbarZone);
