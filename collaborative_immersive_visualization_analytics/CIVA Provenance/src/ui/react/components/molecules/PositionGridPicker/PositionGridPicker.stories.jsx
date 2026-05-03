// src/ui/react/components/molecules/PositionGridPicker/PositionGridPicker.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

const defaultPositions = [
    { id: 'TOP_LEFT', icon: 'arrowUpLeft', label: 'Top Left' },
    { id: 'TOP_RIGHT', icon: 'arrowUpRight', label: 'Top Right' },
    { id: 'BOTTOM_LEFT', icon: 'arrowDownLeft', label: 'Bottom Left' },
    { id: 'BOTTOM_RIGHT', icon: 'arrowDownRight', label: 'Bottom Right' },
];

// Mock component for Storybook
const MockPositionGridPicker = ({
    positions = defaultPositions,
    currentPosition,
    onPositionChange,
    disabled = false,
}) => {
    const grid = [
        [positions.find(p => p.id === 'TOP_LEFT'), positions.find(p => p.id === 'TOP_RIGHT')],
        [positions.find(p => p.id === 'BOTTOM_LEFT'), positions.find(p => p.id === 'BOTTOM_RIGHT')],
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            opacity: disabled ? 0.4 : 1,
        }}>
            {grid.map((row, rowIndex) => (
                <div key={rowIndex} style={{ display: 'flex', gap: '4px' }}>
                    {row.map((pos) => {
                        if (!pos) return null;
                        const isSelected = currentPosition === pos.id;
                        return (
                            <button
                                key={pos.id}
                                onClick={() => !disabled && onPositionChange?.(pos.id)}
                                disabled={disabled}
                                title={pos.label}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isSelected
                                        ? 'rgba(59, 130, 246, 0.3)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: isSelected
                                        ? '2px solid #60a5fa'
                                        : '2px solid transparent',
                                    borderRadius: '6px',
                                    color: isSelected ? '#60a5fa' : '#9ca3af',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Icon name={pos.icon} size={16} />
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default {
    title: 'Molecules/PositionGridPicker',
    component: MockPositionGridPicker,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => {
        const [position, setPosition] = useState('TOP_LEFT');
        return <MockPositionGridPicker currentPosition={position} onPositionChange={setPosition} />;
    },
};

export const NoSelection = {
    args: {
        currentPosition: null,
    },
};

export const Disabled = {
    args: {
        currentPosition: 'TOP_LEFT',
        disabled: true,
    },
};

export const Interactive = {
    render: () => {
        const [position, setPosition] = useState('BOTTOM_RIGHT');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <MockPositionGridPicker currentPosition={position} onPositionChange={setPosition} />
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Selected: <span style={{ color: '#60a5fa' }}>{position}</span>
                </div>
            </div>
        );
    },
};
