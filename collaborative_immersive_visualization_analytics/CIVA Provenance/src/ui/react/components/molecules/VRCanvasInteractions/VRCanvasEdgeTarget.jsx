/**
 * @file VRCanvasEdgeTarget.jsx
 * @description Edge expansion buttons for VR canvas.
 * Allows adding rows/columns at canvas edges.
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTransfer, EDGE_POSITIONS } from './TransferContext';
import './VRCanvasInteractions.scss';

// Edge configuration
const EDGE_CONFIG = {
    [EDGE_POSITIONS.TOP]: {
        icon: 'arrowUp',
        label: 'Add Row',
        position: 'top',
    },
    [EDGE_POSITIONS.BOTTOM]: {
        icon: 'arrowDown',
        label: 'Add Row',
        position: 'bottom',
    },
    [EDGE_POSITIONS.LEFT]: {
        icon: 'arrowLeft',
        label: 'Add Column',
        position: 'left',
    },
    [EDGE_POSITIONS.RIGHT]: {
        icon: 'arrowRight',
        label: 'Add Column',
        position: 'right',
    },
};

/**
 * VRCanvasEdgeTarget - Edge expansion button
 *
 * @param {Object} props
 * @param {'top'|'bottom'|'left'|'right'} props.position - Edge position
 * @param {boolean} props.canExpand - Whether expansion is allowed
 * @param {Function} props.onExpand - Called when edge is tapped to expand
 */
export const VRCanvasEdgeTarget = memo(function VRCanvasEdgeTarget({
    position,
    canExpand,
    onExpand,
}) {
    const { isTransferring, transferSource } = useTransfer();
    const [isHovered, setIsHovered] = useState(false);

    if (!canExpand) return null;

    const config = EDGE_CONFIG[position];
    const showExpanded = isTransferring && canExpand;
    const isVertical = position === 'left' || position === 'right';

    const handleClick = () => {
        if (isTransferring && transferSource) {
            onExpand?.(position, transferSource);
        }
    };

    const classNames = [
        'vr-canvas-edge-target',
        `vr-canvas-edge-target--${position}`,
        showExpanded && 'vr-canvas-edge-target--active',
        isHovered && showExpanded && 'vr-canvas-edge-target--hovered',
        isVertical && 'vr-canvas-edge-target--vertical',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            onClick={handleClick}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            className={classNames}
            disabled={!showExpanded}
        >
            <Icon name={config.icon} size={16} />
            <span className="vr-canvas-edge-target__label">{config.label}</span>
        </button>
    );
});

export default VRCanvasEdgeTarget;
