// src/ui/react/components/atoms/ColorDot/ColorDot.stories.jsx
import React from 'react';
import { ColorDot } from './ColorDot';

export default {
    title: 'Atoms/ColorDot',
    component: ColorDot,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        color: { control: 'color' },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
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
        color: '#3b82f6',
    },
};

export const WithGlow = {
    args: {
        color: '#22c55e',
        glow: true,
    },
};

export const WithBorder = {
    args: {
        color: '#f59e0b',
        border: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ColorDot color="#3b82f6" size="sm" />
            <ColorDot color="#3b82f6" size="md" />
            <ColorDot color="#3b82f6" size="lg" />
        </div>
    ),
};

export const CustomPixelSize = {
    args: {
        color: '#8b5cf6',
        size: 20,
    },
};

export const DatasetColors = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ColorDot color="#ef4444" />
            <ColorDot color="#f59e0b" />
            <ColorDot color="#22c55e" />
            <ColorDot color="#3b82f6" />
            <ColorDot color="#8b5cf6" />
            <ColorDot color="#ec4899" />
        </div>
    ),
};

export const GlowingIndicators = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ColorDot color="#22c55e" glow size="lg" />
            <ColorDot color="#3b82f6" glow size="lg" />
            <ColorDot color="#ef4444" glow size="lg" />
        </div>
    ),
};

export const WithLabels = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
                { color: '#ef4444', label: 'Dataset A' },
                { color: '#22c55e', label: 'Dataset B' },
                { color: '#3b82f6', label: 'Dataset C' },
            ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#e5e7eb' }}>
                    <ColorDot color={color} />
                    <span>{label}</span>
                </div>
            ))}
        </div>
    ),
};
