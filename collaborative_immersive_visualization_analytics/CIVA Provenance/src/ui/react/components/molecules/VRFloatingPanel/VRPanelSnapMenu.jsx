/**
 * @file VRPanelSnapMenu.jsx
 * @description Snap position selection menu for VR floating panels.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './VRFloatingPanel.scss';

const SNAP_GROUPS = [
    {
        label: 'HUD Positions',
        snaps: [
            { id: 'HUD_CENTER', label: 'Center', icon: 'target' },
            { id: 'HUD_LEFT', label: 'Left', icon: 'arrowLeft' },
            { id: 'HUD_RIGHT', label: 'Right', icon: 'arrowRight' },
            { id: 'HUD_TOP', label: 'Top', icon: 'arrowUp' },
            { id: 'HUD_BOTTOM', label: 'Bottom', icon: 'arrowDown' },
        ],
    },
    {
        label: 'Hand Positions',
        snaps: [
            { id: 'LEFT_WRIST', label: 'Left Wrist', icon: 'pan' },
            { id: 'RIGHT_WRIST', label: 'Right Wrist', icon: 'pan' },
        ],
    },
    {
        label: 'Dashboard',
        snaps: [
            { id: 'DASHBOARD_LEFT', label: 'Left Arc', icon: 'cornerDownLeft' },
            { id: 'DASHBOARD_CENTER', label: 'Center Arc', icon: 'arrowDown' },
            { id: 'DASHBOARD_RIGHT', label: 'Right Arc', icon: 'cornerDownRight' },
        ],
    },
];

/**
 * VRPanelSnapMenu - Snap position selection dropdown
 */
export const VRPanelSnapMenu = memo(function VRPanelSnapMenu({
    currentSnap,
    onSelect,
    onClose,
}) {
    return (
        <>
            {/* Backdrop */}
            <div className="vr-panel-menu__backdrop" onClick={onClose} />

            {/* Menu */}
            <div className="vr-panel-menu vr-panel-snap-menu">
                <div className="vr-panel-menu__header">Snap to Position</div>

                {SNAP_GROUPS.map((group) => (
                    <div key={group.label} className="vr-panel-snap-menu__group">
                        <div className="vr-panel-snap-menu__group-label">
                            {group.label}
                        </div>
                        <div className="vr-panel-snap-menu__grid">
                            {group.snaps.map((snap) => (
                                <button
                                    key={snap.id}
                                    onClick={() => onSelect(snap.id)}
                                    className={`vr-panel-snap-menu__btn ${
                                        currentSnap === snap.id
                                            ? 'vr-panel-snap-menu__btn--selected'
                                            : ''
                                    }`}
                                >
                                    <Icon name={snap.icon} size={16} />
                                    <span>{snap.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
});

export default VRPanelSnapMenu;
