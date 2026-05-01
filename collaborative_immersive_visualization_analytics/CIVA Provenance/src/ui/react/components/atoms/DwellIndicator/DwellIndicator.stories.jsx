// src/ui/react/components/atoms/DwellIndicator/DwellIndicator.stories.jsx
import React, { useState, useEffect } from 'react';
import { DwellIndicator } from './DwellIndicator';
import { AdaptiveProvider } from '@UI/react/context/AdaptiveContext';

export default {
    title: 'Atoms/DwellIndicator',
    component: DwellIndicator,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        progress: {
            control: { type: 'range', min: 0, max: 1, step: 0.01 },
        },
        size: {
            control: { type: 'number', min: 20, max: 100 },
        },
        strokeWidth: {
            control: { type: 'number', min: 1, max: 10 },
        },
        color: {
            control: 'color',
        },
        backgroundColor: {
            control: 'color',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <AdaptiveProvider initialMode="vr">
                    <Story />
                </AdaptiveProvider>
            </div>
        ),
    ],
};

export const Default = {
    args: {
        progress: 0.5,
    },
};

export const QuarterProgress = {
    args: {
        progress: 0.25,
    },
};

export const ThreeQuarterProgress = {
    args: {
        progress: 0.75,
    },
};

export const NearComplete = {
    args: {
        progress: 0.95,
    },
};

export const CustomSize = {
    args: {
        progress: 0.6,
        size: 60,
    },
};

export const CustomColors = {
    args: {
        progress: 0.5,
        color: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
    },
};

export const ThickStroke = {
    args: {
        progress: 0.5,
        strokeWidth: 6,
        size: 50,
    },
};

export const Animated = {
    render: function AnimatedStory() {
        const [progress, setProgress] = useState(0);

        useEffect(() => {
            const interval = setInterval(() => {
                setProgress((p) => {
                    const next = p + 0.02;
                    return next >= 1 ? 0.01 : next;
                });
            }, 50);
            return () => clearInterval(interval);
        }, []);

        return <DwellIndicator progress={progress} />;
    },
};

export const AllSizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <DwellIndicator progress={0.5} size={24} strokeWidth={2} />
            <DwellIndicator progress={0.5} size={40} strokeWidth={3} />
            <DwellIndicator progress={0.5} size={60} strokeWidth={4} />
            <DwellIndicator progress={0.5} size={80} strokeWidth={5} />
        </div>
    ),
};

export const ProgressSteps = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <DwellIndicator progress={0.1} />
            <DwellIndicator progress={0.25} />
            <DwellIndicator progress={0.5} />
            <DwellIndicator progress={0.75} />
            <DwellIndicator progress={0.9} />
        </div>
    ),
};

export const DesktopMode = {
    render: () => (
        <AdaptiveProvider initialMode="desktop">
            <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                <p>In desktop mode, the DwellIndicator returns null and is not visible.</p>
                <p style={{ marginTop: '8px' }}>The indicator below has progress=0.5 but is hidden:</p>
                <div style={{ marginTop: '16px', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #374151', borderRadius: '8px' }}>
                    <DwellIndicator progress={0.5} />
                    <span style={{ color: '#6b7280' }}>(empty - indicator hidden in desktop mode)</span>
                </div>
            </div>
        </AdaptiveProvider>
    ),
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};
