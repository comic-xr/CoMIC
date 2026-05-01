// src/ui/react/components/atoms/Chip/Chip.stories.jsx
import React, { useState } from 'react';
import { Chip } from './Chip';

export default {
    title: 'Atoms/Chip',
    component: Chip,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md'],
        },
        onClick: { action: 'clicked' },
        onRemove: { action: 'removed' },
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
        label: 'Tag',
    },
};

export const WithIcon = {
    args: {
        label: 'Settings',
        icon: 'settings',
    },
};

export const Selected = {
    args: {
        label: 'Selected',
        selected: true,
    },
};

export const Removable = {
    args: {
        label: 'Removable',
        removable: true,
    },
};

export const Interactive = {
    args: {
        label: 'Click me',
        onClick: () => {},
    },
};

export const Disabled = {
    args: {
        label: 'Disabled',
        disabled: true,
    },
};

export const WithColor = {
    args: {
        label: 'Colored',
        color: '#8b5cf6',
        selected: true,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Chip label="Small" size="sm" />
            <Chip label="Medium" size="md" />
        </div>
    ),
};

export const ChipGroup = {
    render: function ChipGroupStory() {
        const [selected, setSelected] = useState(['react']);
        const chips = ['react', 'vue', 'angular', 'svelte'];

        const toggle = (chip) => {
            setSelected((prev) =>
                prev.includes(chip)
                    ? prev.filter((c) => c !== chip)
                    : [...prev, chip]
            );
        };

        return (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {chips.map((chip) => (
                    <Chip
                        key={chip}
                        label={chip}
                        selected={selected.includes(chip)}
                        onClick={() => toggle(chip)}
                    />
                ))}
            </div>
        );
    },
};

export const RemovableGroup = {
    render: function RemovableGroupStory() {
        const [chips, setChips] = useState(['React', 'TypeScript', 'Node.js']);

        const remove = (chip) => {
            setChips((prev) => prev.filter((c) => c !== chip));
        };

        return (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {chips.map((chip) => (
                    <Chip
                        key={chip}
                        label={chip}
                        removable
                        onRemove={() => remove(chip)}
                    />
                ))}
            </div>
        );
    },
};
