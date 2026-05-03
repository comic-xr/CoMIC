// src/ui/react/components/molecules/SearchInput/SearchInput.stories.jsx
import React, { useState } from 'react';
import { SearchInput } from './SearchInput';

export default {
    title: 'Molecules/SearchInput',
    component: SearchInput,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        onSubmit: { action: 'submitted' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: function DefaultStory() {
        const [value, setValue] = useState('');
        return <SearchInput value={value} onChange={setValue} />;
    },
};

export const WithValue = {
    render: function WithValueStory() {
        const [value, setValue] = useState('search query');
        return <SearchInput value={value} onChange={setValue} />;
    },
};

export const CustomPlaceholder = {
    render: function CustomPlaceholderStory() {
        const [value, setValue] = useState('');
        return <SearchInput value={value} onChange={setValue} placeholder="Find files..." />;
    },
};

export const Loading = {
    render: function LoadingStory() {
        const [value, setValue] = useState('searching...');
        return <SearchInput value={value} onChange={setValue} loading />;
    },
};

export const Disabled = {
    args: {
        value: 'disabled',
        disabled: true,
    },
};

export const CustomIcon = {
    render: function CustomIconStory() {
        const [value, setValue] = useState('');
        return <SearchInput value={value} onChange={setValue} icon="filter" placeholder="Filter items..." />;
    },
};

export const NoClear = {
    render: function NoClearStory() {
        const [value, setValue] = useState('no clear button');
        return <SearchInput value={value} onChange={setValue} showClear={false} />;
    },
};

export const Sizes = {
    render: function SizesStory() {
        const [values, setValues] = useState({ sm: '', md: '', lg: '' });
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <SearchInput
                    value={values.sm}
                    onChange={(v) => setValues((p) => ({ ...p, sm: v }))}
                    placeholder="Small"
                    size="sm"
                />
                <SearchInput
                    value={values.md}
                    onChange={(v) => setValues((p) => ({ ...p, md: v }))}
                    placeholder="Medium"
                    size="md"
                />
                <SearchInput
                    value={values.lg}
                    onChange={(v) => setValues((p) => ({ ...p, lg: v }))}
                    placeholder="Large"
                    size="lg"
                />
            </div>
        );
    },
};

export const WithSubmit = {
    render: function WithSubmitStory() {
        const [value, setValue] = useState('');
        const [submitted, setSubmitted] = useState('');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    onSubmit={(v) => setSubmitted(v)}
                    placeholder="Press Enter to submit"
                />
                {submitted && (
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        Submitted: "{submitted}"
                    </span>
                )}
            </div>
        );
    },
};

export const InPanel = {
    render: function InPanelStory() {
        const [value, setValue] = useState('');

        return (
            <div style={{
                padding: '16px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    placeholder="Search files..."
                    autoFocus
                />
            </div>
        );
    },
};

export const CommandPalette = {
    render: function CommandPaletteStory() {
        const [value, setValue] = useState('');

        return (
            <div style={{
                padding: '12px',
                background: '#1a1a2e',
                borderRadius: '8px',
                border: '1px solid #374151',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}>
                <SearchInput
                    value={value}
                    onChange={setValue}
                    placeholder="Type a command..."
                    icon="terminal"
                    size="lg"
                />
            </div>
        );
    },
};
