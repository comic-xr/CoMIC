// src/ui/react/components/atoms/FlowDirectionToggle/FlowDirectionToggle.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock FlowDirectionToggle for Storybook
const MockFlowDirectionToggle = ({ direction = 'row', onChange }) => {
    return (
        <div
            style={{
                display: 'flex',
                gap: '2px',
                background: '#1a1a2e',
                borderRadius: '6px',
                padding: '3px',
            }}
            role="group"
            aria-label="Flow direction"
        >
            <button
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    background: direction === 'row' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: direction === 'row' ? '#60a5fa' : '#6b7280',
                    cursor: 'pointer',
                }}
                onClick={() => onChange?.('row')}
                aria-pressed={direction === 'row'}
                type="button"
                title="Row-first placement"
            >
                <Icon name="arrowRight" size={16} />
            </button>
            <button
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    background: direction === 'column' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: direction === 'column' ? '#60a5fa' : '#6b7280',
                    cursor: 'pointer',
                }}
                onClick={() => onChange?.('column')}
                aria-pressed={direction === 'column'}
                type="button"
                title="Column-first placement"
            >
                <Icon name="arrowDown" size={16} />
            </button>
        </div>
    );
};

// Interactive wrapper
const InteractiveFlowToggle = () => {
    const [direction, setDirection] = useState('row');
    return (
        <div>
            <MockFlowDirectionToggle direction={direction} onChange={setDirection} />
            <div style={{ marginTop: '16px', color: '#9ca3af', fontSize: '12px' }}>
                Current: <strong style={{ color: '#60a5fa' }}>{direction}</strong>-first placement
            </div>
        </div>
    );
};

export default {
    title: 'Atoms/FlowDirectionToggle',
    component: MockFlowDirectionToggle,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        direction: {
            control: 'select',
            options: ['row', 'column'],
            description: 'Current flow direction',
        },
        onChange: { action: 'direction changed' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Row = {
    args: {
        direction: 'row',
    },
};

export const Column = {
    args: {
        direction: 'column',
    },
};

export const Interactive = {
    render: () => <InteractiveFlowToggle />,
};

export const WithContext = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Auto-place:</span>
            <InteractiveFlowToggle />
        </div>
    ),
};
