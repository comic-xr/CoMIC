/**
 * UserFollowingPanel Stories
 *
 * Panel for following other collaborators' viewports (separate from view linking).
 * Shows who you're following, follow options, workspace members, and who follows you.
 */

import React, { useState } from 'react';
import { UserFollowingPanel } from './UserFollowingPanel';

export default {
    title: 'Organisms/LinkManagerPanels/UserFollowingPanel',
    component: UserFollowingPanel,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
        docs: {
            description: {
                component: `Panel for following other collaborators' viewports (separate from view linking).

Features:
- **Currently Following**: Shows who you're following with follow options
- **Follow Options**: Jump to view, show cursor, mirror camera, auto-follow
- **Workspace Members**: List of users with follow buttons
- **Following You**: Shows who is following the current user
- **Start Presenting**: Become a broadcast source for followers`,
            },
        },
    },
};

// Sample users for workspace members
const sampleUsers = [
    {
        clientId: 'user-1',
        userName: 'Beth Smith',
        userColor: '#2dd4bf',
        status: 'online',
        activeView: 'Tumor Analysis',
    },
    {
        clientId: 'user-2',
        userName: 'Claude Opus',
        userColor: '#a78bfa',
        status: 'active',
        activeView: 'Vessel Network',
    },
    {
        clientId: 'user-3',
        userName: 'Alex Johnson',
        userColor: '#f472b6',
        status: 'busy',
        activeView: 'Detail View',
    },
    {
        clientId: 'user-4',
        userName: 'David Chen',
        userColor: '#fbbf24',
        status: 'idle',
        activeView: 'Chart Overview',
    },
];

// Sample followers
const sampleFollowers = [
    {
        clientId: 'follower-1',
        userName: 'Emma Wilson',
        userColor: '#fb923c',
    },
    {
        clientId: 'follower-2',
        userName: 'Frank Miller',
        userColor: '#22d3ee',
    },
];

/**
 * Default state - not following anyone
 */
export const Default = () => {
    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={[]}
            onFollow={(user) => {
                console.log('Following:', user.userName);
                setFollowingUser(user);
            }}
            onUnfollow={(user) => {
                console.log('Unfollowed:', user.userName);
                setFollowingUser(null);
            }}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Currently following someone with options visible
 */
export const CurrentlyFollowing = () => {
    const [followingUser, setFollowingUser] = useState(sampleUsers[1]);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={[]}
            onFollow={(user) => {
                console.log('Following:', user.userName);
                setFollowingUser(user);
            }}
            onUnfollow={(user) => {
                console.log('Unfollowed:', user.userName);
                setFollowingUser(null);
            }}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Shows who is following the current user
 */
export const WithFollowers = () => {
    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={sampleFollowers}
            onFollow={(user) => {
                console.log('Following:', user.userName);
                setFollowingUser(user);
            }}
            onUnfollow={(user) => {
                console.log('Unfollowed:', user.userName);
                setFollowingUser(null);
            }}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Full state - following someone with people following you
 */
export const FullState = () => {
    const [followingUser, setFollowingUser] = useState(sampleUsers[0]);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={sampleFollowers}
            onFollow={(user) => {
                console.log('Following:', user.userName);
                setFollowingUser(user);
            }}
            onUnfollow={(user) => {
                console.log('Unfollowed:', user.userName);
                setFollowingUser(null);
            }}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Many users in the workspace
 */
export const ManyUsers = () => {
    const manyUsers = [
        ...sampleUsers,
        { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c', status: 'online', activeView: 'Overview' },
        { clientId: 'user-6', userName: 'Frank Miller', userColor: '#22d3ee', status: 'online', activeView: 'Scatter Plot' },
        { clientId: 'user-7', userName: 'Grace Lee', userColor: '#4ade80', status: 'busy', activeView: 'Heatmap' },
        { clientId: 'user-8', userName: 'Henry Wang', userColor: '#f87171', status: 'away', activeView: 'Timeline' },
    ];

    const manyFollowers = [
        { clientId: 'f-1', userName: 'Iris Chen', userColor: '#60a5fa' },
        { clientId: 'f-2', userName: 'James Liu', userColor: '#a3e635' },
        { clientId: 'f-3', userName: 'Kate Park', userColor: '#e879f9' },
        { clientId: 'f-4', userName: 'Leo Kim', userColor: '#38bdf8' },
    ];

    const [followingUser, setFollowingUser] = useState(manyUsers[2]);

    return (
        <UserFollowingPanel
            users={manyUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={manyFollowers}
            onFollow={(user) => {
                console.log('Following:', user.userName);
                setFollowingUser(user);
            }}
            onUnfollow={(user) => {
                console.log('Unfollowed:', user.userName);
                setFollowingUser(null);
            }}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * No other users in workspace
 */
export const NoUsers = () => (
    <UserFollowingPanel
        users={[]}
        currentUserId="user-current"
        followingUser={null}
        followers={[]}
        onStartPresenting={() => console.log('Start presenting')}
        onClose={() => console.log('Close')}
    />
);

/**
 * Single user in workspace
 */
export const SingleUser = () => {
    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={[sampleUsers[0]]}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={[]}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Mixed online statuses
 */
export const MixedStatuses = () => {
    const mixedUsers = [
        { clientId: 'user-1', userName: 'Online User', userColor: '#22c55e', status: 'online', activeView: 'Active View' },
        { clientId: 'user-2', userName: 'Active User', userColor: '#3b82f6', status: 'active', activeView: 'Working View' },
        { clientId: 'user-3', userName: 'Busy User', userColor: '#ef4444', status: 'busy', activeView: 'In Meeting' },
        { clientId: 'user-4', userName: 'Idle User', userColor: '#f59e0b', status: 'idle', activeView: 'Last Active' },
        { clientId: 'user-5', userName: 'Away User', userColor: '#eab308', status: 'away', activeView: 'Away' },
        { clientId: 'user-6', userName: 'Offline User', userColor: '#6b7280', status: 'offline', activeView: null },
    ];

    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={mixedUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={[]}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onStartPresenting={() => console.log('Start presenting')}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Without presenting option
 */
export const WithoutPresenting = () => {
    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={sampleFollowers}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onClose={() => console.log('Close')}
        />
    );
};

/**
 * Without close button (embedded in another panel)
 */
export const WithoutCloseButton = () => {
    const [followingUser, setFollowingUser] = useState(sampleUsers[0]);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            followers={sampleFollowers}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onStartPresenting={() => console.log('Start presenting')}
        />
    );
};
