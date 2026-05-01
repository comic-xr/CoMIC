// src/ui/react/components/molecules/SectionNavHeader/SectionNavHeader.stories.jsx
import React, { useState } from 'react';
import { SectionNavHeader } from './SectionNavHeader';

const defaultSections = [
    { id: 'transform', icon: 'move', label: 'Transform', color: '#60a5fa' },
    { id: 'selection', icon: 'cursor', label: 'Selection', color: '#4ade80' },
    { id: 'measurement', icon: 'ruler', label: 'Measurement', color: '#fbbf24' },
    { id: 'annotation', icon: 'pen', label: 'Annotations', color: '#f472b6' },
    { id: 'clipping', icon: 'slice', label: 'Clipping', color: '#a78bfa' },
    { id: 'widgets', icon: 'box', label: 'Widgets', color: '#2dd4bf' },
    { id: 'filters', icon: 'filter', label: 'Filters', color: '#fb923c' },
    { id: 'appearance', icon: 'palette', label: 'Appearance', color: '#818cf8' },
];

export default {
    title: 'Molecules/SectionNavHeader',
    component: SectionNavHeader,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        currentSectionId: {
            control: 'select',
            options: defaultSections.map(s => s.id),
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

export const Default = {
    args: {
        sections: defaultSections,
        currentSectionId: 'transform',
    },
};

export const DifferentSections = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {defaultSections.slice(0, 4).map((section) => (
                <div key={section.id} style={{ width: '280px' }}>
                    <SectionNavHeader
                        sections={defaultSections}
                        currentSectionId={section.id}
                    />
                </div>
            ))}
        </div>
    ),
};

export const Interactive = {
    render: () => {
        const [currentId, setCurrentId] = useState('transform');

        return (
            <div style={{ width: '280px' }}>
                <SectionNavHeader
                    sections={defaultSections}
                    currentSectionId={currentId}
                    onSectionClick={(id) => setCurrentId(id)}
                />
            </div>
        );
    },
};

export const InPanelContext = {
    render: () => {
        const [currentId, setCurrentId] = useState('measurement');

        return (
            <div style={{
                width: '280px',
                background: '#1a1a2e',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
            }}>
                {/* Panel title */}
                <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Instance Tools
                </div>

                <SectionNavHeader
                    sections={defaultSections}
                    currentSectionId={currentId}
                    onSectionClick={(id) => setCurrentId(id)}
                />

                {/* Placeholder content */}
                <div style={{
                    padding: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '11px',
                    textAlign: 'center',
                }}>
                    Section content would appear here
                </div>
            </div>
        );
    },
};

export const FewSections = {
    render: () => {
        const fewSections = defaultSections.slice(0, 3);
        const [currentId, setCurrentId] = useState(fewSections[0].id);

        return (
            <div style={{ width: '280px' }}>
                <SectionNavHeader
                    sections={fewSections}
                    currentSectionId={currentId}
                    onSectionClick={(id) => setCurrentId(id)}
                />
            </div>
        );
    },
};
