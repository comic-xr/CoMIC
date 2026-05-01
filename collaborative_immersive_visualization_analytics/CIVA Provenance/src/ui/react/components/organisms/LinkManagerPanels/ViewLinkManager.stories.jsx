/**
 * ViewLinkManager Stories
 */

import React, { useState } from 'react';
import { ViewLinkManager } from './ViewLinkManager';

export default {
    title: 'Organisms/LinkManagerPanels/ViewLinkManager',
    component: ViewLinkManager,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
        docs: {
            description: {
                component: 'Panel for configuring link settings for a specific view. Allows selecting properties to sync and managing group membership.',
            },
        },
    },
};

// Sample link stats with members
const sampleLinkStats = {
    camera: {
        count: 2,
        mode: 'sync',
        members: [
            { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf', viewName: 'Main View', mode: 'sync' },
            { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa', viewName: 'Analysis', mode: 'follow' },
        ],
    },
    filters: {
        count: 1,
        mode: 'broadcast',
        members: [
            { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf', viewName: 'Main View', mode: 'broadcast' },
        ],
    },
    colorMaps: { count: 0, mode: 'sync', members: [] },
    widgets: { count: 0, mode: 'sync', members: [] },
    cursors: {
        count: 3,
        mode: 'follow',
        members: [
            { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf', viewName: 'Main View', mode: 'follow' },
            { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa', viewName: 'Analysis', mode: 'sync' },
            { clientId: 'user-3', userName: 'Alex Johnson', userColor: '#f472b6', viewName: 'Detail', mode: 'broadcast' },
        ],
    },
    annotationDisplay: { count: 0, mode: 'sync', members: [] },
};

export const Default = () => {
    const [linkStats, setLinkStats] = useState(sampleLinkStats);

    const handleModeChange = (propertyId, mode) => {
        console.log('Mode changed:', propertyId, mode);
        setLinkStats(prev => ({
            ...prev,
            [propertyId]: { ...prev[propertyId], mode },
        }));
    };

    const handleRemoveMember = (member) => {
        console.log('Remove member:', member);
    };

    const handleAddMember = (propertyId) => {
        console.log('Add member to:', propertyId);
    };

    return (
        <ViewLinkManager
            viewId="view-1"
            viewName="Main Visualization"
            viewColor="#2dd4bf"
            linkStats={linkStats}
            currentUserId="user-1"
            onModeChange={handleModeChange}
            onRemoveMember={handleRemoveMember}
            onAddMember={handleAddMember}
            onClose={() => console.log('Close')}
        />
    );
};

export const NoLinks = () => (
    <ViewLinkManager
        viewId="view-2"
        viewName="New View"
        viewColor="#a78bfa"
        linkStats={{}}
        currentUserId="user-1"
        onClose={() => console.log('Close')}
    />
);

export const AllLinked = () => {
    const allLinked = {
        camera: { count: 4, mode: 'sync', members: sampleLinkStats.camera.members },
        filters: { count: 2, mode: 'sync', members: sampleLinkStats.filters.members },
        colorMaps: { count: 3, mode: 'broadcast', members: sampleLinkStats.camera.members },
        widgets: { count: 1, mode: 'follow', members: sampleLinkStats.filters.members },
        cursors: { count: 2, mode: 'sync', members: sampleLinkStats.camera.members },
        annotationDisplay: { count: 1, mode: 'sync', members: sampleLinkStats.filters.members },
    };

    return (
        <ViewLinkManager
            viewId="view-3"
            viewName="Fully Connected View"
            viewColor="#f472b6"
            linkStats={allLinked}
            currentUserId="user-1"
            onClose={() => console.log('Close')}
        />
    );
};

export const ManyMembers = () => {
    const manyMembers = {
        camera: {
            count: 6,
            mode: 'sync',
            members: [
                { clientId: 'user-1', userName: 'Beth Smith', userColor: '#2dd4bf', viewName: 'Main', mode: 'sync' },
                { clientId: 'user-2', userName: 'Claude Opus', userColor: '#a78bfa', viewName: 'Analysis', mode: 'follow' },
                { clientId: 'user-3', userName: 'Alex Johnson', userColor: '#f472b6', viewName: 'Detail', mode: 'broadcast' },
                { clientId: 'user-4', userName: 'David Chen', userColor: '#fbbf24', viewName: 'Chart', mode: 'sync' },
                { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c', viewName: 'Overview', mode: 'follow' },
                { clientId: 'user-6', userName: 'Frank Miller', userColor: '#22d3ee', viewName: 'Scatter', mode: 'sync' },
            ],
        },
        filters: { count: 0, mode: 'sync', members: [] },
        colorMaps: { count: 0, mode: 'sync', members: [] },
        widgets: { count: 0, mode: 'sync', members: [] },
        cursors: { count: 0, mode: 'sync', members: [] },
        annotationDisplay: { count: 0, mode: 'sync', members: [] },
    };

    return (
        <ViewLinkManager
            viewId="view-4"
            viewName="Team Dashboard"
            viewColor="#fbbf24"
            linkStats={manyMembers}
            currentUserId="user-1"
            onClose={() => console.log('Close')}
        />
    );
};

export const WithoutCloseButton = () => (
    <ViewLinkManager
        viewId="view-5"
        viewName="Embedded Panel"
        viewColor="#22d3ee"
        linkStats={sampleLinkStats}
        currentUserId="user-1"
    />
);
