// src/ui/react/components/atoms/Spinner/Spinner.stories.jsx
import React from 'react';
import { Spinner } from './Spinner';

export default {
    title: 'Atoms/Spinner',
    component: Spinner,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        color: { control: 'color' },
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
    args: {},
};

export const Small = {
    args: {
        size: 'sm',
    },
};

export const Large = {
    args: {
        size: 'lg',
    },
};

export const CustomColor = {
    args: {
        color: '#22c55e',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
        </div>
    ),
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Spinner color="#3b82f6" />
            <Spinner color="#22c55e" />
            <Spinner color="#f59e0b" />
            <Spinner color="#ef4444" />
            <Spinner color="#8b5cf6" />
        </div>
    ),
};

export const InButton = {
    render: () => (
        <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
        }}>
            <Spinner size="sm" color="white" />
            <span>Loading...</span>
        </button>
    ),
};

export const CenteredLoading = {
    render: () => (
        <div style={{
            width: '200px',
            height: '150px',
            background: '#1a1a2e',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Spinner size="lg" />
        </div>
    ),
};
