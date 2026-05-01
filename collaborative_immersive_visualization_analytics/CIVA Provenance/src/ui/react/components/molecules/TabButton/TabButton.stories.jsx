// src/ui/react/components/molecules/TabButton/TabButton.stories.jsx
import React, { useState } from 'react';
import { TabButton } from './TabButton';

export default {
    title: 'Molecules/TabButton',
    component: TabButton,
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
            options: ['default', 'etched'],
        },
        orientation: {
            control: 'select',
            options: ['horizontal', 'vertical'],
        },
        color: {
            control: 'select',
            options: ['blue', 'teal', 'purple', 'amber', 'green', 'red', 'pink', 'indigo'],
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
        icon: 'file',
        label: 'Files',
    },
};

export const Active = {
    args: {
        icon: 'database',
        label: 'Datasets',
        active: true,
    },
};

export const WithBadge = {
    args: {
        icon: 'bell',
        label: 'Notifications',
        badge: 5,
    },
};

export const IconOnly = {
    args: {
        icon: 'settings',
        label: 'Settings',
        iconOnly: true,
    },
};

export const Disabled = {
    args: {
        icon: 'lock',
        label: 'Locked',
        disabled: true,
    },
};

export const WithColor = {
    args: {
        icon: 'users',
        label: 'Team',
        active: true,
        color: 'purple',
    },
};

export const EtchedVariant = {
    args: {
        icon: 'layers',
        label: 'Layers',
        variant: 'etched',
        active: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <TabButton icon="file" label="Small" size="sm" />
            <TabButton icon="file" label="Medium" size="md" />
            <TabButton icon="file" label="Large" size="lg" />
        </div>
    ),
};

export const HorizontalTabs = {
    render: function TabsStory() {
        const [active, setActive] = useState('files');
        const tabs = [
            { id: 'files', icon: 'file', label: 'Files' },
            { id: 'datasets', icon: 'database', label: 'Datasets', badge: 3 },
            { id: 'views', icon: 'bookmark', label: 'Views' },
            { id: 'annotations', icon: 'messageSquare', label: 'Annotations' },
        ];

        return (
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '8px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        badge={tab.badge}
                        active={active === tab.id}
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const VerticalTabs = {
    render: function VerticalTabsStory() {
        const [active, setActive] = useState('home');
        const tabs = [
            { id: 'home', icon: 'home', label: 'Home' },
            { id: 'search', icon: 'search', label: 'Search' },
            { id: 'settings', icon: 'settings', label: 'Settings' },
            { id: 'help', icon: 'helpCircle', label: 'Help' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px',
                background: '#1a1a2e',
                borderRadius: '8px',
                width: '160px',
            }}>
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        orientation="horizontal"
                        active={active === tab.id}
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const ActivityBar = {
    render: function ActivityBarStory() {
        const [active, setActive] = useState('files');
        const tabs = [
            { id: 'files', icon: 'file' },
            { id: 'search', icon: 'search' },
            { id: 'git', icon: 'gitBranch', badge: 2 },
            { id: 'debug', icon: 'bug' },
            { id: 'extensions', icon: 'package' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.id}
                        badge={tab.badge}
                        iconOnly
                        active={active === tab.id}
                        onClick={() => setActive(tab.id)}
                    />
                ))}
            </div>
        );
    },
};

export const ColoredTabs = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px' }}>
            <TabButton icon="users" label="Team" color="blue" active />
            <TabButton icon="database" label="Data" color="purple" active />
            <TabButton icon="bookmark" label="Views" color="teal" active />
            <TabButton icon="bell" label="Alerts" color="amber" active />
        </div>
    ),
};
