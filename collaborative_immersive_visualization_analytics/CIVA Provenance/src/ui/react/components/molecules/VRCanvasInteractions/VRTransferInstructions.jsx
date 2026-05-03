/**
 * @file VRTransferInstructions.jsx
 * @description HUD overlay showing transfer state during VR canvas placement.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTransfer } from './TransferContext';
import './VRCanvasInteractions.scss';

/**
 * VRTransferInstructions - HUD showing current transfer state
 */
export const VRTransferInstructions = memo(function VRTransferInstructions() {
    const { isTransferring, transferSource, targetCell, cancelTransfer } =
        useTransfer();

    if (!isTransferring) return null;

    return (
        <div className="vr-transfer-instructions">
            {/* Source info */}
            <div className="vr-transfer-instructions__source">
                <Icon
                    name={transferSource?.type === 'dataset' ? 'database' : 'image'}
                    size={18}
                />
                <span className="vr-transfer-instructions__source-name">
                    {transferSource?.name || 'Item'}
                </span>
            </div>

            {/* Instruction */}
            <div className="vr-transfer-instructions__text">
                {targetCell
                    ? 'Tap again to confirm placement'
                    : 'Point at a canvas cell and tap to place'}
            </div>

            {/* Cancel button */}
            <button
                onClick={cancelTransfer}
                className="vr-transfer-instructions__cancel"
            >
                <span className="vr-transfer-instructions__cancel-key">B</span>
                Cancel
            </button>
        </div>
    );
});

export default VRTransferInstructions;
