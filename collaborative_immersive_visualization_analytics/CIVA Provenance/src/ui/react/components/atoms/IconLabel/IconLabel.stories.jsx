// src/ui/react/components/atoms/IconLabel/IconLabel.stories.jsx
import React from 'react';
import { IconLabel } from './IconLabel';

export default {
    title: 'Atoms/IconLabel',
    component: IconLabel,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        color: { control: 'color' },
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

export const Subtle = {
    args: {
        icon: 'info',
        label: 'Information',
        subtle: true,
    },
};

export const Reversed = {
    args: {
        icon: 'chevronRight',
        label: 'Continue',
        reverse: true,
    },
};

export const WithColor = {
    args: {
        icon: 'alertTriangle',
        label: 'Warning',
        color: '#f59e0b',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <IconLabel icon="file" label="Extra Small" size="xs" />
            <IconLabel icon="file" label="Small" size="sm" />
            <IconLabel icon="file" label="Medium" size="md" />
            <IconLabel icon="file" label="Large" size="lg" />
        </div>
    ),
};

export const MenuItems = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '8px',
            width: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
        }}>
            <div style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="file" label="New File" />
            </div>
            <div style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="folder" label="New Folder" />
            </div>
            <div style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="upload" label="Upload" />
            </div>
            <div style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                <IconLabel icon="download" label="Download" />
            </div>
        </div>
    ),
};

export const TabLabels = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <IconLabel icon="files" label="Files" />
            <IconLabel icon="database" label="Datasets" />
            <IconLabel icon="bookmark" label="Views" />
            <IconLabel icon="users" label="People" subtle />
        </div>
    ),
};

export const CustomGap = {
    args: {
        icon: 'star',
        label: 'Favorite',
        gap: 12,
    },
};
