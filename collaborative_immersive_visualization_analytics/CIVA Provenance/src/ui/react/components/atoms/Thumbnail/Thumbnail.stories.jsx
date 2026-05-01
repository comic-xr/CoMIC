// src/ui/react/components/atoms/Thumbnail/Thumbnail.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock Thumbnail component for Storybook since real one requires server connection
const MockThumbnail = ({
    size = 'md',
    state = 'placeholder',
    instanceType = 'vtk',
    onClick,
    className = '',
}) => {
    const sizeMap = {
        xs: { width: 40, height: 30 },
        sm: { width: 60, height: 45 },
        md: { width: 80, height: 60 },
        lg: { width: 120, height: 90 },
        fill: { width: '100%', height: '100%' },
    };

    const iconMap = {
        vtk: 'box',
        '3d': 'box',
        chart: 'barChart',
        image: 'image',
    };

    const dimensions = sizeMap[size] || sizeMap.md;
    const iconName = iconMap[instanceType] || 'image';

    const baseStyle = {
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
    };

    if (state === 'loading') {
        return (
            <div
                className={`thumbnail thumbnail--${size} ${className}`}
                style={{ ...baseStyle, background: '#1a1a2e' }}
                onClick={onClick}
            >
                <Icon name="loader" className="thumbnail__spinner" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (state === 'loaded') {
        return (
            <div
                className={`thumbnail thumbnail--${size} ${className}`}
                style={{ ...baseStyle, background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%)' }}
                onClick={onClick}
            >
                <img
                    src="https://via.placeholder.com/120x90/1a1a2e/3b82f6?text=Preview"
                    alt="Thumbnail"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div
                className={`thumbnail thumbnail--${size} ${className}`}
                style={{ ...baseStyle, background: '#1a1a2e', border: '1px solid #ef4444' }}
                onClick={onClick}
            >
                <Icon name="imageOff" style={{ color: '#ef4444' }} />
            </div>
        );
    }

    // placeholder state
    return (
        <div
            className={`thumbnail thumbnail--${size} ${className}`}
            style={{ ...baseStyle, background: '#1a1a2e', border: '1px solid #374151' }}
            onClick={onClick}
        >
            <Icon name={iconName} style={{ color: '#6b7280' }} />
        </div>
    );
};

export default {
    title: 'Atoms/Thumbnail',
    component: MockThumbnail,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        state: {
            control: 'select',
            options: ['placeholder', 'loading', 'loaded', 'error'],
        },
        instanceType: {
            control: 'select',
            options: ['vtk', '3d', 'chart', 'image'],
        },
        onClick: { action: 'clicked' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Placeholder = {
    args: {
        state: 'placeholder',
        size: 'md',
    },
};

export const Loading = {
    args: {
        state: 'loading',
        size: 'md',
    },
};

export const Loaded = {
    args: {
        state: 'loaded',
        size: 'md',
    },
};

export const Error = {
    args: {
        state: 'error',
        size: 'md',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail size="xs" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>XS</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail size="sm" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>SM</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail size="md" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>MD</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail size="lg" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>LG</div>
            </div>
        </div>
    ),
};

export const InstanceTypes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail instanceType="vtk" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>VTK/3D</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail instanceType="chart" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Chart</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail instanceType="image" state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Image</div>
            </div>
        </div>
    ),
};

export const AllStates = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail state="placeholder" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Placeholder</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail state="loading" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Loading</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail state="loaded" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Loaded</div>
            </div>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <MockThumbnail state="error" />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Error</div>
            </div>
        </div>
    ),
};

export const Clickable = {
    args: {
        state: 'loaded',
        size: 'lg',
        onClick: () => {},
    },
};

export const ThumbnailGrid = {
    render: () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            width: '280px',
        }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <MockThumbnail
                    key={i}
                    state={i % 3 === 0 ? 'loaded' : 'placeholder'}
                    size="md"
                    onClick={() => {}}
                />
            ))}
        </div>
    ),
};
