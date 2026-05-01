/**
 * @file VRSettings.jsx
 * @description VR settings section for the Settings tab.
 * Provides access to VR accessibility settings panel.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VRAccessibilityPanel } from '@UI/react/components/panels/VRAccessibilityPanel';
import { useVRAccessibility } from '@UI/react/context/VRAccessibilityContext';
import '../SettingsTab.scss';

/**
 * Settings group with icon header
 */
function SettingsGroup({ icon: iconName, title, children }) {
    return (
        <div className="settings-tab__group">
            <div className="settings-tab__group-header">
                <Icon name={iconName} size={12} />
                <span>{title}</span>
            </div>
            <div className="settings-tab__group-content">
                {children}
            </div>
        </div>
    );
}

/**
 * Settings button item
 */
function SettingsButton({ icon, label, description, onClick }) {
    return (
        <button
            type="button"
            className="settings-tab__button-item"
            onClick={onClick}
        >
            <div className="settings-tab__button-info">
                <span className="settings-tab__button-label">{label}</span>
                {description && (
                    <span className="settings-tab__button-desc">{description}</span>
                )}
            </div>
            <Icon name="chevronRight" size={14} className="settings-tab__button-arrow" />
        </button>
    );
}

/**
 * VR Settings section component.
 *
 * @returns {React.ReactElement} The rendered section
 */
export function VRSettings() {
    const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
    const { settings } = useVRAccessibility();

    // Get summary of current settings
    const getMovementSummary = () => {
        const parts = [];
        if (settings.movement.snapTurn !== 'off') {
            parts.push(`Snap ${settings.movement.snapTurn}°`);
        }
        if (settings.movement.smoothTurn.enabled) {
            parts.push('Smooth turn');
        }
        if (settings.movement.teleport.style !== 'instant') {
            parts.push('Teleport fade');
        }
        return parts.length > 0 ? parts.join(', ') : 'Default';
    };

    return (
        <div className="settings-tab__section">
            {/* VR Accessibility */}
            <SettingsGroup icon="vrHeadset" title="VR Experience">
                <SettingsButton
                    icon="accessibility"
                    label="VR Accessibility"
                    description="Movement, panels, visual, audio, and input settings"
                    onClick={() => setIsAccessibilityOpen(true)}
                />

                {/* Quick summary of current settings */}
                <div className="settings-tab__summary">
                    <div className="settings-tab__summary-row">
                        <span className="settings-tab__summary-label">Movement</span>
                        <span className="settings-tab__summary-value">{getMovementSummary()}</span>
                    </div>
                    <div className="settings-tab__summary-row">
                        <span className="settings-tab__summary-label">UI Scale</span>
                        <span className="settings-tab__summary-value">{settings.visual.uiScale}x</span>
                    </div>
                    <div className="settings-tab__summary-row">
                        <span className="settings-tab__summary-label">Dominant Hand</span>
                        <span className="settings-tab__summary-value" style={{ textTransform: 'capitalize' }}>
                            {settings.input.dominantHand}
                        </span>
                    </div>
                </div>
            </SettingsGroup>

            {/* VR Accessibility Panel Modal */}
            <VRAccessibilityPanel
                isOpen={isAccessibilityOpen}
                onClose={() => setIsAccessibilityOpen(false)}
            />
        </div>
    );
}

export default VRSettings;
