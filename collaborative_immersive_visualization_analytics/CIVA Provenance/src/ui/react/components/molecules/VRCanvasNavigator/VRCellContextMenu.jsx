/**
 * @file VRCellContextMenu.jsx
 * @description Radial context menu for cell actions in VR.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRNavigator, CELL_ACTIONS } from './VRNavigatorContext';
import './VRCanvasNavigator.scss';

// Radial menu configuration
const RADIAL_RADIUS = 120;

// Action definitions
const MENU_ACTIONS = [
    {
        id: CELL_ACTIONS.MOVE,
        icon: 'move',
        label: 'Move',
        colorClass: 'teal',
    },
    {
        id: CELL_ACTIONS.DUPLICATE,
        icon: 'copy',
        label: 'Copy',
        colorClass: 'blue',
    },
    {
        id: CELL_ACTIONS.DELETE,
        icon: 'trash-2',
        label: 'Delete',
        colorClass: 'red',
    },
    {
        id: CELL_ACTIONS.SET_HOME,
        icon: 'home',
        label: 'Set Home',
        colorClass: 'amber',
    },
    {
        id: CELL_ACTIONS.NAVIGATE,
        icon: 'target',
        label: 'Go To',
        colorClass: 'green',
    },
    {
        id: CELL_ACTIONS.SPLIT,
        icon: 'scissors',
        label: 'Split',
        colorClass: 'purple',
    },
];

/**
 * VRCellContextMenu - Radial menu for cell actions
 */
export const VRCellContextMenu = memo(function VRCellContextMenu({
    isOpen,
    cell,
    position,
    onClose,
}) {
    const { handleContextAction } = useVRNavigator();

    if (!isOpen || !cell) return null;

    const angleStep = (2 * Math.PI) / MENU_ACTIONS.length;
    const startAngle = -Math.PI / 2; // Start at top

    return (
        <>
            {/* Backdrop */}
            <div className="vr-cell-context-menu__backdrop" onClick={onClose} />

            {/* Radial menu */}
            <div
                className="vr-cell-context-menu"
                style={{
                    left: position?.x || '50%',
                    top: position?.y || '50%',
                }}
            >
                {/* Center indicator */}
                <div className="vr-cell-context-menu__center">
                    <div
                        className="vr-cell-context-menu__center-dot"
                        style={{ background: cell?.color || '#60a5fa' }}
                    />
                    <span className="vr-cell-context-menu__center-coords">
                        [{cell?.row}, {cell?.col}]
                    </span>
                </div>

                {/* Action buttons */}
                {MENU_ACTIONS.map((action, index) => {
                    const angle = startAngle + index * angleStep;
                    const x = Math.cos(angle) * RADIAL_RADIUS;
                    const y = Math.sin(angle) * RADIAL_RADIUS;

                    return (
                        <button
                            key={action.id}
                            onClick={() => handleContextAction(action.id)}
                            className={`vr-cell-context-menu__action vr-cell-context-menu__action--${action.colorClass}`}
                            style={{
                                left: `calc(50% + ${x}px)`,
                                top: `calc(50% + ${y}px)`,
                            }}
                        >
                            <Icon name={action.icon} size={20} />
                            <span className="vr-cell-context-menu__action-label">
                                {action.label}
                            </span>
                        </button>
                    );
                })}

                {/* Cancel hint */}
                <div className="vr-cell-context-menu__hint">B to cancel</div>
            </div>
        </>
    );
});

/**
 * Portal component for context menu (used in VRCanvasNavigator)
 */
export const VRCellContextMenuPortal = memo(
    function VRCellContextMenuPortal() {
        const { contextMenu, cancelOperation } = useVRNavigator();

        return (
            <VRCellContextMenu
                isOpen={!!contextMenu}
                cell={contextMenu?.cell}
                position={contextMenu?.position}
                onClose={cancelOperation}
            />
        );
    }
);

export default VRCellContextMenu;
