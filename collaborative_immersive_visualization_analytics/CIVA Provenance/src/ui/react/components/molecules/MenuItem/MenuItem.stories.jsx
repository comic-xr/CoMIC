// src/ui/react/components/molecules/MenuItem/MenuItem.stories.jsx
import React from 'react';
import { MenuItem } from './MenuItem';

export default {
    title: 'Molecules/MenuItem',
    component: MenuItem,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onClick: { action: 'clicked' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '250px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        label: 'Menu Item',
    },
};

export const WithIcon = {
    args: {
        icon: 'file',
        label: 'New File',
    },
};

export const WithShortcut = {
    args: {
        icon: 'save',
        label: 'Save',
        shortcut: '⌘S',
    },
};

export const WithDescription = {
    args: {
        icon: 'share',
        label: 'Share',
        description: 'Share with collaborators',
    },
};

export const Selected = {
    args: {
        icon: 'check',
        label: 'Option A',
        selected: true,
    },
};

export const Danger = {
    args: {
        icon: 'trash',
        label: 'Delete',
        danger: true,
    },
};

export const Disabled = {
    args: {
        icon: 'lock',
        label: 'Locked',
        disabled: true,
    },
};

export const DropdownMenu = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            padding: '4px 0',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}>
            <MenuItem icon="file" label="New File" shortcut="⌘N" />
            <MenuItem icon="folder" label="New Folder" shortcut="⌘⇧N" />
            <MenuItem icon="upload" label="Upload" />
            <div style={{ height: '1px', background: '#374151', margin: '4px 0' }} />
            <MenuItem icon="download" label="Download" />
            <MenuItem icon="share" label="Share" shortcut="⌘⇧S" />
            <div style={{ height: '1px', background: '#374151', margin: '4px 0' }} />
            <MenuItem icon="trash" label="Delete" danger />
        </div>
    ),
};

export const SelectionMenu = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            padding: '4px 0',
        }}>
            <MenuItem label="Small" selected />
            <MenuItem label="Medium" />
            <MenuItem label="Large" />
        </div>
    ),
};

export const CommandPalette = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            padding: '4px 0',
        }}>
            <MenuItem icon="file" label="Open File" description="Browse local files" />
            <MenuItem icon="search" label="Find in Files" description="Search across workspace" />
            <MenuItem icon="terminal" label="Toggle Terminal" description="Show/hide terminal panel" />
            <MenuItem icon="settings" label="Settings" description="Open preferences" />
        </div>
    ),
};

export const ContextMenu = {
    render: () => (
        <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #374151',
            padding: '4px 0',
            width: '180px',
        }}>
            <MenuItem icon="copy" label="Copy" shortcut="⌘C" />
            <MenuItem icon="scissors" label="Cut" shortcut="⌘X" />
            <MenuItem icon="clipboard" label="Paste" shortcut="⌘V" />
            <div style={{ height: '1px', background: '#374151', margin: '4px 0' }} />
            <MenuItem icon="edit" label="Rename" />
            <MenuItem icon="trash" label="Delete" danger shortcut="⌫" />
        </div>
    ),
};
