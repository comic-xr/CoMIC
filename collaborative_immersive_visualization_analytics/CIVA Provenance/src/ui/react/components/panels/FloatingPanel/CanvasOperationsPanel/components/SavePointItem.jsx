/**
 * @file SavePointItem.jsx
 * @description A single save point row
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * SavePointItem - Single save point row
 *
 * @param {Object} props - Component props
 * @param {Object} props.savePoint - Save point object
 * @param {boolean} props.isCurrent - Whether this is the current/active save point
 * @param {Function} props.onRevert - Revert to this save point
 * @param {Function} props.onDelete - Delete this save point
 */
export function SavePointItem({
  savePoint,
  isCurrent = false,
  onRevert,
  onDelete,
}) {
  return (
    <div className={`save-point-item ${isCurrent ? 'save-point-item--current' : ''}`}>
      {/* Icon */}
      <div
        className={`save-point-item__icon ${isCurrent ? 'save-point-item__icon--current' : 'save-point-item__icon--default'}`}
      >
        <Icon name={isCurrent ? 'check' : 'save'} size={14} />
      </div>

      {/* Info */}
      <div className="save-point-item__info">
        <div className="save-point-item__name">
          {savePoint.name}
          {isCurrent && (
            <span className="save-point-item__current-label">(Current)</span>
          )}
        </div>
        <div className="save-point-item__meta">
          {savePoint.timestamp} • {savePoint.user} • {savePoint.viewCount} views
        </div>
      </div>

      {/* Actions */}
      <div className="save-point-item__actions">
        {!isCurrent && (
          <button
            className="cop-button cop-button--outline-amber cop-button--small"
            onClick={onRevert}
            title="Revert to this save point"
            type="button"
          >
            <Icon name="undo" size={10} />
            Revert
          </button>
        )}
        <button
          className="cop-button cop-button--icon cop-button--secondary"
          onClick={onDelete}
          title="Delete save point"
          type="button"
          style={{ width: 28, height: 28, padding: 0 }}
        >
          <Icon name="delete" size={12} />
        </button>
      </div>
    </div>
  );
}

export default SavePointItem;
