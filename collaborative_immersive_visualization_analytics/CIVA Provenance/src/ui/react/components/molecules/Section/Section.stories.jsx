// src/ui/react/components/molecules/Section/Section.stories.jsx
import React from 'react';
import { Section } from './Section';

export default {
    title: 'Molecules/Section',
    component: Section,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        title: 'Section Title',
        children: <div style={{ color: '#9ca3af', padding: '12px' }}>Section content goes here</div>,
    },
};

export const WithIcon = {
    args: {
        title: 'Files',
        icon: 'folder',
        children: <div style={{ color: '#9ca3af', padding: '12px' }}>File list...</div>,
    },
};

export const Collapsed = {
    args: {
        title: 'Collapsed Section',
        icon: 'settings',
        defaultExpanded: false,
        children: <div style={{ color: '#9ca3af', padding: '12px' }}>Hidden content</div>,
    },
};

export const NotCollapsible = {
    args: {
        title: 'Always Open',
        icon: 'info',
        collapsible: false,
        children: <div style={{ color: '#9ca3af', padding: '12px' }}>Cannot be collapsed</div>,
    },
};

export const WithActions = {
    args: {
        title: 'Settings',
        icon: 'settings',
        actions: (
            <button
                onClick={() => {}}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '4px',
                }}
            >
                Reset
            </button>
        ),
        children: <div style={{ color: '#9ca3af', padding: '12px' }}>Settings content</div>,
    },
};

export const MultipleSections = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Section title="General" icon="settings" defaultExpanded>
                <div style={{ color: '#9ca3af', padding: '12px' }}>General settings...</div>
            </Section>
            <Section title="Appearance" icon="palette" defaultExpanded={false}>
                <div style={{ color: '#9ca3af', padding: '12px' }}>Theme options...</div>
            </Section>
            <Section title="Advanced" icon="sliders" defaultExpanded={false}>
                <div style={{ color: '#9ca3af', padding: '12px' }}>Advanced options...</div>
            </Section>
        </div>
    ),
};

export const InPanel = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            overflow: 'hidden',
        }}>
            <Section title="Properties" icon="sliders" defaultExpanded>
                <div style={{ color: '#9ca3af', padding: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>Width: 100px</div>
                    <div style={{ marginBottom: '8px' }}>Height: 200px</div>
                    <div>Color: #3b82f6</div>
                </div>
            </Section>
        </div>
    ),
};
