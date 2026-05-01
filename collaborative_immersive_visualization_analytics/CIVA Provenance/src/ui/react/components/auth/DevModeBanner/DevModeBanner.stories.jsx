// src/ui/react/components/auth/DevModeBanner.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock DevUserSwitcher for the banner
const MockDevUserSwitcher = ({ compact = false }) => {
    const users = ['Developer', 'Admin', 'Guest'];
    const [current, setCurrent] = useState('Developer');
    const [isOpen, setIsOpen] = useState(false);

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
                    <Icon name="user" size={12} />
                    {current}
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
                        borderRadius: '4px',
                        overflow: 'hidden',
                        zIndex: 1000,
                    }}>
                        {users.map(user => (
                            <button
                                key={user}
                                onClick={() => { setCurrent(user); setIsOpen(false); }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: user === current ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                {user}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return null;
};

// Mock DevModeBanner for Storybook
const MockDevModeBanner = ({
    visible = true,
    message = 'Development Mode',
    isDismissed = false,
    onDismiss,
}) => {
    const [dismissed, setDismissed] = useState(isDismissed);

    if (!visible || dismissed) {
        return null;
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '6px 16px',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.9), rgba(234, 88, 12, 0.9))',
            color: 'white',
            fontSize: '12px',
            fontWeight: 500,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="warning" size={14} />
                <span>{message}</span>
                <MockDevUserSwitcher compact />
            </div>
            <button
                onClick={() => { setDismissed(true); onDismiss?.(); }}
                title="Dismiss (will reappear on refresh)"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                }}
            >
                <Icon name="close" size={12} />
            </button>
        </div>
    );
};

export default {
    title: 'Auth/DevModeBanner',
    component: MockDevModeBanner,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        visible: { control: 'boolean' },
        message: { control: 'text' },
        isDismissed: { control: 'boolean' },
        onDismiss: { action: 'dismissed' },
    },
};

export const Default = {
    args: {
        visible: true,
        message: 'Development Mode',
    },
};

export const CustomMessage = {
    args: {
        visible: true,
        message: 'Dev Mode - Auth Bypassed',
    },
};

export const WithAppContext = {
    render: () => (
        <div style={{ background: '#0a0a0f', minHeight: '300px' }}>
            <MockDevModeBanner message="Development Mode" />
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                background: '#1a1a2e',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                    CIA Web
                </div>
                <div style={{ display: 'flex', gap: '16px', color: '#9ca3af' }}>
                    <span>Project: Demo</span>
                    <span>Room: default</span>
                </div>
            </div>
            <div style={{
                padding: '40px',
                color: '#6b7280',
                textAlign: 'center',
            }}>
                Application content would appear here
            </div>
        </div>
    ),
};

export const Hidden = {
    args: {
        visible: false,
    },
};
