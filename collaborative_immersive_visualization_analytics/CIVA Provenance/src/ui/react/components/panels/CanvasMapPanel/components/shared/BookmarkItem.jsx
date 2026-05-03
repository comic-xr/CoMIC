/**
 * @file BookmarkItem.jsx
 * @description Bookmark list item component
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatCellRef } from '../../utils/gridUtils';

/**
 * BookmarkItem - Bookmark list item
 *
 * @param {Object} props
 * @param {Object} props.bookmark - Bookmark data { id, name, position, isStarred, isPinned }
 * @param {Function} props.onClick - Click handler to navigate to bookmark
 * @param {Function} [props.onDelete] - Delete handler
 * @param {Function} [props.onStar] - Star/favorite handler
 */
export const BookmarkItem = memo(function BookmarkItem({
  bookmark,
  onClick,
  onDelete,
  onStar,
}) {
  return (
    <div
      className={`bookmark-item ${bookmark.isStarred ? 'bookmark-item--starred' : ''}`}
      onClick={() => onClick?.(bookmark)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(bookmark);
        }
      }}
    >
      <Icon
        name={bookmark.isStarred ? 'star' : 'bookmark'}
        size={14}
        className="bookmark-item__icon"
      />

      <span className="bookmark-item__name">{bookmark.name}</span>

      <span className="bookmark-item__position">
        {formatCellRef(bookmark.position.row, bookmark.position.col)}
      </span>

      {onStar && (
        <button
          className="bookmark-item__star"
          onClick={(e) => {
            e.stopPropagation();
            onStar(bookmark.id);
          }}
          title={bookmark.isStarred ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Icon name={bookmark.isStarred ? 'starOff' : 'star'} size={12} />
        </button>
      )}

      {onDelete && (
        <button
          className="bookmark-item__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(bookmark.id);
          }}
          title="Delete bookmark"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
});

export default BookmarkItem;
