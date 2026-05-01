// components/BookmarkItem.jsx
// Individual bookmark item component

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatTimestamp } from '@Utils/formatters.js';

export function BookmarkItem({ bookmark, onNavigate, onTogglePin, onDelete, getThumbnailUrl }) {
    const [isHovered, setIsHovered] = useState(false);
    const thumbnailUrl = bookmark.thumbnailKey ? getThumbnailUrl?.(bookmark.id) : null;

    return (
        <div
            className="bookmark-item"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Thumbnail */}
            <div className="bookmark-item__thumbnail">
                {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={bookmark.name} />
                ) : (
                    <Icon name="camera" size={16} />
                )}
            </div>

            {/* Content */}
            <div className="bookmark-item__content">
                <div className="bookmark-item__name">
                    {bookmark.name}
                    {bookmark.scope !== 'personal' && <Icon name="share2" size={9} className="icon-pink" />}
                </div>
                <div className="bookmark-item__meta">
                    <span>{bookmark.datasetName || 'No dataset'}</span>
                    <span>&middot;</span>
                    <span>{formatTimestamp(bookmark.createdAt)}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="bookmark-item__actions" style={{ opacity: isHovered ? 1 : 0 }}>
                <button
                    className={`bookmark-item__action-btn ${bookmark.isPinned ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onTogglePin(bookmark.id); }}
                    title={bookmark.isPinned ? 'Unpin' : 'Pin'}
                >
                    {bookmark.isPinned ? <Icon name="pin" size={10} fill="currentColor" /> : <Icon name="pinOff" size={10} />}
                </button>
                {bookmark.isOwn && (
                    <button
                        className="bookmark-item__action-btn"
                        onClick={(e) => { e.stopPropagation(); onDelete(bookmark.id); }}
                        title="Delete"
                    >
                        <Icon name="delete" size={10} />
                    </button>
                )}
            </div>

            {/* Go button */}
            <button
                className="bookmark-item__go-btn"
                onClick={() => onNavigate(bookmark.id)}
            >
                <Icon name="play" size={10} /> Go
            </button>
        </div>
    );
}

export default BookmarkItem;