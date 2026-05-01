// src/ui/react/components/atoms/Button/IconButton.stories.jsx
// Dedicated stories for IconButton component
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock IconButton component for Storybook
const MockIconButton = ({
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    active = false,
    loading = false,
    disabled = false,
    tooltip,
    onClick,
}) => {
    const sizes = {
        sm: { size: 24, iconSize: 14 },
        md: { size: 32, iconSize: 16 },
        lg: { size: 40, iconSize: 20 },
    };
    const s = sizes[size] || sizes.md;

    const variants = {
        ghost: {
            bg: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: active ? '#60a5fa' : '#9ca3af',
            hoverBg: 'rgba(255, 255, 255, 0.1)',
        },
        primary: {
            bg: active ? '#2563eb' : '#3b82f6',
            color: '#fff',
            hoverBg: '#2563eb',
        },
        secondary: {
            bg: active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
            color: active ? '#e5e7eb' : '#9ca3af',
            hoverBg: 'rgba(255, 255, 255, 0.15)',
        },
        danger: {
            bg: active ? '#dc2626' : 'rgba(239, 68, 68, 0.1)',
            color: active ? '#fff' : '#f87171',
            hoverBg: '#dc2626',
        },
    };
    const v = variants[variant] || variants.ghost;

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            title={typeof tooltip === 'string' ? tooltip : label}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: `${s.size}px`,
                height: `${s.size}px`,
                background: v.bg,
                border: 'none',
                borderRadius: '6px',
                color: v.color,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.15s',
            }}
        >
            {loading ? (
                <Icon name="loader" size={s.iconSize} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
                <Icon name={icon} size={s.iconSize} />
            )}
        </button>
    );
};

export default {
    title: 'Atoms/IconButton',
    component: MockIconButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        icon: {
            control: 'select',
            options: ['settings', 'plus', 'trash', 'edit', 'save', 'download', 'upload', 'play', 'pause', 'eye', 'eyeOff', 'grid3x3', 'list', 'chevronLeft', 'chevronRight', 'x', 'check', 'search', 'filter', 'share2'],
        },
        variant: {
            control: 'select',
            options: ['ghost', 'primary', 'secondary', 'danger'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        active: { control: 'boolean' },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
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
        variant: 'ghost',
        size: 'md',
    },
};

export const Primary = {
    args: {
        icon: 'plus',
        label: 'Add item',
        variant: 'primary',
        size: 'md',
    },
};

export const Danger = {
    args: {
        icon: 'trash',
        label: 'Delete',
        variant: 'danger',
        size: 'md',
    },
};

export const Active = {
    args: {
        icon: 'play',
        label: 'Playing',
        variant: 'ghost',
        size: 'md',
        active: true,
    },
};

export const Loading = {
    args: {
        icon: 'upload',
        label: 'Uploading',
        variant: 'primary',
        size: 'md',
        loading: true,
    },
};

export const Disabled = {
    args: {
        icon: 'save',
        label: 'Save',
        variant: 'primary',
        size: 'md',
        disabled: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockIconButton icon="settings" label="Small" size="sm" />
            <MockIconButton icon="settings" label="Medium" size="md" />
            <MockIconButton icon="settings" label="Large" size="lg" />
        </div>
    ),
};

export const SizesWithLabels = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <MockIconButton icon="settings" label="Small" size="sm" />
                <span style={{ fontSize: '10px', color: '#888' }}>sm (24px)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <MockIconButton icon="settings" label="Medium" size="md" />
                <span style={{ fontSize: '10px', color: '#888' }}>md (32px)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <MockIconButton icon="settings" label="Large" size="lg" />
                <span style={{ fontSize: '10px', color: '#888' }}>lg (40px)</span>
            </div>
        </div>
    ),
};

export const AllVariants = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <MockIconButton icon="settings" label="Ghost" variant="ghost" />
            <MockIconButton icon="plus" label="Primary" variant="primary" />
            <MockIconButton icon="edit" label="Secondary" variant="secondary" />
            <MockIconButton icon="trash" label="Danger" variant="danger" />
        </div>
    ),
};

export const VariantsActive = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <MockIconButton icon="settings" label="Ghost Active" variant="ghost" active />
            <MockIconButton icon="plus" label="Primary Active" variant="primary" active />
            <MockIconButton icon="edit" label="Secondary Active" variant="secondary" active />
            <MockIconButton icon="trash" label="Danger Active" variant="danger" active />
        </div>
    ),
};

export const WithTooltip = {
    args: {
        icon: 'settings',
        label: 'Settings',
        tooltip: true,
    },
};

export const WithCustomTooltip = {
    args: {
        icon: 'save',
        label: 'Save',
        tooltip: 'Save changes (Ctrl+S)',
    },
};

export const CommonIcons = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <MockIconButton icon="plus" label="Add" />
            <MockIconButton icon="edit" label="Edit" />
            <MockIconButton icon="trash" label="Delete" />
            <MockIconButton icon="save" label="Save" />
            <MockIconButton icon="download" label="Download" />
            <MockIconButton icon="upload" label="Upload" />
            <MockIconButton icon="copy" label="Copy" />
            <MockIconButton icon="share2" label="Share" />
            <MockIconButton icon="search" label="Search" />
            <MockIconButton icon="filter" label="Filter" />
            <MockIconButton icon="settings" label="Settings" />
            <MockIconButton icon="moreVertical" label="More" />
        </div>
    ),
};

export const MediaControls = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MockIconButton icon="skipBack" label="Previous" />
            <MockIconButton icon="play" label="Play" variant="primary" size="lg" />
            <MockIconButton icon="skipForward" label="Next" />
        </div>
    ),
};

export const NavigationIcons = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MockIconButton icon="chevronLeft" label="Back" />
            <MockIconButton icon="chevronRight" label="Forward" />
            <MockIconButton icon="chevronUp" label="Up" />
            <MockIconButton icon="chevronDown" label="Down" />
            <MockIconButton icon="home" label="Home" />
            <MockIconButton icon="maximize" label="Maximize" />
            <MockIconButton icon="minimize" label="Minimize" />
            <MockIconButton icon="x" label="Close" />
        </div>
    ),
};

export const ToggleIcons = {
    render: () => {
        const [states, setStates] = React.useState({
            eye: true,
            lock: false,
            star: false,
            bookmark: false,
        });

        return (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <MockIconButton
                    icon={states.eye ? 'eye' : 'eyeOff'}
                    label={states.eye ? 'Visible' : 'Hidden'}
                    active={states.eye}
                    onClick={() => setStates(s => ({ ...s, eye: !s.eye }))}
                />
                <MockIconButton
                    icon={states.lock ? 'lock' : 'unlock'}
                    label={states.lock ? 'Locked' : 'Unlocked'}
                    active={states.lock}
                    onClick={() => setStates(s => ({ ...s, lock: !s.lock }))}
                />
                <MockIconButton
                    icon="star"
                    label="Favorite"
                    active={states.star}
                    onClick={() => setStates(s => ({ ...s, star: !s.star }))}
                />
                <MockIconButton
                    icon="bookmark"
                    label="Bookmark"
                    active={states.bookmark}
                    onClick={() => setStates(s => ({ ...s, bookmark: !s.bookmark }))}
                />
            </div>
        );
    },
};

export const LoadingStates = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <MockIconButton icon="upload" label="Uploading" loading />
            <MockIconButton icon="download" label="Downloading" loading variant="primary" />
            <MockIconButton icon="save" label="Saving" loading variant="secondary" />
            <MockIconButton icon="trash" label="Deleting" loading variant="danger" />
        </div>
    ),
};

export const ToolbarExample = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <MockIconButton icon="mousePointer" label="Select" active />
            <MockIconButton icon="move" label="Pan" />
            <MockIconButton icon="zoomIn" label="Zoom In" />
            <MockIconButton icon="zoomOut" label="Zoom Out" />
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />
            <MockIconButton icon="undo" label="Undo" />
            <MockIconButton icon="redo" label="Redo" />
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />
            <MockIconButton icon="maximize" label="Fullscreen" />
            <MockIconButton icon="settings" label="Settings" />
        </div>
    ),
};
