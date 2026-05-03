// src/ui/react/components/molecules/PanelHeader/PanelHeader.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock PanelHeader component for Storybook
const MockPanelHeader = ({
    title,
    icon,
    size = 'md',
    color = 'blue',
    showDragHandle = false,
    minimized = false,
    actions = [],
    onMinimize,
    onMaximize,
    onDock,
    onClose,
}) => {
    const sizes = {
        sm: { height: '32px', fontSize: '12px', iconSize: 14 },
        md: { height: '40px', fontSize: '13px', iconSize: 16 },
        lg: { height: '48px', fontSize: '14px', iconSize: 18 },
    };
    const s = sizes[size] || sizes.md;

    const colors = {
        blue: '#60a5fa',
        purple: '#c084fc',
        teal: '#2dd4bf',
        amber: '#fbbf24',
        red: '#f87171',
        green: '#4ade80',
    };
    const accentColor = colors[color] || colors.blue;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            height: s.height,
            padding: '0 12px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
            {showDragHandle && (
                <div style={{ marginRight: '8px', cursor: 'grab' }}>
                    <Icon name="gripVertical" size={14} style={{ color: '#4b5563' }} />
                </div>
            )}

            {icon && (
                <Icon name={icon} size={s.iconSize} style={{ color: accentColor, marginRight: '8px' }} />
            )}

            <span style={{
                flex: 1,
                fontSize: s.fontSize,
                fontWeight: 500,
                color: '#e5e7eb',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {title}
            </span>

            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={action.onClick}
                    title={action.tooltip}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: action.danger ? '#f87171' : '#9ca3af',
                        cursor: 'pointer',
                        marginLeft: '4px',
                    }}
                >
                    <Icon name={action.icon} size={14} />
                </button>
            ))}

            {onMinimize && (
                <button
                    onClick={onMinimize}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        marginLeft: '4px',
                    }}
                >
                    <Icon name={minimized ? 'chevronDown' : 'minus'} size={14} />
                </button>
            )}

            {onMaximize && (
                <button
                    onClick={onMaximize}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        marginLeft: '4px',
                    }}
                >
                    <Icon name="maximize" size={14} />
                </button>
            )}

            {onDock && (
                <button
                    onClick={onDock}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        marginLeft: '4px',
                    }}
                >
                    <Icon name="dock_to_left" size={14} />
                </button>
            )}

            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        marginLeft: '4px',
                    }}
                >
                    <Icon name="x" size={14} />
                </button>
            )}
        </div>
    );
};

export default {
    title: 'Molecules/PanelHeader',
    component: MockPanelHeader,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        color: {
            control: 'select',
            options: ['blue', 'purple', 'teal', 'amber', 'red', 'green'],
        },
        onMinimize: { action: 'minimize' },
        onMaximize: { action: 'maximize' },
        onDock: { action: 'dock' },
        onClose: { action: 'close' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '350px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        title: 'Panel Title',
    },
};

export const WithIcon = {
    args: {
        title: 'Settings',
        icon: 'settings',
    },
};

export const WithClose = {
    args: {
        title: 'Panel',
        icon: 'layers',
        onClose: () => {},
    },
};

export const WithAllControls = {
    args: {
        title: 'Floating Panel',
        icon: 'box',
        onMinimize: () => {},
        onMaximize: () => {},
        onDock: () => {},
        onClose: () => {},
    },
};

export const Minimized = {
    args: {
        title: 'Minimized Panel',
        icon: 'folder',
        minimized: true,
        onMinimize: () => {},
        onClose: () => {},
    },
};

export const WithDragHandle = {
    args: {
        title: 'Draggable Panel',
        icon: 'move',
        showDragHandle: true,
        onClose: () => {},
    },
};

export const WithCustomActions = {
    args: {
        title: 'Panel',
        icon: 'file',
        actions: [
            { icon: 'plus', onClick: () => {}, tooltip: 'Add item' },
            { icon: 'refresh', onClick: () => {}, tooltip: 'Refresh' },
            { icon: 'trash', onClick: () => {}, tooltip: 'Delete', danger: true },
        ],
        onClose: () => {},
    },
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MockPanelHeader title="Blue Panel" icon="file" color="blue" onClose={() => {}} />
            <MockPanelHeader title="Purple Panel" icon="database" color="purple" onClose={() => {}} />
            <MockPanelHeader title="Teal Panel" icon="users" color="teal" onClose={() => {}} />
            <MockPanelHeader title="Amber Panel" icon="bell" color="amber" onClose={() => {}} />
            <MockPanelHeader title="Green Panel" icon="check" color="green" onClose={() => {}} />
            <MockPanelHeader title="Red Panel" icon="alertTriangle" color="red" onClose={() => {}} />
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MockPanelHeader title="Small" icon="file" size="sm" onClose={() => {}} />
            <MockPanelHeader title="Medium" icon="file" size="md" onClose={() => {}} />
            <MockPanelHeader title="Large" icon="file" size="lg" onClose={() => {}} />
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
            <MockPanelHeader
                title="Files"
                icon="folder"
                color="blue"
                onMinimize={() => {}}
                onClose={() => {}}
            />
            <div style={{ padding: '16px', color: '#9ca3af' }}>
                Panel content goes here...
            </div>
        </div>
    ),
};

export const FloatingPanel = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
        }}>
            <MockPanelHeader
                title="Properties"
                icon="sliders"
                showDragHandle
                onMinimize={() => {}}
                onMaximize={() => {}}
                onDock={() => {}}
                onClose={() => {}}
            />
            <div style={{ padding: '16px', color: '#9ca3af', minHeight: '100px' }}>
                Floating panel content
            </div>
        </div>
    ),
};
