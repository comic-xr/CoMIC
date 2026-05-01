// src/ui/react/components/dev/DevUserSwitcher.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

const mockUsers = [
    { id: 'dev-1', name: 'Developer', color: '#f59e0b', role: 'admin' },
    { id: 'dev-2', name: 'Alice Chen', color: '#2dd4bf', role: 'editor' },
    { id: 'dev-3', name: 'Bob Smith', color: '#f472b6', role: 'viewer' },
    { id: 'dev-4', name: 'Carol Davis', color: '#60a5fa', role: 'editor' },
];

// Mock DevUserSwitcher for Storybook
const MockDevUserSwitcher = ({
    showLabel = true,
    compact = false,
    currentUser = mockUsers[0],
    allUsers = mockUsers,
    onSwitchUser,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(currentUser);

    const initials = selected.name.split(' ').map(n => n[0]).join('').slice(0, 2);

    const handleSelect = (user) => {
        setSelected(user);
        setIsOpen(false);
        onSwitchUser?.(user);
    };

    if (compact) {
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '11px',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: selected.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                        fontWeight: 600,
                    }}>
                        {initials}
                    </div>
                    {selected.name.split(' ')[0]}
                    <Icon name="chevronDown" size={10} />
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        background: '#1a1a2e',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        zIndex: 1000,
                        minWidth: '140px',
                    }}>
                        {allUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleSelect(user)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: user.id === selected.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: user.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    fontWeight: 600,
                                }}>
                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <span style={{ flex: 1 }}>{user.name}</span>
                                <span style={{ color: '#6b7280', fontSize: '10px' }}>{user.role}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                }}
            >
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: selected.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                }}>
                    {initials}
                </div>
                {showLabel && (
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ color: '#f59e0b', fontSize: '10px' }}>Dev User</div>
                        <div style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
                            {selected.name}
                        </div>
                    </div>
                )}
                <Icon name="chevronDown" size={14} style={{ color: '#f59e0b' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: '#1a1a2e',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 1000,
                    minWidth: '200px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 500 }}>
                            Switch Test User
                        </div>
                    </div>
                    <div style={{ padding: '4px' }}>
                        {allUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleSelect(user)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: user.id === selected.id ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: user.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                }}>
                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                    <div style={{ color: '#6b7280', fontSize: '11px' }}>{user.role}</div>
                                </div>
                                {user.id === selected.id && (
                                    <Icon name="check" size={14} style={{ color: '#f59e0b' }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Dev/DevUserSwitcher',
    component: MockDevUserSwitcher,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        showLabel: { control: 'boolean' },
        compact: { control: 'boolean' },
        onSwitchUser: { action: 'user switched' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '100px 40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        showLabel: true,
    },
};

export const Compact = {
    args: {
        compact: true,
    },
};

export const NoLabel = {
    args: {
        showLabel: false,
    },
};

export const InDevBanner = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '6px 16px',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.9), rgba(234, 88, 12, 0.9))',
            borderRadius: '8px',
        }}>
            <Icon name="warning" size={14} style={{ color: 'white' }} />
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>
                Development Mode
            </span>
            <MockDevUserSwitcher compact />
        </div>
    ),
};
