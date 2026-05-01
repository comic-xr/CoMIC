// src/ui/react/components/molecules/LabeledButton/LabeledButton.stories.jsx
import React from 'react';
import { LabeledButton } from './LabeledButton';

export default {
    title: 'Molecules/LabeledButton',
    component: LabeledButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        variant: {
            control: 'select',
            options: ['ghost', 'secondary', 'primary'],
        },
        onClick: { action: 'clicked' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        icon: 'settings',
        label: 'Settings',
    },
};

export const Active = {
    args: {
        icon: 'play',
        label: 'Playing',
        active: true,
    },
};

export const WithAccent = {
    args: {
        icon: 'download',
        label: 'Download',
        accent: '#22c55e',
        active: true,
    },
};

export const Loading = {
    args: {
        icon: 'upload',
        label: 'Uploading...',
        loading: true,
    },
};

export const Disabled = {
    args: {
        icon: 'lock',
        label: 'Locked',
        disabled: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <LabeledButton icon="file" label="Small" size="sm" />
            <LabeledButton icon="file" label="Medium" size="md" />
            <LabeledButton icon="file" label="Large" size="lg" />
        </div>
    ),
};

export const Variants = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <LabeledButton icon="file" label="Ghost" variant="ghost" />
            <LabeledButton icon="file" label="Secondary" variant="secondary" />
            <LabeledButton icon="file" label="Primary" variant="primary" />
        </div>
    ),
};

export const FooterActions = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '8px',
            padding: '12px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <LabeledButton icon="save" label="Save" />
            <LabeledButton icon="share" label="Share" />
            <LabeledButton icon="download" label="Export" />
            <LabeledButton icon="trash" label="Delete" accent="#ef4444" />
        </div>
    ),
};

export const ToolbarButtons = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <LabeledButton icon="play" label="Play" active variant="ghost" />
            <LabeledButton icon="pause" label="Pause" variant="ghost" />
            <LabeledButton icon="skipForward" label="Skip" variant="ghost" />
            <LabeledButton icon="settings" label="Settings" variant="ghost" />
        </div>
    ),
};
