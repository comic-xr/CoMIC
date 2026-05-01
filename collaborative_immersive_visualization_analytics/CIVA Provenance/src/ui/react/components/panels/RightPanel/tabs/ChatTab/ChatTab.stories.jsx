/**
 * @file ChatTab.stories.jsx
 * @description Storybook stories for ChatTab component.
 */

import React from 'react';
import { ChatTab } from './ChatTab';

// Mock messages for stories
const mockMessages = [
    {
        id: 'msg-1',
        userId: 'user-1',
        userName: 'Dr. Smith',
        userColor: '#fb7185',
        text: 'Just finished reviewing the tumor boundaries. The margins look adequate.',
        timestamp: Date.now() - 300000,
        isSystem: false,
    },
    {
        id: 'msg-2',
        userId: 'user-2',
        userName: 'Alice Chen',
        userColor: '#60a5fa',
        text: 'Agreed. I measured 2.3cm clearance on the lateral aspect.',
        timestamp: Date.now() - 240000,
        isSystem: false,
    },
    {
        id: 'msg-3',
        userId: 'current',
        userName: 'You',
        userColor: '#2dd4bf',
        text: 'Should we annotate the critical structures before the team meeting?',
        timestamp: Date.now() - 180000,
        isSystem: false,
    },
    {
        id: 'msg-4',
        userId: 'system',
        userName: 'System',
        userColor: '#888',
        text: 'Dr. Jones joined the room',
        timestamp: Date.now() - 120000,
        isSystem: true,
    },
    {
        id: 'msg-5',
        userId: 'user-3',
        userName: 'Dr. Jones',
        userColor: '#fbbf24',
        text: 'Hi everyone! Just catching up on the discussion.',
        timestamp: Date.now() - 60000,
        isSystem: false,
    },
];

export default {
    title: 'Panels/RightPanel/ChatTab',
    component: ChatTab,
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
    },
    parameters: {
        docs: {
            description: {
                story: 'Default chat tab with Y.js sync enabled.',
            },
        },
    },
};

export const WithMessages = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Chat tab showing a conversation with multiple participants.',
            },
        },
    },
};

export const EmptyChat = {
    args: {
        workspaceId: 'empty-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty state when no messages have been sent yet.',
            },
        },
    },
};

export const Loading = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Loading state while connecting to Y.js.',
            },
        },
    },
};

export const Offline = {
    args: {
        workspaceId: 'offline-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Offline state when Y.js connection is lost.',
            },
        },
    },
};

export const LongMessages = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Chat with long messages that wrap to multiple lines.',
            },
        },
    },
};

export const ManyParticipants = {
    args: {
        workspaceId: 'busy-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Active chat with many participants and system messages.',
            },
        },
    },
};