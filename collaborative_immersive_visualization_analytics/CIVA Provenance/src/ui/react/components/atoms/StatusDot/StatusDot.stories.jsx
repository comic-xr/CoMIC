// src/ui/react/components/atoms/StatusDot/StatusDot.stories.jsx
import React from 'react';
import { StatusDot } from './StatusDot';

export default {
    title: 'Atoms/StatusDot',
    component: StatusDot,
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
    },
};

export const Offline = {
    args: {
        status: 'offline',
    },
};

export const Busy = {
    args: {
        status: 'busy',
    },
};

export const Away = {
    args: {
        status: 'away',
    },
};

export const Loading = {
    args: {
        status: 'loading',
    },
};

export const WithPulse = {
    args: {
        status: 'online',
        pulse: true,
    },
};

export const AllStatuses = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
                <StatusDot status="online" />
                <span>Online</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
                <StatusDot status="away" />
                <span>Away</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
                <StatusDot status="busy" />
                <span>Busy</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
                <StatusDot status="offline" />
                <span>Offline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
                <StatusDot status="loading" />
                <span>Loading</span>
            </div>
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <StatusDot status="online" size="sm" />
            <StatusDot status="online" size="md" />
            <StatusDot status="online" size="lg" />
        </div>
    ),
};

export const UserPresence = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
                { name: 'Alice', status: 'online' },
                { name: 'Bob', status: 'away' },
                { name: 'Charlie', status: 'busy' },
                { name: 'Diana', status: 'offline' },
            ].map(({ name, status }) => (
                <div key={name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: '#1a1a2e',
                    borderRadius: '6px',
                    color: '#e5e7eb',
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}>
                        {name[0]}
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px' }}>
                            <StatusDot status={status} size="sm" />
                        </div>
                    </div>
                    <span>{name}</span>
                </div>
            ))}
        </div>
    ),
};
