// src/ui/react/components/organisms/LayoutModeToggle/LayoutModeToggle.stories.jsx
import React, { useState } from 'react';
import { LayoutModeToggle, LayoutModeIndicator, LAYOUT_MODES } from './LayoutModeToggle.jsx';

// Interactive wrapper
const InteractiveToggle = (props) => {
    const [mode, setMode] = useState(props.mode || LAYOUT_MODES.NORMAL);
    return <LayoutModeToggle {...props} mode={mode} onModeChange={setMode} />;
};

export default {
    title: 'Organisms/LayoutModeToggle',
    component: LayoutModeToggle,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Layout mode toggle built on SegmentedToggle molecule.

Switches between:
- **Normal** - Standard grid layout with all cells visible
- **Isolation** - Focus on a single cell in fullscreen
- **Subset** - View a filtered subset of cells

Uses the SegmentedToggle molecule for consistent styling and VR-adaptive behavior.
                `,
            },
        },
    },
    argTypes: {
        mode: {
            control: 'select',
            options: Object.values(LAYOUT_MODES),
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
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
        mode: LAYOUT_MODES.NORMAL,
        size: 'md',
    },
};

export const Normal = {
    args: {
        mode: LAYOUT_MODES.NORMAL,
    },
};

export const Isolation = {
    args: {
        mode: LAYOUT_MODES.ISOLATION,
    },
};

export const Subset = {
    args: {
        mode: LAYOUT_MODES.SUBSET,
    },
};

export const SmallSize = {
    args: {
        mode: LAYOUT_MODES.NORMAL,
        size: 'sm',
    },
};

export const LargeSize = {
    args: {
        mode: LAYOUT_MODES.NORMAL,
        size: 'lg',
    },
};

export const Disabled = {
    args: {
        mode: LAYOUT_MODES.NORMAL,
        disabled: true,
    },
};

export const WithLabels = {
    args: {
        mode: LAYOUT_MODES.NORMAL,
        showLabels: true,
    },
};

export const Interactive = {
    render: () => <InteractiveToggle />,
};

export const WithDisabledModes = {
    render: () => <InteractiveToggle disabledModes={[LAYOUT_MODES.SUBSET]} />,
    parameters: {
        docs: {
            description: {
                story: 'Subset mode is disabled in this example.',
            },
        },
    },
};

export const Indicators = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>Normal:</span>
                <LayoutModeIndicator mode={LAYOUT_MODES.NORMAL} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>Isolation:</span>
                <LayoutModeIndicator mode={LAYOUT_MODES.ISOLATION} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>Subset:</span>
                <LayoutModeIndicator mode={LAYOUT_MODES.SUBSET} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', width: '80px' }}>Compact:</span>
                <LayoutModeIndicator mode={LAYOUT_MODES.NORMAL} compact />
                <LayoutModeIndicator mode={LAYOUT_MODES.ISOLATION} compact />
                <LayoutModeIndicator mode={LAYOUT_MODES.SUBSET} compact />
            </div>
        </div>
    ),
};

export const InToolbar = {
    render: () => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 16px',
            background: '#1a1a2e',
            borderRadius: '8px',
        }}>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>View:</span>
            <InteractiveToggle size="sm" />
            <div style={{ flex: 1 }} />
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>3 views selected</span>
        </div>
    ),
};
