/**
 * @file VRCanvasCellTarget.jsx
 * @description Overlay for canvas cells during VR transfer mode.
 * Shows valid/invalid states and zone selection.
 */

import React, { memo, useState } from 'react';
import { useTransfer, DROP_ZONES } from './TransferContext';
import './VRCanvasInteractions.scss';

/**
 * VRCanvasCellTarget - Makes canvas cells tappable during transfer
 *
 * @param {Object} props
 * @param {number} props.row - Cell row index
 * @param {number} props.col - Cell column index
 * @param {boolean} props.isEmpty - Whether cell is empty
 * @param {Object} [props.existingPlacement] - Existing placement data if occupied
 * @param {React.ReactNode} props.children - Cell content
 */
export const VRCanvasCellTarget = memo(function VRCanvasCellTarget({
    row,
    col,
    isEmpty,
    existingPlacement,
    children,
}) {
    const {
        isTransferring,
        targetCell,
        selectedZone,
        selectTargetCell,
        confirmTransfer,
        setShowZonePicker,
    } = useTransfer();

    const [isHovered, setIsHovered] = useState(false);
    const isSelected = targetCell?.row === row && targetCell?.col === col;

    const handleClick = (e) => {
        e.stopPropagation();
        if (!isTransferring) return;

        if (isSelected) {
            // Already selected - confirm or open zone picker
            if (isEmpty) {
                confirmTransfer();
            } else {
                setShowZonePicker(true);
            }
        } else {
            selectTargetCell(row, col, isEmpty, existingPlacement);
        }
    };

    if (!isTransferring) {
        return children;
    }

    // Determine zone color
    const getZoneColor = () => {
        if (isEmpty) return 'var(--vr-zone-place)';
        switch (selectedZone) {
            case DROP_ZONES.SWAP:
                return 'var(--vr-zone-swap)';
            case DROP_ZONES.PUSH_UP:
            case DROP_ZONES.PUSH_DOWN:
            case DROP_ZONES.PUSH_LEFT:
            case DROP_ZONES.PUSH_RIGHT:
                return 'var(--vr-zone-push)';
            default:
                return 'var(--vr-zone-place)';
        }
    };

    const classNames = [
        'vr-canvas-cell-target',
        isHovered && 'vr-canvas-cell-target--hovered',
        isSelected && 'vr-canvas-cell-target--selected',
        isEmpty && 'vr-canvas-cell-target--empty',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            onClick={handleClick}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            className={classNames}
            style={{ '--zone-color': getZoneColor() }}
        >
            {children}

            {/* Hover prompt */}
            {isHovered && !isSelected && (
                <div className="vr-canvas-cell-target__overlay">
                    <div className="vr-canvas-cell-target__prompt">
                        {isEmpty ? 'Tap to place here' : 'Tap for options'}
                    </div>
                </div>
            )}

            {/* Selected state */}
            {isSelected && (
                <div className="vr-canvas-cell-target__overlay vr-canvas-cell-target__overlay--selected">
                    <div className="vr-canvas-cell-target__confirm-prompt">
                        {isEmpty
                            ? 'Tap again to confirm'
                            : 'Tap for placement options'}
                    </div>
                </div>
            )}
        </div>
    );
});

export default VRCanvasCellTarget;
