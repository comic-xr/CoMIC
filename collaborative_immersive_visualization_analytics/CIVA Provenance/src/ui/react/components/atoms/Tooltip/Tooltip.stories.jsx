// src/ui/react/components/atoms/Tooltip/Tooltip.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock Button component
const MockButton = ({ children, variant = 'secondary', icon, size = 'md', onClick }) => {
    const variants = {
        primary: { bg: '#3b82f6', color: '#fff' },
        secondary: { bg: 'rgba(255, 255, 255, 0.08)', color: '#e5e7eb' },
        danger: { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171' },
    };
    const v = variants[variant] || variants.secondary;

    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: v.bg,
                border: 'none',
                borderRadius: '6px',
                color: v.color,
                cursor: 'pointer',
                fontSize: '13px',
            }}
        >
            {icon && <Icon name={icon} size={14} />}
            {children}
        </button>
    );
};

// Mock IconButton component
const MockIconButton = ({ icon, label, variant = 'ghost', size = 'md', onClick }) => {
    const variants = {
        ghost: { bg: 'transparent', color: '#9ca3af' },
        primary: { bg: '#3b82f6', color: '#fff' },
        danger: { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171' },
    };
    const v = variants[variant] || variants.ghost;

    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size === 'sm' ? '24px' : '32px',
                height: size === 'sm' ? '24px' : '32px',
                background: v.bg,
                border: 'none',
                borderRadius: '6px',
                color: v.color,
                cursor: 'pointer',
            }}
        >
            <Icon name={icon} size={size === 'sm' ? 14 : 16} />
        </button>
    );
};

// Mock Tooltip component
const MockTooltip = ({
    children,
    content,
    placement = 'top',
    interactive = false,
    arrow = true,
    delay = 300,
    disabled = false,
    maxWidth = 250,
}) => {
    const [visible, setVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);

    const show = () => {
        if (disabled) return;
        if (timeoutId) clearTimeout(timeoutId);
        const id = setTimeout(() => setVisible(true), delay);
        setTimeoutId(id);
    };

    const hide = () => {
        if (timeoutId) clearTimeout(timeoutId);
        setVisible(false);
    };

    const positions = {
        top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
        bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
        left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
        right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
    };

    return (
        <div
            style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            {children}
            {visible && (
                <div style={{
                    position: 'absolute',
                    ...positions[placement],
                    padding: '6px 10px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#e5e7eb',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    maxWidth: `${maxWidth}px`,
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                    {content}
                </div>
            )}
        </div>
    );
};

// Mock Rich Tooltip content component
MockTooltip.Rich = ({ icon, title, description, shortcut }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {icon && <Icon name={icon} size={12} style={{ color: '#9ca3af' }} />}
                {title && <span style={{ fontWeight: 500 }}>{title}</span>}
            </div>
            {shortcut && (
                <span style={{
                    padding: '1px 5px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px',
                    fontSize: '10px',
                    color: '#9ca3af',
                }}>
                    {shortcut}
                </span>
            )}
        </div>
        {description && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{description}</span>
        )}
    </div>
);

export default {
    title: 'Atoms/Tooltip',
    component: MockTooltip,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '100px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => (
        <MockTooltip content="This is a tooltip">
            <button style={{ padding: '8px 16px', background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                Hover me
            </button>
        </MockTooltip>
    ),
};

export const OnIconButton = {
    render: () => (
        <MockTooltip content="Open settings">
            <MockIconButton icon="settings" label="Settings" />
        </MockTooltip>
    ),
};

export const OnButton = {
    render: () => (
        <MockTooltip content="Save your changes to the server">
            <MockButton variant="primary" icon="save">
                Save
            </MockButton>
        </MockTooltip>
    ),
};

export const Placements = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', padding: '40px' }}>
            <div />
            <MockTooltip content="Top placement" placement="top">
                <MockButton variant="secondary">Top</MockButton>
            </MockTooltip>
            <div />

            <MockTooltip content="Left placement" placement="left">
                <MockButton variant="secondary">Left</MockButton>
            </MockTooltip>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Icon name="info" size={24} style={{ color: '#666' }} />
            </div>
            <MockTooltip content="Right placement" placement="right">
                <MockButton variant="secondary">Right</MockButton>
            </MockTooltip>

            <div />
            <MockTooltip content="Bottom placement" placement="bottom">
                <MockButton variant="secondary">Bottom</MockButton>
            </MockTooltip>
            <div />
        </div>
    ),
};

export const RichWithTitle = {
    render: () => (
        <MockTooltip
            content={
                <MockTooltip.Rich
                    title="Global Search"
                    description="Search across all your projects, datasets, and views"
                />
            }
        >
            <MockIconButton icon="search" label="Search" />
        </MockTooltip>
    ),
};

export const RichWithShortcut = {
    render: () => (
        <MockTooltip
            content={
                <MockTooltip.Rich
                    title="Save Changes"
                    description="Save all pending changes to the server"
                    shortcut="Cmd+S"
                />
            }
        >
            <MockButton variant="primary" icon="save">
                Save
            </MockButton>
        </MockTooltip>
    ),
};

export const RichWithIcon = {
    render: () => (
        <MockTooltip
            content={
                <MockTooltip.Rich
                    icon="delete"
                    title="Delete Item"
                    description="This action cannot be undone"
                />
            }
        >
            <MockIconButton icon="delete" label="Delete" variant="danger" />
        </MockTooltip>
    ),
};

export const AllRichTooltips = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <MockTooltip
                content={
                    <MockTooltip.Rich
                        title="Edit"
                        shortcut="E"
                    />
                }
            >
                <MockIconButton icon="edit" label="Edit" />
            </MockTooltip>

            <MockTooltip
                content={
                    <MockTooltip.Rich
                        title="Share"
                        description="Share this item with others"
                        shortcut="Cmd+Shift+S"
                    />
                }
            >
                <MockIconButton icon="share" label="Share" />
            </MockTooltip>

            <MockTooltip
                content={
                    <MockTooltip.Rich
                        title="Copy Link"
                        shortcut="Cmd+C"
                    />
                }
            >
                <MockIconButton icon="copy" label="Copy" />
            </MockTooltip>
        </div>
    ),
};

export const InstantTooltip = {
    render: () => (
        <MockTooltip content="Instant tooltip (no delay)" delay={0}>
            <MockButton variant="secondary">No Delay</MockButton>
        </MockTooltip>
    ),
};

export const SlowTooltip = {
    render: () => (
        <MockTooltip content="Slow tooltip (800ms delay)" delay={800}>
            <MockButton variant="secondary">Long Delay (800ms)</MockButton>
        </MockTooltip>
    ),
};

export const DisabledTooltip = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <MockTooltip content="This tooltip is visible">
                <MockButton variant="secondary">Enabled</MockButton>
            </MockTooltip>
            <MockTooltip content="This tooltip is hidden" disabled>
                <MockButton variant="secondary">Disabled</MockButton>
            </MockTooltip>
        </div>
    ),
};

export const ToolbarExample = {
    render: () => (
        <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: '#1a1a24',
            borderRadius: '8px',
            border: '1px solid #2a2a3a'
        }}>
            <MockTooltip content={<MockTooltip.Rich title="Edit" shortcut="E" />}>
                <MockIconButton icon="edit" label="Edit" size="sm" />
            </MockTooltip>
            <MockTooltip content={<MockTooltip.Rich title="Copy" shortcut="Cmd+C" />}>
                <MockIconButton icon="copy" label="Copy" size="sm" />
            </MockTooltip>
            <MockTooltip content={<MockTooltip.Rich title="Share" shortcut="Cmd+Shift+S" />}>
                <MockIconButton icon="share" label="Share" size="sm" />
            </MockTooltip>
            <div style={{ width: '1px', background: '#2a2a3a', margin: '0 4px' }} />
            <MockTooltip content={<MockTooltip.Rich title="Delete" description="Cannot be undone" />}>
                <MockIconButton icon="delete" label="Delete" size="sm" variant="danger" />
            </MockTooltip>
        </div>
    ),
};

export const MaxWidth = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <MockTooltip
                content="This is a tooltip with the default max width of 250px. It will wrap to multiple lines when the content exceeds this width."
            >
                <MockButton variant="secondary">Default (250px)</MockButton>
            </MockTooltip>
            <MockTooltip
                content="This tooltip has a custom max width of 150px set explicitly."
                maxWidth={150}
            >
                <MockButton variant="secondary">Narrow (150px)</MockButton>
            </MockTooltip>
            <MockTooltip
                content="This tooltip has a wider max width of 400px for displaying more content."
                maxWidth={400}
            >
                <MockButton variant="secondary">Wide (400px)</MockButton>
            </MockTooltip>
        </div>
    ),
};
