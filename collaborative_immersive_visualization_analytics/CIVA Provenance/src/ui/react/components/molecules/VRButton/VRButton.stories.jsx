// src/ui/react/components/molecules/VRButton/VRButton.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock VRButton component - optimized for VR with larger touch targets
const MockVRButton = ({
    icon,
    label,
    variant = 'default',
    size = 'md',
    active = false,
    disabled = false,
    onClick,
}) => {
    const sizeMap = {
        sm: { padding: '12px 16px', fontSize: '14px', iconSize: 20 },
        md: { padding: '16px 24px', fontSize: '16px', iconSize: 24 },
        lg: { padding: '20px 32px', fontSize: '18px', iconSize: 28 },
    };

    const variantMap = {
        default: { bg: '#2d2d4a', color: '#e5e7eb' },
        primary: { bg: '#3b82f6', color: 'white' },
        danger: { bg: '#ef4444', color: 'white' },
        ghost: { bg: 'transparent', color: '#e5e7eb' },
    };

    const s = sizeMap[size];
    const v = variantMap[variant];

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: s.padding,
                background: active ? '#3b82f6' : v.bg,
                border: 'none',
                borderRadius: '12px',
                color: active ? 'white' : v.color,
                fontSize: s.fontSize,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                minWidth: '80px',
                transition: 'all 0.2s',
            }}
        >
            {icon && <Icon name={icon} size={s.iconSize} />}
            {label && <span>{label}</span>}
        </button>
    );
};

export default {
    title: 'Molecules/VRButton',
    component: MockVRButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'primary', 'danger', 'ghost'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        onClick: { action: 'clicked' },
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
        icon: 'settings',
        label: 'Settings',
    },
};

export const Primary = {
    args: {
        icon: 'play',
        label: 'Play',
        variant: 'primary',
    },
};

export const Danger = {
    args: {
        icon: 'trash',
        label: 'Delete',
        variant: 'danger',
    },
};

export const IconOnly = {
    args: {
        icon: 'home',
        variant: 'default',
    },
};

export const Active = {
    args: {
        icon: 'target',
        label: 'Active',
        active: true,
    },
};

export const Disabled = {
    args: {
        icon: 'lock',
        label: 'Locked',
        disabled: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockVRButton icon="folder" label="Small" size="sm" />
            <MockVRButton icon="folder" label="Medium" size="md" />
            <MockVRButton icon="folder" label="Large" size="lg" />
        </div>
    ),
};

export const Variants = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockVRButton icon="zap" label="Default" variant="default" />
            <MockVRButton icon="zap" label="Primary" variant="primary" />
            <MockVRButton icon="zap" label="Danger" variant="danger" />
            <MockVRButton icon="zap" label="Ghost" variant="ghost" />
        </div>
    ),
};

export const VRToolbar = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            background: '#1a1a2e',
            borderRadius: '16px',
        }}>
            <MockVRButton icon="mousePointer" size="lg" />
            <MockVRButton icon="hand" size="lg" active />
            <MockVRButton icon="penTool" size="lg" />
            <MockVRButton icon="ruler" size="lg" />
            <MockVRButton icon="search" size="lg" />
        </div>
    ),
};

export const VRActionButtons = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <MockVRButton icon="x" label="Cancel" variant="ghost" size="lg" />
            <MockVRButton icon="check" label="Confirm" variant="primary" size="lg" />
        </div>
    ),
};
