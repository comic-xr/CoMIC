/**
 * @file MemberRow.stories.jsx
 * @description Storybook stories for MemberRow component.
 */

import React from 'react';
import { MemberRow } from './MemberRow';

export default {
    title: 'Molecules/MemberRow',
    component: MemberRow,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{ width: 280, background: 'var(--color-bg-secondary, #1e1e1e)', padding: '8px 0' }}>
                <Story />
            </div>
        ),
    ],
};

const mockUser = {
    odbc: 'user-1',
    userName: 'Alice Chen',
    userColor: '#4CAF50',
    status: 'online',
};

export const Default = {
    args: {
        user: mockUser,
    },
};

export const Selected = {
    args: {
        user: mockUser,
        isSelected: true,
    },
};

export const CurrentUser = {
    args: {
        user: { ...mockUser, isYou: true },
    },
};

export const InVoice = {
    args: {
        user: { ...mockUser, inVoice: true, isSpeaking: false },
        showVoiceStatus: true,
    },
};

export const Speaking = {
    args: {
        user: { ...mockUser, inVoice: true, isSpeaking: true },
        showVoiceStatus: true,
    },
};

export const Muted = {
    args: {
        user: { ...mockUser, inVoice: true, isMuted: true },
        showVoiceStatus: true,
    },
};

export const WithStatusMessage = {
    args: {
        user: { ...mockUser, statusMessage: 'Analyzing Dataset 5' },
    },
};

export const WithViewing = {
    args: {
        user: { ...mockUser, viewingView: 'Brain MRI - Slice 42' },
        showViewing: true,
    },
};

export const WithActions = {
    args: {
        user: mockUser,
        showActions: true,
        onGoToView: () => console.log('Go to view'),
        onMessage: () => console.log('Message'),
        onToggleCursor: () => console.log('Toggle cursor'),
        onMoreMenu: () => console.log('More menu'),
    },
};

export const RoomOwner = {
    args: {
        user: { ...mockUser, isRoomOwner: true },
    },
};

export const Compact = {
    args: {
        user: mockUser,
        variant: 'compact',
    },
};

export const OfflineUser = {
    args: {
        user: { ...mockUser, status: 'offline' },
    },
};

export const IdleUser = {
    args: {
        user: { ...mockUser, status: 'idle', statusMessage: 'BRB in 5 mins' },
    },
};

export const AwayUser = {
    args: {
        user: { ...mockUser, status: 'away', statusMessage: 'In a meeting' },
    },
};

export const MultipleUsers = {
    render: () => (
        <>
            <MemberRow
                user={{ ...mockUser, isYou: true }}
                showActions
                onMessage={() => { }}
                onGoToView={() => { }}
            />
            <MemberRow
                user={{ odbc: 'u2', userName: 'Bob Smith', userColor: '#2196F3', inVoice: true }}
                showVoiceStatus
                showActions
                onMessage={() => { }}
                onGoToView={() => { }}
            />
            <MemberRow
                user={{ odbc: 'u3', userName: 'Carol Davis', userColor: '#FF9800', statusMessage: 'Deep in code' }}
                showActions
                onMessage={() => { }}
                onGoToView={() => { }}
            />
            <MemberRow
                user={{ odbc: 'u4', userName: 'David Lee', userColor: '#9C27B0', status: 'idle' }}
                showActions
                onMessage={() => { }}
                onGoToView={() => { }}
            />
            <MemberRow
                user={{ odbc: 'u5', userName: 'Eva Martinez', userColor: '#E91E63', status: 'away', isRoomOwner: true }}
                showActions
                onMessage={() => { }}
                onGoToView={() => { }}
            />
        </>
    ),
};

export const CompactList = {
    render: () => (
        <>
            <MemberRow user={{ ...mockUser, isYou: true }} variant="compact" />
            <MemberRow user={{ odbc: 'u2', userName: 'Bob Smith', userColor: '#2196F3' }} variant="compact" />
            <MemberRow user={{ odbc: 'u3', userName: 'Carol Davis', userColor: '#FF9800' }} variant="compact" />
        </>
    ),
};