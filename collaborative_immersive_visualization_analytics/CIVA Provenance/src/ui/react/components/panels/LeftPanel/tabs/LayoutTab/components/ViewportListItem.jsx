/**
 * @file ViewportListItem.jsx
 * @description Card-style list item for Viewports, matching DatasetsTab design.
 *
 * Features:
 * - Card layout with vertical stacked action buttons (right edge)
 * - Editable name (double-click)
 * - Position mode indicator (Snap vs Free)
 * - Primary viewport badge
 * - Shared viewport indicator (room-wide sharing)
 * - Size display with cell count
 *
 * Sharing Note:
 * The isShared toggle shares the viewport with all participants in the
 * current workspace/room. There's no per-user sharing at this time.
 *
 * @example
 * <ViewportListItem
 *   viewport={viewport}
 *   isSelected={selectedId === viewport.id}
 *   onClick={() => handleSelect(viewport.id)}
 *   onRename={(newName) => handleRename(viewport.id, newName)}
 * />
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';

/**
 * ViewportListItem component
 *
 * @param {Object} props - Component props
 * @param {Object} props.viewport - Viewport data
 * @param {boolean} [props.isSelected=false] - Whether this item is selected
 * @param {Function} [props.onClick] - Click handler
 * @param {Function} [props.onRename] - Rename handler (newName) => void
 * @param {Function} [props.onDuplicate] - Duplicate action handler
 * @param {Function} [props.onSettings] - Settings action handler
 * @param {Function} [props.onDelete] - Delete action handler
 * @param {Function} [props.onToggleShare] - Toggle share handler (shares with room)
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const ViewportListItem = memo(function ViewportListItem({
    viewport,
    isSelected = false,
    onClick,
    onRename,
    onDuplicate,
    onSettings,
    onDelete,
    onToggleShare,
    className = '',
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(viewport.name);
    const inputRef = useRef(null);

    // Focus input when editing
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Sync edit value with viewport name
    useEffect(() => {
        setEditValue(viewport.name);
    }, [viewport.name]);

    const handleActionClick = (e, action) => {
        e.stopPropagation();
        action?.(viewport);
    };

    const handleNameDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleNameSubmit = () => {
        if (editValue.trim() && editValue.trim() !== viewport.name) {
            onRename?.(editValue.trim());
        } else {
            setEditValue(viewport.name);
        }
        setIsEditing(false);
    };

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        }
        if (e.key === 'Escape') {
            setEditValue(viewport.name);
            setIsEditing(false);
        }
    };

    const isSnap = viewport.mode === 'snap';

    return (
        <div
            className={`viewport-item ${isHovered ? 'viewport-item--hovered' : ''} ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`viewport-item__card ${isSelected ? 'viewport-item__card--selected' : ''}`}>
                {/* Header row with content + actions */}
                <div className="viewport-item__header">
                    {/* Main clickable content area */}
                    <div
                        className="viewport-item__header-content"
                        onClick={onClick}
                    >
                        {/* Mode icon */}
                        <div className={`viewport-item__mode-icon ${isSnap ? 'viewport-item__mode-icon--snap' : 'viewport-item__mode-icon--free'}`}>
                            <Icon name={isSnap ? 'grid3x3' : 'move'} size={14} />
                        </div>

                        {/* Name and meta info */}
                        <div className="viewport-item__info">
                            <div className="viewport-item__name-row">
                                {isEditing ? (
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="viewport-item__name-input"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleNameSubmit}
                                        onKeyDown={handleNameKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className="viewport-item__name"
                                        onDoubleClick={handleNameDoubleClick}
                                        title="Double-click to rename"
                                    >
                                        {viewport.name}
                                    </span>
                                )}
                                {viewport.isPrimary && (
                                    <span className="viewport-item__badge viewport-item__badge--primary">
                                        Primary
                                    </span>
                                )}
                            </div>
                            <div className="viewport-item__meta">
                                <span className="viewport-item__mode-badge">
                                    {isSnap ? 'Snap' : 'Free'}
                                </span>
                                {viewport.isShared && (
                                    <span className="viewport-item__meta-item viewport-item__meta-item--shared">
                                        <Icon name="users" size={10} />
                                        Room
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Size badge */}
                        <div className="viewport-item__size">
                            <span className="viewport-item__size-value">
                                {viewport.size.cols}×{viewport.size.rows}
                            </span>
                            <span className="viewport-item__size-label">cells</span>
                        </div>
                    </div>

                    {/* Vertical stacked action buttons (right edge) */}
                    <div className="viewport-item__actions">
                        <button
                            className={`viewport-item__action viewport-item__action--share ${viewport.isShared ? 'viewport-item__action--active' : ''}`}
                            onClick={(e) => handleActionClick(e, onToggleShare)}
                            title={viewport.isShared ? 'Stop sharing with room' : 'Share with room'}
                        >
                            <Icon name="share2" size={12} />
                        </button>
                        <button
                            className="viewport-item__action"
                            onClick={(e) => handleActionClick(e, onDuplicate)}
                            title="Duplicate"
                        >
                            <Icon name="copy" size={12} />
                        </button>
                        <button
                            className="viewport-item__action viewport-item__action--delete"
                            onClick={(e) => handleActionClick(e, onDelete)}
                            title="Delete"
                        >
                            <Icon name="trash" size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ViewportListItem;
