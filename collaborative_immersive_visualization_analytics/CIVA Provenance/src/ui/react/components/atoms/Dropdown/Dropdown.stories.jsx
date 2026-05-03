/**
 * @file Dropdown.stories.jsx
 * @description Storybook stories for the Dropdown component system.
 * Demonstrates dropdown menus, select inputs, and various configurations.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Dropdown, DropdownMenu, DropdownSelect } from './index';
import { Button, IconButton } from '../Button';

export default {
    title: 'Atoms/Dropdown',
    component: Dropdown,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '100px', background: '#0a0a0f', minHeight: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BASIC DROPDOWN MENU
// =============================================================================

export const BasicMenu = {
    render: () => (
        <Dropdown
            trigger={<Button variant="secondary" iconRight="chevronDown">Options</Button>}
        >
            <DropdownMenu
                items={[
                    { id: 'profile', label: 'Profile', icon: 'user' },
                    { id: 'settings', label: 'Settings', icon: 'settings' },
                    { type: 'separator' },
                    { id: 'logout', label: 'Sign Out', icon: 'logout', danger: true },
                ]}
                onSelect={(item) => console.log('Selected:', item.id)}
            />
        </Dropdown>
    ),
};

export const WithShortcuts = {
    render: () => (
        <Dropdown
            trigger={<Button variant="secondary">Edit</Button>}
        >
            <DropdownMenu
                items={[
                    { id: 'cut', label: 'Cut', shortcut: '⌘X' },
                    { id: 'copy', label: 'Copy', icon: 'copy', shortcut: '⌘C' },
                    { id: 'paste', label: 'Paste', shortcut: '⌘V' },
                    { type: 'separator' },
                    { id: 'delete', label: 'Delete', icon: 'delete', shortcut: '⌫', danger: true },
                ]}
                onSelect={(item) => console.log('Selected:', item.id)}
            />
        </Dropdown>
    ),
};

export const WithHeaders = {
    render: () => (
        <Dropdown
            trigger={<Button variant="secondary">File</Button>}
        >
            <DropdownMenu
                items={[
                    { type: 'header', label: 'Create' },
                    { id: 'new-file', label: 'New File', icon: 'file' },
                    { id: 'new-folder', label: 'New Folder', icon: 'folderPlus' },
                    { type: 'separator' },
                    { type: 'header', label: 'Import/Export' },
                    { id: 'upload', label: 'Upload', icon: 'upload' },
                    { id: 'download', label: 'Download', icon: 'download' },
                ]}
                onSelect={(item) => console.log('Selected:', item.id)}
            />
        </Dropdown>
    ),
};

export const IconButtonTrigger = {
    render: () => (
        <Dropdown
            trigger={<IconButton icon="moreHorizontal" label="More options" />}
        >
            <DropdownMenu
                items={[
                    { id: 'edit', label: 'Edit', icon: 'edit' },
                    { id: 'share', label: 'Share', icon: 'share' },
                    { id: 'copy', label: 'Duplicate', icon: 'copy' },
                    { type: 'separator' },
                    { id: 'delete', label: 'Delete', icon: 'delete', danger: true },
                ]}
                onSelect={(item) => console.log('Selected:', item.id)}
            />
        </Dropdown>
    ),
};

// =============================================================================
// CHECKBOX & RADIO ITEMS
// =============================================================================

export const CheckboxItems = {
    render: () => {
        const [bold, setBold] = useState(true);
        const [italic, setItalic] = useState(false);
        const [underline, setUnderline] = useState(false);

        return (
            <Dropdown
                trigger={<Button variant="secondary">Text Style</Button>}
                closeOnSelect={false}
            >
                <DropdownMenu
                    items={[
                        { id: 'bold', label: 'Bold', type: 'checkbox', checked: bold, icon: 'edit', onClick: () => setBold(!bold) },
                        { id: 'italic', label: 'Italic', type: 'checkbox', checked: italic, icon: 'edit', onClick: () => setItalic(!italic) },
                        { id: 'underline', label: 'Underline', type: 'checkbox', checked: underline, icon: 'edit', onClick: () => setUnderline(!underline) },
                    ]}
                />
            </Dropdown>
        );
    },
};

export const RadioItems = {
    render: () => {
        const [align, setAlign] = useState('left');

        return (
            <Dropdown
                trigger={<Button variant="secondary">Alignment</Button>}
                closeOnSelect={false}
            >
                <DropdownMenu
                    items={[
                        { id: 'left', label: 'Left', type: 'radio', checked: align === 'left', icon: 'layout', onClick: () => setAlign('left') },
                        { id: 'center', label: 'Center', type: 'radio', checked: align === 'center', icon: 'layout', onClick: () => setAlign('center') },
                        { id: 'right', label: 'Right', type: 'radio', checked: align === 'right', icon: 'layout', onClick: () => setAlign('right') },
                    ]}
                />
            </Dropdown>
        );
    },
};

// =============================================================================
// PLACEMENTS
// =============================================================================

export const Placements = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <Dropdown
                trigger={<Button variant="secondary">Bottom Start (default)</Button>}
                placement="bottom-start"
            >
                <DropdownMenu items={[
                    { id: '1', label: 'Option 1' },
                    { id: '2', label: 'Option 2' },
                ]} />
            </Dropdown>

            <Dropdown
                trigger={<Button variant="secondary">Bottom End</Button>}
                placement="bottom-end"
            >
                <DropdownMenu items={[
                    { id: '1', label: 'Option 1' },
                    { id: '2', label: 'Option 2' },
                ]} />
            </Dropdown>

            <Dropdown
                trigger={<Button variant="secondary">Top Start</Button>}
                placement="top-start"
            >
                <DropdownMenu items={[
                    { id: '1', label: 'Option 1' },
                    { id: '2', label: 'Option 2' },
                ]} />
            </Dropdown>
        </div>
    ),
};

// =============================================================================
// DROPDOWN SELECT
// =============================================================================

export const BasicSelect = {
    render: () => {
        const [value, setValue] = useState('');

        return (
            <div style={{ width: '200px' }}>
                <DropdownSelect
                    options={[
                        { value: 'viewer', label: 'Viewer' },
                        { value: 'member', label: 'Member' },
                        { value: 'admin', label: 'Admin' },
                    ]}
                    value={value}
                    onChange={setValue}
                    placeholder="Select role..."
                />
            </div>
        );
    },
};

export const SelectWithIcons = {
    render: () => {
        const [value, setValue] = useState('');

        return (
            <div style={{ width: '250px' }}>
                <DropdownSelect
                    options={[
                        { value: 'bug', label: 'Bug', icon: 'warning' },
                        { value: 'feature', label: 'Feature Request', icon: 'star' },
                        { value: 'project', label: 'Project', icon: 'folder' },
                        { value: 'dataset', label: 'Dataset', icon: 'database' },
                    ]}
                    value={value}
                    onChange={setValue}
                    placeholder="Select type..."
                />
            </div>
        );
    },
};

export const SearchableSelect = {
    render: () => {
        const [value, setValue] = useState('');

        return (
            <div style={{ width: '250px' }}>
                <DropdownSelect
                    options={[
                        { value: 'us', label: 'United States' },
                        { value: 'uk', label: 'United Kingdom' },
                        { value: 'ca', label: 'Canada' },
                        { value: 'au', label: 'Australia' },
                        { value: 'de', label: 'Germany' },
                        { value: 'fr', label: 'France' },
                        { value: 'jp', label: 'Japan' },
                        { value: 'cn', label: 'China' },
                    ]}
                    value={value}
                    onChange={setValue}
                    placeholder="Select country..."
                    searchable
                />
            </div>
        );
    },
};

export const ClearableSelect = {
    render: () => {
        const [value, setValue] = useState('admin');

        return (
            <div style={{ width: '200px' }}>
                <DropdownSelect
                    options={[
                        { value: 'viewer', label: 'Viewer' },
                        { value: 'member', label: 'Member' },
                        { value: 'admin', label: 'Admin' },
                    ]}
                    value={value}
                    onChange={setValue}
                    placeholder="Select role..."
                    clearable
                />
            </div>
        );
    },
};

export const MultiSelect = {
    render: () => {
        const [values, setValues] = useState(['react', 'typescript']);

        return (
            <div style={{ width: '300px' }}>
                <DropdownSelect
                    options={[
                        { value: 'react', label: 'React' },
                        { value: 'vue', label: 'Vue' },
                        { value: 'angular', label: 'Angular' },
                        { value: 'typescript', label: 'TypeScript' },
                        { value: 'javascript', label: 'JavaScript' },
                        { value: 'python', label: 'Python' },
                    ]}
                    value={values}
                    onChange={setValues}
                    placeholder="Select technologies..."
                    multiple
                    searchable
                    clearable
                />
            </div>
        );
    },
};

export const SelectSizes = {
    render: () => {
        const [sm, setSm] = useState('');
        const [md, setMd] = useState('');
        const [lg, setLg] = useState('');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '200px' }}>
                <DropdownSelect
                    size="sm"
                    options={[{ value: '1', label: 'Small' }]}
                    value={sm}
                    onChange={setSm}
                    placeholder="Small..."
                />
                <DropdownSelect
                    size="md"
                    options={[{ value: '1', label: 'Medium' }]}
                    value={md}
                    onChange={setMd}
                    placeholder="Medium..."
                />
                <DropdownSelect
                    size="lg"
                    options={[{ value: '1', label: 'Large' }]}
                    value={lg}
                    onChange={setLg}
                    placeholder="Large..."
                />
            </div>
        );
    },
};

export const SelectWithError = {
    render: () => {
        const [value, setValue] = useState('');

        return (
            <div style={{ width: '200px' }}>
                <DropdownSelect
                    options={[
                        { value: 'viewer', label: 'Viewer' },
                        { value: 'member', label: 'Member' },
                    ]}
                    value={value}
                    onChange={setValue}
                    placeholder="Select role..."
                    error="Please select a role"
                />
            </div>
        );
    },
};

export const DisabledSelect = {
    render: () => (
        <div style={{ width: '200px' }}>
            <DropdownSelect
                options={[
                    { value: 'viewer', label: 'Viewer' },
                    { value: 'member', label: 'Member' },
                ]}
                value="viewer"
                onChange={() => { }}
                disabled
            />
        </div>
    ),
};

export const FullWidthSelect = {
    render: () => {
        const [value, setValue] = useState('');

        return (
            <div style={{ width: '400px' }}>
                <DropdownSelect
                    options={[
                        { value: 'opt1', label: 'Option 1' },
                        { value: 'opt2', label: 'Option 2' },
                    ]}
                    value={value}
                    onChange={setValue}
                    placeholder="Full width select..."
                    fullWidth
                />
            </div>
        );
    },
};

// =============================================================================
// ACTIVE ITEM
// =============================================================================

export const WithActiveItem = {
    render: () => (
        <Dropdown
            trigger={<Button variant="secondary">View</Button>}
        >
            <DropdownMenu
                items={[
                    { id: 'grid', label: 'Grid View' },
                    { id: 'list', label: 'List View' },
                    { id: 'table', label: 'Table View' },
                ]}
                activeId="list"
                onSelect={(item) => console.log('Selected:', item.id)}
            />
        </Dropdown>
    ),
};

// =============================================================================
// DISABLED ITEMS
// =============================================================================

export const WithDisabledItems = {
    render: () => (
        <Dropdown
            trigger={<Button variant="secondary">Actions</Button>}
        >
            <DropdownMenu
                items={[
                    { id: 'edit', label: 'Edit', icon: 'edit' },
                    { id: 'share', label: 'Share', icon: 'share', disabled: true },
                    { id: 'copy', label: 'Duplicate', icon: 'copy' },
                    { type: 'separator' },
                    { id: 'delete', label: 'Delete', icon: 'delete', danger: true, disabled: true },
                ]}
                onSelect={(item) => console.log('Selected:', item.id)}
            />
        </Dropdown>
    ),
};