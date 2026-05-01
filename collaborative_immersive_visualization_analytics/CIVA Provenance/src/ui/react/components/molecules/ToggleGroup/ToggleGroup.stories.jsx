// src/ui/react/components/molecules/ToggleGroup/ToggleGroup.stories.jsx
import React, { useState } from 'react';
import { ToggleGroup } from './ToggleGroup';

export default {
    title: 'Molecules/ToggleGroup',
    component: ToggleGroup,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'etched', 'segmented'],
        },
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
        const [value, setValue] = useState('a');
        return (
            <ToggleGroup
                value={value}
                onChange={setValue}
                options={[
                    { value: 'a', label: 'Option A' },
                    { value: 'b', label: 'Option B' },
                    { value: 'c', label: 'Option C' },
                ]}
            />
        );
    },
};

export const WithIcons = {
    render: function WithIconsStory() {
        const [value, setValue] = useState('grid');
        return (
            <ToggleGroup
                value={value}
                onChange={setValue}
                options={[
                    { value: 'list', icon: 'list' },
                    { value: 'grid', icon: 'grid' },
                    { value: 'columns', icon: 'columns' },
                ]}
            />
        );
    },
};

export const IconsAndLabels = {
    render: function IconsAndLabelsStory() {
        const [value, setValue] = useState('day');
        return (
            <ToggleGroup
                value={value}
                onChange={setValue}
                options={[
                    { value: 'day', icon: 'sun', label: 'Day' },
                    { value: 'week', icon: 'calendar', label: 'Week' },
                    { value: 'month', icon: 'calendarDays', label: 'Month' },
                ]}
            />
        );
    },
};

export const Disabled = {
    render: function DisabledStory() {
        return (
            <ToggleGroup
                value="a"
                onChange={() => {}}
                disabled
                options={[
                    { value: 'a', label: 'Disabled A' },
                    { value: 'b', label: 'Disabled B' },
                ]}
            />
        );
    },
};

export const DisabledOption = {
    render: function DisabledOptionStory() {
        const [value, setValue] = useState('a');
        return (
            <ToggleGroup
                value={value}
                onChange={setValue}
                options={[
                    { value: 'a', label: 'Active' },
                    { value: 'b', label: 'Disabled', disabled: true },
                    { value: 'c', label: 'Active' },
                ]}
            />
        );
    },
};

export const Variants = {
    render: function VariantsStory() {
        const [values, setValues] = useState({ default: 'a', etched: 'a', segmented: 'a' });
        const options = [
            { value: 'a', label: 'One' },
            { value: 'b', label: 'Two' },
            { value: 'c', label: 'Three' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Default</span>
                    <ToggleGroup
                        value={values.default}
                        onChange={(v) => setValues((p) => ({ ...p, default: v }))}
                        options={options}
                        variant="default"
                    />
                </div>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Etched</span>
                    <ToggleGroup
                        value={values.etched}
                        onChange={(v) => setValues((p) => ({ ...p, etched: v }))}
                        options={options}
                        variant="etched"
                    />
                </div>
                <div>
                    <span style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Segmented</span>
                    <ToggleGroup
                        value={values.segmented}
                        onChange={(v) => setValues((p) => ({ ...p, segmented: v }))}
                        options={options}
                        variant="segmented"
                    />
                </div>
            </div>
        );
    },
};

export const Sizes = {
    render: function SizesStory() {
        const [values, setValues] = useState({ sm: 'a', md: 'a', lg: 'a' });
        const options = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ToggleGroup
                    value={values.sm}
                    onChange={(v) => setValues((p) => ({ ...p, sm: v }))}
                    options={options}
                    size="sm"
                />
                <ToggleGroup
                    value={values.md}
                    onChange={(v) => setValues((p) => ({ ...p, md: v }))}
                    options={options}
                    size="md"
                />
                <ToggleGroup
                    value={values.lg}
                    onChange={(v) => setValues((p) => ({ ...p, lg: v }))}
                    options={options}
                    size="lg"
                />
            </div>
        );
    },
};

export const FullWidth = {
    render: function FullWidthStory() {
        const [value, setValue] = useState('left');
        return (
            <div style={{ width: '300px' }}>
                <ToggleGroup
                    value={value}
                    onChange={setValue}
                    fullWidth
                    options={[
                        { value: 'left', icon: 'alignLeft' },
                        { value: 'center', icon: 'alignCenter' },
                        { value: 'right', icon: 'alignRight' },
                        { value: 'justify', icon: 'alignJustify' },
                    ]}
                />
            </div>
        );
    },
};

export const ViewModeToggle = {
    render: function ViewModeStory() {
        const [value, setValue] = useState('3d');
        return (
            <ToggleGroup
                value={value}
                onChange={setValue}
                variant="segmented"
                options={[
                    { value: '2d', label: '2D' },
                    { value: '3d', label: '3D' },
                    { value: 'vr', label: 'VR' },
                ]}
            />
        );
    },
};
