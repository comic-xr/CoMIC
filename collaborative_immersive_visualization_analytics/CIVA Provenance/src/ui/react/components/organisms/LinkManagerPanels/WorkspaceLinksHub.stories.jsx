/**
 * WorkspaceLinksHub Stories
 */

import React from 'react';
import { WorkspaceLinksHub } from './WorkspaceLinksHub';

export default {
    title: 'Organisms/LinkManagerPanels/WorkspaceLinksHub',
    component: WorkspaceLinksHub,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
        docs: {
            description: {
                component: 'Bird\'s-eye view panel showing all link groups in the workspace. Provides overview of sync relationships between views.',
            },
        },
    },
};

// Sample link groups data
const sampleLinkGroups = {
    camera: [
        {
            id: 'camera-1',
            name: 'Main Camera Group',
            members: [
                { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf' },
                { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa' },
                { clientId: 'user-3', userName: 'Alex Johnson', userColor: '#f472b6' },
            ],
        },
        {
            id: 'camera-2',
            name: 'Detail Views',
            members: [
                { clientId: 'user-4', userName: 'David Chen', userColor: '#fbbf24' },
                { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c' },
            ],
        },
    ],
    filters: [
        {
            id: 'filters-1',
            name: 'Dataset A Filters',
            members: [
                { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf' },
                { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa' },
            ],
        },
    ],
    colorMaps: [],
    widgets: [],
    cursors: [
        {
            id: 'cursors-1',
            name: 'Cursor Sync',
            members: [
                { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf' },
                { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa' },
                { clientId: 'user-3', userName: 'Alex Johnson', userColor: '#f472b6' },
                { clientId: 'user-4', userName: 'David Chen', userColor: '#fbbf24' },
            ],
        },
    ],
    annotationDisplay: [],
};

export const Default = () => (
    <WorkspaceLinksHub
        linkGroups={sampleLinkGroups}
        onSelectGroup={(group) => console.log('Select group:', group)}
        onExpandGroup={(group) => console.log('Expand group:', group)}
        onCreateGroup={() => console.log('Create group')}
        onClose={() => console.log('Close')}
    />
);

export const ManyGroups = () => {
    const manyGroups = {
        camera: [
            ...sampleLinkGroups.camera,
            { id: 'camera-3', name: 'Overview Cameras', members: sampleLinkGroups.cursors[0].members },
            { id: 'camera-4', name: 'Comparison Group', members: sampleLinkGroups.filters[0].members },
        ],
        filters: [
            ...sampleLinkGroups.filters,
            { id: 'filters-2', name: 'Dataset B Filters', members: sampleLinkGroups.camera[1].members },
        ],
        colorMaps: [
            { id: 'colors-1', name: 'Shared Colors', members: sampleLinkGroups.camera[0].members },
        ],
        widgets: [
            { id: 'widgets-1', name: 'Control Panel Sync', members: sampleLinkGroups.filters[0].members },
        ],
        cursors: sampleLinkGroups.cursors,
        annotationDisplay: [
            { id: 'annot-1', name: 'Annotations Visible', members: sampleLinkGroups.camera[0].members },
        ],
    };

    return (
        <WorkspaceLinksHub
            linkGroups={manyGroups}
            onSelectGroup={(group) => console.log('Select group:', group)}
            onExpandGroup={(group) => console.log('Expand group:', group)}
            onCreateGroup={() => console.log('Create group')}
            onClose={() => console.log('Close')}
        />
    );
};

export const Empty = () => (
    <WorkspaceLinksHub
        linkGroups={{}}
        onCreateGroup={() => console.log('Create group')}
        onClose={() => console.log('Close')}
    />
);

export const SinglePropertyGroup = () => {
    const single = {
        camera: sampleLinkGroups.camera,
        filters: [],
        colorMaps: [],
        widgets: [],
        cursors: [],
        annotationDisplay: [],
    };

    return (
        <WorkspaceLinksHub
            linkGroups={single}
            onSelectGroup={(group) => console.log('Select group:', group)}
            onClose={() => console.log('Close')}
        />
    );
};

export const WithoutCreateButton = () => (
    <WorkspaceLinksHub
        linkGroups={sampleLinkGroups}
        onSelectGroup={(group) => console.log('Select group:', group)}
        onClose={() => console.log('Close')}
    />
);

export const LargeGroups = () => {
    const largeGroups = {
        camera: [
            {
                id: 'camera-large',
                name: 'All Views Synced',
                members: [
                    { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf' },
                    { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa' },
                    { clientId: 'user-3', userName: 'Alex Johnson', userColor: '#f472b6' },
                    { clientId: 'user-4', userName: 'David Chen', userColor: '#fbbf24' },
                    { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c' },
                    { clientId: 'user-6', userName: 'Frank Miller', userColor: '#22d3ee' },
                    { clientId: 'user-7', userName: 'Grace Lee', userColor: '#4ade80' },
                    { clientId: 'user-8', userName: 'Henry Wang', userColor: '#f87171' },
                ],
            },
        ],
        filters: [],
        colorMaps: [],
        widgets: [],
        cursors: [],
        annotationDisplay: [],
    };

    return (
        <WorkspaceLinksHub
            linkGroups={largeGroups}
            onSelectGroup={(group) => console.log('Select group:', group)}
            onClose={() => console.log('Close')}
        />
    );
};
