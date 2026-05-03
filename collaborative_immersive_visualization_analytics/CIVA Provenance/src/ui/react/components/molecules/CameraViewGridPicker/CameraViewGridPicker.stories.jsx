// src/ui/react/components/molecules/CameraViewGridPicker/CameraViewGridPicker.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock component for Storybook
const MockCameraViewGridPicker = ({ views = [], disabled = false, onViewChange }) => {
    const [hoveredCell, setHoveredCell] = useState(null);

    const iconMap = {
        'camera': 'camera',
        'box': 'box',
        'maximize-2': 'maximize',
    };

    const viewsMap = views.reduce((acc, view) => {
        acc[view.id] = view;
        return acc;
    }, {});

    const grid = [
        [viewsMap.top, viewsMap.isometric, null],
        [viewsMap.left, viewsMap.reset, viewsMap.right],
        [viewsMap.bottom, viewsMap.front, viewsMap.back],
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                opacity: disabled ? 0.4 : 1,
            }}>
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} style={{ display: 'flex', gap: '2px' }}>
                        {row.map((view, colIndex) => {
                            if (!view) {
                                return (
                                    <div
                                        key={`empty-${rowIndex}-${colIndex}`}
                                        style={{
                                            width: '44px',
                                            height: '44px',
                                            background: 'transparent',
                                        }}
                                    />
                                );
                            }

                            const iconName = iconMap[view.icon] || 'camera';
                            const isHovered = hoveredCell === view.id;

                            return (
                                <button
                                    key={view.id}
                                    onClick={() => !disabled && onViewChange?.(view.id)}
                                    onMouseEnter={() => !disabled && setHoveredCell(view.id)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    title={view.label}
                                    disabled={disabled}
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        background: view.special
                                            ? 'rgba(59, 130, 246, 0.2)'
                                            : isHovered
                                                ? 'rgba(255, 255, 255, 0.1)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: view.special ? '#60a5fa' : '#e5e7eb',
                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <Icon name={iconName} size={14} />
                                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{view.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
            {hoveredCell && (
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    Switch to {hoveredCell} view
                </div>
            )}
        </div>
    );
};

const defaultViews = [
    { id: 'top', icon: 'camera', label: 'Top' },
    { id: 'isometric', icon: 'box', label: 'Iso', special: true },
    { id: 'left', icon: 'camera', label: 'Left' },
    { id: 'reset', icon: 'maximize-2', label: 'Reset', special: true },
    { id: 'right', icon: 'camera', label: 'Right' },
    { id: 'bottom', icon: 'camera', label: 'Bottom' },
    { id: 'front', icon: 'camera', label: 'Front' },
    { id: 'back', icon: 'camera', label: 'Back' },
];

export default {
    title: 'Molecules/CameraViewGridPicker',
    component: MockCameraViewGridPicker,
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
    args: {
        views: defaultViews,
    },
};

export const Disabled = {
    args: {
        views: defaultViews,
        disabled: true,
    },
};

export const Interactive = {
    render: () => {
        const [lastClicked, setLastClicked] = useState(null);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <MockCameraViewGridPicker views={defaultViews} onViewChange={setLastClicked} />
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Last clicked: <span style={{ color: '#60a5fa' }}>{lastClicked || 'none'}</span>
                </div>
            </div>
        );
    },
};
