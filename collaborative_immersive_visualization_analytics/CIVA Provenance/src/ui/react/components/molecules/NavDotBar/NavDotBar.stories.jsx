// src/ui/react/components/molecules/NavDotBar/NavDotBar.stories.jsx
import React, { useState } from 'react';
import { NavDotBar } from './NavDotBar';

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
    title: 'Molecules/NavDotBar',
    component: NavDotBar,
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
            <div style={{ padding: '60px', background: '#0a0a0f' }}>
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

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>Small</div>
                <NavDotBar
                    sections={defaultSections}
                    currentSectionId="selection"
                    size="sm"
                />
            </div>
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>Medium (default)</div>
                <NavDotBar
                    sections={defaultSections}
                    currentSectionId="selection"
                    size="md"
                />
            </div>
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>Large</div>
                <NavDotBar
                    sections={defaultSections}
                    currentSectionId="selection"
                    size="lg"
                />
            </div>
        </div>
    ),
};

export const FewSections = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>3 Sections</div>
                <NavDotBar
                    sections={defaultSections.slice(0, 3)}
                    currentSectionId="transform"
                />
            </div>
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>5 Sections</div>
                <NavDotBar
                    sections={defaultSections.slice(0, 5)}
                    currentSectionId="measurement"
                />
            </div>
        </div>
    ),
};

export const Interactive = {
    render: () => {
        const [currentId, setCurrentId] = useState('transform');

        return (
            <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
                    Current section: <strong style={{ color: '#fff' }}>{currentId}</strong>
                </div>
                <NavDotBar
                    sections={defaultSections}
                    currentSectionId={currentId}
                    onSectionClick={(id) => setCurrentId(id)}
                />
            </div>
        );
    },
};

export const InPanel = {
    render: () => {
        const [currentId, setCurrentId] = useState('annotation');

        return (
            <div style={{
                width: '280px',
                background: '#1a1a2e',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '12px',
            }}>
                <NavDotBar
                    sections={defaultSections}
                    currentSectionId={currentId}
                    onSectionClick={(id) => setCurrentId(id)}
                />
            </div>
        );
    },
};
