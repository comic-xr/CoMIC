/**
 * @file MiniCanvasHeader.jsx
 * @description Mini header for each canvas in tile mode
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon, Button } from '@UI/react/components/atoms';
import { WORKSPACE_TYPE_CONFIG } from './TiledCanvasView.logic';

/**
 * MiniCanvasHeader - Compact header for tile mode canvases
 */
const MiniCanvasHeader = memo(function MiniCanvasHeader({
    workspace,
    isActive,
    onActivate,
    onClose,
    onMaximize,
    onRename,
    currentBreakoutId,
    onJoinBreakout,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(workspace.name);
    const inputRef = useRef(null);
    const config = WORKSPACE_TYPE_CONFIG[workspace.type] || WORKSPACE_TYPE_CONFIG.workspace;
    const isInThisBreakout = currentBreakoutId === workspace.id;

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

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (editName.trim()) {
                console.log('[MiniCanvasHeader] Enter pressed, calling onRename with:', editName.trim());
                onRename?.(editName.trim());
            }
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(workspace.name);
        }
    };

    const handleBlur = () => {
        if (editName.trim() && editName.trim() !== workspace.name) {
            console.log('[MiniCanvasHeader] Blur with changed name, calling onRename with:', editName.trim());
            onRename?.(editName.trim());
        }
        setIsEditing(false);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        onClose?.();
    };

    const handleMaximize = (e) => {
        e.stopPropagation();
        onMaximize?.();
    };

    const handleJoinBreakout = (e) => {
        e.stopPropagation();
        if (!isInThisBreakout) {
            onJoinBreakout?.(workspace.id);
        }
    };

    return (
        <div
            className={`mini-canvas-header ${isActive ? 'mini-canvas-header--active' : ''}`}
            onClick={onActivate}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Type icon */}
            {config.icon && (
                <Icon
                    name={config.icon}
                    size={12}
                    className={`mini-canvas-header__type-icon mini-canvas-header__type-icon--${config.color}`}
                />
            )}

            {/* Unsaved indicator */}
            {workspace.hasChanges && (
                <span className="mini-canvas-header__unsaved-dot" />
            )}

            {/* Name - double-click to rename */}
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    className="mini-canvas-header__name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span
                    className="mini-canvas-header__name"
                    onDoubleClick={handleDoubleClick}
                    title="Double-click to rename"
                >
                    {workspace.name}
                </span>
            )}

            {/* Breakout indicator */}
            {workspace.hasBreakout && (
                <button
                    className={`mini-canvas-header__breakout ${isInThisBreakout ? 'mini-canvas-header__breakout--active' : ''}`}
                    onClick={handleJoinBreakout}
                    title={isInThisBreakout ? 'In breakout' : 'Join breakout'}
                >
                    <Icon name="mic" size={10} />
                    <span>{workspace.breakoutUsers}</span>
                </button>
            )}

            {/* Actions (visible on hover/active) */}
            {(isHovered || isActive) && (
                <div className="mini-canvas-header__actions">
                    <Button
                        variant="ghost"
                        size="xs"
                        icon="focus"
                        onClick={handleMaximize}
                        title="Focus"
                    />
                    <Button
                        variant="ghost"
                        size="xs"
                        icon="x"
                        onClick={handleClose}
                        title="Close"
                        className="mini-canvas-header__close"
                    />
                </div>
            )}
        </div>
    );
});

MiniCanvasHeader.propTypes = {
    workspace: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    }).isRequired,
    isActive: PropTypes.bool,
    onActivate: PropTypes.func,
    onClose: PropTypes.func,
    onMaximize: PropTypes.func,
    onRename: PropTypes.func,
    currentBreakoutId: PropTypes.string,
    onJoinBreakout: PropTypes.func,
};

export { MiniCanvasHeader };
export default MiniCanvasHeader;
