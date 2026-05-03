// src/ui/react/components/molecules/ColorSwatchGrid/ColorSwatchGrid.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

const DEFAULT_COLORMAPS = [
    { id: 'viridis', name: 'Viridis', gradient: 'linear-gradient(90deg, #440154, #21918c, #fde725)' },
    { id: 'plasma', name: 'Plasma', gradient: 'linear-gradient(90deg, #0d0887, #cc4778, #f0f921)' },
    { id: 'inferno', name: 'Inferno', gradient: 'linear-gradient(90deg, #000004, #bb3754, #fcffa4)' },
    { id: 'magma', name: 'Magma', gradient: 'linear-gradient(90deg, #000004, #b63679, #fcfdbf)' },
    { id: 'rainbow', name: 'Rainbow', gradient: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)' },
    { id: 'jet', name: 'Jet', gradient: 'linear-gradient(90deg, #00007f, #00ffff, #ffff00, #ff0000, #7f0000)' },
];

// Mock component for Storybook
const MockColorSwatchGrid = ({
    colormaps = DEFAULT_COLORMAPS,
    currentColormap,
    onColormapChange,
    disabled = false,
}) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            opacity: disabled ? 0.4 : 1,
        }}>
            {colormaps.map((cmap) => (
                <button
                    key={cmap.id}
                    onClick={() => !disabled && onColormapChange?.(cmap.id)}
                    disabled={disabled}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px',
                        background: currentColormap === cmap.id
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: currentColormap === cmap.id
                            ? '2px solid #60a5fa'
                            : '2px solid transparent',
                        borderRadius: '8px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        background: cmap.gradient,
                    }} />
                    <span style={{
                        fontSize: '10px',
                        color: currentColormap === cmap.id ? '#60a5fa' : '#9ca3af',
                    }}>
                        {cmap.name}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default {
    title: 'Molecules/ColorSwatchGrid',
    component: MockColorSwatchGrid,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '280px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => {
        const [colormap, setColormap] = useState('viridis');
        return <MockColorSwatchGrid currentColormap={colormap} onColormapChange={setColormap} />;
    },
};

export const NoSelection = {
    args: {
        currentColormap: null,
    },
};

export const Disabled = {
    args: {
        currentColormap: 'rainbow',
        disabled: true,
    },
};

export const Interactive = {
    render: () => {
        const [colormap, setColormap] = useState('plasma');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <MockColorSwatchGrid currentColormap={colormap} onColormapChange={setColormap} />
                <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                    Selected: <span style={{ color: '#60a5fa' }}>{colormap}</span>
                </div>
                <div style={{
                    height: '24px',
                    borderRadius: '4px',
                    background: DEFAULT_COLORMAPS.find(c => c.id === colormap)?.gradient || '#333',
                }} />
            </div>
        );
    },
};
