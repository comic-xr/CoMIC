/**
 * @file VRPanelArrangementControls.jsx
 * @description Global controls for arranging multiple VR panels.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRPanels } from './VRPanelContext';
import './VRFloatingPanel.scss';

/**
 * VRPanelArrangementControls - Controls for arranging all panels
 */
export const VRPanelArrangementControls = memo(
    function VRPanelArrangementControls() {
        const { arrangementMode, arrangeDashboard, stackPanels, vrPanelStates } =
            useVRPanels();

        const panelCount = vrPanelStates.size;

        // Only show when multiple panels exist
        if (panelCount < 2) return null;

        return (
            <div className="vr-panel-arrangement">
                <span className="vr-panel-arrangement__count">
                    {panelCount} panels
                </span>

                <button
                    onClick={arrangeDashboard}
                    className={`vr-panel-arrangement__btn ${
                        arrangementMode === 'dashboard'
                            ? 'vr-panel-arrangement__btn--active'
                            : ''
                    }`}
                    title="Arrange as dashboard"
                >
                    <Icon name="dashboard" size={14} />
                    <span>Dashboard</span>
                </button>

                <button
                    onClick={stackPanels}
                    className={`vr-panel-arrangement__btn ${
                        arrangementMode === 'stacked'
                            ? 'vr-panel-arrangement__btn--active'
                            : ''
                    }`}
                    title="Stack at center"
                >
                    <Icon name="layers" size={14} />
                    <span>Stack</span>
                </button>
            </div>
        );
    }
);

export default VRPanelArrangementControls;
