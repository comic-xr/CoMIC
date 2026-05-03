// src/ui/react/components/panels/RightPanel/RightPanel.stories.jsx
// Storybook stories for the RightPanel and its tabs

import React from 'react';
import { RightPanel } from './index';
import { PeoplePanelContent } from './tabs/PeopleTab';
import { RoomsPanelContent } from './tabs/RoomsTab';
import { ChatPanelContent } from './tabs/ChatTab';
import { VoicePanelContent } from './tabs/VoiceTab';
import { NotesPanelContent } from './tabs/NotesTab';
import { RecordingsPanelContent } from './tabs/RecordingsTab';
import { ActivityPanelContent } from './tabs/ActivityTab';
import {
    VOICE_MOCK,
    ACTIVITY_MOCK,
} from '@UI/react/__mocks__';
import './RightPanel.scss';

export default {
    title: 'Panels/RightPanel',
    component: RightPanel,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#1e1e1e' },
            ],
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#1e1e1e',
            }}>
                <div style={{ width: '320px', height: '100%' }}>
                    <Story />
                </div>
            </div>
        ),
    ],
};

// =============================================================================
// FULL PANEL STORIES
// =============================================================================

export const Default = {
    args: {
        workspaceId: 'ws-1',
    },
};

export const Collapsed = {
    args: {
        workspaceId: 'ws-1',
        initialCollapsed: true,
    },
};

// =============================================================================
// INDIVIDUAL TAB STORIES
// =============================================================================

const TabDecorator = (Story) => (
    <div style={{
        height: '100vh',
        width: '300px',
        background: 'var(--color-bg-secondary, #252526)',
        overflow: 'hidden',
    }}>
        <Story />
    </div>
);

export const PeopleTab = {
    render: () => <PeoplePanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'People tab showing online members grouped by workspace with status indicators and actions.',
            },
        },
    },
};

export const RoomsTab = {
    render: () => <RoomsPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Rooms tab for managing breakout rooms with create, join, and leave functionality.',
            },
        },
    },
};

export const ChatTab = {
    render: () => <ChatPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Chat tab with Room, Breakout, and Direct message sub-tabs.',
            },
        },
    },
};

export const VoiceTab = {
    render: () => (
        <VoicePanelContent
            workspaceId="ws-1"
            channels={VOICE_MOCK.channels}
            participants={VOICE_MOCK.participants}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Voice tab with channel selector, controls, and participant list.',
            },
        },
    },
};

export const VoiceTabEmpty = {
    render: () => (
        <VoicePanelContent
            workspaceId="ws-1"
            channels={[]}
            participants={[]}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Voice tab in empty state with no channels or participants.',
            },
        },
    },
};

export const NotesTab = {
    render: () => <NotesPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Notes tab for creating and managing session notes with pinning and sharing.',
            },
        },
    },
};

export const RecordingsTab = {
    render: () => <RecordingsPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Recordings tab with recording controls and past recordings list.',
            },
        },
    },
};

export const ActivityTab = {
    render: () => (
        <ActivityPanelContent
            workspaceId="ws-1"
            activities={ACTIVITY_MOCK.activities}
            filters={ACTIVITY_MOCK.filters}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Activity tab showing session activity feed with filtering options.',
            },
        },
    },
};

export const ActivityTabEmpty = {
    render: () => (
        <ActivityPanelContent
            workspaceId="ws-1"
            activities={[]}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Activity tab in empty state with no activities.',
            },
        },
    },
};