// src/ui/react/components/molecules/SubtabBar/SubtabBar.stories.jsx
import React, { useState } from 'react';

// Mock SubtabBar component
const MockSubtabBar = ({ tabs, activeTab, onChange }) => (
    <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        background: '#1a1a2e',
        borderRadius: '8px',
    }}>
        {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                style={{
                    padding: '6px 12px',
                    background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: activeTab === tab.id ? 'white' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                }}
            >
                {tab.label}
                {tab.count !== undefined && (
                    <span style={{
                        marginLeft: '6px',
                        padding: '1px 6px',
                        background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#374151',
                        borderRadius: '10px',
                        fontSize: '11px',
                    }}>
                        {tab.count}
                    </span>
                )}
            </button>
        ))}
    </div>
);

export default {
    title: 'Molecules/SubtabBar',
    component: MockSubtabBar,
    parameters: {
        layout: 'centered',
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
    render: function DefaultStory() {
        const [active, setActive] = useState('all');
        return (
            <MockSubtabBar
                activeTab={active}
                onChange={setActive}
                tabs={[
                    { id: 'all', label: 'All' },
                    { id: 'recent', label: 'Recent' },
                    { id: 'favorites', label: 'Favorites' },
                ]}
            />
        );
    },
};

export const WithCounts = {
    render: function CountsStory() {
        const [active, setActive] = useState('all');
        return (
            <MockSubtabBar
                activeTab={active}
                onChange={setActive}
                tabs={[
                    { id: 'all', label: 'All', count: 24 },
                    { id: 'active', label: 'Active', count: 5 },
                    { id: 'archived', label: 'Archived', count: 19 },
                ]}
            />
        );
    },
};

export const PeopleTabs = {
    render: function PeopleStory() {
        const [active, setActive] = useState('room');
        return (
            <MockSubtabBar
                activeTab={active}
                onChange={setActive}
                tabs={[
                    { id: 'room', label: 'Room', count: 3 },
                    { id: 'project', label: 'Project', count: 8 },
                    { id: 'breakout', label: 'Breakout' },
                ]}
            />
        );
    },
};

export const ActivityTabs = {
    render: function ActivityStory() {
        const [active, setActive] = useState('all');
        return (
            <MockSubtabBar
                activeTab={active}
                onChange={setActive}
                tabs={[
                    { id: 'all', label: 'All' },
                    { id: 'mentions', label: 'Mentions', count: 2 },
                    { id: 'reactions', label: 'Reactions' },
                ]}
            />
        );
    },
};

export const ManyTabs = {
    render: function ManyTabsStory() {
        const [active, setActive] = useState('tab1');
        return (
            <MockSubtabBar
                activeTab={active}
                onChange={setActive}
                tabs={[
                    { id: 'tab1', label: 'Tab 1' },
                    { id: 'tab2', label: 'Tab 2' },
                    { id: 'tab3', label: 'Tab 3' },
                    { id: 'tab4', label: 'Tab 4' },
                    { id: 'tab5', label: 'Tab 5' },
                ]}
            />
        );
    },
};
