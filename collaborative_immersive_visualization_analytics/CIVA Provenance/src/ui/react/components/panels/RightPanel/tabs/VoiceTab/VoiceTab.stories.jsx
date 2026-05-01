/**
 * @file VoiceTab.stories.jsx
 * @description Storybook stories for VoiceTab component.
 */

import React from 'react';
import { VoiceTab } from './VoiceTab';

// Mock channels for stories
const mockChannels = [
    { id: 'main', name: 'Main Room', participants: 4 },
    { id: 'breakout-1', name: 'Tumor Analysis', participants: 2 },
    { id: 'breakout-2', name: 'Surgical Planning', participants: 0 },
    { id: 'breakout-3', name: 'Follow-up Discussion', participants: 1 },
];

export default {
    title: 'Panels/RightPanel/VoiceTab',
    component: VoiceTab,
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

export const Disconnected = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab when not connected, showing join button.',
            },
        },
    },
};

export const Connecting = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab while connecting to LiveKit.',
            },
        },
    },
};

export const Connected = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab when connected with mute/deafen controls visible.',
            },
        },
    },
};

export const Muted = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab with microphone muted.',
            },
        },
    },
};

export const Deafened = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab with audio deafened (not receiving audio).',
            },
        },
    },
};

export const WithParticipants = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab showing other participants in the channel.',
            },
        },
    },
};

export const ParticipantSpeaking = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab with a participant actively speaking.',
            },
        },
    },
};

export const Reconnecting = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Voice tab while reconnecting after connection loss.',
            },
        },
    },
};

export const ChannelSelection = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Channel selector dropdown open for room switching.',
            },
        },
    },
};

export const EmptyChannel = {
    args: {
        workspaceId: 'ws-1',
        channels: mockChannels,
    },
    parameters: {
        docs: {
            description: {
                story: 'Connected to an empty channel with no other participants.',
            },
        },
    },
};