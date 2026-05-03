// src/ui/react/components/molecules/StatusIndicator/StatusIndicator.stories.jsx
import React from 'react';
import { StatusIndicator } from './StatusIndicator';

export default {
    title: 'Molecules/StatusIndicator',
    component: StatusIndicator,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        status: {
            control: 'select',
            options: ['online', 'offline', 'busy', 'away', 'loading'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Online = {
    args: {
        status: 'online',
        label: 'Online',
    },
};

export const Offline = {
    args: {
        status: 'offline',
        label: 'Offline',
    },
};

export const Busy = {
    args: {
        status: 'busy',
        label: 'Busy',
    },
};

export const Away = {
    args: {
        status: 'away',
        label: 'Away',
    },
};

export const Loading = {
    args: {
        status: 'loading',
        label: 'Connecting...',
    },
};

export const WithPulse = {
    args: {
        status: 'online',
        label: 'Active',
        pulse: true,
    },
};

export const Reversed = {
    args: {
        status: 'online',
        label: 'Connected',
        reverse: true,
    },
};

export const DotOnly = {
    args: {
        status: 'online',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatusIndicator status="online" label="Small" size="sm" />
            <StatusIndicator status="online" label="Medium" size="md" />
            <StatusIndicator status="online" label="Large" size="lg" />
        </div>
    ),
};

export const AllStatuses = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatusIndicator status="online" label="Online - Available" />
            <StatusIndicator status="away" label="Away - Be right back" />
            <StatusIndicator status="busy" label="Busy - Do not disturb" />
            <StatusIndicator status="offline" label="Offline" />
            <StatusIndicator status="loading" label="Connecting..." />
        </div>
    ),
};

export const ConnectionStatus = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <StatusIndicator status="online" label="Server connected" pulse />
        </div>
    ),
};

export const UserList = {
    render: () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: '#1a1a2e',
            borderRadius: '8px',
            width: '200px',
        }}>
            {[
                { name: 'Alice', status: 'online' },
                { name: 'Bob', status: 'away' },
                { name: 'Charlie', status: 'busy' },
                { name: 'Diana', status: 'offline' },
            ].map(({ name, status }) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#e5e7eb' }}>{name}</span>
                    <StatusIndicator status={status} size="sm" />
                </div>
            ))}
        </div>
    ),
};
