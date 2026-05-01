// src/ui/react/components/molecules/SearchBar/SearchBar.stories.jsx
import React, { useState } from 'react';
import { SearchBar } from './SearchBar';

export default {
    title: 'Molecules/SearchBar',
    component: SearchBar,
    parameters: {
        layout: 'centered',
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
        return <SearchBar value={value} onChange={setValue} />;
    },
};

export const WithPlaceholder = {
    render: function PlaceholderStory() {
        const [value, setValue] = useState('');
        return <SearchBar value={value} onChange={setValue} placeholder="Search files..." />;
    },
};

export const WithValue = {
    render: function WithValueStory() {
        const [value, setValue] = useState('example search');
        return <SearchBar value={value} onChange={setValue} />;
    },
};

export const FileSearch = {
    render: function FileSearchStory() {
        const [value, setValue] = useState('');
        return <SearchBar value={value} onChange={setValue} placeholder="Search files and folders..." />;
    },
};
