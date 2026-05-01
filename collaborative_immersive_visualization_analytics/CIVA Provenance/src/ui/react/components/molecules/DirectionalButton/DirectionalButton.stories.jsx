// src/ui/react/components/molecules/DirectionalButton/DirectionalButton.stories.jsx
import React from 'react';
import { DirectionalButton } from './DirectionalButton';

export default {
    title: 'Molecules/DirectionalButton',
    component: DirectionalButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        direction: {
            control: 'select',
            options: ['up', 'down', 'left', 'right', 'center'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        onClick: { action: 'clicked' },
        onLongPress: { action: 'long pressed' },
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
        direction: 'up',
    },
};

export const AllDirections = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px' }}>
            <DirectionalButton direction="left" />
            <DirectionalButton direction="up" />
            <DirectionalButton direction="down" />
            <DirectionalButton direction="right" />
        </div>
    ),
};

export const DPad = {
    render: () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 40px)',
            gridTemplateRows: 'repeat(3, 40px)',
            gap: '4px',
            placeItems: 'center',
        }}>
            <div />
            <DirectionalButton direction="up" />
            <div />
            <DirectionalButton direction="left" />
            <DirectionalButton direction="center" />
            <DirectionalButton direction="right" />
            <div />
            <DirectionalButton direction="down" />
            <div />
        </div>
    ),
};

export const Active = {
    args: {
        direction: 'up',
        active: true,
    },
};

export const Disabled = {
    args: {
        direction: 'right',
        disabled: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <DirectionalButton direction="up" size="sm" />
            <DirectionalButton direction="up" size="md" />
            <DirectionalButton direction="up" size="lg" />
        </div>
    ),
};

export const CustomIcon = {
    args: {
        direction: 'center',
        icon: 'home',
        tooltip: 'Reset to center',
    },
};

export const WithTooltip = {
    args: {
        direction: 'up',
        tooltip: 'Move up',
    },
};
