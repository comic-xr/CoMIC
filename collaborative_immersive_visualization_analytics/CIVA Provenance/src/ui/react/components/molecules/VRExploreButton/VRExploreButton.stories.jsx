// src/ui/react/components/molecules/VRExploreButton/VRExploreButton.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock VRExploreButton since the real component requires VR manager and other dependencies
const MockVRExploreButton = ({
    size = 'sm',
    showLabel = false,
    variant = 'default',
    className = '',
    isInVR = false,
    isLoading = false,
    isSupported = true,
    sessionCount = 0,
    onClick,
}) => {
    const sizeMap = {
        sm: { iconSize: 14, padding: '6px 10px', fontSize: '12px' },
        md: { iconSize: 16, padding: '8px 14px', fontSize: '14px' },
        lg: { iconSize: 18, padding: '10px 18px', fontSize: '16px' },
    };

    const variantMap = {
        default: { bg: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' },
        primary: { bg: 'rgba(96, 165, 250, 0.2)', border: '1px solid rgba(96, 165, 250, 0.3)' },
        minimal: { bg: 'transparent', border: 'none' },
    };

    const s = sizeMap[size];
    const v = variantMap[variant];

    if (!isSupported) {
        return null;
    }

    if (isLoading) {
        return (
            <button
                className={`vr-explore-button ${className}`}
                disabled
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: s.padding,
                    background: v.bg,
                    border: v.border,
                    borderRadius: '6px',
                    color: '#6b7280',
                    fontSize: s.fontSize,
                    cursor: 'not-allowed',
                    opacity: 0.6,
                }}
            >
                <Icon name="loader" size={s.iconSize} />
                {showLabel && <span>VR</span>}
            </button>
        );
    }

    const getLabel = () => {
        if (isInVR) return 'Exit VR';
        if (sessionCount > 0) return `VR (${sessionCount})`;
        return 'Explore in VR';
    };

    return (
        <button
            className={`vr-explore-button ${className}`}
            onClick={onClick}
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: s.padding,
                background: isInVR ? 'rgba(96, 165, 250, 0.2)' : v.bg,
                border: isInVR ? '1px solid rgba(96, 165, 250, 0.5)' : v.border,
                borderRadius: '6px',
                color: isInVR ? '#60a5fa' : '#e5e7eb',
                fontSize: s.fontSize,
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
        >
            <Icon name="vr" size={s.iconSize} />
            {showLabel && <span>{getLabel()}</span>}

            {/* Session count badge */}
            {!isInVR && sessionCount > 0 && !showLabel && (
                <span
                    style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        minWidth: '16px',
                        height: '16px',
                        padding: '0 4px',
                        background: '#3b82f6',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {sessionCount}
                </span>
            )}

            {/* Active pulse */}
            {isInVR && (
                <span
                    style={{
                        position: 'absolute',
                        inset: '-2px',
                        borderRadius: '8px',
                        border: '2px solid rgba(96, 165, 250, 0.5)',
                        animation: 'pulse 2s ease-in-out infinite',
                        pointerEvents: 'none',
                    }}
                />
            )}
        </button>
    );
};

export default {
    title: 'Molecules/VRExploreButton',
    component: MockVRExploreButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        variant: {
            control: 'select',
            options: ['default', 'primary', 'minimal'],
        },
        showLabel: { control: 'boolean' },
        isInVR: { control: 'boolean' },
        isLoading: { control: 'boolean' },
        isSupported: { control: 'boolean' },
        sessionCount: { control: 'number' },
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
        size: 'sm',
        variant: 'default',
        showLabel: false,
        isInVR: false,
        isSupported: true,
    },
};

export const WithLabel = {
    args: {
        size: 'sm',
        variant: 'default',
        showLabel: true,
        isInVR: false,
        isSupported: true,
    },
};

export const Loading = {
    args: {
        size: 'sm',
        variant: 'default',
        showLabel: true,
        isLoading: true,
        isSupported: true,
    },
};

export const InVRSession = {
    args: {
        size: 'sm',
        variant: 'default',
        showLabel: true,
        isInVR: true,
        isSupported: true,
    },
};

export const WithActiveSessions = {
    args: {
        size: 'sm',
        variant: 'default',
        showLabel: false,
        isInVR: false,
        sessionCount: 3,
        isSupported: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockVRExploreButton size="sm" showLabel />
            <MockVRExploreButton size="md" showLabel />
            <MockVRExploreButton size="lg" showLabel />
        </div>
    ),
};

export const Variants = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockVRExploreButton variant="default" showLabel />
            <MockVRExploreButton variant="primary" showLabel />
            <MockVRExploreButton variant="minimal" showLabel />
        </div>
    ),
};

export const AllStates = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>Default:</span>
                <MockVRExploreButton showLabel />
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>Loading:</span>
                <MockVRExploreButton showLabel isLoading />
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>In VR:</span>
                <MockVRExploreButton showLabel isInVR />
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>Sessions:</span>
                <MockVRExploreButton sessionCount={2} />
            </div>
        </div>
    ),
};
