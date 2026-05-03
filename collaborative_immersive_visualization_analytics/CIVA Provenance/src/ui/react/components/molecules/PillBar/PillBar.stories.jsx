// src/ui/react/components/molecules/PillBar/PillBar.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock PillBar component for Storybook
const MockPillBar = ({
    tabs = [],
    activeTab,
    onTabChange,
    size = 'md',
}) => {
    const sizes = {
        sm: { padding: '4px 10px', fontSize: '11px', iconSize: 12 },
        md: { padding: '6px 14px', fontSize: '12px', iconSize: 14 },
    };
    const s = sizes[size] || sizes.md;

    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: '20px',
        }}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const color = tab.color || 'blue';
                const colors = {
                    blue: { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa' },
                    green: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.4)', text: '#4ade80' },
                    pink: { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)', text: '#f472b6' },
                    amber: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' },
                    teal: { bg: 'rgba(20, 184, 166, 0.2)', border: 'rgba(20, 184, 166, 0.4)', text: '#2dd4bf' },
                    purple: { bg: 'rgba(168, 85, 247, 0.2)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc' },
                };
                const c = colors[color] || colors.blue;

                return (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && onTabChange?.(tab.id)}
                        disabled={tab.disabled}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: s.padding,
                            fontSize: s.fontSize,
                            fontWeight: 500,
                            background: isActive ? c.bg : 'transparent',
                            border: isActive ? `1px solid ${c.border}` : '1px solid transparent',
                            borderRadius: '16px',
                            color: isActive ? c.text : tab.disabled ? '#4b5563' : '#9ca3af',
                            cursor: tab.disabled ? 'not-allowed' : 'pointer',
                            opacity: tab.disabled ? 0.5 : 1,
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.icon && <Icon name={tab.icon} size={s.iconSize} />}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <span style={{
                                padding: '1px 6px',
                                fontSize: '10px',
                                background: isActive ? c.text : '#4b5563',
                                color: '#000',
                                borderRadius: '10px',
                                fontWeight: 600,
                            }}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default {
    title: 'Molecules/PillBar',
    component: MockPillBar,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#0f0f0f', borderRadius: '8px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => {
        const [activeTab, setActiveTab] = useState('presence');
        const tabs = [
            { id: 'presence', label: 'Presence' },
            { id: 'layout', label: 'Layout' },
            { id: 'homepoints', label: 'Homepoints' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const WithIcons = {
    render: () => {
        const [activeTab, setActiveTab] = useState('presence');
        const tabs = [
            { id: 'presence', label: 'Presence', icon: 'users' },
            { id: 'layout', label: 'Layout', icon: 'layers' },
            { id: 'homepoints', label: 'Homepoints', icon: 'home' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const DatasetsTab = {
    render: () => {
        const [activeTab, setActiveTab] = useState('datasets');
        const tabs = [
            { id: 'datasets', label: 'Datasets', icon: 'folder', color: 'teal' },
            { id: 'views', label: 'Views', icon: 'eye', badge: 4, color: 'blue' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const WorkspaceTab = {
    render: () => {
        const [activeTab, setActiveTab] = useState('layout');
        const tabs = [
            { id: 'presence', label: 'Presence', icon: 'users', color: 'pink', badge: 3 },
            { id: 'layout', label: 'Layout', icon: 'layers', color: 'green' },
            { id: 'homepoints', label: 'Homepoints', icon: 'home', color: 'amber' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const WithBadges = {
    render: () => {
        const [activeTab, setActiveTab] = useState('filters');
        const tabs = [
            { id: 'filters', label: 'Filters', icon: 'filter', badge: 12 },
            { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark', badge: 5 },
            { id: 'views', label: 'Views', icon: 'eye', badge: 8 },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const SmallSize = {
    render: () => {
        const [activeTab, setActiveTab] = useState('layout');
        const tabs = [
            { id: 'presence', label: 'Presence', icon: 'users' },
            { id: 'layout', label: 'Layout', icon: 'layers' },
            { id: 'homepoints', label: 'Homepoints', icon: 'home' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} size="sm" />;
    },
};

export const WithDisabledTab = {
    render: () => {
        const [activeTab, setActiveTab] = useState('layout');
        const tabs = [
            { id: 'presence', label: 'Presence', icon: 'users', disabled: true },
            { id: 'layout', label: 'Layout', icon: 'layers' },
            { id: 'homepoints', label: 'Homepoints', icon: 'home' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const ColorVariants = {
    render: () => {
        const [activeTab, setActiveTab] = useState('blue');
        const tabs = [
            { id: 'blue', label: 'Blue', color: 'blue' },
            { id: 'green', label: 'Green', color: 'green' },
            { id: 'pink', label: 'Pink', color: 'pink' },
            { id: 'amber', label: 'Amber', color: 'amber' },
            { id: 'teal', label: 'Teal', color: 'teal' },
            { id: 'purple', label: 'Purple', color: 'purple' },
        ];
        return <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    },
};

export const InPanelHeader = {
    render: () => {
        const [activeTab, setActiveTab] = useState('datasets');
        const tabs = [
            { id: 'datasets', label: 'Datasets', icon: 'folder', color: 'teal' },
            { id: 'views', label: 'Views', icon: 'eye', badge: 4, color: 'blue' },
        ];

        return (
            <div style={{
                width: '280px',
                background: '#1a1a1a',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <MockPillBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
                <div style={{
                    padding: '16px',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '13px'
                }}>
                    {activeTab === 'datasets' ? 'Datasets content...' : 'Views content...'}
                </div>
            </div>
        );
    },
};
