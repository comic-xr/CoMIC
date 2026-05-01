// src/ui/react/components/molecules/SliderMenuOption/SliderMenuOption.stories.jsx
import React, { useState } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock component for Storybook
const MockSliderMenuOption = ({
    icon,
    label,
    description,
    value = 0.5,
    min = 0,
    max = 1,
    step = 0.01,
    onChange,
    formatValue = (v) => v.toFixed(2),
    presets = [],
    disabled = false,
}) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div style={{
            padding: '8px 12px',
            opacity: disabled ? 0.4 : 1,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon && <span style={{ color: '#9ca3af' }}>{icon}</span>}
                    <div>
                        <span style={{ fontSize: '12px', color: '#e5e7eb' }}>{label}</span>
                        {description && (
                            <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0 0' }}>
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                <span style={{ fontSize: '11px', color: '#60a5fa', fontFamily: 'monospace' }}>
                    {formatValue(value)}
                </span>
            </div>

            <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
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
                        height: '16px',
                        opacity: 0,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                />
                <div style={{
                    position: 'absolute',
                    left: `${percentage}%`,
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    background: '#60a5fa',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
            </div>

            {presets.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {presets.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => !disabled && onChange?.(preset)}
                            disabled={disabled}
                            style={{
                                padding: '2px 6px',
                                fontSize: '9px',
                                background: value === preset
                                    ? 'rgba(96, 165, 250, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: value === preset
                                    ? '1px solid rgba(96, 165, 250, 0.3)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '3px',
                                color: value === preset ? '#60a5fa' : '#9ca3af',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {formatValue(preset)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default {
    title: "Molecules/SliderMenuOption",
    component: MockSliderMenuOption,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    width: "280px",
                    padding: "16px",
                    background: "#1a1a1f",
                    borderRadius: "8px",
                    border: "1px solid #333",
                }}
            >
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => {
        const [value, setValue] = useState(0.5);
        return (
            <MockSliderMenuOption
                label="Opacity"
                value={value}
                onChange={setValue}
            />
        );
    },
};

export const WithIcon = {
    render: () => {
        const [value, setValue] = useState(0.75);
        return (
            <MockSliderMenuOption
                icon={<Icon name="circle" size={14} />}
                label="Opacity"
                value={value}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
            />
        );
    },
};

export const WithDescription = {
    render: () => {
        const [value, setValue] = useState(0.5);
        return (
            <MockSliderMenuOption
                icon={<Icon name="sun" size={14} />}
                label="Brightness"
                description="Adjust the brightness of the visualization"
                value={value}
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
            <MockSliderMenuOption
                icon={<Icon name="circle" size={14} />}
                label="Opacity"
                value={value}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
                presets={[0, 0.25, 0.5, 0.75, 1.0]}
            />
        );
    },
};

export const CustomRange = {
    render: () => {
        const [value, setValue] = useState(50);
        return (
            <MockSliderMenuOption
                icon={<Icon name="volume2" size={14} />}
                label="Volume"
                value={value}
                min={0}
                max={100}
                step={1}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val)}%`}
            />
        );
    },
};

export const Disabled = {
    render: () => (
        <MockSliderMenuOption
            icon={<Icon name="layers" size={14} />}
            label="Layer Depth"
            value={0.5}
            onChange={() => { }}
            disabled={true}
            formatValue={(val) => `${Math.round(val * 100)}%`}
        />
    ),
};

export const InMenuContext = {
    render: () => {
        const [opacity, setOpacity] = useState(0.8);
        const [pointSize, setPointSize] = useState(5);
        const [brightness, setBrightness] = useState(1);

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div
                    style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #333",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#e0e0e0",
                        marginBottom: "4px",
                    }}
                >
                    Appearance Settings
                </div>

                <MockSliderMenuOption
                    icon={<Icon name="circle" size={14} />}
                    label="Opacity"
                    value={opacity}
                    onChange={setOpacity}
                    formatValue={(val) => `${Math.round(val * 100)}%`}
                />

                <div style={{ height: "1px", background: "#333", margin: "4px 0" }} />

                <MockSliderMenuOption
                    icon={<Icon name="circle" size={14} />}
                    label="Point Size"
                    value={pointSize}
                    min={1}
                    max={20}
                    step={0.5}
                    onChange={setPointSize}
                    formatValue={(val) => `${val.toFixed(1)}px`}
                />

                <div style={{ height: "1px", background: "#333", margin: "4px 0" }} />

                <MockSliderMenuOption
                    icon={<Icon name="sun" size={14} />}
                    label="Brightness"
                    value={brightness}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={setBrightness}
                    formatValue={(val) => `${Math.round(val * 100)}%`}
                />
            </div>
        );
    },
};
