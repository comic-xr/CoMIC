/**
 * @file PeopleTab.stories.jsx
 * @description Storybook stories for PeopleTab component.
 */

import React from 'react';
import { PeopleTab } from './PeopleTab';

export default {
    title: 'Panels/RightPanel/PeopleTab',
    component: PeopleTab,
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
        roomId: 'room-1',
    },
};

export const RoomSubtab = {
    args: {
        workspaceId: 'ws-1',
        roomId: 'room-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Room subtab showing users in the current room, grouped by voice status.',
            },
        },
    },
};

export const BreakoutSubtab = {
    args: {
        workspaceId: 'ws-1',
        roomId: 'room-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Breakout subtab showing users viewing the current workspace with cursor settings.',
            },
        },
    },
};

export const ProjectSubtab = {
    args: {
        workspaceId: 'ws-1',
        roomId: 'room-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Project subtab showing all project members grouped by room.',
            },
        },
    },
};

export const NoUsersOnline = {
    args: {
        workspaceId: 'empty-ws',
        roomId: 'empty-room',
    },
    parameters: {
        docs: {
            description: {
                story: 'State when no users are online in the room.',
            },
        },
    },
};

export const ManyUsers = {
    args: {
        workspaceId: 'busy-ws',
        roomId: 'busy-room',
    },
    parameters: {
        docs: {
            description: {
                story: 'State with many users in the room.',
            },
        },
    },
};

export const WithSearch = {
    args: {
        workspaceId: 'ws-1',
        roomId: 'room-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows search functionality for filtering users.',
            },
        },
    },
};