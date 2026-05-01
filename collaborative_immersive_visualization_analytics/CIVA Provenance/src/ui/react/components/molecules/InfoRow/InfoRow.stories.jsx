// src/ui/react/components/molecules/InfoRow/InfoRow.stories.jsx
import React from 'react';
import { InfoRow } from './InfoRow';

export default {
    title: 'Molecules/InfoRow',
    component: InfoRow,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        label: 'Status',
        value: 'Active',
    },
};

export const WithIcon = {
    args: {
        icon: 'user',
        label: 'Owner',
        value: 'John Doe',
    },
};

export const Monospace = {
    args: {
        label: 'File Hash',
        value: 'a3f2b8c9d1e4',
        mono: true,
    },
};

export const Truncated = {
    args: {
        label: 'Path',
        value: '/Users/documents/projects/my-very-long-project-name/src/components',
        truncate: true,
    },
};

export const Stacked = {
    args: {
        label: 'Description',
        value: 'This is a longer value that appears below the label',
        inline: false,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <InfoRow label="Small" value="Value" size="sm" />
            <InfoRow label="Medium" value="Value" size="md" />
            <InfoRow label="Large" value="Value" size="lg" />
        </div>
    ),
};

export const FileMetadata = {
    render: () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <InfoRow icon="file" label="Name" value="dataset.csv" />
            <InfoRow icon="database" label="Size" value="2.4 MB" />
            <InfoRow icon="calendar" label="Modified" value="Jan 3, 2026" />
            <InfoRow icon="user" label="Owner" value="Alice Smith" />
            <InfoRow icon="hash" label="Checksum" value="a3f2b8c9" mono />
        </div>
    ),
};

export const SettingsPanel = {
    render: () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <InfoRow label="Version" value="2.1.0" />
            <InfoRow label="Build" value="2026.01.03" mono />
            <InfoRow label="Environment" value="Production" />
            <InfoRow label="API Endpoint" value="api.example.com" mono />
        </div>
    ),
};

export const WithCustomValue = {
    render: () => (
        <InfoRow
            label="Status"
            value={
                <span style={{ color: '#22c55e', fontWeight: 500 }}>
                    ● Connected
                </span>
            }
        />
    ),
};
