/**
 * VRAccessibilityPanel
 * Location: src/ui/react/components/panels/VRAccessibilityPanel/VRAccessibilityPanel.jsx
 *
 * VR Accessibility Settings panel for configuring movement, panels, visual,
 * audio, and input preferences for VR mode.
 *
 * Access points:
 * - Desktop: Settings → VR → Accessibility
 * - VR Wrist Menu: Center Hub → Accessibility
 * - VR Panel: Settings Panel → Accessibility Tab
 *
 * @module VRAccessibilityPanel
 */

import React, { useState, useCallback } from 'react';
import { Modal } from '@UI/react/components/modals/Modal';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVRAccessibility } from '@UI/react/context/VRAccessibilityContext';
import { MovementTab } from './tabs/MovementTab';
import { PanelsTab } from './tabs/PanelsTab';
import { VisualTab } from './tabs/VisualTab';
import { AudioTab } from './tabs/AudioTab';
import { InputTab } from './tabs/InputTab';
import './VRAccessibilityPanel.scss';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

const TABS = [
    { id: 'movement', label: 'Movement', icon: 'move' },
    { id: 'panels', label: 'Panels', icon: 'layout' },
    { id: 'visual', label: 'Visual', icon: 'eye' },
    { id: 'audio', label: 'Audio', icon: 'volume-2' },
    { id: 'input', label: 'Input', icon: 'hand' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * VRAccessibilityPanel - Modal panel for VR accessibility settings
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether panel is visible
 * @param {Function} props.onClose - Close handler
 */
export function VRAccessibilityPanel({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('movement');
    const {
        hasUnsavedChanges,
        saveSettings,
        revertSettings,
        resetToDefaults,
    } = useVRAccessibility();

    // Handle close - prompt if unsaved changes
    const handleClose = useCallback(() => {
        if (hasUnsavedChanges) {
            // Revert changes on close without saving
            revertSettings();
        }
        onClose();
    }, [hasUnsavedChanges, revertSettings, onClose]);

    // Handle apply
    const handleApply = useCallback(() => {
        saveSettings();
        onClose();
    }, [saveSettings, onClose]);

    // Handle reset to defaults
    const handleResetDefaults = useCallback(() => {
        if (window.confirm('Reset all VR accessibility settings to defaults? This cannot be undone.')) {
            resetToDefaults();
        }
    }, [resetToDefaults]);

    // Render active tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'movement':
                return <MovementTab />;
            case 'panels':
                return <PanelsTab />;
            case 'visual':
                return <VisualTab />;
            case 'audio':
                return <AudioTab />;
            case 'input':
                return <InputTab />;
            default:
                return null;
        }
    };

    // Footer with actions
    const footer = (
        <div className="vr-accessibility-panel__footer">
            <button
                type="button"
                className="btn btn--ghost"
                onClick={handleResetDefaults}
            >
                Reset to Defaults
            </button>
            <div className="vr-accessibility-panel__footer-actions">
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleClose}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleApply}
                    disabled={!hasUnsavedChanges}
                >
                    Apply
                </button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="VR Accessibility"
            icon="settings"
            severity="info"
            size="lg"
            closeOnBackdrop={false}
            footer={footer}
            testId="vr-accessibility-panel"
        >
            <div className="vr-accessibility-panel">
                {/* Tab Navigation */}
                <div className="vr-accessibility-panel__tabs" role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`vr-accessibility-${tab.id}`}
                            className={`vr-accessibility-panel__tab ${activeTab === tab.id ? 'vr-accessibility-panel__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon name={tab.icon} size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div
                    className="vr-accessibility-panel__content"
                    role="tabpanel"
                    id={`vr-accessibility-${activeTab}`}
                    aria-labelledby={`tab-${activeTab}`}
                >
                    {renderTabContent()}
                </div>
            </div>
        </Modal>
    );
}

export default VRAccessibilityPanel;
