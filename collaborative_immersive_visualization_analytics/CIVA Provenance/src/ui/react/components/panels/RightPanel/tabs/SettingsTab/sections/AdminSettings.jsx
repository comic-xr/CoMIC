/**
 * @file AdminSettings.jsx
 * @description Admin-only settings section.
 * Handles member management, roles, and project policies.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import '../SettingsTab.scss';

/**
 * Toggle switch component
 */
function ToggleSwitch({ checked, onChange, label, description }) {
    return (
        <label className="settings-tab__toggle">
            <div className="settings-tab__toggle-info">
                <span className="settings-tab__toggle-label">{label}</span>
                {description && (
                    <span className="settings-tab__toggle-desc">{description}</span>
                )}
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="settings-tab__toggle-switch" />
        </label>
    );
}

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
 * @typedef {Object} AdminSettingsProps
 * @property {string} projectId - Project ID
 */

/**
 * Admin Settings section component.
 * Only visible to admin and owner roles.
 *
 * @param {AdminSettingsProps} props - Component props
 * @returns {React.ReactElement} The rendered section
 */
export function AdminSettings({ projectId }) {
    // Local state for admin settings
    const [settings, setSettings] = useState({
        // Member management
        allowSelfJoin: false,
        requireApproval: true,
        allowGuestAccess: false,

        // Recording
        allowMemberRecording: true,
        autoSaveRecordings: true,
        recordingNotifications: true,

        // Security
        requireMFA: false,
        sessionTimeout: true,
        auditLogging: true,
    });

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        // TODO: Persist to API
    };

    return (
        <div className="settings-tab__section">
            {/* Member Management */}
            <SettingsGroup icon="users" title="Member Management">
                <ToggleSwitch
                    label="Allow Self-Join"
                    description="Users can join with project link"
                    checked={settings.allowSelfJoin}
                    onChange={(v) => updateSetting('allowSelfJoin', v)}
                />
                <ToggleSwitch
                    label="Require Approval"
                    description="New members need admin approval"
                    checked={settings.requireApproval}
                    onChange={(v) => updateSetting('requireApproval', v)}
                />
                <ToggleSwitch
                    label="Allow Guest Access"
                    description="Temporary access without account"
                    checked={settings.allowGuestAccess}
                    onChange={(v) => updateSetting('allowGuestAccess', v)}
                />
                <div className="settings-tab__action-row">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="userPlus"
                    >
                        Invite Members
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="users"
                    >
                        Manage Members
                    </Button>
                </div>
            </SettingsGroup>

            {/* Recording Policy */}
            <SettingsGroup icon="video" title="Recording Policy">
                <ToggleSwitch
                    label="Allow Member Recording"
                    description="Members can start recordings"
                    checked={settings.allowMemberRecording}
                    onChange={(v) => updateSetting('allowMemberRecording', v)}
                />
                <ToggleSwitch
                    label="Auto-Save Recordings"
                    description="Automatically save to project storage"
                    checked={settings.autoSaveRecordings}
                    onChange={(v) => updateSetting('autoSaveRecordings', v)}
                />
                <ToggleSwitch
                    label="Recording Notifications"
                    description="Alert all users when recording starts"
                    checked={settings.recordingNotifications}
                    onChange={(v) => updateSetting('recordingNotifications', v)}
                />
            </SettingsGroup>

            {/* Security */}
            <SettingsGroup icon="lock" title="Security">
                <ToggleSwitch
                    label="Require MFA"
                    description="Members must use two-factor auth"
                    checked={settings.requireMFA}
                    onChange={(v) => updateSetting('requireMFA', v)}
                />
                <ToggleSwitch
                    label="Session Timeout"
                    description="Auto-logout after inactivity"
                    checked={settings.sessionTimeout}
                    onChange={(v) => updateSetting('sessionTimeout', v)}
                />
                <ToggleSwitch
                    label="Audit Logging"
                    description="Log all member actions"
                    checked={settings.auditLogging}
                    onChange={(v) => updateSetting('auditLogging', v)}
                />
            </SettingsGroup>

            {/* Roles & Permissions */}
            <SettingsGroup icon="shield" title="Roles & Permissions">
                <div className="settings-tab__roles-info">
                    <p>Configure custom roles and permissions for project members.</p>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="shield"
                    >
                        Manage Roles
                    </Button>
                </div>
            </SettingsGroup>
        </div>
    );
}

export default AdminSettings;