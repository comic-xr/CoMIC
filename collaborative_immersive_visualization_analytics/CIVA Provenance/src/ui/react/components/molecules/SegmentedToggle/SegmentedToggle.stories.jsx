// src/ui/react/components/molecules/SegmentedToggle/SegmentedToggle.stories.jsx
import React, { useState } from 'react';
import { SegmentedToggle } from './SegmentedToggle';

export default {
    title: 'Molecules/SegmentedToggle',
    component: SegmentedToggle,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
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
        const [value, setValue] = useState('row');
        return (
            <SegmentedToggle
                value={value}
                onChange={setValue}
                options={[
                    { value: 'row', icon: 'arrowRight', label: 'Row Flow' },
                    { value: 'column', icon: 'arrowDown', label: 'Column Flow' },
                ]}
            />
        );
    },
};

export const WithAccents = {
    render: function WithAccentsStory() {
        const [value, setValue] = useState('normal');
        return (
            <SegmentedToggle
                value={value}
                onChange={setValue}
                options={[
                    { value: 'normal', icon: 'eye', label: 'Normal View', accent: '#3b82f6' },
                    { value: 'isolation', icon: 'focus', label: 'Isolation', accent: '#8b5cf6' },
                    { value: 'subset', icon: 'filter', label: 'Subset', accent: '#22c55e' },
                ]}
            />
        );
    },
};

export const ThreeOptions = {
    render: function ThreeOptionsStory() {
        const [value, setValue] = useState('left');
        return (
            <SegmentedToggle
                value={value}
                onChange={setValue}
                options={[
                    { value: 'left', icon: 'alignLeft', label: 'Align Left' },
                    { value: 'center', icon: 'alignCenter', label: 'Align Center' },
                    { value: 'right', icon: 'alignRight', label: 'Align Right' },
                ]}
            />
        );
    },
};

export const Disabled = {
    render: () => (
        <SegmentedToggle
            value="a"
            onChange={() => {}}
            disabled
            options={[
                { value: 'a', icon: 'grid', label: 'Grid' },
                { value: 'b', icon: 'list', label: 'List' },
            ]}
        />
    ),
};

export const Sizes = {
    render: function SizesStory() {
        const [values, setValues] = useState({ sm: 'a', md: 'a', lg: 'a' });
        const options = [
            { value: 'a', icon: 'grid', label: 'Grid' },
            { value: 'b', icon: 'list', label: 'List' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Small</span>
                    <SegmentedToggle
                        value={values.sm}
                        onChange={(v) => setValues((p) => ({ ...p, sm: v }))}
                        options={options}
                        size="sm"
                    />
                </div>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Medium</span>
                    <SegmentedToggle
                        value={values.md}
                        onChange={(v) => setValues((p) => ({ ...p, md: v }))}
                        options={options}
                        size="md"
                    />
                </div>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Large</span>
                    <SegmentedToggle
                        value={values.lg}
                        onChange={(v) => setValues((p) => ({ ...p, lg: v }))}
                        options={options}
                        size="lg"
                    />
                </div>
            </div>
        );
    },
};

export const ViewModeToggle = {
    render: function ViewModeStory() {
        const [value, setValue] = useState('3d');
        return (
            <SegmentedToggle
                value={value}
                onChange={setValue}
                options={[
                    { value: '2d', icon: 'square', label: '2D View', accent: '#3b82f6' },
                    { value: '3d', icon: 'box', label: '3D View', accent: '#8b5cf6' },
                    { value: 'vr', icon: 'vrPano', label: 'VR View', accent: '#22c55e' },
                ]}
            />
        );
    },
};

export const InToolbar = {
    render: function ToolbarStory() {
        const [flow, setFlow] = useState('row');
        const [align, setAlign] = useState('center');

        return (
            <div style={{
                display: 'flex',
                gap: '16px',
                padding: '8px 12px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <SegmentedToggle
                    value={flow}
                    onChange={setFlow}
                    size="sm"
                    options={[
                        { value: 'row', icon: 'arrowRight', label: 'Row' },
                        { value: 'column', icon: 'arrowDown', label: 'Column' },
                    ]}
                />
                <div style={{ width: '1px', background: '#374151' }} />
                <SegmentedToggle
                    value={align}
                    onChange={setAlign}
                    size="sm"
                    options={[
                        { value: 'left', icon: 'alignLeft', label: 'Left' },
                        { value: 'center', icon: 'alignCenter', label: 'Center' },
                        { value: 'right', icon: 'alignRight', label: 'Right' },
                    ]}
                />
            </div>
        );
    },
};
