// src/ui/react/components/molecules/InstanceToolOptions/InstanceToolOptions.stories.jsx
import React, { useState } from 'react';
import {
    CameraGridMenu,
    SliderWithPresets,
    ColormapGrid,
    ToolOptionItem,
} from './InstanceToolOptions';

// Mock data
const mockViews = [
    { id: 'top', label: 'Top', icon: 'arrowUp' },
    { id: 'bottom', label: 'Bottom', icon: 'arrowDown' },
    { id: 'left', label: 'Left', icon: 'arrowLeft' },
    { id: 'right', label: 'Right', icon: 'arrowRight' },
    { id: 'front', label: 'Front', icon: 'circle' },
    { id: 'back', label: 'Back', icon: 'circle' },
    { id: 'isometric', label: 'Iso', icon: 'box' },
    { id: 'reset', label: 'Reset', icon: 'refreshCw', special: true },
];

const mockColormaps = [
    { id: 'viridis', name: 'Viridis', gradient: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde725)' },
    { id: 'plasma', name: 'Plasma', gradient: 'linear-gradient(90deg, #0d0887, #9c179e, #ed7953, #f0f921)' },
    { id: 'inferno', name: 'Inferno', gradient: 'linear-gradient(90deg, #000004, #6a176e, #f1605d, #fcffa4)' },
    { id: 'magma', name: 'Magma', gradient: 'linear-gradient(90deg, #000004, #721f81, #f1605d, #fcfdbf)' },
    { id: 'rainbow', name: 'Rainbow', gradient: 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)' },
    { id: 'grayscale', name: 'Grayscale', gradient: 'linear-gradient(90deg, #000, #fff)' },
];

export default {
    title: 'Molecules/InstanceToolOptions',
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', minWidth: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

// CameraGridMenu Stories
export const CameraGrid = {
    render: function CameraGridStory() {
        return (
            <CameraGridMenu
                views={mockViews}
                onViewSelect={(viewId) => console.log('View selected:', viewId)}
            />
        );
    },
};

export const CameraGridDisabled = {
    render: function CameraGridDisabledStory() {
        return (
            <CameraGridMenu
                views={mockViews}
                onViewSelect={(viewId) => console.log('View selected:', viewId)}
                disabled
            />
        );
    },
};

// SliderWithPresets Stories
export const SliderDefault = {
    render: function SliderDefaultStory() {
        const [value, setValue] = useState(0.5);
        return (
            <SliderWithPresets
                icon="sliders"
                label="Opacity"
                value={value}
                min={0}
                max={1}
                step={0.01}
                onChange={setValue}
                formatValue={(v) => `${Math.round(v * 100)}%`}
            />
        );
    },
};

export const SliderWithPresetsValues = {
    render: function SliderWithPresetsValuesStory() {
        const [value, setValue] = useState(5);
        return (
            <SliderWithPresets
                icon="circle"
                label="Point Size"
                value={value}
                min={1}
                max={20}
                step={0.5}
                presets={[1, 3, 5, 10, 15, 20]}
                onChange={setValue}
                formatValue={(v) => `${v.toFixed(1)}px`}
            />
        );
    },
};

export const SliderDisabled = {
    render: function SliderDisabledStory() {
        return (
            <SliderWithPresets
                icon="lock"
                label="Locked Setting"
                value={0.5}
                min={0}
                max={1}
                step={0.01}
                disabled
                disabledReason="Select an instance to adjust this setting"
                formatValue={(v) => `${Math.round(v * 100)}%`}
            />
        );
    },
};

// ColormapGrid Stories
export const ColormapSelection = {
    render: function ColormapSelectionStory() {
        const [colormap, setColormap] = useState('viridis');
        return (
            <ColormapGrid
                colormaps={mockColormaps}
                currentColormap={colormap}
                onColormapChange={setColormap}
            />
        );
    },
};

export const ColormapDisabled = {
    render: function ColormapDisabledStory() {
        return (
            <ColormapGrid
                colormaps={mockColormaps}
                currentColormap="viridis"
                onColormapChange={() => {}}
                disabled
            />
        );
    },
};

// ToolOptionItem Stories
export const OptionItemDefault = {
    render: function OptionItemDefaultStory() {
        return (
            <ToolOptionItem
                option={{
                    icon: 'eye',
                    label: 'Show Grid',
                    description: 'Display grid lines on the canvas',
                    onClick: () => console.log('Clicked'),
                }}
            />
        );
    },
};

export const OptionItemActive = {
    render: function OptionItemActiveStory() {
        return (
            <ToolOptionItem
                option={{
                    icon: 'check',
                    label: 'Auto-Save',
                    description: 'Automatically save changes',
                    active: true,
                    onClick: () => console.log('Clicked'),
                }}
            />
        );
    },
};

export const OptionItemDisabled = {
    render: function OptionItemDisabledStory() {
        return (
            <ToolOptionItem
                option={{
                    icon: 'lock',
                    label: 'Premium Feature',
                    description: 'Upgrade to access',
                    disabled: true,
                    onClick: () => console.log('Clicked'),
                }}
            />
        );
    },
};

export const OptionItemSeparator = {
    render: function OptionItemSeparatorStory() {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <ToolOptionItem option={{ icon: 'eye', label: 'Option 1', onClick: () => {} }} />
                <ToolOptionItem option={{ type: 'separator' }} />
                <ToolOptionItem option={{ icon: 'settings', label: 'Option 2', onClick: () => {} }} />
            </div>
        );
    },
};

export const OptionItemHeader = {
    render: function OptionItemHeaderStory() {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <ToolOptionItem option={{ type: 'header', label: 'View Options' }} />
                <ToolOptionItem option={{ icon: 'eye', label: 'Show Grid', onClick: () => {} }} />
                <ToolOptionItem option={{ icon: 'layers', label: 'Show Layers', onClick: () => {} }} />
            </div>
        );
    },
};

// Combined Stories
export const FullOptionsPanel = {
    render: function FullOptionsPanelStory() {
        const [opacity, setOpacity] = useState(0.8);
        const [pointSize, setPointSize] = useState(5);
        const [colormap, setColormap] = useState('viridis');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '280px' }}>
                <ToolOptionItem option={{ type: 'header', label: 'Camera' }} />
                <CameraGridMenu
                    views={mockViews}
                    onViewSelect={(viewId) => console.log('View:', viewId)}
                />

                <ToolOptionItem option={{ type: 'separator' }} />
                <ToolOptionItem option={{ type: 'header', label: 'Appearance' }} />

                <SliderWithPresets
                    icon="circle"
                    label="Opacity"
                    value={opacity}
                    min={0}
                    max={1}
                    step={0.01}
                    presets={[0, 0.25, 0.5, 0.75, 1]}
                    onChange={setOpacity}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                />

                <SliderWithPresets
                    icon="maximize"
                    label="Point Size"
                    value={pointSize}
                    min={1}
                    max={20}
                    step={0.5}
                    presets={[1, 5, 10, 15, 20]}
                    onChange={setPointSize}
                    formatValue={(v) => `${v.toFixed(1)}px`}
                />

                <ToolOptionItem option={{ type: 'separator' }} />
                <ToolOptionItem option={{ type: 'header', label: 'Colormap' }} />

                <ColormapGrid
                    colormaps={mockColormaps}
                    currentColormap={colormap}
                    onColormapChange={setColormap}
                />
            </div>
        );
    },
};
