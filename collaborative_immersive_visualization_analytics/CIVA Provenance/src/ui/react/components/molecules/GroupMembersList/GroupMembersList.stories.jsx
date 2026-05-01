/**
 * GroupMembersList Stories
 */

import React, { useState } from 'react';
import { GroupMembersList, GroupMembersCompact } from './GroupMembersList';

export default {
    title: 'Molecules/GroupMembersList',
    component: GroupMembersList,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Displays members of a link/sync group with avatars, names, and mode indicators.',
            },
        },
    },
};

// Sample member data
const sampleMembers = [
    {
        clientId: 'user-1',
        userName: 'Beth Smith',
        userColor: '#2dd4bf',
        viewName: 'Main View',
        viewColor: '#2dd4bf',
        mode: 'sync',
    },
    {
        clientId: 'user-2',
        userName: 'Claude Opus',
        userColor: '#a78bfa',
        viewName: 'Analysis View',
        viewColor: '#a78bfa',
        mode: 'follow',
    },
    {
        clientId: 'user-3',
        userName: 'Alex Johnson',
        userColor: '#f472b6',
        viewName: 'Comparison View',
        viewColor: '#f472b6',
        mode: 'broadcast',
    },
];

export const Default = () => {
    const [members, setMembers] = useState(sampleMembers);

    const handleRemove = (member) => {
        setMembers(members.filter(m => m.clientId !== member.clientId));
    };

    return (
        <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8, padding: 8 }}>
            <GroupMembersList
                members={members}
                currentUserId="user-1"
                onRemoveMember={handleRemove}
            />
        </div>
    );
};

export const WithoutRemove = () => (
    <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8, padding: 8 }}>
        <GroupMembersList
            members={sampleMembers}
            currentUserId="user-1"
        />
    </div>
);

export const WithoutModes = () => (
    <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8, padding: 8 }}>
        <GroupMembersList
            members={sampleMembers}
            currentUserId="user-1"
            showModes={false}
        />
    </div>
);

export const CustomPropertyColor = () => (
    <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8, padding: 8 }}>
        <GroupMembersList
            members={sampleMembers}
            currentUserId="user-1"
            propertyColor="#a78bfa"
        />
    </div>
);

export const Empty = () => (
    <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
        <GroupMembersList
            members={[]}
            emptyMessage="No one else is in this sync group"
        />
    </div>
);

export const SingleMember = () => (
    <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8, padding: 8 }}>
        <GroupMembersList
            members={[sampleMembers[0]]}
            currentUserId="user-1"
        />
    </div>
);

export const ManyMembers = () => {
    const manyMembers = [
        ...sampleMembers,
        { clientId: 'user-4', userName: 'David Chen', userColor: '#fbbf24', viewName: 'Chart View', mode: 'sync' },
        { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c', viewName: 'Detail View', mode: 'follow' },
        { clientId: 'user-6', userName: 'Frank Miller', userColor: '#22d3ee', viewName: 'Overview', mode: 'sync' },
    ];

    return (
        <div style={{ width: 360, background: 'var(--color-bg-secondary)', borderRadius: 8, padding: 8 }}>
            <GroupMembersList
                members={manyMembers}
                currentUserId="user-1"
            />
        </div>
    );
};

// Compact variant stories
export const CompactDefault = () => (
    <div style={{ padding: 20, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
        <GroupMembersCompact members={sampleMembers} />
    </div>
);

export const CompactWithMax = () => (
    <div style={{ padding: 20, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
        <GroupMembersCompact
            members={[
                ...sampleMembers,
                { clientId: 'user-4', userName: 'David Chen', userColor: '#fbbf24' },
                { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c' },
            ]}
            max={3}
        />
    </div>
);

export const CompactSizes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
        <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>Extra Small (xs)</span>
            <GroupMembersCompact members={sampleMembers} size="xs" />
        </div>
        <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>Small (sm)</span>
            <GroupMembersCompact members={sampleMembers} size="sm" />
        </div>
        <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>Medium (md)</span>
            <GroupMembersCompact members={sampleMembers} size="md" />
        </div>
        <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>Large (lg)</span>
            <GroupMembersCompact members={sampleMembers} size="lg" />
        </div>
    </div>
);
