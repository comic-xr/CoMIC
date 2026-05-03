/**
 * @file SavePointsTab.jsx
 * @description Manual checkpoints for canvas state recovery.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { SavePointItem } from '../components/SavePointItem';

/**
 * SavePointsTab - Save points management
 *
 * @param {Object} props - Component props
 * @param {Array} props.savePoints - Array of save point objects
 * @param {number|null} props.currentSavePoint - Index of current save point
 * @param {Function} props.onCreateSavePoint - Create new save point
 * @param {Function} props.onRevert - Revert to a save point
 * @param {Function} props.onDelete - Delete a save point
 */
export function SavePointsTab({
  savePoints = [],
  currentSavePoint,
  onCreateSavePoint,
  onRevert,
  onDelete,
}) {
  return (
    <div className="save-points-tab">
      {/* Create button */}
      <div className="save-points-tab__header">
        <LabeledButton
          icon="save"
          label="Create Save Point"
          onClick={onCreateSavePoint}
          variant="secondary"
          fullWidth
        />
      </div>

      {/* Save points list */}
      <div className="cop-scroll-list">
        {savePoints.length === 0 ? (
          <div className="cop-empty-state">
            <div className="cop-empty-state__icon">
              <Icon name="save" size={24} />
            </div>
            <div className="cop-empty-state__title">No save points</div>
            <div className="cop-empty-state__description">
              Create a save point to bookmark the current canvas state
            </div>
          </div>
        ) : (
          <div className="cop-list cop-list--gap-md">
            {savePoints.map((sp, i) => (
              <SavePointItem
                key={sp.id || i}
                savePoint={sp}
                isCurrent={currentSavePoint === i}
                onRevert={() => onRevert?.(i)}
                onDelete={() => onDelete?.(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavePointsTab;
