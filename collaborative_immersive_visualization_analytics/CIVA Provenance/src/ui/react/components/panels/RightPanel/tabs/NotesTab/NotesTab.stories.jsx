/**
 * @file NotesTab.stories.jsx
 * @description Storybook stories for NotesTab component.
 */

import React from 'react';
import { NotesTab } from './NotesTab';

// Note: The component uses internal mock data via useNotesTab hook

export default {
    title: 'Panels/RightPanel/NotesTab',
    component: NotesTab,
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
                story: 'Default notes tab with sample notes including pinned items.',
            },
        },
    },
};

export const WithPinnedNotes = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Notes tab showing the pinned section with important notes.',
            },
        },
    },
};

export const SelectedNote = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Note card expanded to show actions (edit, pin, share, delete).',
            },
        },
    },
};

export const EditingNote = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Edit view with rich text toolbar for modifying a note.',
            },
        },
    },
};

export const CreatingNote = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'New note creation view with title and content inputs.',
            },
        },
    },
};

export const SearchingNotes = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Search functionality to filter notes by content.',
            },
        },
    },
};

export const EmptyNotes = {
    args: {
        workspaceId: 'empty-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty state when no notes have been created.',
            },
        },
    },
};

export const ManyNotes = {
    args: {
        workspaceId: 'busy-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Tab with many notes demonstrating scrolling behavior.',
            },
        },
    },
};

export const SharedNotes = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Notes with share indicators showing collaborative notes.',
            },
        },
    },
};