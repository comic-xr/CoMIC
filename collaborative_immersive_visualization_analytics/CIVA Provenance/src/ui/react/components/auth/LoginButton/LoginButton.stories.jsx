// src/ui/react/components/auth/LoginButton.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock LoginButton for Storybook (avoids auth dependencies)
const MockLoginButton = ({
    variant = 'default',
    isLoading = false,
    className = '',
}) => {
    const baseClass = 'login-button';

    if (variant === 'compact') {
        return (
            <button
                className={`${baseClass} ${baseClass}--compact ${className}`}
                disabled={isLoading}
                title="Sign In"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    color: '#60a5fa',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                }}
            >
                <Icon
                    name={isLoading ? 'loader' : 'login'}
                    size={16}
                    className={isLoading ? 'login-button__spinner' : ''}
                />
            </button>
        );
    }

    if (variant === 'full') {
        return (
            <button
                className={`${baseClass} ${baseClass}--full ${className}`}
                disabled={isLoading}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    width: '100%',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                }}
            >
                <Icon
                    name={isLoading ? 'loader' : 'login'}
                    size={18}
                    className={isLoading ? 'login-button__spinner' : ''}
                />
                <span>{isLoading ? 'Signing in...' : 'Sign In with SSO'}</span>
            </button>
        );
    }

    // Default variant
    return (
        <button
            className={`${baseClass} ${className}`}
            disabled={isLoading}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                color: '#60a5fa',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
            }}
        >
            <Icon
                name={isLoading ? 'loader' : 'login'}
                size={16}
                className={isLoading ? 'login-button__spinner' : ''}
            />
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
        </button>
    );
};

export default {
    title: 'Auth/LoginButton',
    component: MockLoginButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'compact', 'full'],
            description: 'Button display variant',
        },
        isLoading: {
            control: 'boolean',
            description: 'Loading state during sign-in',
        },
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
        variant: 'default',
        isLoading: false,
    },
};

export const Compact = {
    args: {
        variant: 'compact',
        isLoading: false,
    },
};

export const Full = {
    args: {
        variant: 'full',
        isLoading: false,
    },
};

export const Loading = {
    args: {
        variant: 'default',
        isLoading: true,
    },
};

export const FullLoading = {
    args: {
        variant: 'full',
        isLoading: true,
    },
};

export const AllVariants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <MockLoginButton variant="compact" />
            <MockLoginButton variant="default" />
            <div style={{ width: '280px' }}>
                <MockLoginButton variant="full" />
            </div>
        </div>
    ),
};

export const LoginCard = {
    render: () => (
        <div style={{
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '320px',
            textAlign: 'center',
        }}>
            <h2 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '20px' }}>
                Welcome Back
            </h2>
            <p style={{ color: '#9ca3af', margin: '0 0 24px 0', fontSize: '14px' }}>
                Sign in to access your workspace
            </p>
            <MockLoginButton variant="full" />
            <p style={{ color: '#6b7280', margin: '16px 0 0 0', fontSize: '12px' }}>
                You will be redirected to your SSO provider
            </p>
        </div>
    ),
};
