// src/ui/react/components/molecules/LabeledIconButton/LabeledIconButton.stories.jsx
import React from 'react';
import { LabeledIconButton } from './LabeledIconButton.jsx';

export default {
    title: 'Molecules/LabeledIconButton',
    component: LabeledIconButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        icon: {
            control: 'text',
            description: 'Icon name from the icon library',
        },
        label: {
            control: 'text',
            description: 'Button label text',
        },
        active: {
            control: 'boolean',
            description: 'Whether button is in active state',
        },
        disabled: {
            control: 'boolean',
            description: 'Whether button is disabled',
        },
        accent: {
            control: 'color',
            description: 'Accent color for active state',
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
        icon: 'map',
        label: 'Navigator',
    },
};

export const Active = {
    args: {
        icon: 'map',
        label: 'Navigator',
        active: true,
        accent: '#2dd4bf',
    },
};

export const Disabled = {
    args: {
        icon: 'lock',
        label: 'Locked',
        disabled: true,
    },
};

export const WithTealAccent = {
    args: {
        icon: 'map',
        label: 'Navigator',
        active: true,
        accent: '#2dd4bf',
    },
};

export const WithAmberAccent = {
    args: {
        icon: 'edit',
        label: 'Scratchpad',
        active: true,
        accent: '#f59e0b',
    },
};

export const ToolbarExample = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '8px',
            padding: '8px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <LabeledIconButton
                icon="map"
                label="Navigator"
                active={true}
                accent="#2dd4bf"
            />
            <LabeledIconButton
                icon="edit"
                label="Scratchpad"
                accent="#f59e0b"
            />
            <LabeledIconButton
                icon="settings"
                label="Settings"
            />
        </div>
    ),
};

export const States = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', width: '80px', fontSize: '12px' }}>Default:</span>
                <LabeledIconButton icon="folder" label="Files" />
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', width: '80px', fontSize: '12px' }}>Active:</span>
                <LabeledIconButton icon="folder" label="Files" active accent="#3b82f6" />
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', width: '80px', fontSize: '12px' }}>Disabled:</span>
                <LabeledIconButton icon="folder" label="Files" disabled />
            </div>
        </div>
    ),
};
