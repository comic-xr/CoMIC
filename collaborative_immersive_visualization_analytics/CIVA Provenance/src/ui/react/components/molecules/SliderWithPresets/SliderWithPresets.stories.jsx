// src/ui/react/components/molecules/SliderWithPresets/SliderWithPresets.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock component for Storybook
const MockSliderWithPresets = ({
    label,
    icon,
    value = 0.5,
    min = 0,
    max = 1,
    step = 0.01,
    onChange,
    formatValue = (v) => v.toFixed(2),
    presets = [],
    disabled = false,
    disabledReason,
}) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            opacity: disabled ? 0.4 : 1,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon && <span style={{ color: '#9ca3af' }}>{icon}</span>}
                    <span style={{ fontSize: '12px', color: '#e5e7eb' }}>{label}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#60a5fa', fontFamily: 'monospace' }}>
                    {formatValue(value)}
                </span>
            </div>

            <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                }} />
                <div style={{
                    position: 'absolute',
                    width: `${percentage}%`,
                    height: '4px',
                    background: '#60a5fa',
                    borderRadius: '2px',
                }} />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => !disabled && onChange?.(parseFloat(e.target.value))}
                    disabled={disabled}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '20px',
                        opacity: 0,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                />
                <div style={{
                    position: 'absolute',
                    left: `${percentage}%`,
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '12px',
                    background: '#60a5fa',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }} />
            </div>

            {presets.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {presets.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => !disabled && onChange?.(preset)}
                            disabled={disabled}
                            style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                background: value === preset
                                    ? 'rgba(96, 165, 250, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: value === preset
                                    ? '1px solid rgba(96, 165, 250, 0.3)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                color: value === preset ? '#60a5fa' : '#9ca3af',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {formatValue(preset)}
                        </button>
                    ))}
                </div>
            )}

            {disabled && disabledReason && (
                <span style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>
                    {disabledReason}
                </span>
            )}
        </div>
    );
};

export default {
    title: "Molecules/SliderWithPresets",
    component: MockSliderWithPresets,
    parameters: { layout: "centered" },
    decorators: [
        (Story) => (
            <div style={{ padding: "20px", background: "#1a1a2e", width: "300px" }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => {
        const [value, setValue] = useState(0.5);
        return (
            <MockSliderWithPresets
                label="Opacity"
                icon={<Icon name="circle" size={14} />}
                value={value}
                min={0}
                max={1}
                step={0.01}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
            />
        );
    },
};

export const WithPresets = {
    render: () => {
        const [value, setValue] = useState(0.5);
        return (
            <MockSliderWithPresets
                label="Opacity"
                icon={<Icon name="circle" size={14} />}
                value={value}
                min={0}
                max={1}
                step={0.01}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
                presets={[0, 0.25, 0.5, 0.75, 1]}
            />
        );
    },
};

export const Disabled = {
    render: () => (
        <MockSliderWithPresets
            label="Opacity"
            icon={<Icon name="circle" size={14} />}
            value={0.5}
            disabled={true}
            disabledReason="Select an instance first"
            presets={[0, 0.25, 0.5, 0.75, 1]}
            formatValue={(val) => `${Math.round(val * 100)}%`}
        />
    ),
};

export const CustomFormat = {
    render: () => {
        const [value, setValue] = useState(128);
        return (
            <MockSliderWithPresets
                label="Threshold"
                icon={<Icon name="activity" size={14} />}
                value={value}
                min={0}
                max={255}
                step={1}
                onChange={setValue}
                formatValue={(val) => String(Math.round(val))}
                presets={[0, 64, 128, 192, 255]}
            />
        );
    },
};

export const PointSize = {
    render: () => {
        const [value, setValue] = useState(5);
        return (
            <MockSliderWithPresets
                label="Point Size"
                icon={<Icon name="circle" size={14} />}
                value={value}
                min={1}
                max={20}
                step={0.5}
                onChange={setValue}
                formatValue={(val) => `${val.toFixed(1)}px`}
                presets={[1, 3, 5, 10, 15, 20]}
            />
        );
    },
};
