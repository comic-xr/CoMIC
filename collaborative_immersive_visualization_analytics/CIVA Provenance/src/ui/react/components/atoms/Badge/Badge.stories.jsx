// src/ui/react/components/atoms/Badge/Badge.stories.jsx
import React from 'react';
import { Badge } from './Badge';

export default {
    title: 'Atoms/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        color: {
            control: 'select',
            options: ['default', 'primary', 'danger', 'success', 'warning'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md'],
        },
        variant: {
            control: 'select',
            options: ['filled', 'outline'],
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
        children: '5',
    },
};

export const WithCount = {
    args: {
        count: 12,
    },
};

export const MaxCount = {
    args: {
        count: 150,
        max: 99,
    },
};

export const Dot = {
    args: {
        dot: true,
        color: 'danger',
    },
};

export const Pulse = {
    args: {
        count: 3,
        color: 'danger',
        pulse: true,
    },
};

export const AllColors = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Badge color="default">1</Badge>
            <Badge color="primary">2</Badge>
            <Badge color="danger">3</Badge>
            <Badge color="success">4</Badge>
            <Badge color="warning">5</Badge>
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Badge size="sm" color="primary">SM</Badge>
            <Badge size="md" color="primary">MD</Badge>
        </div>
    ),
};

export const Variants = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Badge variant="filled" color="primary">Filled</Badge>
            <Badge variant="outline" color="primary">Outline</Badge>
        </div>
    ),
};

export const CustomColor = {
    args: {
        children: 'Custom',
        color: '#8b5cf6',
    },
};
