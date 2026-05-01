/**
 * @file VRNavigationControls.jsx
 * @description D-pad and zoom controls for VR canvas navigation.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';
import { useVRNavigator } from './VRNavigatorContext';
import './VRCanvasNavigator.scss';

// Direction button configurations
const DIRECTIONS = [
    {
        id: 'up',
        icon: 'chevron-up',
        dx: 0,
        dy: -1,
        position: 'top',
    },
    {
        id: 'down',
        icon: 'chevron-down',
        dx: 0,
        dy: 1,
        position: 'bottom',
    },
    {
        id: 'left',
        icon: 'chevron-left',
        dx: -1,
        dy: 0,
        position: 'left',
    },
    {
        id: 'right',
        icon: 'chevron-right',
        dx: 1,
        dy: 0,
        position: 'right',
    },
];

/**
 * VRNavigationControls - D-pad and zoom controls for VR
 */
export const VRNavigationControls = memo(function VRNavigationControls({
    onNavigate,
    onZoom,
    currentPosition,
}) {
    const { canvasSize } = useVRNavigator();

    // Check if direction is valid
    const canNavigate = (dx, dy) => {
        const newRow = currentPosition.row + dy;
        const newCol = currentPosition.col + dx;
        return (
            newRow >= 0 &&
            newCol >= 0 &&
            newRow < canvasSize.rows &&
            newCol < canvasSize.cols
        );
    };

    return (
        <div className="vr-navigation-controls">
            {/* D-pad */}
            <div className="vr-navigation-controls__dpad">
                {/* Center display */}
                <div className="vr-navigation-controls__center">
                    {formatGridPosition(currentPosition.col, currentPosition.row)}
                </div>

                {/* Direction buttons */}
                {DIRECTIONS.map((dir) => {
                    const enabled = canNavigate(dir.dx, dir.dy);
                    return (
                        <button
                            key={dir.id}
                            onClick={() =>
                                enabled && onNavigate?.(dir.dx, dir.dy)
                            }
                            disabled={!enabled}
                            className={`vr-navigation-controls__dir vr-navigation-controls__dir--${dir.position}`}
                        >
                            <Icon name={dir.icon} size={18} />
                        </button>
                    );
                })}
            </div>

            {/* Zoom controls */}
            <div className="vr-navigation-controls__zoom">
                <button
                    onClick={() => onZoom?.(1)}
                    className="vr-navigation-controls__zoom-btn"
                    title="Zoom in"
                >
                    <Icon name="zoom-in" size={18} />
                </button>
                <button
                    onClick={() => onZoom?.(-1)}
                    className="vr-navigation-controls__zoom-btn"
                    title="Zoom out"
                >
                    <Icon name="zoom-out" size={18} />
                </button>
            </div>
        </div>
    );
});

export default VRNavigationControls;
