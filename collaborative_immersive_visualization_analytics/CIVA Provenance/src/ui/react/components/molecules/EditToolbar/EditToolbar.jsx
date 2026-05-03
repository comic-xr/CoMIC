/**
 * @file EditToolbar.jsx
 * @description Contextual edit tools, only visible in Edit Mode.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';

import './EditToolbar.scss';

const EDIT_TOOLS = [
    { id: 'select', icon: 'rightClick', label: 'Select', color: 'blue' },
    { id: 'pan', icon: 'pan', label: 'Pan', color: 'teal' },
    { id: 'merge', icon: 'merge', label: 'Merge Cells', color: 'purple' },
];

/**
 * Edit toolbar component with contextual tools.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.isEditMode] - Whether edit mode is active
 * @param {string} [props.activeTool] - Currently active tool ID
 * @param {Function} [props.onToolChange] - Callback when tool is selected
 * @param {Function} [props.onToggleEditMode] - Callback to toggle edit mode
 * @param {boolean} [props.canUndo] - Whether undo is available
 * @param {boolean} [props.canRedo] - Whether redo is available
 * @param {Function} [props.onUndo] - Undo callback
 * @param {Function} [props.onRedo] - Redo callback
 */
export function EditToolbar({
    isEditMode,
    activeTool = 'select',
    onToolChange,
    onToggleEditMode,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
}) {
    // When not in edit mode, just show the pencil button to enter
    if (!isEditMode) {
        return (
            <Tooltip content="Enter Edit Mode">
                <button
                    className="edit-toolbar__toggle"
                    onClick={onToggleEditMode}
                    type="button"
                    aria-label="Enter edit mode"
                >
                    <Icon name="edit" size={16} />
                </button>
            </Tooltip>
        );
    }

    return (
        <div className="edit-toolbar" role="toolbar" aria-label="Edit tools">
            {/* Tool buttons */}
            {EDIT_TOOLS.map((tool) => (
                <Tooltip key={tool.id} content={tool.label}>
                    <button
                        className={`edit-toolbar__btn ${activeTool === tool.id ? 'active' : ''
                            }`}
                        onClick={() => onToolChange?.(tool.id)}
                        data-color={tool.color}
                        type="button"
                        aria-pressed={activeTool === tool.id}
                    >
                        <Icon name={tool.icon} size={16} />
                    </button>
                </Tooltip>
            ))}

            <div className="edit-toolbar__divider" />

            {/* Undo/Redo */}
            <Tooltip content="Undo (Ctrl+Z)">
                <button
                    className="edit-toolbar__btn"
                    onClick={onUndo}
                    disabled={!canUndo}
                    type="button"
                    aria-label="Undo"
                >
                    <Icon name="undo" size={16} />
                </button>
            </Tooltip>
            <Tooltip content="Redo (Ctrl+Shift+Z)">
                <button
                    className="edit-toolbar__btn"
                    onClick={onRedo}
                    disabled={!canRedo}
                    type="button"
                    aria-label="Redo"
                >
                    <Icon name="redo" size={16} />
                </button>
            </Tooltip>

            <div className="edit-toolbar__divider" />

            {/* Exit Edit Mode */}
            <Tooltip content="Exit Edit Mode">
                <button
                    className="edit-toolbar__btn edit-toolbar__btn--exit"
                    onClick={onToggleEditMode}
                    data-color="amber"
                    type="button"
                    aria-label="Exit edit mode"
                >
                    <Icon name="edit" size={16} />
                </button>
            </Tooltip>
        </div>
    );
}

export default EditToolbar;