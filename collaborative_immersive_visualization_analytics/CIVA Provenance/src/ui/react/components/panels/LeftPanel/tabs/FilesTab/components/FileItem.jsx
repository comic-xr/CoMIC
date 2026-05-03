/**
 * @file FileItem.jsx
 * @description File item component for list and grid views.
 * V7: Added tag display support - shows up to 2 tags under filename with overflow.
 * V7.1: Added animated loading/processing indicator and improved size display.
 *
 * CLEAN MIGRATION: Uses <Icon name={...} /> directly with semantic names.
 */

import React, { useState, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { TagChipList } from '@UI/react/components/atoms/TagChip';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { FileThumbnail } from './FileThumbnail';
import { STATE_COLORS } from '@UI/react/constants/filesTabConfig.js';

/**
 * LoadStateIndicator - Shows animated spinner for loading/processing, dot for loaded
 * @param {Object} props - Component props
 * @param {string} [props.state] - Load state: 'stored' | 'loading' | 'loaded' | 'processing'
 * @param {boolean} [props.loaded] - Alternative: simple loaded boolean
 * @param {number} props.size - Icon size in pixels
 */
const LoadStateIndicator = memo(function LoadStateIndicator({ state, loaded, size = 8 }) {
    // Derive state from loaded boolean if no explicit state provided
    const effectiveState = state || (loaded ? 'loaded' : 'stored');
    const color = STATE_COLORS[effectiveState] || 'transparent';
    const isAnimated = effectiveState === 'loading' || effectiveState === 'processing';

    // Don't show anything for stored state
    if (effectiveState === 'stored') return null;

    if (isAnimated) {
        return (
            <span className="load-state-indicator load-state-indicator--animated" title={effectiveState === 'loading' ? 'Loading...' : 'Processing...'}>
                <Icon name="loader" size={size} style={{ color }} className="spin" />
            </span>
        );
    }

    // Loaded state - solid dot
    return (
        <span
            className="load-state-indicator"
            title="Loaded"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: color,
                boxShadow: `0 0 ${size}px ${color}40`,
                flexShrink: 0,
            }}
        />
    );
});

/**
 * Get icon config for a file - returns STRING icon names (not components!)
 * @param {Object} file - File object
 * @returns {{ icon: string, color: string|null, colorClass: string|null }}
 */
export function getFileTypeConfig(file) {
    if (file.isFolder || file.type === 'folder') {
        return { icon: 'folder', color: null, colorClass: 'file-icon--folder' };
    }

    const displayInfo = getFileTypeDisplayInfo(file.fileType);
    if (displayInfo) {
        return {
            icon: displayInfo.icon,  // Already semantic!
            color: displayInfo.color,
            colorClass: null,
        };
    }

    return { icon: 'file', color: null, colorClass: 'file-icon--default' };
}

/**
 * List view file item
 */
export const FileItemList = memo(function FileItemList({
    file,
    depth = 0,
    isSelected,
    onSelect,
    onStar,
    onDragStart,
    onContextMenu,
    onMenuClick,
    onDoubleClick,
    expandedFolders,
    onToggleFolder,
    // V7: Tag display props
    tags,
    getCategoryForTag,
    showTags = true,
    // Optional: Add to workspace button
    onAdd,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon, colorClass, color } = getFileTypeConfig(file);
    const isFolder = file.type === 'folder' || file.isFolder;
    const isExpanded = expandedFolders?.has(file.id);

    return (
        <>
            <div
                className={`tree-item ${isFolder ? 'tree-item--folder' : 'tree-item--file'} ${isSelected ? 'selected' : ''} ${file.loaded ? 'loaded' : ''}`}
                style={{ paddingLeft: 8 + depth * 16 }}
                draggable={!isFolder}
                onDragStart={(e) => !isFolder && onDragStart?.(e, file)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => (isFolder ? onToggleFolder?.(file.id) : onSelect?.(file))}
                onDoubleClick={() => !isFolder && onDoubleClick?.(file)}
                onContextMenu={(e) => onContextMenu?.(e, file)}
            >
                {/* Folder chevron */}
                {isFolder && (
                    <span className="tree-item__chevron">
                        <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={10} />
                    </span>
                )}

                {/* File type icon - uses semantic name directly */}
                <span
                    className={`tree-item__icon ${colorClass || ''}`}
                    style={color ? { color } : undefined}
                >
                    <Icon name={icon} size={14} />
                </span>

                {/* File name and tags */}
                <div className="tree-item__info">
                    <span className="tree-item__name" title={file.name}>
                        {file.name}
                    </span>
                    {/* V7: Tag display */}
                    {showTags && file.tagIds && file.tagIds.length > 0 && tags && (
                        <TagChipList
                            tags={file.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean)}
                            getCategoryForTag={getCategoryForTag}
                            maxVisible={2}
                            size="xs"
                            className="tree-item__tags"
                        />
                    )}
                </div>

                {/* Load state indicator (animated for loading/processing) */}
                {!isFolder && (
                    <LoadStateIndicator state={file.loadState} loaded={file.loaded} size={8} />
                )}

                {/* Star indicator (always visible when starred) */}
                {file.starred && !isHovered && !isFolder && (
                    <div className="tree-item__star-indicator">
                        <Icon name="star" size={12} />
                    </div>
                )}

                {/* Hover actions */}
                {isHovered && !isFolder && (
                    <div className="tree-item__actions">
                        {/* Add to workspace button (shown in Available tab) */}
                        {onAdd && (
                            <button
                                className="tree-item__action tree-item__action--add"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdd?.(file.id);
                                }}
                                title="Add to workspace"
                            >
                                <Icon name="plus" size={12} />
                            </button>
                        )}
                        <button
                            className={`tree-item__action ${file.starred ? 'starred' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onStar?.(file.id);
                            }}
                            title={file.starred ? 'Remove star' : 'Add star'}
                        >
                            <Icon name={file.starred ? "star" : "starOutline"} size={12} />
                        </button>
                        <button
                            className="tree-item__action"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMenuClick?.(e, file);
                            }}
                            title="More actions"
                        >
                            <Icon name="moreHorizontal" size={12} />
                        </button>
                    </div>
                )}

                {/* File size or folder item count */}
                <span className="tree-item__size">
                    {isFolder ? `${file.children?.length || 0}` : (file.size || '—')}
                </span>
            </div>

            {/* Children if folder is expanded */}
            {isFolder && isExpanded && file.children?.map((child) => (
                <FileItemList
                    key={child.id}
                    file={child}
                    depth={depth + 1}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    onStar={onStar}
                    onDragStart={onDragStart}
                    onContextMenu={onContextMenu}
                    onMenuClick={onMenuClick}
                    onDoubleClick={onDoubleClick}
                    expandedFolders={expandedFolders}
                    onToggleFolder={onToggleFolder}
                    tags={tags}
                    getCategoryForTag={getCategoryForTag}
                    showTags={showTags}
                    onAdd={onAdd}
                />
            ))}
        </>
    );
});

/**
 * Grid view file item (card)
 */
export const FileItemGrid = memo(function FileItemGrid({
    file,
    isSelected,
    onSelect,
    onStar,
    onDragStart,
    onContextMenu,
    onMenuClick,
    onDoubleClick,
    // V7: Tag display props
    tags,
    getCategoryForTag,
    showTags = true,
    // Optional: Add to workspace button
    onAdd,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon, colorClass, color } = getFileTypeConfig(file);

    if (file.type === 'folder') return null;

    return (
        <div
            className={`file-card ${isSelected ? 'selected' : ''}`}
            draggable
            onDragStart={(e) => onDragStart?.(e, file)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(file.id)}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick?.(file);
            }}
            onContextMenu={(e) => onContextMenu?.(e, file)}
        >
            <div className="thumbnail">
                <div className="thumbnail__preview">
                    <FileThumbnail
                        fileId={file.id}
                        fallbackIcon={icon}
                        color={color}
                        colorClass={colorClass}
                    />
                </div>
                {/* Star indicator (always visible when starred) */}
                {file.starred && !isHovered && (
                    <div className="thumbnail-star-indicator">
                        <Icon name="star" size={10} />
                    </div>
                )}
                <div className="thumbnail-actions" style={{ opacity: isHovered ? 1 : 0 }}>
                    {/* Add to workspace button (shown in Available tab) */}
                    {onAdd && (
                        <button
                            className="thumbnail-action thumbnail-action--add"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAdd?.(file.id);
                            }}
                            title="Add to workspace"
                        >
                            <Icon name="plus" size={10} />
                        </button>
                    )}
                    <button
                        className={`thumbnail-action ${file.starred ? 'starred' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStar(file.id);
                        }}
                        title={file.starred ? 'Remove star' : 'Add star'}
                    >
                        <Icon name={file.starred ? "star" : "starOutline"} size={10} />
                    </button>
                    <button
                        className="thumbnail-action"
                        onClick={(e) => onMenuClick?.(e, file)}
                        title="More actions"
                    >
                        <Icon name="moreHorizontal" size={10} />
                    </button>
                </div>
            </div>
            <div className="file-card__name-row">
                <div className="file-name">{file.name}</div>
                {/* Load state indicator */}
                <LoadStateIndicator state={file.loadState} loaded={file.loaded} size={8} />
            </div>
            {/* V7: Tag display for grid view */}
            {showTags && file.tagIds && file.tagIds.length > 0 && tags && (
                <TagChipList
                    tags={file.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean)}
                    getCategoryForTag={getCategoryForTag}
                    maxVisible={2}
                    size="xs"
                    className="file-card__tags"
                />
            )}
            <div className="file-size">{file.size || '—'}</div>
        </div>
    );
});

/**
 * FileItem - Main export
 */
export const FileItem = memo(function FileItem({ variant = 'list', ...props }) {
    if (variant === 'grid') {
        return <FileItemGrid {...props} />;
    }
    return <FileItemList {...props} />;
});

export default FileItemList;