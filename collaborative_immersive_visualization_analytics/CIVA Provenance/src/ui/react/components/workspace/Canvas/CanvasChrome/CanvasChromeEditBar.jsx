// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeEditBar.jsx
// Edit bar shown only when edit mode is enabled.

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './CanvasChromeEditBar.scss';

const TOOL_BUTTONS = [
    { id: 'select', icon: 'boxSelect', label: 'Select' },
    { id: 'pan', icon: 'hand', label: 'Pan' },
];

const GRID_BUTTONS = [
    { id: 'merge', icon: 'combine', label: 'Merge' },
    { id: 'split', icon: 'scissors', label: 'Split' },
    { id: 'swap', icon: 'arrowLeftRight', label: 'Swap' },
];

const ROW_COL_BUTTONS = [
    { id: 'add', icon: 'add', label: 'Add' },
    { id: 'remove', icon: 'remove', label: 'Remove' },
];

export const CanvasChromeEditBar = memo(function CanvasChromeEditBar({
    activeTool = 'select',
    onToolChange,
    onGridAction,
    onRowAction,
    onDone,
}) {
    return (
        <div className="canvas-chrome-edit-bar">
            <span className="canvas-chrome-edit-bar__label">Edit Mode</span>

            <div className="canvas-chrome-edit-bar__group">
                {TOOL_BUTTONS.map((tool) => (
                    <button
                        key={tool.id}
                        type="button"
                        className={`canvas-chrome-edit-bar__btn ${activeTool === tool.id ? 'is-active' : ''}`}
                        onClick={() => onToolChange?.(tool.id)}
                    >
                        <Icon name={tool.icon} size={12} />
                        <span>{tool.label}</span>
                    </button>
                ))}
            </div>

            <div className="canvas-chrome-edit-bar__divider" />

            <div className="canvas-chrome-edit-bar__group">
                {GRID_BUTTONS.map((tool) => (
                    <button
                        key={tool.id}
                        type="button"
                        className="canvas-chrome-edit-bar__btn"
                        onClick={() => onGridAction?.(tool.id)}
                    >
                        <Icon name={tool.icon} size={12} />
                        <span>{tool.label}</span>
                    </button>
                ))}
            </div>

            <div className="canvas-chrome-edit-bar__divider" />

            <div className="canvas-chrome-edit-bar__group">
                {ROW_COL_BUTTONS.map((tool) => (
                    <button
                        key={tool.id}
                        type="button"
                        className="canvas-chrome-edit-bar__btn"
                        onClick={() => onRowAction?.(tool.id)}
                    >
                        <Icon name={tool.icon} size={12} />
                        <span>{tool.label}</span>
                    </button>
                ))}
            </div>

            <div className="canvas-chrome-edit-bar__spacer" />

            <button
                type="button"
                className="canvas-chrome-edit-bar__done"
                onClick={onDone}
            >
                Done
            </button>
        </div>
    );
});

export default CanvasChromeEditBar;
