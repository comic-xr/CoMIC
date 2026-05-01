/**
 * @file Breadcrumb.stories.jsx
 * @description Storybook stories for the Breadcrumb molecule
 */

import React, { useState } from 'react';
import { Breadcrumb } from './Breadcrumb';

export default {
    title: 'Molecules/Breadcrumb',
    component: Breadcrumb,
    argTypes: {
        rootLabel: {
            control: 'text',
        },
        showHomeIcon: {
            control: 'boolean',
        },
    },
};

const Template = (args) => {
    const [currentPath, setCurrentPath] = useState(args.path || []);

    const handleNavigate = (folderId) => {
        if (!folderId) {
            setCurrentPath([]);
        } else {
            const index = currentPath.findIndex(s => s.id === folderId);
            if (index >= 0) {
                setCurrentPath(currentPath.slice(0, index + 1));
            }
        }
    };

    return (
        <Breadcrumb
            {...args}
            path={currentPath}
            onNavigate={handleNavigate}
        />
    );
};

export const AtRoot = Template.bind({});
AtRoot.args = {
    path: [],
    rootLabel: 'Root',
    showHomeIcon: true,
};

export const OneLevel = Template.bind({});
OneLevel.args = {
    path: [{ id: '1', name: 'Raw Scans' }],
    rootLabel: 'Root',
    showHomeIcon: true,
};

export const TwoLevels = Template.bind({});
TwoLevels.args = {
    path: [
        { id: '1', name: 'Raw Scans' },
        { id: '2', name: 'Session 1' },
    ],
    rootLabel: 'Root',
    showHomeIcon: true,
};

export const DeepPath = Template.bind({});
DeepPath.args = {
    path: [
        { id: '1', name: 'Projects' },
        { id: '2', name: 'Brain Study' },
        { id: '3', name: 'Patient Data' },
        { id: '4', name: 'Session 2023-01' },
    ],
    rootLabel: 'Root',
    showHomeIcon: true,
};

export const LongFolderNames = Template.bind({});
LongFolderNames.args = {
    path: [
        { id: '1', name: 'Very Long Folder Name That Should Truncate' },
        { id: '2', name: 'Another Long Name' },
    ],
    rootLabel: 'Root',
    showHomeIcon: true,
};

export const NoHomeIcon = Template.bind({});
NoHomeIcon.args = {
    path: [{ id: '1', name: 'Documents' }],
    rootLabel: 'Home',
    showHomeIcon: false,
};

export const Interactive = () => {
    const [path, setPath] = useState([
        { id: '1', name: 'Raw Scans' },
        { id: '2', name: 'Session 1' },
    ]);

    const handleNavigate = (folderId) => {
        if (!folderId) {
            setPath([]);
        } else {
            const index = path.findIndex(s => s.id === folderId);
            if (index >= 0) {
                setPath(path.slice(0, index + 1));
            }
        }
    };

    return (
        <div>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                Click on path segments to navigate. Current location: {path.length === 0 ? 'Root' : path[path.length - 1].name}
            </p>
            <Breadcrumb
                path={path}
                onNavigate={handleNavigate}
                rootLabel="Root"
                showHomeIcon
            />
        </div>
    );
};
