/**
 * @file ViewGroupListItem.jsx
 * @description Card-style list item for ViewGroups, matching DatasetsTab design.
 *
 * Features:
 * - Card layout with vertical stacked action buttons (right edge)
 * - Layout preview thumbnail with type icon
 * - Editable name (double-click)
 * - View count badge
 * - Multi-select mode with checkboxes
 * - Empty badge for ViewGroups with no views
 * - Linked indicator for linked ViewGroups
 *
 * @example
 * <ViewGroupListItem
 *   viewGroup={viewGroup}
 *   layout={layout}
 *   isSelected={selectedId === viewGroup.id}
 *   onClick={() => handleSelect(viewGroup.id)}
 *   onDoubleClick={() => handleDrillIn(viewGroup.id)}
 * />
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LayoutPreview } from './LayoutPreview';

/**
 * ViewGroupListItem component
 *
 * @param {Object} props - Component props
 * @param {Object} props.viewGroup - ViewGroup data
 * @param {Object} props.layout - Layout configuration for this ViewGroup
 * @param {boolean} [props.isSelected=false] - Whether this item is selected
 * @param {boolean} [props.isMultiSelectMode=false] - Whether multi-select mode is active
 * @param {boolean} [props.isChecked=false] - Whether this item is checked (multi-select)
 * @param {Function} [props.onClick] - Click handler
 * @param {Function} [props.onDoubleClick] - Double-click handler (drill into ViewGroup)
 * @param {Function} [props.onToggleCheck] - Checkbox toggle handler (multi-select)
 * @param {Function} [props.onDuplicate] - Duplicate action handler
 * @param {Function} [props.onSettings] - Settings action handler
 * @param {Function} [props.onDelete] - Delete action handler
 * @param {Function} [props.onRename] - Rename handler
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const ViewGroupListItem = memo(function ViewGroupListItem({
    viewGroup,
    layout,
    isSelected = false,
    isMultiSelectMode = false,
    isChecked = false,
    onClick,
    onDoubleClick,
    onToggleCheck,
    onDuplicate,
    onSettings,
    onDelete,
    onRename,
    className = '',
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(viewGroup.name);
    const inputRef = useRef(null);

    // Focus input when editing
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Sync edit value with viewGroup name
    useEffect(() => {
        setEditValue(viewGroup.name);
    }, [viewGroup.name]);

    const handleClick = (e) => {
        if (isMultiSelectMode) {
            onToggleCheck?.();
        } else {
            onClick?.();
        }
    };

    const handleDoubleClick = (e) => {
        if (!isMultiSelectMode) {
            onDoubleClick?.();
        }
    };

    const handleNameDoubleClick = (e) => {
        e.stopPropagation();
        if (!isMultiSelectMode) {
            setIsEditing(true);
        }
    };

    const handleNameSubmit = () => {
        if (editValue.trim() && editValue.trim() !== viewGroup.name) {
            onRename?.(editValue.trim());
        } else {
            setEditValue(viewGroup.name);
        }
        setIsEditing(false);
    };

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        }
        if (e.key === 'Escape') {
            setEditValue(viewGroup.name);
            setIsEditing(false);
        }
    };

    const handleActionClick = (e, action) => {
        e.stopPropagation();
        action?.(viewGroup);
    };

    const isEmpty = viewGroup.views.length === 0;
    const hasLink = !!viewGroup.linkedTo;

    return (
        <div
            className={`viewgroup-item ${isHovered ? 'viewgroup-item--hovered' : ''} ${className}`}
            style={{ '--vg-color': viewGroup.color }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`viewgroup-item__card ${isSelected || isChecked ? 'viewgroup-item__card--selected' : ''}`}>
                {/* Header row with content + actions */}
                <div className="viewgroup-item__header">
                    {/* Main clickable content area */}
                    <div
                        className="viewgroup-item__header-content"
                        onClick={handleClick}
                        onDoubleClick={handleDoubleClick}
                    >
                        {/* Multi-select checkbox */}
                        {isMultiSelectMode && (
                            <div className={`viewgroup-item__checkbox ${isChecked ? 'viewgroup-item__checkbox--checked' : ''}`}>
                                {isChecked && <Icon name="check" size={12} />}
                            </div>
                        )}

                        {/* Chevron for expansion */}
                        <div className="viewgroup-item__chevron">
                            <Icon name="chevronDown" size={14} />
                        </div>

                        {/* Layout preview icon */}
                        <div className="viewgroup-item__type-icon">
                            <LayoutPreview
                                layout={layout}
                                size="xs"
                                active={isSelected}
                                color={viewGroup.color}
                            />
                        </div>

                        {/* Name and meta info */}
                        <div className="viewgroup-item__info">
                            {isEditing ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="viewgroup-item__name-input"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleNameSubmit}
                                    onKeyDown={handleNameKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className="viewgroup-item__name"
                                    onDoubleClick={handleNameDoubleClick}
                                    title="Double-click to rename"
                                >
                                    {viewGroup.name}
                                </span>
                            )}
                            <div className="viewgroup-item__meta">
                                <span className="viewgroup-item__layout-badge">
                                    {layout?.name || 'Single'}
                                </span>
                                {hasLink && (
                                    <span className="viewgroup-item__meta-item">
                                        <Icon name="link2" size={10} />
                                    </span>
                                )}
                                {isEmpty && (
                                    <span className="viewgroup-item__empty-badge">empty</span>
                                )}
                            </div>
                        </div>

                        {/* View count badge */}
                        <div className={`viewgroup-item__view-count ${viewGroup.views.length > 0 ? 'viewgroup-item__view-count--has-views' : ''}`}>
                            <span className="viewgroup-item__view-count-number">{viewGroup.views.length}</span>
                            <span className="viewgroup-item__view-count-label">views</span>
                        </div>
                    </div>

                    {/* Vertical stacked action buttons (right edge) */}
                    {!isMultiSelectMode && (
                        <div className="viewgroup-item__actions">
                            <button
                                className="viewgroup-item__action viewgroup-item__action--edit"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDoubleClick?.();
                                }}
                                title="Edit layout"
                            >
                                <Icon name="edit3" size={12} />
                            </button>
                            <button
                                className="viewgroup-item__action"
                                onClick={(e) => handleActionClick(e, onDuplicate)}
                                title="Duplicate"
                            >
                                <Icon name="copy" size={12} />
                            </button>
                            <button
                                className="viewgroup-item__action viewgroup-item__action--delete"
                                onClick={(e) => handleActionClick(e, onDelete)}
                                title="Delete"
                            >
                                <Icon name="trash" size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ViewGroupListItem;
