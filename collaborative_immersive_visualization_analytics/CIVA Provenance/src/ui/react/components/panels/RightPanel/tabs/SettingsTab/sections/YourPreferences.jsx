/**
 * @file YourPreferences.jsx
 * @description Personal preferences section for the Settings tab.
 * Allows users to customize notifications, cursors, and display settings.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
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
 * @typedef {Object} YourPreferencesProps
 * @property {Object} preferences - Current preferences
 * @property {(section: string, key: string, value: any) => void} onChange - Change handler
 */

/**
 * Your Preferences section component.
 *
 * @param {YourPreferencesProps} props - Component props
 * @returns {React.ReactElement} The rendered section
 */
export function YourPreferences({ preferences, onChange }) {
    const { notifications, cursors, display, audio } = preferences;

    return (
        <div className="settings-tab__section">
            {/* Notifications */}
            <SettingsGroup icon="bell" title="Notifications">
                <ToggleSwitch
                    label="Mentions"
                    description="Notify when someone mentions you"
                    checked={notifications.mentions}
                    onChange={(v) => onChange('notifications', 'mentions', v)}
                />
                <ToggleSwitch
                    label="Direct Messages"
                    description="Notify for new direct messages"
                    checked={notifications.directMessages}
                    onChange={(v) => onChange('notifications', 'directMessages', v)}
                />
                <ToggleSwitch
                    label="Room Updates"
                    description="Notify when room status changes"
                    checked={notifications.roomUpdates}
                    onChange={(v) => onChange('notifications', 'roomUpdates', v)}
                />
                <ToggleSwitch
                    label="Recording Alerts"
                    description="Notify when recording starts/stops"
                    checked={notifications.recordingAlerts}
                    onChange={(v) => onChange('notifications', 'recordingAlerts', v)}
                />
            </SettingsGroup>

            {/* Cursors */}
            <SettingsGroup icon="mousePointer" title="Cursors">
                <ToggleSwitch
                    label="Show My Cursor"
                    description="Let others see your cursor position"
                    checked={cursors.showMyCursor}
                    onChange={(v) => onChange('cursors', 'showMyCursor', v)}
                />
                <ToggleSwitch
                    label="Show Other Cursors"
                    description="See other users' cursor positions"
                    checked={cursors.showOtherCursors}
                    onChange={(v) => onChange('cursors', 'showOtherCursors', v)}
                />
                <ToggleSwitch
                    label="Cursor Name Labels"
                    description="Show names next to cursors"
                    checked={cursors.cursorNameLabels}
                    onChange={(v) => onChange('cursors', 'cursorNameLabels', v)}
                />
            </SettingsGroup>

            {/* Display */}
            <SettingsGroup icon="eye" title="Display">
                <ToggleSwitch
                    label="Compact Mode"
                    description="Use smaller UI elements"
                    checked={display.compactMode}
                    onChange={(v) => onChange('display', 'compactMode', v)}
                />
                <ToggleSwitch
                    label="Show Avatars"
                    description="Display user avatars in lists"
                    checked={display.showAvatars}
                    onChange={(v) => onChange('display', 'showAvatars', v)}
                />
                <ToggleSwitch
                    label="Show Status Messages"
                    description="Display custom status messages"
                    checked={display.showStatusMessages}
                    onChange={(v) => onChange('display', 'showStatusMessages', v)}
                />
            </SettingsGroup>

            {/* Audio */}
            <SettingsGroup icon="headphones" title="Audio">
                <ToggleSwitch
                    label="Mute on Join"
                    description="Start muted when joining voice"
                    checked={audio.muteOnJoin}
                    onChange={(v) => onChange('audio', 'muteOnJoin', v)}
                />
                <ToggleSwitch
                    label="Push to Talk"
                    description="Hold key to transmit audio"
                    checked={audio.pushToTalk}
                    onChange={(v) => onChange('audio', 'pushToTalk', v)}
                />
                <ToggleSwitch
                    label="Echo Cancellation"
                    description="Reduce audio feedback"
                    checked={audio.echoCancellation}
                    onChange={(v) => onChange('audio', 'echoCancellation', v)}
                />
            </SettingsGroup>
        </div>
    );
}

export default YourPreferences;