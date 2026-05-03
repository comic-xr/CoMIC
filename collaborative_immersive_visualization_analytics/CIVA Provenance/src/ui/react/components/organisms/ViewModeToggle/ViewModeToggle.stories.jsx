// src/ui/react/components/organisms/ViewModeToggle/ViewModeToggle.stories.jsx
import React, { useState } from 'react';
import { ViewModeToggle, ViewModeIndicator, VIEW_MODES } from './ViewModeToggle.jsx';

// Interactive wrapper
const InteractiveToggle = (props) => {
    const [mode, setMode] = useState(props.mode || VIEW_MODES.DESKTOP);
    return <ViewModeToggle {...props} mode={mode} onModeChange={setMode} />;
};

export default {
    title: 'Organisms/ViewModeToggle',
    component: ViewModeToggle,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
View mode toggle built on SegmentedToggle molecule.

Switches between:
- **Desktop** - Standard 2D interface
- **VR** - Immersive 3D experience (requires WebXR)

Includes automatic WebXR availability detection. VR option is disabled when:
- Browser doesn't support WebXR
- No VR headset is connected

Uses the SegmentedToggle molecule for consistent styling and VR-adaptive behavior.
                `,
            },
        },
    },
    argTypes: {
        mode: {
            control: 'select',
            options: Object.values(VIEW_MODES),
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        vrAvailable: { control: 'boolean' },
        disabled: { control: 'boolean' },
        showLabels: { control: 'boolean' },
        onModeChange: { action: 'mode changed' },
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
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        size: 'md',
    },
};

export const Desktop = {
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
    },
};

export const VRMode = {
    args: {
        mode: VIEW_MODES.VR,
        vrAvailable: true,
    },
};

export const VRUnavailable = {
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'VR option is disabled when WebXR is not available.',
            },
        },
    },
};

export const SmallSize = {
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        size: 'sm',
    },
};

export const LargeSize = {
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        size: 'lg',
    },
};

export const Disabled = {
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        disabled: true,
    },
};

export const WithLabels = {
    args: {
        mode: VIEW_MODES.DESKTOP,
        vrAvailable: true,
        showLabels: true,
    },
};

export const Interactive = {
    render: () => <InteractiveToggle vrAvailable={true} />,
};

export const InteractiveVRDisabled = {
    render: () => <InteractiveToggle vrAvailable={false} />,
    parameters: {
        docs: {
            description: {
                story: 'Interactive demo with VR unavailable - can only select Desktop.',
            },
        },
    },
};

export const Indicators = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>Desktop:</span>
                <ViewModeIndicator mode={VIEW_MODES.DESKTOP} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>VR:</span>
                <ViewModeIndicator mode={VIEW_MODES.VR} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>Compact:</span>
                <ViewModeIndicator mode={VIEW_MODES.DESKTOP} compact />
                <ViewModeIndicator mode={VIEW_MODES.VR} compact />
            </div>
        </div>
    ),
};

export const InHeader = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500 }}>Project Name</span>
            <div style={{ flex: 1 }} />
            <InteractiveToggle vrAvailable={true} size="sm" />
        </div>
    ),
};
