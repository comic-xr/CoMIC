// src/ui/react/components/atoms/NavDot/NavDot.stories.jsx
import React from 'react';
import { NavDot } from './NavDot';

export default {
    title: 'Atoms/NavDot',
    component: NavDot,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        icon: {
            control: 'select',
            options: ['move', 'cursor', 'ruler', 'pen', 'slice', 'box', 'filter', 'palette'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        isActive: {
            control: 'boolean',
        },
        color: {
            control: 'color',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '60px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        icon: 'move',
        label: 'Transform',
        color: '#60a5fa',
    },
};

export const Active = {
    args: {
        icon: 'cursor',
        label: 'Selection',
        color: '#4ade80',
        isActive: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NavDot icon="move" label="Small" color="#60a5fa" size="sm" />
                <span style={{ fontSize: '10px', color: '#888' }}>sm</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NavDot icon="move" label="Medium" color="#60a5fa" size="md" />
                <span style={{ fontSize: '10px', color: '#888' }}>md</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <NavDot icon="move" label="Large" color="#60a5fa" size="lg" />
                <span style={{ fontSize: '10px', color: '#888' }}>lg</span>
            </div>
        </div>
    ),
};

export const AllColors = {
    render: () => {
        const sections = [
            { icon: 'move', label: 'Transform', color: '#60a5fa' },
            { icon: 'cursor', label: 'Selection', color: '#4ade80' },
            { icon: 'ruler', label: 'Measurement', color: '#fbbf24' },
            { icon: 'pen', label: 'Annotations', color: '#f472b6' },
            { icon: 'slice', label: 'Clipping', color: '#a78bfa' },
            { icon: 'box', label: 'Widgets', color: '#2dd4bf' },
            { icon: 'filter', label: 'Filters', color: '#fb923c' },
            { icon: 'palette', label: 'Appearance', color: '#818cf8' },
        ];

        return (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {sections.map((section) => (
                    <NavDot
                        key={section.label}
                        icon={section.icon}
                        label={section.label}
                        color={section.color}
                    />
                ))}
            </div>
        );
    },
};

export const ActiveStates = {
    render: () => {
        const sections = [
            { icon: 'move', label: 'Transform', color: '#60a5fa' },
            { icon: 'cursor', label: 'Selection', color: '#4ade80' },
            { icon: 'ruler', label: 'Measurement', color: '#fbbf24' },
            { icon: 'pen', label: 'Annotations', color: '#f472b6' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>First Active</div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {sections.map((section, i) => (
                            <NavDot
                                key={section.label}
                                icon={section.icon}
                                label={section.label}
                                color={section.color}
                                isActive={i === 0}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>Third Active</div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {sections.map((section, i) => (
                            <NavDot
                                key={section.label}
                                icon={section.icon}
                                label={section.label}
                                color={section.color}
                                isActive={i === 2}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    },
};

export const Interactive = {
    render: () => {
        const [activeId, setActiveId] = React.useState('transform');

        const sections = [
            { id: 'transform', icon: 'move', label: 'Transform', color: '#60a5fa' },
            { id: 'selection', icon: 'cursor', label: 'Selection', color: '#4ade80' },
            { id: 'measurement', icon: 'ruler', label: 'Measurement', color: '#fbbf24' },
            { id: 'annotation', icon: 'pen', label: 'Annotations', color: '#f472b6' },
        ];

        return (
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
                    Click dots to change active: <strong>{activeId}</strong>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {sections.map((section) => (
                        <NavDot
                            key={section.id}
                            icon={section.icon}
                            label={section.label}
                            color={section.color}
                            isActive={section.id === activeId}
                            onClick={() => setActiveId(section.id)}
                        />
                    ))}
                </div>
            </div>
        );
    },
};
