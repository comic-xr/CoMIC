/**
 * @file SettingsTab.stories.jsx
 * @description Storybook stories for SettingsTab component.
 */

import React from 'react';
import { SettingsTab } from './SettingsTab';

const mockProject = {
    id: 'project-1',
    name: 'CIA Web Project',
    description: 'Collaborative Intelligence Analysis Platform',
    createdAt: '2024-01-15T10:00:00Z',
    memberCount: 12,
    roomCount: 4,
    storageUsed: '2.4 GB',
    owner: {
        id: 'user-1',
        name: 'Alice Chen',
    },
};

const mockPreferences = {
    notifications: {
        mentions: true,
        directMessages: true,
        roomUpdates: false,
        recordingAlerts: true,
    },
    cursors: {
        showMyCursor: true,
        showOtherCursors: true,
        cursorNameLabels: true,
    },
    display: {
        compactMode: false,
        showAvatars: true,
        showStatusMessages: true,
    },
    audio: {
        muteOnJoin: false,
        pushToTalk: false,
        echoCancellation: true,
    },
};

const mockRoleConfig = {
    id: 'owner',
    label: 'Owner',
    canManageMembers: true,
    canManageRoles: true,
    canManageSettings: true,
    canDelete: true,
    canTransfer: true,
};

export default {
    title: 'Panels/RightPanel/SettingsTab',
    component: SettingsTab,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: 320,
                height: 600,
                background: 'var(--color-bg-secondary, #1e1e1e)',
                borderRadius: 8,
                overflow: 'hidden',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const AsOwner = {
    args: {
        workspaceId: 'ws-1',
        project: mockProject,
        userRole: 'owner',
        roleConfig: mockRoleConfig,
        isAdmin: true,
        isOwner: true,
        preferences: mockPreferences,
        updatePreferences: (section, key, value) => console.log('Update:', section, key, value),
        loading: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'Settings tab as project owner, showing all sections including admin and danger zone.',
            },
        },
    },
};

export const AsAdmin = {
    args: {
        workspaceId: 'ws-1',
        project: mockProject,
        userRole: 'admin',
        roleConfig: {
            ...mockRoleConfig,
            id: 'admin',
            label: 'Admin',
            canDelete: false,
            canTransfer: false,
        },
        isAdmin: true,
        isOwner: false,
        preferences: mockPreferences,
        updatePreferences: (section, key, value) => console.log('Update:', section, key, value),
        loading: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'Settings tab as admin, showing admin settings but no danger zone.',
            },
        },
    },
};

export const AsMember = {
    args: {
        workspaceId: 'ws-1',
        project: mockProject,
        userRole: 'member',
        roleConfig: {
            id: 'member',
            label: 'Member',
            canManageMembers: false,
            canManageRoles: false,
            canManageSettings: false,
            canDelete: false,
            canTransfer: false,
        },
        isAdmin: false,
        isOwner: false,
        preferences: mockPreferences,
        updatePreferences: (section, key, value) => console.log('Update:', section, key, value),
        loading: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'Settings tab as regular member, showing only preferences and project info.',
            },
        },
    },
};

export const Loading = {
    args: {
        workspaceId: 'ws-1',
        project: null,
        userRole: 'member',
        roleConfig: null,
        isAdmin: false,
        isOwner: false,
        preferences: {},
        updatePreferences: () => { },
        loading: true,
    },
    parameters: {
        docs: {
            description: {
                story: 'Settings tab in loading state.',
            },
        },
    },
};

export const CompactPreferences = {
    args: {
        workspaceId: 'ws-1',
        project: mockProject,
        userRole: 'member',
        roleConfig: {
            id: 'member',
            label: 'Member',
            canManageMembers: false,
            canManageRoles: false,
            canManageSettings: false,
            canDelete: false,
            canTransfer: false,
        },
        isAdmin: false,
        isOwner: false,
        preferences: {
            ...mockPreferences,
            display: {
                ...mockPreferences.display,
                compactMode: true,
            },
        },
        updatePreferences: (section, key, value) => console.log('Update:', section, key, value),
        loading: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'Settings with compact mode enabled.',
            },
        },
    },
};