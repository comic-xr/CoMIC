/**
 * @file ActivityTab.stories.jsx
 * @description Storybook stories for ActivityTab component.
 */

import React from 'react';
import { ActivityTab } from './ActivityTab';

// Mock activities for stories
const mockActivities = [
    {
        id: 'act-1',
        type: 'view',
        action: 'opened',
        target: 'MRI Scan View',
        user: { name: 'Dr. Smith', color: '#fb7185' },
        timestamp: Date.now() - 60000,
    },
    {
        id: 'act-2',
        type: 'annotation',
        action: 'created annotation on',
        target: 'Tumor Region',
        user: { name: 'Alice Chen', color: '#60a5fa' },
        timestamp: Date.now() - 120000,
    },
    {
        id: 'act-3',
        type: 'dataset',
        action: 'uploaded',
        target: 'patient_scan_2024.nii',
        user: { name: 'Dr. Jones', color: '#fbbf24' },
        timestamp: Date.now() - 180000,
    },
    {
        id: 'act-4',
        type: 'join',
        action: 'joined the session',
        target: null,
        user: { name: 'Bob Wilson', color: '#c084fc' },
        timestamp: Date.now() - 240000,
    },
    {
        id: 'act-5',
        type: 'system',
        action: 'Session recording started',
        target: null,
        user: null,
        timestamp: Date.now() - 300000,
    },
    {
        id: 'act-6',
        type: 'share',
        action: 'shared bookmark',
        target: 'Critical Finding #1',
        user: { name: 'Dr. Smith', color: '#fb7185' },
        timestamp: Date.now() - 360000,
    },
    {
        id: 'act-7',
        type: 'edit',
        action: 'modified',
        target: 'Measurement Note',
        user: { name: 'Alice Chen', color: '#60a5fa' },
        timestamp: Date.now() - 420000,
    },
];

export default {
    title: 'Panels/RightPanel/ActivityTab',
    component: ActivityTab,
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

export const Default = {
    args: {
        workspaceId: 'ws-1',
        activities: mockActivities,
    },
    parameters: {
        docs: {
            description: {
                story: 'Default activity tab showing all recent activities.',
            },
        },
    },
};

export const AllActivity = {
    args: {
        workspaceId: 'ws-1',
        activities: mockActivities,
    },
    parameters: {
        docs: {
            description: {
                story: 'Activity feed with all activity types visible.',
            },
        },
    },
};

export const FilteredByViews = {
    args: {
        workspaceId: 'ws-1',
        activities: mockActivities.filter(a => a.type === 'view'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Activity filtered to show only view-related actions.',
            },
        },
    },
};

export const FilteredByDatasets = {
    args: {
        workspaceId: 'ws-1',
        activities: mockActivities.filter(a => a.type === 'dataset'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Activity filtered to show only dataset-related actions.',
            },
        },
    },
};

export const FilteredByAnnotations = {
    args: {
        workspaceId: 'ws-1',
        activities: mockActivities.filter(a => a.type === 'annotation'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Activity filtered to show only annotation actions.',
            },
        },
    },
};

export const SystemEventsOnly = {
    args: {
        workspaceId: 'ws-1',
        activities: mockActivities.filter(a => a.type === 'system' || a.type === 'join'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Activity filtered to show only system events and user joins.',
            },
        },
    },
};

export const EmptyActivity = {
    args: {
        workspaceId: 'ws-1',
        activities: [],
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty state when no activity has occurred yet.',
            },
        },
    },
};

export const BusySession = {
    args: {
        workspaceId: 'ws-1',
        activities: [
            ...mockActivities,
            ...mockActivities.map((a, i) => ({ ...a, id: `act-extra-${i}` })),
        ],
    },
    parameters: {
        docs: {
            description: {
                story: 'Busy session with many activities demonstrating scrolling.',
            },
        },
    },
};