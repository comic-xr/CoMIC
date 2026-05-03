/**
 * @file SettingsTab.jsx
 * @description Settings tab for the right panel.
 * Displays user preferences, project info, admin settings, and danger zone.
 *
 * @example
 * <SettingsTab workspaceId="ws-1" projectId="project-1" />
 */

import React, { useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SectionNavGroup } from '@UI/react/components/organisms';
import { useSettingsTab } from './hooks/useSettingsTab';
import { YourPreferences } from './sections/YourPreferences';
import { VRSettings } from './sections/VRSettings';
import { ProjectInfo } from './sections/ProjectInfo';
import { AdminSettings } from './sections/AdminSettings';
import { DangerZone } from './sections/DangerZone';
import './SettingsTab.scss';

/**
 * @typedef {Object} SettingsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {string} [projectId] - Current project ID
 */

/**
 * Settings tab panel content component.
 * Headless wrapper for SettingsTab that manages its own state.
 *
 * @param {SettingsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered panel content
 */
export function SettingsPanelContent({ workspaceId, projectId }) {
    const settingsState = useSettingsTab(projectId);
    return <SettingsTab {...settingsState} workspaceId={workspaceId} />;
}

/**
 * @typedef {Object} SettingsTabInternalProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {Object} project - Project data
 * @property {string} userRole - Current user's role
 * @property {Object} roleConfig - Role configuration
 * @property {boolean} isAdmin - Whether user is admin or owner
 * @property {boolean} isOwner - Whether user is owner
 * @property {Object} preferences - User preferences
 * @property {Function} updatePreferences - Preference update handler
 * @property {boolean} loading - Loading state
 */

/**
 * Settings tab component.
 * Displays settings sections based on user role.
 *
 * @param {SettingsTabInternalProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function SettingsTab({
    workspaceId,
    project,
    userRole,
    roleConfig,
    isAdmin,
    isOwner,
    preferences,
    updatePreferences,
    loading,
}) {
    // Build sections array with conditional admin/danger sections
    const settingsSections = useMemo(() => {
        const sections = [
            {
                id: 'preferences',
                icon: 'user',
                label: 'Your Preferences',
                color: '#60a5fa', // blue
                content: (
                    <YourPreferences
                        preferences={preferences}
                        onChange={updatePreferences}
                    />
                ),
            },
            {
                id: 'vr',
                icon: 'vrPano',
                label: 'VR Settings',
                color: '#c084fc', // purple
                content: <VRSettings />,
            },
            {
                id: 'project',
                icon: 'building',
                label: 'Project Info',
                color: '#7dd3fc', // teal
                content: <ProjectInfo project={project} />,
            },
        ];

        if (isAdmin) {
            sections.push({
                id: 'admin',
                icon: 'settings',
                label: 'Admin Settings',
                color: '#fbbf24', // amber
                content: (
                    <AdminSettings
                        project={project}
                        roleConfig={roleConfig}
                    />
                ),
            });
        }

        if (isOwner) {
            sections.push({
                id: 'danger',
                icon: 'alertTriangle',
                label: 'Danger Zone',
                color: '#f87171', // red
                content: <DangerZone project={project} />,
            });
        }

        return sections;
    }, [preferences, updatePreferences, project, roleConfig, isAdmin, isOwner]);

    if (loading) {
        return (
            <div className="settings-tab settings-tab--loading">
                <div className="panel-header panel-header--indigo">
                    <Icon name="settings" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Settings</span>
                </div>
                <div className="settings-tab__loader">
                    <Icon name="loader" size={24} className="spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="settings-tab">
            {/* Panel Header */}
            <div className="panel-header panel-header--indigo">
                <Icon name="settings" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Settings</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">{userRole}</span>
            </div>

            {/* Section Navigation */}
            <div className="settings-tab__sections">
                <SectionNavGroup
                    sections={settingsSections}
                    defaultSectionId="preferences"
                    size="sm"
                />
            </div>
        </div>
    );
}

export default SettingsTab;