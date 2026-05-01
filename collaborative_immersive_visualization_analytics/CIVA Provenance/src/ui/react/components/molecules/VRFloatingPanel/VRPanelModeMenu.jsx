/**
 * @file VRPanelModeMenu.jsx
 * @description Mode selection menu for VR floating panels.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VR_PANEL_MODES } from './VRPanelContext';
import './VRFloatingPanel.scss';

const MODES = [
    {
        id: VR_PANEL_MODES.HUD,
        icon: 'eye',
        label: 'HUD Mode',
        desc: 'Follows your view',
    },
    {
        id: VR_PANEL_MODES.WORLD,
        icon: 'globe',
        label: 'World Mode',
        desc: 'Fixed in space',
    },
    {
        id: VR_PANEL_MODES.HAND,
        icon: 'pan',
        label: 'Hand Mode',
        desc: 'Near your controller',
    },
    {
        id: VR_PANEL_MODES.DASHBOARD,
        icon: 'dashboard',
        label: 'Dashboard',
        desc: 'Curved arrangement',
    },
];

/**
 * VRPanelModeMenu - Mode selection dropdown
 */
export const VRPanelModeMenu = memo(function VRPanelModeMenu({
    currentMode,
    onSelect,
    onClose,
}) {
    return (
        <>
            {/* Backdrop */}
            <div className="vr-panel-menu__backdrop" onClick={onClose} />

            {/* Menu */}
            <div className="vr-panel-menu vr-panel-mode-menu">
                <div className="vr-panel-menu__header">Panel Mode</div>

                {MODES.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onSelect(mode.id)}
                        className={`vr-panel-menu__item ${
                            currentMode === mode.id
                                ? 'vr-panel-menu__item--selected'
                                : ''
                        }`}
                    >
                        <Icon name={mode.icon} size={18} />
                        <div className="vr-panel-menu__item-info">
                            <div className="vr-panel-menu__item-label">
                                {mode.label}
                            </div>
                            <div className="vr-panel-menu__item-desc">
                                {mode.desc}
                            </div>
                        </div>
                    </button>
                ))}

                <div className="vr-panel-menu__footer">
                    Grip + move to reposition
                </div>
            </div>
        </>
    );
});

export default VRPanelModeMenu;
