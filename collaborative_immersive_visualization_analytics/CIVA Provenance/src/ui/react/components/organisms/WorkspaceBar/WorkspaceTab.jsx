/**
 * @file WorkspaceTab.jsx
 * @description Individual workspace tab with badges for changes, breakout, and presence.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const WorkspaceTab = memo(function WorkspaceTab({
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

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) {
            setEditName(workspace.name);
        }
    }, [workspace.name, isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
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

    return (
        <div
            className={`workspace-bar__tab ${isActive ? 'workspace-bar__tab--active' : ''} ${isDragTarget ? 'workspace-bar__tab--drag-target' : ''}`}
            onClick={() => !isEditing && onSelect(workspace.id)}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            draggable={!isEditing}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isHovered && !isEditing && (
                <Icon name="gripVertical" size={10} className="workspace-bar__drag-handle" />
            )}

            <Icon name="layers" size={12} className="workspace-bar__tab-icon" />

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    className="workspace-bar__tab-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="workspace-bar__tab-name">{workspace.name}</span>
            )}

            {/* Unsaved changes badge */}
            {workspace.hasChanges && (
                <span className="workspace-bar__badge workspace-bar__badge--changes" title="Unsaved changes" />
            )}

            {/* Active breakout badge */}
            {workspace.hasBreakout && (
                <span className="workspace-bar__badge workspace-bar__badge--breakout" title="Has active breakout">
                    <Icon name="gitBranch" size={9} />
                    <span>{workspace.breakoutUsers}</span>
                </span>
            )}

            {/* Users viewing badge */}
            {workspace.usersViewing > 0 && (
                <span className="workspace-bar__badge workspace-bar__badge--presence" title="Users viewing this workspace">
                    <Icon name="users" size={9} />
                    <span>{workspace.usersViewing}</span>
                </span>
            )}

            {(isHovered || isActive) && !isEditing && (
                <button
                    type="button"
                    className="workspace-bar__tab-close"
                    onClick={handleCloseClick}
                >
                    <Icon name="x" size={12} />
                </button>
            )}
        </div>
    );
});

WorkspaceTab.propTypes = {
    workspace: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        usersViewing: PropTypes.number,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    }).isRequired,
    isActive: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func,
    onRename: PropTypes.func,
    onDragOver: PropTypes.func,
    onDrop: PropTypes.func,
    isDragTarget: PropTypes.bool,
};

export { WorkspaceTab };
export default WorkspaceTab;
