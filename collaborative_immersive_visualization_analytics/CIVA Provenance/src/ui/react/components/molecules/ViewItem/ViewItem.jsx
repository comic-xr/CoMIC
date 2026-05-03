/**
 * ViewItem Component
 * Location: src/ui/react/components/common/ViewItem/ViewItem.jsx
 *
 * Adaptive view item component supporting desktop and VR modes.
 * Handles three view states: active (on canvas), inactive (not on canvas), trashed.
 *
 * Desktop Mode: Slide-over actions on hover, expandable toolbar on click
 * VR Mode: Horizontal action bar below content, always visible
 *
 * @module ViewItem
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ViewItemContextMenu } from './components/ViewItemContextMenu';
import { ViewExpandedPanel } from './components/ViewExpandedPanel';
import { ViewSettingsModal } from '@UI/react/components/modals/ViewSettingsModal';
import { Thumbnail } from '@UI/react/components/atoms/Thumbnail';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';
import './ViewItem.scss';

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG = {
    active: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: 'Active', glow: true },
    inactive: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Inactive', glow: false },
    trashed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Trashed', glow: false },
};

const formatPosition = (col, row) => formatGridPosition(col, row);

// =============================================================================
// TOOL BUTTON COMPONENT
// =============================================================================

const ToolButton = memo(function ToolButton({
    icon,
    label,
    color,
    onClick,
    isVR = false,
    showLabel = false,
    className = '',
}) {
    const handleClick = (e) => {
        e.stopPropagation();
        onClick?.();
    };

    if (isVR) {
        return (
            <button
                className={`view-item__vr-action-btn ${className}`}
                onClick={handleClick}
                title={label}
                style={{ '--tool-color': color }}
            >
                <Icon name={icon} size={20} />
                <span>{label}</span>
            </button>
        );
    }

    return (
        <button
            className={`view-item__tool-btn ${className}`}
            onClick={handleClick}
            title={label}
            style={{ '--tool-color': color }}
        >
            <Icon name={icon} size={12} />
            {showLabel && <span className="view-item__tool-label">{label}</span>}
        </button>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ViewItem = memo(function ViewItem({
    view,
    mode = 'desktop',
    isSelected = false,
    showDatasetBadge = false,
    dataset = null,
    sharedUsers = [],

    // Index for drag/drop
    index,
    totalItems,
    isDragging = null,
    dragOverIndex = null,

    // State-specific callbacks
    onFocus,
    onClose,
    onPlace,
    onTrash,
    onRestore,
    onDeletePermanently,
    onVisibilityToggle,

    // Common callbacks
    onLink,
    onDuplicate,
    onSnapshot,
    onSettings,
    onRename,
    onSelect,
    onNavigate,
    onBookmark,
    onShare,
    onOpenTools,
    onSizeChange,
    onFilterRemove,
    onLinkPropertyChange,
    onLinkModeChange,
    availableViews = [],

    // Drag callbacks
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,

    className = '',
}) {
    // =========================================================================
    // LOCAL STATE
    // =========================================================================

    const [isHovered, setIsHovered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragHandle, setIsDragHandle] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(view?.name || '');
    const [contextMenu, setContextMenu] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const itemRef = useRef(null);
    const inputRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    // =========================================================================
    // DERIVED STATE
    // =========================================================================

    const isVR = mode === 'vr';
    const isBeingDragged = isDragging === index;
    const isDropTarget = dragOverIndex === index;
    const isDropAfterTarget = dragOverIndex === index + 0.5;

    // Determine view state from status and position
    const viewState = view?.status === 'trashed'
        ? 'trashed'
        : view?.position
            ? 'active'
            : 'inactive';

    const statusConfig = STATUS_CONFIG[viewState];

    // Get dataset info
    const datasetInfo = dataset || view?.dataset || {
        name: view?.datasetName || view?.name?.replace('View of ', '') || 'Unknown',
        type: view?.instanceType || 'vtk',
    };

    // =========================================================================
    // TOOL DEFINITIONS
    // =========================================================================

    const getTools = useCallback(() => {
        const commonTools = [
            { id: 'link', icon: 'link', label: 'Link', color: '#a78bfa', onClick: () => onLink?.(view.id) },
            { id: 'duplicate', icon: 'copy', label: 'Duplicate', color: '#f472b6', onClick: () => onDuplicate?.(view.id) },
            { id: 'snapshot', icon: 'camera', label: 'Snapshot', color: '#fbbf24', onClick: () => onSnapshot?.(view.id) },
            { id: 'settings', icon: 'settings', label: 'Settings', color: '#6b7280', onClick: () => setShowSettingsModal(true) },
        ];

        switch (viewState) {
            case 'active':
                return {
                    quick: [
                        { id: 'focus', icon: 'target', label: 'Focus', color: '#60a5fa', onClick: () => onFocus?.(view.id) },
                        {
                            id: 'visibility',
                            icon: view.visible !== false ? 'eye' : 'eyeOff',
                            label: view.visible !== false ? 'Hide' : 'Show',
                            color: view.visible !== false ? '#4ade80' : '#6b7280',
                            onClick: () => onVisibilityToggle?.(view.id),
                        },
                        { id: 'close', icon: 'close', label: 'Close', color: '#ef4444', onClick: () => onClose?.(view.id) },
                    ],
                    more: commonTools,
                };
            case 'inactive':
                return {
                    quick: [
                        { id: 'place', icon: 'place', label: 'Place', color: '#60a5fa', onClick: () => onPlace?.(view.id) },
                        { id: 'trash', icon: 'trash', label: 'Trash', color: '#ef4444', onClick: () => onTrash?.(view.id) },
                    ],
                    more: commonTools,
                };
            case 'trashed':
                return {
                    quick: [
                        { id: 'restore', icon: 'restore', label: 'Restore', color: '#4ade80', onClick: () => onRestore?.(view.id) },
                        { id: 'deletePermanently', icon: 'deletePermanent', label: 'Delete', color: '#ef4444', onClick: () => onDeletePermanently?.(view.id) },
                    ],
                    more: [],
                };
            default:
                return { quick: [], more: [] };
        }
    }, [view, viewState, onFocus, onClose, onPlace, onTrash, onRestore, onDeletePermanently, onVisibilityToggle, onLink, onDuplicate, onSnapshot]);

    const { quick: quickTools, more: moreTools } = getTools();

    // =========================================================================
    // HOVER HANDLING
    // =========================================================================

    const handleMouseEnter = useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 150);
    }, []);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleRowClick = useCallback(() => {
        if (isVR) {
            onFocus?.(view.id);
        } else {
            setIsExpanded(!isExpanded);
        }
    }, [isVR, view?.id, isExpanded, onFocus]);

    const handleExpandClick = useCallback((e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    }, [isExpanded]);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleStartEditing = useCallback(() => {
        setEditedName(view?.name || '');
        setIsEditing(true);
    }, [view?.name]);

    const handleFinishEditing = useCallback(() => {
        if (editedName.trim() && editedName !== view?.name) {
            onRename?.(view.id, editedName.trim());
        }
        setIsEditing(false);
    }, [editedName, view?.name, view?.id, onRename]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleFinishEditing();
        } else if (e.key === 'Escape') {
            setEditedName(view?.name || '');
            setIsEditing(false);
        }
    }, [handleFinishEditing, view?.name]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // =========================================================================
    // DRAG HANDLING
    // =========================================================================

    const handleDragStart = useCallback((e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index?.toString() || '0');
        e.dataTransfer.setData('application/x-viewitem', JSON.stringify({
            type: 'view-item',
            id: view.id,
            viewConfigId: view.id,
            viewId: view.id,
            name: view.name,
            color: view.color,
            datasetId: view.datasetId,
            rowSpan: view.rowSpan || 1,
            colSpan: view.colSpan || 1,
        }));
        onDragStart?.(index);
    }, [view, index, onDragStart]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
            onDragOver?.(index);
        } else {
            onDragOver?.(index + 0.5);
        }
    }, [index, onDragOver]);

    const handleDragLeave = useCallback((e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            onDragOver?.(null);
        }
    }, [onDragOver]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        let toIndex = dragOverIndex;

        if (toIndex % 1 !== 0) {
            toIndex = Math.ceil(toIndex);
        }

        onDrop?.(fromIndex, toIndex);
    }, [dragOverIndex, onDrop]);

    // =========================================================================
    // RENDER
    // =========================================================================

    const itemClasses = [
        'view-item',
        `view-item--${viewState}`,
        isVR && 'view-item--vr',
        isSelected && 'view-item--selected',
        isExpanded && 'view-item--expanded',
        isBeingDragged && 'view-item--dragging',
        (isHovered || isExpanded) && 'view-item--hovered',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={itemClasses}
            ref={itemRef}
            style={{ '--view-color': view?.color }}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={onDragEnd}
            onMouseEnter={!isVR ? handleMouseEnter : undefined}
            onMouseLeave={!isVR ? handleMouseLeave : undefined}
        >
            {/* Drop indicators */}
            <div className={`view-item__drop-before ${isDropTarget ? 'view-item__drop-before--visible' : ''}`} />
            {index === totalItems - 1 && (
                <div className={`view-item__drop-after ${isDropAfterTarget ? 'view-item__drop-after--visible' : ''}`} />
            )}

            {/* Main Row */}
            <div
                className="view-item__row"
                onClick={handleRowClick}
                onContextMenu={handleContextMenu}
            >
                {/* VR: Color strip */}
                {isVR && <div className="view-item__color-strip" />}

                {/* Content area */}
                <div className="view-item__content">
                    {/* Drag Handle */}
                    <div
                        className="view-item__drag-handle"
                        onMouseEnter={() => setIsDragHandle(true)}
                        onMouseLeave={() => setIsDragHandle(false)}
                    >
                        <Icon name="gripVertical" size={isVR ? 16 : 12} />
                    </div>

                    {/* Thumbnail - shows for both desktop and VR */}
                    <div className="view-item__thumbnail">
                        <Thumbnail
                            viewId={view.id}
                            size={isVR ? 'sm' : 'xs'}
                            instanceType={view.instanceType || datasetInfo?.type || 'vtk'}
                        />
                    </div>

                    {/* View info */}
                    <div className="view-item__info">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                className="view-item__name-input"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleFinishEditing}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span
                                className="view-item__name"
                                onDoubleClick={handleStartEditing}
                            >
                                {view.name}
                            </span>
                        )}

                        <div className="view-item__meta">
                            {isVR && (
                                <>
                                    <span className="view-item__handler-badge">
                                        {view.handlerType || datasetInfo?.type}
                                    </span>
                                    <span className="view-item__meta-dot">•</span>
                                </>
                            )}
                            <span className="view-item__dataset-name">
                                {view.datasetName || datasetInfo?.name}
                            </span>
                        </div>
                    </div>

                    {/* Right content wrapper (fades on desktop hover) */}
                    <div className="view-item__right-content">
                        {/* Position badge */}
                        {view.position && (
                            <div className="view-item__position-badge">
                                <Icon name="grid" size={isVR ? 12 : 8} />
                                <span>{formatPosition(view.position.col, view.position.row)}</span>
                            </div>
                        )}

                        {/* Status indicator */}
                        <div className="view-item__status" style={{ background: statusConfig.bg }}>
                            <div
                                className="view-item__status-dot"
                                style={{
                                    background: statusConfig.color,
                                    boxShadow: statusConfig.glow ? `0 0 8px ${statusConfig.color}` : 'none',
                                }}
                            />
                            {isVR && <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>}
                        </div>
                    </div>

                    {/* Desktop: Slide-in quick actions */}
                    {!isVR && (
                        <div className="view-item__quick-actions">
                            {quickTools.map(tool => (
                                <ToolButton key={tool.id} {...tool} />
                            ))}
                            <button
                                className="view-item__expand-btn"
                                onClick={handleExpandClick}
                                title={isExpanded ? 'Collapse tools' : 'Expand tools'}
                            >
                                <Icon name="chevronDown" size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* VR: Horizontal action bar */}
            {isVR && (
                <div className="view-item__vr-actions">
                    {quickTools.map(tool => (
                        <ToolButton key={tool.id} {...tool} isVR />
                    ))}
                    {moreTools.length > 0 && (
                        <button
                            className={`view-item__vr-more-btn ${isExpanded ? 'view-item__vr-more-btn--active' : ''}`}
                            onClick={handleExpandClick}
                        >
                            <Icon name="moreHorizontal" size={18} />
                            <span>{isExpanded ? 'Less' : 'More'}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Expanded Panel with full details */}
            {isExpanded && viewState === 'active' && (
                <ViewExpandedPanel
                    view={view}
                    isVR={isVR}
                    availableViews={availableViews}
                    onNavigate={() => onNavigate?.(view.id)}
                    onOpenTools={() => onOpenTools?.(view.id)}
                    onDuplicate={() => onDuplicate?.(view.id)}
                    onBookmark={() => onBookmark?.(view.id)}
                    onShare={() => onShare?.(view.id)}
                    onClose={() => onClose?.(view.id)}
                    onDelete={() => onTrash?.(view.id)}
                    onSizeChange={onSizeChange}
                    onFilterRemove={onFilterRemove}
                    onLinkPropertyChange={onLinkPropertyChange}
                    onLinkModeChange={onLinkModeChange}
                />
            )}

            {/* Desktop: Expanded toolbar for inactive views */}
            {isExpanded && !isVR && viewState !== 'active' && moreTools.length > 0 && (
                <div className="view-item__toolbar">
                    <span className="view-item__toolbar-label">Tools</span>
                    {moreTools.map(tool => (
                        <ToolButton key={tool.id} {...tool} />
                    ))}
                </div>
            )}

            {/* VR: Expanded toolbar for inactive views */}
            {isExpanded && isVR && viewState !== 'active' && moreTools.length > 0 && (
                <div className="view-item__vr-toolbar">
                    {moreTools.map(tool => (
                        <ToolButton key={tool.id} {...tool} isVR />
                    ))}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ViewItemContextMenu
                    view={view}
                    position={contextMenu}
                    isPlaced={viewState === 'active'}
                    onClose={handleCloseContextMenu}
                    onSelect={() => { onSelect?.(view.id); handleCloseContextMenu(); }}
                    onRename={() => { handleStartEditing(); handleCloseContextMenu(); }}
                    onDuplicate={() => { onDuplicate?.(view.id); handleCloseContextMenu(); }}
                    onTrash={() => { onTrash?.(view.id); handleCloseContextMenu(); }}
                    onSettings={() => { setShowSettingsModal(true); handleCloseContextMenu(); }}
                    onPlaceOnCanvas={() => { onPlace?.(view.id); handleCloseContextMenu(); }}
                    onRemoveFromCanvas={() => { onClose?.(view.id); handleCloseContextMenu(); }}
                    onNavigate={() => { onNavigate?.(view.id); handleCloseContextMenu(); }}
                />
            )}

            {/* Settings Modal */}
            <ViewSettingsModal
                isOpen={showSettingsModal}
                view={view}
                dataset={datasetInfo}
                sharedUsers={sharedUsers}
                onClose={() => setShowSettingsModal(false)}
                onRename={(newName) => onRename?.(view.id, newName)}
            />
        </div>
    );
});

export default ViewItem;
