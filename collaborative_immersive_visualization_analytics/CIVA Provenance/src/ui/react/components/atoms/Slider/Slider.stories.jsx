// src/ui/react/components/atoms/Slider/Slider.stories.jsx
import React, { useState } from 'react';

// Mock Slider component for Storybook
const MockSlider = ({
    value = 50,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    showValue = true,
    valueFormatter = (v) => String(Math.round(v)),
    disabled = false,
}) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div style={{ opacity: disabled ? 0.5 : 1 }}>
            {(label || showValue) && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                }}>
                    {label && (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{label}</span>
                    )}
                    {showValue && (
                        <span style={{ fontSize: '12px', color: '#60a5fa', fontFamily: 'monospace' }}>
                            {valueFormatter(value)}
                        </span>
                    )}
                </div>
            )}
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
                    background: '#3b82f6',
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
                    width: '14px',
                    height: '14px',
                    background: '#3b82f6',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    pointerEvents: 'none',
                }} />
            </div>
        </div>
    );
};

export default {
    title: 'Atoms/Slider',
    component: MockSlider,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: function DefaultStory() {
        const [value, setValue] = useState(50);
        return <MockSlider value={value} onChange={setValue} />;
    },
};

export const WithLabel = {
    render: function WithLabelStory() {
        const [value, setValue] = useState(75);
        return <MockSlider value={value} onChange={setValue} label="Volume" />;
    },
};

export const HideValue = {
    render: function HideValueStory() {
        const [value, setValue] = useState(50);
        return <MockSlider value={value} onChange={setValue} label="Brightness" showValue={false} />;
    },
};

export const CustomRange = {
    render: function CustomRangeStory() {
        const [value, setValue] = useState(0);
        return (
            <MockSlider
                value={value}
                onChange={setValue}
                min={-100}
                max={100}
                label="Balance"
            />
        );
    },
};

export const WithStep = {
    render: function WithStepStory() {
        const [value, setValue] = useState(25);
        return (
            <MockSlider
                value={value}
                onChange={setValue}
                min={0}
                max={100}
                step={25}
                label="Quality"
            />
        );
    },
};

export const CustomFormatter = {
    render: function CustomFormatterStory() {
        const [value, setValue] = useState(50);
        return (
            <MockSlider
                value={value}
                onChange={setValue}
                label="Opacity"
                valueFormatter={(v) => `${v}%`}
            />
        );
    },
};

export const Disabled = {
    args: {
        value: 40,
        label: 'Disabled',
        disabled: true,
    },
};

export const TemperatureSlider = {
    render: function TemperatureStory() {
        const [temp, setTemp] = useState(22);
        return (
            <MockSlider
                value={temp}
                onChange={setTemp}
                min={16}
                max={30}
                step={0.5}
                label="Temperature"
                valueFormatter={(v) => `${v}°C`}
            />
        );
    },
};

export const MultipleSliders = {
    render: function MultipleSlidersStory() {
        const [values, setValues] = useState({ r: 128, g: 64, b: 200 });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <MockSlider
                    value={values.r}
                    onChange={(v) => setValues((prev) => ({ ...prev, r: v }))}
                    min={0}
                    max={255}
                    label="Red"
                />
                <MockSlider
                    value={values.g}
                    onChange={(v) => setValues((prev) => ({ ...prev, g: v }))}
                    min={0}
                    max={255}
                    label="Green"
                />
                <MockSlider
                    value={values.b}
                    onChange={(v) => setValues((prev) => ({ ...prev, b: v }))}
                    min={0}
                    max={255}
                    label="Blue"
                />
                <div style={{
                    height: '40px',
                    borderRadius: '4px',
                    background: `rgb(${values.r}, ${values.g}, ${values.b})`,
                }} />
            </div>
        );
    },
};

export const ZoomControl = {
    render: function ZoomControlStory() {
        const [zoom, setZoom] = useState(100);
        return (
            <MockSlider
                value={zoom}
                onChange={setZoom}
                min={25}
                max={400}
                step={25}
                label="Zoom"
                valueFormatter={(v) => `${v}%`}
            />
        );
    },
};
