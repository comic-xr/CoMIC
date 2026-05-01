// src/ui/react/components/atoms/PresenceIndicator/PresenceIndicator.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Status configuration
const STATUS_CONFIG = {
    online: { color: '#22c55e', label: 'Online', icon: 'check' },
    active: { color: '#22c55e', label: 'Active', icon: 'check' },
    idle: { color: '#fbbf24', label: 'Idle', icon: 'clock' },
    away: { color: '#f97316', label: 'Away', icon: 'coffee' },
    dnd: { color: '#ef4444', label: 'Do Not Disturb', icon: 'minusCircle' },
    busy: { color: '#ef4444', label: 'Busy', icon: 'minusCircle' },
    offline: { color: '#6b7280', label: 'Offline', icon: 'circle' },
};

// Mock PresenceIndicator component for Storybook
const MockPresenceIndicator = ({
    status = 'online',
    size = 'md',
    variant = 'dot',
    showLabel = false,
    pulse = false,
}) => {
    const sizes = {
        xs: { dot: 6, icon: 10, fontSize: '10px' },
        sm: { dot: 8, icon: 12, fontSize: '11px' },
        md: { dot: 10, icon: 14, fontSize: '12px' },
        lg: { dot: 12, icon: 16, fontSize: '13px' },
    };
    const s = sizes[size] || sizes.md;
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {variant === 'dot' ? (
                <div style={{
                    width: `${s.dot}px`,
                    height: `${s.dot}px`,
                    borderRadius: '50%',
                    background: config.color,
                    boxShadow: pulse ? `0 0 0 2px rgba(34, 197, 94, 0.3)` : 'none',
                    animation: pulse ? 'pulse 2s infinite' : 'none',
                }} />
            ) : (
                <Icon name={config.icon} size={s.icon} style={{ color: config.color }} />
            )}
            {showLabel && (
                <span style={{ fontSize: s.fontSize, color: config.color }}>
                    {config.label}
                </span>
            )}
        </div>
    );
};

export default {
    title: 'Atoms/PresenceIndicator',
    component: MockPresenceIndicator,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        status: {
            control: 'select',
            options: ['online', 'idle', 'away', 'dnd', 'offline', 'active', 'busy'],
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        variant: {
            control: 'select',
            options: ['dot', 'icon'],
        },
        showLabel: {
            control: 'boolean',
        },
        pulse: {
            control: 'boolean',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '20px', background: '#1a1a2e' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        status: 'online',
        size: 'md',
        variant: 'dot',
    },
};

export const AllStatuses = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MockPresenceIndicator status="online" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MockPresenceIndicator status="idle" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MockPresenceIndicator status="away" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MockPresenceIndicator status="dnd" showLabel />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MockPresenceIndicator status="offline" showLabel />
            </div>
        </div>
    ),
};

export const AllSizes = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <MockPresenceIndicator status="online" size="xs" />
                <span style={{ color: '#666', fontSize: '10px' }}>xs</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <MockPresenceIndicator status="online" size="sm" />
                <span style={{ color: '#666', fontSize: '10px' }}>sm</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <MockPresenceIndicator status="online" size="md" />
                <span style={{ color: '#666', fontSize: '10px' }}>md</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <MockPresenceIndicator status="online" size="lg" />
                <span style={{ color: '#666', fontSize: '10px' }}>lg</span>
            </div>
        </div>
    ),
};

export const DotVariant = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <MockPresenceIndicator status="online" variant="dot" />
            <MockPresenceIndicator status="idle" variant="dot" />
            <MockPresenceIndicator status="away" variant="dot" />
            <MockPresenceIndicator status="dnd" variant="dot" />
            <MockPresenceIndicator status="offline" variant="dot" />
        </div>
    ),
};

export const IconVariant = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <MockPresenceIndicator status="online" variant="icon" />
            <MockPresenceIndicator status="idle" variant="icon" />
            <MockPresenceIndicator status="away" variant="icon" />
            <MockPresenceIndicator status="dnd" variant="icon" />
            <MockPresenceIndicator status="offline" variant="icon" />
        </div>
    ),
};

export const WithLabels = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MockPresenceIndicator status="online" showLabel />
            <MockPresenceIndicator status="idle" showLabel />
            <MockPresenceIndicator status="away" showLabel />
            <MockPresenceIndicator status="dnd" showLabel />
            <MockPresenceIndicator status="offline" showLabel />
        </div>
    ),
};

export const IconWithLabels = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MockPresenceIndicator status="online" variant="icon" showLabel />
            <MockPresenceIndicator status="idle" variant="icon" showLabel />
            <MockPresenceIndicator status="away" variant="icon" showLabel />
            <MockPresenceIndicator status="dnd" variant="icon" showLabel />
            <MockPresenceIndicator status="offline" variant="icon" showLabel />
        </div>
    ),
};

export const WithPulse = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <MockPresenceIndicator status="online" pulse />
            <MockPresenceIndicator status="online" pulse size="lg" />
            <MockPresenceIndicator status="online" pulse showLabel />
        </div>
    ),
};

export const StatusAliases = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>
                Status aliases (for compatibility):
            </div>
            <MockPresenceIndicator status="active" showLabel />
            <MockPresenceIndicator status="busy" showLabel />
        </div>
    ),
};

export const InContext = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    AC
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MockPresenceIndicator status="online" size="xs" />
                        Alice Chen
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Working on feature branch</div>
                </div>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#2196F3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    BS
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MockPresenceIndicator status="idle" size="xs" />
                        Bob Smith
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Away for 5 minutes</div>
                </div>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                opacity: 0.6,
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#607D8B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    CD
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MockPresenceIndicator status="offline" size="xs" />
                        Carol Davis
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Last seen 2 hours ago</div>
                </div>
            </div>
        </div>
    ),
};
