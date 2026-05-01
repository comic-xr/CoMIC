/**
 * @file Header.stories.jsx
 * @description Storybook stories for the Header component (48px).
 * Primary header bar with global application controls.
 */

import React, { useState } from 'react';
import { Header } from './Header.jsx';

export default {
    title: 'Layout/Header',
    component: Header,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#0a0a0a' },
            ],
        },
    },
    argTypes: {
        viewMode: {
            control: 'radio',
            options: ['desktop', 'vr'],
        },
        vrAvailable: { control: 'boolean' },
        unreadCount: { control: 'number' },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockUser = {
    id: 'user-1',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@research.edu',
    avatar: null,
    role: 'admin',
    status: 'online',
};

const mockProjects = [
    { id: 'p1', name: 'Brain Study Alpha', lastAccessed: Date.now() - 3600000 },
    { id: 'p2', name: 'Cardiac Analysis', lastAccessed: Date.now() - 86400000 },
    { id: 'p3', name: 'Neural Network Visualization', lastAccessed: Date.now() - 172800000 },
    { id: 'p4', name: 'COVID Research Dataset', lastAccessed: Date.now() - 259200000 },
];

const mockNotifications = [
    { id: 'n1', type: 'mention', message: 'Bob mentioned you in Brain Study', time: Date.now() - 300000, read: false },
    { id: 'n2', type: 'invite', message: 'Alice invited you to Cardiac Analysis', time: Date.now() - 3600000, read: false },
    { id: 'n3', type: 'update', message: 'New data available in Neural Network', time: Date.now() - 7200000, read: true },
];

// =============================================================================
// DECORATOR
// =============================================================================

const HeaderDecorator = (Story) => (
    <div style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
        <Story />
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    decorators: [HeaderDecorator],
    args: {
        user: mockUser,
        currentProject: mockProjects[0],
        projects: mockProjects,
        notifications: mockNotifications,
        unreadCount: 2,
        viewMode: 'desktop',
        vrAvailable: true,
    },
    render: (args) => {
        const [viewMode, setViewMode] = useState(args.viewMode);
        const [currentProject, setCurrentProject] = useState(args.currentProject);

        return (
            <Header
                {...args}
                viewMode={viewMode}
                currentProject={currentProject}
                onViewModeChange={setViewMode}
                onProjectChange={setCurrentProject}
                onCreateProject={() => console.log('Create project')}
                onOpenSearch={() => console.log('Open search')}
                onOpenHelp={() => console.log('Open help')}
                onNotificationClick={(n) => console.log('Notification clicked:', n)}
                onNavigate={(path) => console.log('Navigate:', path)}
                onSignOut={() => console.log('Sign out')}
            />
        );
    },
};

export const NoProject = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        currentProject: null,
    },
    render: Default.render,
};

export const VRMode = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        viewMode: 'vr',
    },
    render: Default.render,
};

export const VRUnavailable = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        vrAvailable: false,
    },
    render: Default.render,
};

export const ManyNotifications = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        unreadCount: 99,
        notifications: [
            ...mockNotifications,
            { id: 'n4', type: 'mention', message: 'Carol mentioned you', time: Date.now() - 100000, read: false },
            { id: 'n5', type: 'update', message: 'Dataset updated', time: Date.now() - 200000, read: false },
        ],
    },
    render: Default.render,
};

export const NoNotifications = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        notifications: [],
        unreadCount: 0,
    },
    render: Default.render,
};

export const GuestUser = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        user: {
            id: 'guest-1',
            name: 'Guest User',
            email: null,
            avatar: null,
            role: 'guest',
            status: 'online',
        },
    },
    render: Default.render,
};

export const ManyProjects = {
    decorators: [HeaderDecorator],
    args: {
        ...Default.args,
        projects: [
            ...mockProjects,
            { id: 'p5', name: 'Project Five', lastAccessed: Date.now() - 300000000 },
            { id: 'p6', name: 'Project Six', lastAccessed: Date.now() - 400000000 },
            { id: 'p7', name: 'Project Seven', lastAccessed: Date.now() - 500000000 },
            { id: 'p8', name: 'Project Eight', lastAccessed: Date.now() - 600000000 },
        ],
    },
    render: Default.render,
};

export const InteractiveDemo = {
    decorators: [HeaderDecorator],
    args: Default.args,
    render: (args) => {
        const [viewMode, setViewMode] = useState(args.viewMode);
        const [currentProject, setCurrentProject] = useState(args.currentProject);
        const [unreadCount, setUnreadCount] = useState(args.unreadCount);

        return (
            <div>
                <Header
                    {...args}
                    viewMode={viewMode}
                    currentProject={currentProject}
                    unreadCount={unreadCount}
                    onViewModeChange={setViewMode}
                    onProjectChange={setCurrentProject}
                    onCreateProject={() => console.log('Create project')}
                    onOpenSearch={() => console.log('Open search (Cmd/Ctrl+K)')}
                    onOpenHelp={() => console.log('Open help')}
                    onNotificationClick={() => setUnreadCount(Math.max(0, unreadCount - 1))}
                    onNavigate={(path) => console.log('Navigate:', path)}
                    onSignOut={() => console.log('Sign out')}
                />

                {/* Interactive Controls */}
                <div style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    fontSize: '12px',
                    color: '#888',
                }}>
                    <span>Mode: <strong style={{ color: viewMode === 'vr' ? '#c084fc' : '#60a5fa' }}>{viewMode.toUpperCase()}</strong></span>
                    <span>Project: <strong style={{ color: '#2dd4bf' }}>{currentProject?.name || 'None'}</strong></span>
                    <span>Unread: <strong style={{ color: unreadCount > 0 ? '#fb7185' : '#888' }}>{unreadCount}</strong></span>
                </div>
            </div>
        );
    },
};