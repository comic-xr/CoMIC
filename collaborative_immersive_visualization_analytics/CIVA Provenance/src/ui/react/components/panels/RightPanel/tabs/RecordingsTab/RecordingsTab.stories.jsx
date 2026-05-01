/**
 * @file RecordingsTab.stories.jsx
 * @description Storybook stories for RecordingsTab component.
 */

import React from 'react';
import { RecordingsTab } from './RecordingsTab';

// Note: The component uses useRecordings hook for data

export default {
    title: 'Panels/RightPanel/RecordingsTab',
    component: RecordingsTab,
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
                story: 'Default recordings tab ready to start a new recording.',
            },
        },
    },
};

export const NotRecording = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Idle state with recording mode selection.',
            },
        },
    },
};

export const Recording = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Active recording with live indicator and stop button.',
            },
        },
    },
};

export const RecordingPaused = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Recording paused with resume option.',
            },
        },
    },
};

export const FullSessionMode = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Full session recording mode selected.',
            },
        },
    },
};

export const IsolationMode = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Isolation mode for recording single focused instance.',
            },
        },
    },
};

export const SubsetMode = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Subset mode for recording selected instances.',
            },
        },
    },
};

export const WithAudio = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Recording with audio capture enabled.',
            },
        },
    },
};

export const WithoutAudio = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Recording with audio capture disabled.',
            },
        },
    },
};

export const PastRecordings = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'List of past recordings with playback controls.',
            },
        },
    },
};

export const RecordingExpanded = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Recording card expanded showing playback and actions.',
            },
        },
    },
};

export const Exporting = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Recording being exported to storage.',
            },
        },
    },
};

export const Exported = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Recording successfully exported with checkmark indicator.',
            },
        },
    },
};

export const SearchingRecordings = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Search functionality to filter recordings.',
            },
        },
    },
};

export const EmptyRecordings = {
    args: {
        workspaceId: 'ws-1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty state with prompt to start first recording.',
            },
        },
    },
};

export const ManyRecordings = {
    args: {
        workspaceId: 'busy-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Many past recordings demonstrating scrolling.',
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
                story: 'Loading state while fetching recordings.',
            },
        },
    },
};

export const Error = {
    args: {
        workspaceId: 'error-ws',
    },
    parameters: {
        docs: {
            description: {
                story: 'Error state when recording service is unavailable.',
            },
        },
    },
};