// src/ui/react/components/atoms/Toggle/Toggle.stories.jsx
import React, { useState } from 'react';

// Mock Toggle component for Storybook
const MockToggle = ({
    checked = false,
    onChange,
    label,
    labelPosition = 'right',
    size = 'md',
    color = '#3b82f6',
    disabled = false,
}) => {
    const sizes = {
        sm: { width: 32, height: 18, knob: 14 },
        md: { width: 40, height: 22, knob: 18 },
    };
    const s = sizes[size] || sizes.md;

    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
        }}>
            <div
                onClick={() => !disabled && onChange?.(!checked)}
                style={{
                    position: 'relative',
                    width: `${s.width}px`,
                    height: `${s.height}px`,
                    background: checked ? color : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: `${s.height}px`,
                    transition: 'all 0.2s',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: checked ? `${s.width - s.knob - 2}px` : '2px',
                    width: `${s.knob}px`,
                    height: `${s.knob}px`,
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
            </div>
            {label && (
                <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{label}</span>
            )}
        </label>
    );
};

export default {
    title: 'Atoms/Toggle',
    component: MockToggle,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md'],
        },
        labelPosition: {
            control: 'select',
            options: ['left', 'right'],
        },
        color: { control: 'color' },
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
    render: function DefaultStory() {
        const [checked, setChecked] = useState(false);
        return <MockToggle checked={checked} onChange={setChecked} />;
    },
};

export const Checked = {
    render: function CheckedStory() {
        const [checked, setChecked] = useState(true);
        return <MockToggle checked={checked} onChange={setChecked} />;
    },
};

export const WithLabel = {
    render: function WithLabelStory() {
        const [checked, setChecked] = useState(false);
        return <MockToggle checked={checked} onChange={setChecked} label="Enable notifications" />;
    },
};

export const LabelLeft = {
    render: function LabelLeftStory() {
        const [checked, setChecked] = useState(true);
        return <MockToggle checked={checked} onChange={setChecked} label="Dark mode" labelPosition="left" />;
    },
};

export const Disabled = {
    args: {
        checked: false,
        disabled: true,
    },
};

export const DisabledChecked = {
    args: {
        checked: true,
        disabled: true,
    },
};

export const CustomColor = {
    render: function CustomColorStory() {
        const [checked, setChecked] = useState(true);
        return <MockToggle checked={checked} onChange={setChecked} color="#22c55e" />;
    },
};

export const Sizes = {
    render: function SizesStory() {
        const [small, setSmall] = useState(true);
        const [medium, setMedium] = useState(true);
        return (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <MockToggle checked={small} onChange={setSmall} size="sm" label="Small" />
                <MockToggle checked={medium} onChange={setMedium} size="md" label="Medium" />
            </div>
        );
    },
};

export const SettingsPanel = {
    render: function SettingsPanelStory() {
        const [settings, setSettings] = useState({
            notifications: true,
            sounds: false,
            darkMode: true,
            analytics: false,
        });

        const toggle = (key) => {
            setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
        };

        return (
            <div style={{
                background: '#1a1a2e',
                borderRadius: '8px',
                padding: '16px',
                width: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <MockToggle
                    checked={settings.notifications}
                    onChange={() => toggle('notifications')}
                    label="Push notifications"
                />
                <MockToggle
                    checked={settings.sounds}
                    onChange={() => toggle('sounds')}
                    label="Sound effects"
                />
                <MockToggle
                    checked={settings.darkMode}
                    onChange={() => toggle('darkMode')}
                    label="Dark mode"
                />
                <MockToggle
                    checked={settings.analytics}
                    onChange={() => toggle('analytics')}
                    label="Usage analytics"
                />
            </div>
        );
    },
};

export const AllStates = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <MockToggle checked={false} onChange={() => {}} />
                <span>Unchecked</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <MockToggle checked={true} onChange={() => {}} />
                <span>Checked</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <MockToggle checked={false} disabled onChange={() => {}} />
                <span>Disabled unchecked</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#9ca3af' }}>
                <MockToggle checked={true} disabled onChange={() => {}} />
                <span>Disabled checked</span>
            </div>
        </div>
    ),
};
