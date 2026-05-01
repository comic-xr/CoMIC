// src/ui/react/components/molecules/PositionDisplay/PositionDisplay.stories.jsx
import React, { useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock component for Storybook
const MockPositionDisplay = ({
    current = { x: 0, y: 0 },
    home = { x: 0, y: 0 },
    showHome = false,
    showIcon = true,
    color = '#9ca3af',
    size = 'md',
}) => {
    const isAtHome = current.x === home.x && current.y === home.y;
    const sizes = {
        sm: { fontSize: '10px', iconSize: 12, padding: '4px 8px' },
        md: { fontSize: '12px', iconSize: 14, padding: '6px 10px' },
        lg: { fontSize: '14px', iconSize: 16, padding: '8px 12px' },
    };
    const s = sizes[size] || sizes.md;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: s.padding,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
            {showIcon && (
                <Icon name="grid" size={s.iconSize} style={{ color }} />
            )}
            <span style={{
                fontSize: s.fontSize,
                fontFamily: 'monospace',
                color: '#e5e7eb',
            }}>
                <span style={{ color }}>X:</span> {current.x}
                <span style={{ margin: '0 6px', color: '#4b5563' }}>|</span>
                <span style={{ color }}>Y:</span> {current.y}
            </span>
            {showHome && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '4px',
                    paddingLeft: '8px',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <Icon
                        name={isAtHome ? 'home' : 'navigation'}
                        size={s.iconSize - 2}
                        style={{ color: isAtHome ? '#4ade80' : '#fbbf24' }}
                    />
                    {!isAtHome && (
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>
                            Away
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Molecules/PositionDisplay',
    component: MockPositionDisplay,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
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
        current: { x: 2, y: 3 },
    },
};

export const WithColor = {
    args: {
        current: { x: 1, y: 1 },
        color: '#60a5fa',
    },
};

export const AtHome = {
    args: {
        current: { x: 0, y: 0 },
        home: { x: 0, y: 0 },
        showHome: true,
    },
};

export const AwayFromHome = {
    args: {
        current: { x: 3, y: 2 },
        home: { x: 0, y: 0 },
        showHome: true,
    },
};

export const NoIcon = {
    args: {
        current: { x: 5, y: 7 },
        showIcon: false,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <MockPositionDisplay current={{ x: 2, y: 3 }} size="sm" />
            <MockPositionDisplay current={{ x: 2, y: 3 }} size="md" />
            <MockPositionDisplay current={{ x: 2, y: 3 }} size="lg" />
        </div>
    ),
};

export const LivePosition = {
    render: () => {
        const [position, setPosition] = useState({ x: 0, y: 0 });

        useEffect(() => {
            const interval = setInterval(() => {
                setPosition(prev => ({
                    x: Math.min(9, prev.x + (Math.random() > 0.5 ? 1 : 0)),
                    y: Math.min(9, prev.y + (Math.random() > 0.5 ? 1 : 0)),
                }));
            }, 1000);
            return () => clearInterval(interval);
        }, []);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <MockPositionDisplay
                    current={position}
                    home={{ x: 0, y: 0 }}
                    showHome
                    color="#60a5fa"
                />
                <span style={{ fontSize: '10px', color: '#666' }}>
                    Position updates automatically
                </span>
            </div>
        );
    },
};

export const NavigationContext = {
    render: () => {
        const [position, setPosition] = useState({ x: 2, y: 1 });
        const home = { x: 0, y: 0 };

        const move = (dx, dy) => {
            setPosition(p => ({
                x: Math.max(0, Math.min(9, p.x + dx)),
                y: Math.max(0, Math.min(9, p.y + dy)),
            }));
        };

        const goHome = () => setPosition(home);

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                <MockPositionDisplay
                    current={position}
                    home={home}
                    showHome
                    color="#4ade80"
                />

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => move(0, -1)}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Up
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => move(-1, 0)}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Left
                    </button>
                    <button
                        onClick={goHome}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(96, 165, 250, 0.2)',
                            border: '1px solid rgba(96, 165, 250, 0.3)',
                            borderRadius: '4px',
                            color: '#60a5fa',
                            cursor: 'pointer'
                        }}
                    >
                        Home
                    </button>
                    <button
                        onClick={() => move(1, 0)}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Right
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => move(0, 1)}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Down
                    </button>
                </div>
            </div>
        );
    },
};

export const MultipleViews = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MockPositionDisplay current={{ x: 0, y: 0 }} color="#60a5fa" />
            <MockPositionDisplay current={{ x: 1, y: 0 }} color="#4ade80" />
            <MockPositionDisplay current={{ x: 2, y: 1 }} color="#fbbf24" />
            <MockPositionDisplay current={{ x: 0, y: 2 }} color="#f472b6" />
        </div>
    ),
};
