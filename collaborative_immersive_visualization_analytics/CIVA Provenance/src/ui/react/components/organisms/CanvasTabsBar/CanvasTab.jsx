/**
 * @file CanvasTab.jsx
 * @description Individual workspace tab component
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { WORKSPACE_TYPES } from './CanvasTabsBar.logic';

/**
 * CanvasTab - Individual workspace tab with drag-and-drop support
 */
const CanvasTab = memo(function CanvasTab({
    workspace,
    isActive,
    onSelect,
    onClose,
    onRename,
    onDragOver,
    onDrop,
    isDragTarget,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(workspace.name);
    const inputRef = useRef(null);

    const typeConfig = WORKSPACE_TYPES[workspace.type] || WORKSPACE_TYPES.workspace;

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditName(workspace.name);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (editName.trim()) {
                onRename?.(editName.trim());
            }
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(workspace.name);
        }
    };

    const handleBlur = () => {
        if (editName.trim()) {
            onRename?.(editName.trim());
        }
        setIsEditing(false);
    };

    const handleDragStart = (e) => {
        e.dataTransfer.setData('text/plain', workspace.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        onDragOver?.(workspace.id);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        onDrop?.(draggedId, workspace.id);
    };

    const handleCloseClick = (e) => {
        e.stopPropagation();
        onClose?.();
    };

    // Get accent color class
    const getColorClass = () => {
        switch (typeConfig.color) {
            case 'amber': return 'canvas-tab--amber';
            case 'green': return 'canvas-tab--green';
            default: return 'canvas-tab--blue';
        }
    };

    return (
        <div
            className={`canvas-tab ${isActive ? 'canvas-tab--active' : ''} ${isDragTarget ? 'canvas-tab--drag-target' : ''} ${getColorClass()}`}
            draggable={!isEditing}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => !isEditing && onSelect?.()}
            onDoubleClick={handleDoubleClick}
        >
            {/* Drag handle (visible on hover) */}
            {isHovered && !isEditing && (
                <Icon name="gripVertical" size={10} className="canvas-tab__drag-handle" />
            )}

            {/* Type icon */}
            {typeConfig.icon && (
                <Icon
                    name={typeConfig.icon}
                    size={12}
                    className={`canvas-tab__type-icon canvas-tab__type-icon--${typeConfig.color}`}
                />
            )}

            {/* Unsaved changes indicator */}
            {workspace.hasChanges && (
                <span className="canvas-tab__unsaved-dot" />
            )}

            {/* Breakout indicator */}
            {workspace.hasBreakout && (
                <Icon name="mic" size={11} className="canvas-tab__breakout-icon" />
            )}

            {/* Name (editable or display) */}
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    className="canvas-tab__input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="canvas-tab__name">
                    {typeConfig.prefix && (
                        <span className={`canvas-tab__prefix canvas-tab__prefix--${typeConfig.color}`}>
                            {typeConfig.prefix}
                        </span>
                    )}
                    {workspace.name}
                </span>
            )}

            {/* Close button */}
            {(isHovered || isActive) && !isEditing && (
                <button
                    className="canvas-tab__close"
                    onClick={handleCloseClick}
                >
                    <Icon name="x" size={12} />
                </button>
            )}
        </div>
    );
});

CanvasTab.propTypes = {
    workspace: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        isOpen: PropTypes.bool,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    }).isRequired,
    isActive: PropTypes.bool,
    onSelect: PropTypes.func,
    onClose: PropTypes.func,
    onRename: PropTypes.func,
    onDragOver: PropTypes.func,
    onDrop: PropTypes.func,
    isDragTarget: PropTypes.bool,
};

export { CanvasTab };
export default CanvasTab;
