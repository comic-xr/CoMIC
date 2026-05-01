// src/ui/react/components/molecules/OptionList/OptionList.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock OptionList for story
const MockOptionList = ({ options, value, onChange, multiple = false }) => {
    const [selected, setSelected] = useState(value || (multiple ? [] : null));

    const handleSelect = (optValue) => {
        if (multiple) {
            const newSelected = selected.includes(optValue)
                ? selected.filter((v) => v !== optValue)
                : [...selected, optValue];
            setSelected(newSelected);
            onChange?.(newSelected);
        } else {
            setSelected(optValue);
            onChange?.(optValue);
        }
    };

    return (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            overflow: 'hidden',
        }}>
            {options.map((opt) => {
                const isSelected = multiple
                    ? selected.includes(opt.value)
                    : selected === opt.value;

                return (
                    <button
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '10px 14px',
                            background: isSelected ? '#2d3748' : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid #374151',
                            color: isSelected ? '#e5e7eb' : '#9ca3af',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <span>{opt.label}</span>
                        {isSelected && <Icon name="check" size={14} style={{ color: '#3b82f6' }} />}
                    </button>
                );
            })}
        </div>
    );
};

export default {
    title: 'Molecules/OptionList',
    component: MockOptionList,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '250px' }}>
                <Story />
            </div>
        ),
    ],
};

export const SingleSelection = {
    render: function SingleStory() {
        const [value, setValue] = useState('option1');
        return (
            <MockOptionList
                value={value}
                onChange={setValue}
                options={[
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                ]}
            />
        );
    },
};

export const MultipleSelection = {
    render: function MultipleStory() {
        const [value, setValue] = useState(['a', 'c']);
        return (
            <MockOptionList
                value={value}
                onChange={setValue}
                multiple
                options={[
                    { value: 'a', label: 'Option A' },
                    { value: 'b', label: 'Option B' },
                    { value: 'c', label: 'Option C' },
                    { value: 'd', label: 'Option D' },
                ]}
            />
        );
    },
};

export const ViewOptions = {
    render: function ViewOptionsStory() {
        const [value, setValue] = useState('grid');
        return (
            <MockOptionList
                value={value}
                onChange={setValue}
                options={[
                    { value: 'grid', label: 'Grid View' },
                    { value: 'list', label: 'List View' },
                    { value: 'compact', label: 'Compact View' },
                ]}
            />
        );
    },
};

export const SortOptions = {
    render: function SortOptionsStory() {
        const [value, setValue] = useState('name');
        return (
            <MockOptionList
                value={value}
                onChange={setValue}
                options={[
                    { value: 'name', label: 'Name' },
                    { value: 'date', label: 'Date Modified' },
                    { value: 'size', label: 'Size' },
                    { value: 'type', label: 'Type' },
                ]}
            />
        );
    },
};
