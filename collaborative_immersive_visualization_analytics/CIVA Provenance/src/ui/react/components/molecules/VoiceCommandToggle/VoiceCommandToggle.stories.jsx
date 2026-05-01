// src/ui/react/components/molecules/VoiceCommandToggle/VoiceCommandToggle.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock VoiceCommandToggle component
const MockVoiceCommandToggle = ({
    active = false,
    listening = false,
    disabled = false,
    onClick,
    onToggle,
}) => (
    <button
        onClick={() => {
            onClick?.();
            onToggle?.(!active);
        }}
        disabled={disabled}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: active ? (listening ? '#22c55e' : '#3b82f6') : '#2d2d4a',
            border: 'none',
            borderRadius: '20px',
            color: active ? 'white' : '#9ca3af',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s',
        }}
    >
        <Icon name="mic" size={16} style={{
            animation: listening ? 'pulse 1.5s infinite' : 'none',
        }} />
        <span>{listening ? 'Listening...' : (active ? 'Voice On' : 'Voice Off')}</span>
        {listening && (
            <span style={{
                width: '8px',
                height: '8px',
                background: '#22c55e',
                borderRadius: '50%',
                animation: 'pulse 1s infinite',
            }} />
        )}
    </button>
);

export default {
    title: 'Molecules/VoiceCommandToggle',
    component: MockVoiceCommandToggle,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onClick: { action: 'clicked' },
        onToggle: { action: 'toggled' },
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
        active: false,
    },
};

export const Active = {
    args: {
        active: true,
    },
};

export const Listening = {
    args: {
        active: true,
        listening: true,
    },
};

export const Disabled = {
    args: {
        disabled: true,
    },
};

export const Interactive = {
    render: function InteractiveStory() {
        const [active, setActive] = useState(false);
        const [listening, setListening] = useState(false);

        const handleToggle = () => {
            if (!active) {
                setActive(true);
                setListening(true);
                setTimeout(() => setListening(false), 3000);
            } else {
                setActive(false);
                setListening(false);
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <MockVoiceCommandToggle
                    active={active}
                    listening={listening}
                    onClick={handleToggle}
                />
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {listening ? 'Say a command...' : (active ? 'Click to activate listening' : 'Click to enable voice')}
                </span>
            </div>
        );
    },
};

export const InStatusBar = {
    render: function StatusBarStory() {
        const [active, setActive] = useState(true);

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 16px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Status:</span>
                <span style={{ color: '#22c55e', fontSize: '12px' }}>● Connected</span>
                <div style={{ flex: 1 }} />
                <MockVoiceCommandToggle
                    active={active}
                    onToggle={setActive}
                />
            </div>
        );
    },
};

export const AllStates = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MockVoiceCommandToggle active={false} />
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Inactive</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MockVoiceCommandToggle active={true} />
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Active (standby)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MockVoiceCommandToggle active={true} listening={true} />
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Listening</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MockVoiceCommandToggle disabled />
                <span style={{ color: '#6b7280', fontSize: '12px' }}>Disabled</span>
            </div>
        </div>
    ),
};
