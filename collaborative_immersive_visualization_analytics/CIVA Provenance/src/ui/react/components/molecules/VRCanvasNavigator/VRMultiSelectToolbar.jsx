/**
 * @file VRMultiSelectToolbar.jsx
 * @description Toolbar for multi-selected cells in VR canvas navigator.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRNavigator } from './VRNavigatorContext';
import './VRCanvasNavigator.scss';

/**
 * VRMultiSelectToolbar - Actions for selected cells
 */
export const VRMultiSelectToolbar = memo(function VRMultiSelectToolbar() {
    const { selectedCells, handleMerge, clearSelection } = useVRNavigator();

    if (selectedCells.length === 0) return null;

    const canMerge = selectedCells.length >= 2;

    return (
        <div className="vr-multi-select-toolbar">
            <span className="vr-multi-select-toolbar__count">
                {selectedCells.length} selected
            </span>

            <div className="vr-multi-select-toolbar__divider" />

            <button
                onClick={handleMerge}
                disabled={!canMerge}
                className={`vr-multi-select-toolbar__btn ${
                    canMerge ? 'vr-multi-select-toolbar__btn--primary' : ''
                }`}
            >
                <Icon name="link" size={14} />
                <span>Merge</span>
            </button>

            <button
                onClick={clearSelection}
                className="vr-multi-select-toolbar__btn"
            >
                <Icon name="x" size={14} />
                <span>Clear</span>
            </button>
        </div>
    );
});

export default VRMultiSelectToolbar;
