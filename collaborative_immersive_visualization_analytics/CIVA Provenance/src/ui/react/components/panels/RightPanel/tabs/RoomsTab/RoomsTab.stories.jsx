/**
 * @file RoomsTab.stories.jsx
 * @description Storybook stories for RoomsTab component.
 */

import React from 'react';
import { RoomsTab } from './RoomsTab';

// Note: The component uses internal mock data via useRoomsTab hook

export default {
    title: 'Panels/RightPanel/RoomsTab',
    component: RoomsTab,
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
                story: 'Default rooms tab showing project, breakout, and personal rooms.',
            },
        },
    },
};

export const InMainRoom = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'User in the main project room (cannot leave).',
            },
        },
    },
};

export const InBreakoutRoom = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'User in a breakout room with leave option available.',
            },
        },
    },
};

export const RoomExpanded = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Room card expanded showing member list and actions.',
            },
        },
    },
};

export const CreatingRoom = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Create room form for making a new breakout room.',
            },
        },
    },
};

export const SearchingRooms = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Search functionality to find rooms by name or member.',
            },
        },
    },
};

export const PrivateRooms = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Rooms with different access levels (open, invite-only, private).',
            },
        },
    },
};

export const ManyRooms = {
    args: {
        workspaceId: 'busy-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Workspace with many breakout rooms demonstrating scrolling.',
            },
        },
    },
};

export const PersonalSpace = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Personal space room for solo work.',
            },
        },
    },
};

export const EmptyRooms = {
    args: {
        workspaceId: 'empty-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty state with prompt to create first room.',
            },
        },
    },
};

export const RoomWithVoice = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Room with voice chat enabled showing voice indicator.',
            },
        },
    },
};