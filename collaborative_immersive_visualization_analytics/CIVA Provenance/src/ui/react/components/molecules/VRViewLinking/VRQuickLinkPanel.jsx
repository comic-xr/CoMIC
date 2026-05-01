/**
 * @file VRQuickLinkPanel.jsx
 * @description VR-optimized panel for selecting link property and mode.
 * Appears after selecting a link target in VR.
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
    LINK_PROPERTIES,
    LINK_MODES,
} from '@UI/react/components/organisms/LinkManagerPanels/linkConstants';
import './VRViewLinking.scss';

// Ordered mode array for display
const MODES_ARRAY = [
    LINK_MODES.follow,
    LINK_MODES.sync,
    LINK_MODES.broadcast,
];

/**
 * VRQuickLinkPanel - Property and mode selection for VR
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is visible
 * @param {Object} props.sourceView - Source view { id, name, color }
 * @param {Object} props.targetView - Target view { id, name, color }
 * @param {Function} props.onConfirm - Called with (property, mode) when confirmed
 * @param {Function} props.onCancel - Called when cancelled
 */
export const VRQuickLinkPanel = memo(function VRQuickLinkPanel({
    isOpen,
    sourceView,
    targetView,
    onConfirm,
    onCancel,
}) {
    const [selectedProperty, setSelectedProperty] = useState('camera');
    const [selectedMode, setSelectedMode] = useState('sync');

    if (!isOpen || !sourceView || !targetView) return null;

    const handleConfirm = () => {
        onConfirm?.(selectedProperty, selectedMode);
    };

    return (
        <>
            {/* Backdrop */}
            <div className="vr-quick-link-panel__backdrop" onClick={onCancel} />

            {/* Panel */}
            <div className="vr-quick-link-panel">
                {/* Header */}
                <div className="vr-quick-link-panel__header">
                    <div className="vr-quick-link-panel__title">Create Link</div>
                    <div className="vr-quick-link-panel__views">
                        <span
                            className="vr-quick-link-panel__view-dot"
                            style={{ background: sourceView.color }}
                        />
                        <span className="vr-quick-link-panel__view-name">
                            {sourceView.name}
                        </span>
                        <Icon
                            name="arrowRight"
                            size={14}
                            className="vr-quick-link-panel__arrow"
                        />
                        <span
                            className="vr-quick-link-panel__view-dot"
                            style={{ background: targetView.color }}
                        />
                        <span className="vr-quick-link-panel__view-name">
                            {targetView.name}
                        </span>
                    </div>
                </div>

                {/* Property Selection */}
                <div className="vr-quick-link-panel__section">
                    <div className="vr-quick-link-panel__section-label">
                        What to Link
                    </div>
                    <div className="vr-quick-link-panel__property-grid">
                        {LINK_PROPERTIES.map((prop) => (
                            <button
                                key={prop.id}
                                onClick={() => setSelectedProperty(prop.id)}
                                className={`vr-quick-link-panel__property-btn ${
                                    selectedProperty === prop.id
                                        ? 'vr-quick-link-panel__property-btn--selected'
                                        : ''
                                }`}
                                style={{
                                    '--property-color': prop.colorHex,
                                }}
                            >
                                <Icon name={prop.icon} size={20} />
                                <span className="vr-quick-link-panel__property-label">
                                    {prop.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode Selection */}
                <div className="vr-quick-link-panel__section">
                    <div className="vr-quick-link-panel__section-label">
                        Link Mode
                    </div>
                    <div className="vr-quick-link-panel__mode-row">
                        {MODES_ARRAY.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`vr-quick-link-panel__mode-btn ${
                                    selectedMode === mode.id
                                        ? 'vr-quick-link-panel__mode-btn--selected'
                                        : ''
                                }`}
                            >
                                <span className="vr-quick-link-panel__mode-icon">
                                    {mode.iconChar}
                                </span>
                                <span className="vr-quick-link-panel__mode-label">
                                    {mode.label}
                                </span>
                                <span className="vr-quick-link-panel__mode-desc">
                                    {mode.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="vr-quick-link-panel__actions">
                    <button
                        onClick={onCancel}
                        className="vr-quick-link-panel__btn vr-quick-link-panel__btn--cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="vr-quick-link-panel__btn vr-quick-link-panel__btn--confirm"
                    >
                        Create Link
                    </button>
                </div>

                {/* Controller hints */}
                <div className="vr-quick-link-panel__hints">
                    <span>A: Confirm</span>
                    <span>B: Cancel</span>
                </div>
            </div>
        </>
    );
});

export default VRQuickLinkPanel;
