/**
 * @file VRTransferableSource.jsx
 * @description Wrapper for items that can be transferred to canvas in VR.
 * Replaces draggable behavior with tap-to-select.
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTransfer } from './TransferContext';
import './VRCanvasInteractions.scss';

/**
 * VRTransferableSource - Makes items tappable to start transfer
 *
 * @param {Object} props
 * @param {'dataset'|'view'} props.type - Type of item being transferred
 * @param {Object} props.data - Item data { id, name, color, ... }
 * @param {boolean} [props.disabled=false] - Whether transfer is disabled
 * @param {React.ReactNode} props.children - Child content
 */
export const VRTransferableSource = memo(function VRTransferableSource({
    type,
    data,
    disabled = false,
    children,
}) {
    const { isTransferring, transferSource, startTransfer, cancelTransfer } =
        useTransfer();

    const isActive = transferSource?.id === data.id && transferSource?.type === type;
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = (e) => {
        e.stopPropagation();
        if (disabled) return;

        if (isActive) {
            cancelTransfer();
        } else {
            startTransfer(type, data);
        }
    };

    const classNames = [
        'vr-transferable-source',
        isActive && 'vr-transferable-source--active',
        disabled && 'vr-transferable-source--disabled',
        isTransferring && !isActive && 'vr-transferable-source--dimmed',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            onClick={handleClick}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            className={classNames}
        >
            {children}

            {/* Active indicator */}
            {isActive && (
                <div className="vr-transferable-source__active-badge">
                    <Icon name="check" size={12} />
                </div>
            )}

            {/* Hover hint */}
            {isHovered && !isTransferring && !disabled && (
                <div className="vr-transferable-source__hint">
                    Tap to place on canvas
                </div>
            )}
        </div>
    );
});

export default VRTransferableSource;
