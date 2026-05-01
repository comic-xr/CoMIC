// src/ui/react/components/auth/UserMenu.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock UserMenu for Storybook (avoids auth dependencies)
const MockUserMenu = ({
    userName = 'John Doe',
    userEmail = 'john.doe@example.com',
    userColor = '#2dd4bf',
    inVoice = false,
    isAdmin = false,
    isDevBypass = false,
    onProfileClick,
    onSettingsClick,
    onLogout,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const initial = userName[0].toUpperCase();

    return (
        <div style={{ position: 'relative' }}>
            {/* Avatar button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: userColor,
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: inVoice ? `0 0 0 2px ${userColor}` : 'none',
                    }}
                >
                    {initial}
                </span>
                <Icon
                    name="chevronDown"
                    size={14}
                    style={{
                        color: '#9ca3af',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                    }}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        width: '240px',
                        background: '#1a1a2e',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden',
                        zIndex: 1000,
                    }}
                >
                    {/* User info header */}
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: userColor,
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                }}
                            >
                                {initial}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ color: 'white', fontWeight: 500, fontSize: '14px' }}>
                                    {userName}
                                </div>
                                <div style={{
                                    color: '#9ca3af',
                                    fontSize: '12px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {userEmail}
                                </div>
                                {isDevBypass && (
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '4px',
                                        padding: '2px 6px',
                                        background: 'rgba(245, 158, 11, 0.2)',
                                        color: '#f59e0b',
                                        fontSize: '10px',
                                        borderRadius: '4px',
                                    }}>
                                        Dev Mode
                                    </span>
                                )}
                                {isAdmin && !isDevBypass && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginTop: '4px',
                                        padding: '2px 6px',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        color: '#60a5fa',
                                        fontSize: '10px',
                                        borderRadius: '4px',
                                    }}>
                                        <Icon name="shield" size={10} /> Admin
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: '8px' }}>
                        <button
                            onClick={() => { setIsOpen(false); onProfileClick?.(); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '10px 12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#e5e7eb',
                                fontSize: '13px',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <Icon name="user" size={16} />
                            <span>Profile</span>
                        </button>
                        <button
                            onClick={() => { setIsOpen(false); onSettingsClick?.(); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '10px 12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#e5e7eb',
                                fontSize: '13px',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <Icon name="userCog" size={16} />
                            <span>Settings</span>
                        </button>
                    </div>

                    <div style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '8px',
                    }}>
                        <button
                            onClick={() => { setIsOpen(false); onLogout?.(); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '10px 12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#ef4444',
                                fontSize: '13px',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <Icon name="logout" size={16} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Auth/UserMenu',
    component: MockUserMenu,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        userName: { control: 'text' },
        userEmail: { control: 'text' },
        userColor: { control: 'color' },
        inVoice: { control: 'boolean' },
        isAdmin: { control: 'boolean' },
        isDevBypass: { control: 'boolean' },
        onProfileClick: { action: 'profile clicked' },
        onSettingsClick: { action: 'settings clicked' },
        onLogout: { action: 'logout clicked' },
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '100px 40px 200px',
                background: '#0a0a0f',
                display: 'flex',
                justifyContent: 'flex-end',
            }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        userColor: '#2dd4bf',
    },
};

export const InVoiceChat = {
    args: {
        userName: 'Jane Smith',
        userEmail: 'jane.smith@example.com',
        userColor: '#f472b6',
        inVoice: true,
    },
};

export const AdminUser = {
    args: {
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        userColor: '#60a5fa',
        isAdmin: true,
    },
};

export const DevMode = {
    args: {
        userName: 'Developer',
        userEmail: 'dev@localhost',
        userColor: '#f59e0b',
        isDevBypass: true,
    },
};

export const HeaderContext = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: '#1a1a2e',
            borderRadius: '8px',
            width: '600px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: 'white', fontWeight: 600 }}>CIA Web</div>
                <span style={{ color: '#6b7280' }}>|</span>
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>Project Alpha</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '8px',
                }}>
                    <Icon name="bell" size={18} />
                </button>
                <MockUserMenu
                    userName="John Doe"
                    userEmail="john.doe@example.com"
                    userColor="#2dd4bf"
                />
            </div>
        </div>
    ),
};
