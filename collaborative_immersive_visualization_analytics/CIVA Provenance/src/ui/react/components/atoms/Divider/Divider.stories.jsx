// src/ui/react/components/atoms/Divider/Divider.stories.jsx
import React from 'react';
import { Divider } from './Divider';

export default {
    title: 'Atoms/Divider',
    component: Divider,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        orientation: {
            control: 'select',
            options: ['horizontal', 'vertical'],
        },
        spacing: {
            control: 'select',
            options: ['none', 'sm', 'md', 'lg'],
        },
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
    args: {},
};

export const WithLabel = {
    args: {
        label: 'OR',
    },
};

export const Vertical = {
    args: {
        orientation: 'vertical',
    },
    decorators: [
        (Story) => (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center' }}>
                <Story />
            </div>
        ),
    ],
};

export const Spacing = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', color: '#e5e7eb' }}>
            <span>Content above</span>
            <Divider spacing="none" />
            <span>No spacing</span>
            <Divider spacing="sm" />
            <span>Small spacing</span>
            <Divider spacing="md" />
            <span>Medium spacing</span>
            <Divider spacing="lg" />
            <span>Large spacing</span>
        </div>
    ),
};

export const InMenu = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '8px 0',
            width: '200px',
        }}>
            <div style={{ padding: '8px 16px', color: '#e5e7eb' }}>Edit</div>
            <div style={{ padding: '8px 16px', color: '#e5e7eb' }}>Copy</div>
            <div style={{ padding: '8px 16px', color: '#e5e7eb' }}>Paste</div>
            <Divider spacing="sm" />
            <div style={{ padding: '8px 16px', color: '#ef4444' }}>Delete</div>
        </div>
    ),
};

export const SectionDivider = {
    render: () => (
        <div style={{ color: '#e5e7eb' }}>
            <h3 style={{ margin: 0 }}>Section 1</h3>
            <p style={{ margin: '8px 0' }}>Some content here...</p>
            <Divider label="Next Section" spacing="lg" />
            <h3 style={{ margin: 0 }}>Section 2</h3>
            <p style={{ margin: '8px 0' }}>More content here...</p>
        </div>
    ),
};
