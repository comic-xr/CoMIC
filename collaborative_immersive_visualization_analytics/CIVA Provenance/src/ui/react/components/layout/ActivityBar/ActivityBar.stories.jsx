// src/ui/react/components/layout/ActivityBar/ActivityBar.stories.jsx
// Storybook stories for ActivityBar component

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ActivityBar } from './ActivityBar.jsx';

export default {
    title: 'Layout/ActivityBar',
    component: ActivityBar,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#0a0a0a' },
            ],
        },
    },
    argTypes: {
        side: {
            control: 'radio',
            options: ['left', 'right'],
        },
        isPanelOpen: { control: 'boolean' },
    },
};

// =============================================================================
// MOCK TAB CONFIGURATIONS
// =============================================================================

const LEFT_PANEL_TABS = [
    { id: 'files', icon: 'folderOpen', label: 'Files' },
    { id: 'datasets', icon: 'database', label: 'Datasets' },
    { id: 'tools', icon: 'wrench', label: 'Instance Tools' },
    { id: 'layout', icon: 'grid', label: 'Layout' },
    { id: 'annotations', icon: 'mapPin', label: 'Annotations', badge: 3 },
    { id: 'filters', icon: 'filter', label: 'Saved Filters' },
    { id: 'bookmarks', icon: 'bookmark', label: 'Bookmarks' },
];

const RIGHT_PANEL_TABS = [
    { id: 'people', icon: 'users', label: 'People', badge: 4 },
    { id: 'chat', icon: 'messageSquare', label: 'Chat', badge: 12, badgeColor: '#fb7185' },
    { id: 'voice', icon: 'mic', label: 'Voice' },
    { id: 'notes', icon: 'stickyNote', label: 'Notes' },
    { id: 'recording', icon: 'video', label: 'Recording' },
    { id: 'activity', icon: 'activity', label: 'Activity' },
];

// =============================================================================
// DECORATOR
// =============================================================================

const MockDecorator = (Story) => {
    return (
        <div style={{
            background: '#0f0f0f',
            height: '500px',
            display: 'flex',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <Story />
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const LeftPanel = {
    decorators: [MockDecorator],
    args: {
        side: 'left',
        tabs: LEFT_PANEL_TABS,
        isPanelOpen: true,
        dividerAfter: ['datasets', 'layout'],
    },
    render: (args) => {
        const [activeTab, setActiveTab] = useState('datasets');
        const [panelOpen, setPanelOpen] = useState(args.isPanelOpen);

        return (
            <>
                <ActivityBar
                    {...args}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isPanelOpen={panelOpen}
                    onTogglePanel={() => setPanelOpen(!panelOpen)}
                />
                {panelOpen && (
                    <div style={{
                        width: '232px',
                        background: '#1a1a1a',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#888',
                        fontSize: '12px',
                    }}>
                        {activeTab} panel content
                    </div>
                )}
            </>
        );
    },
};

export const RightPanel = {
    decorators: [MockDecorator],
    args: {
        side: 'right',
        tabs: RIGHT_PANEL_TABS,
        isPanelOpen: true,
        dividerAfter: ['voice'],
    },
    render: (args) => {
        const [activeTab, setActiveTab] = useState('people');
        const [panelOpen, setPanelOpen] = useState(args.isPanelOpen);

        return (
            <>
                {panelOpen && (
                    <div style={{
                        width: '232px',
                        background: '#1a1a1a',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#888',
                        fontSize: '12px',
                    }}>
                        {activeTab} panel content
                    </div>
                )}
                <ActivityBar
                    {...args}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isPanelOpen={panelOpen}
                    onTogglePanel={() => setPanelOpen(!panelOpen)}
                />
            </>
        );
    },
};

export const CollapsedState = {
    decorators: [MockDecorator],
    args: {
        side: 'left',
        tabs: LEFT_PANEL_TABS,
        isPanelOpen: false,
        dividerAfter: ['datasets', 'layout'],
    },
    render: (args) => {
        const [activeTab, setActiveTab] = useState('datasets');
        const [panelOpen, setPanelOpen] = useState(args.isPanelOpen);

        return (
            <ActivityBar
                {...args}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (!panelOpen) setPanelOpen(true);
                }}
                isPanelOpen={panelOpen}
                onTogglePanel={() => setPanelOpen(!panelOpen)}
            />
        );
    },
};

export const WithBadges = {
    decorators: [MockDecorator],
    args: {
        side: 'right',
        tabs: [
            { id: 'people', icon: 'users', label: 'People', badge: 8 },
            { id: 'chat', icon: 'messageSquare', label: 'Chat', badge: 99, badgeColor: '#fb7185' },
            { id: 'voice', icon: 'mic', label: 'Voice' },
            { id: 'activity', icon: 'activity', label: 'Activity', badge: 3, badgeColor: '#fbbf24' },
        ],
        isPanelOpen: true,
    },
    render: (args) => {
        const [activeTab, setActiveTab] = useState('chat');

        return (
            <ActivityBar
                {...args}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTogglePanel={() => { }}
            />
        );
    },
};

export const MinimalTabs = {
    decorators: [MockDecorator],
    args: {
        side: 'left',
        tabs: [
            { id: 'files', icon: 'folderOpen', label: 'Files' },
            { id: 'datasets', icon: 'database', label: 'Datasets' },
        ],
        isPanelOpen: true,
    },
    render: (args) => {
        const [activeTab, setActiveTab] = useState('files');

        return (
            <ActivityBar
                {...args}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTogglePanel={() => { }}
            />
        );
    },
};

export const CustomColors = {
    decorators: [MockDecorator],
    args: {
        side: 'left',
        tabs: [
            { id: 'data', icon: 'database', label: 'Data', color: '#60a5fa' },
            { id: 'analysis', icon: 'wrench', label: 'Analysis', color: '#c084fc' },
            { id: 'viz', icon: 'grid', label: 'Visualization', color: '#fb7185' },
            { id: 'collab', icon: 'users', label: 'Collaboration', color: '#34d399' },
        ],
        isPanelOpen: true,
    },
    render: (args) => {
        const [activeTab, setActiveTab] = useState('analysis');

        return (
            <ActivityBar
                {...args}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTogglePanel={() => { }}
            />
        );
    },
};

// Both panels side by side
export const BothPanels = {
    parameters: {
        layout: 'fullscreen',
    },
    render: () => {
        const [leftTab, setLeftTab] = useState('datasets');
        const [rightTab, setRightTab] = useState('people');
        const [leftOpen, setLeftOpen] = useState(true);
        const [rightOpen, setRightOpen] = useState(true);

        return (
            <div style={{
                display: 'flex',
                height: '100vh',
                background: '#0a0a0a',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
                {/* Left Activity Bar + Panel */}
                <ActivityBar
                    side="left"
                    tabs={LEFT_PANEL_TABS}
                    activeTab={leftTab}
                    onTabChange={setLeftTab}
                    isPanelOpen={leftOpen}
                    onTogglePanel={() => setLeftOpen(!leftOpen)}
                    dividerAfter={['datasets', 'layout']}
                />
                {leftOpen && (
                    <div style={{
                        width: '232px',
                        background: '#1a1a1a',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        padding: '16px',
                        color: '#888',
                        fontSize: '12px',
                    }}>
                        <strong style={{ color: '#fff' }}>{leftTab}</strong>
                        <p style={{ marginTop: '8px' }}>Panel content here...</p>
                    </div>
                )}

                {/* Center workspace */}
                <div style={{
                    flex: 1,
                    background: '#0f0f0f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#444',
                }}>
                    Workspace Grid
                </div>

                {/* Right Panel + Activity Bar */}
                {rightOpen && (
                    <div style={{
                        width: '232px',
                        background: '#1a1a1a',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        padding: '16px',
                        color: '#888',
                        fontSize: '12px',
                    }}>
                        <strong style={{ color: '#fff' }}>{rightTab}</strong>
                        <p style={{ marginTop: '8px' }}>Panel content here...</p>
                    </div>
                )}
                <ActivityBar
                    side="right"
                    tabs={RIGHT_PANEL_TABS}
                    activeTab={rightTab}
                    onTabChange={setRightTab}
                    isPanelOpen={rightOpen}
                    onTogglePanel={() => setRightOpen(!rightOpen)}
                    dividerAfter={['voice']}
                />
            </div>
        );
    },
};