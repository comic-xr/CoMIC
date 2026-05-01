/**
 * @file ProfileModal.stories.jsx
 * @description Storybook stories for the ProfileModal component.
 * Demonstrates profile modal with various user states and configurations.
 */

import React, { useState } from 'react';
import { ProfileModal, getInitials } from './index';
import { Button } from '@UI/react/components/atoms/Button';

export default {
    title: 'Modals/ProfileModal',
    component: ProfileModal,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', minHeight: '100vh' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// SAMPLE USERS
// =============================================================================

const SAMPLE_USERS = {
    online: {
        id: '1',
        name: 'Sarah Chen',
        email: 'sarah.chen@example.com',
        avatar: null,
        status: 'online',
        role: 'admin',
        currentView: 'Mars Terrain Analysis',
        lastActive: new Date().toISOString(),
    },
    away: {
        id: '2',
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatar: null,
        status: 'away',
        role: 'member',
        currentView: 'Dataset Explorer',
        lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    },
    busy: {
        id: '3',
        name: 'Alice Johnson',
        email: 'alice.j@example.com',
        avatar: null,
        status: 'busy',
        role: 'owner',
        currentView: 'Annotation Editor',
        lastActive: new Date().toISOString(),
    },
    offline: {
        id: '4',
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        avatar: null,
        status: 'offline',
        role: 'viewer',
        currentView: null,
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
};

// =============================================================================
// DEFAULT
// =============================================================================

export const Default = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Click the button to view user profile
                </p>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    View Profile
                </Button>
                <ProfileModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    user={SAMPLE_USERS.online}
                    onMessage={() => console.log('Message clicked')}
                    onInviteToVoice={() => console.log('Invite to voice clicked')}
                    onGoToView={() => console.log('Go to view clicked')}
                />
            </div>
        );
    },
};

// =============================================================================
// STATUS VARIANTS
// =============================================================================

export const OnlineUser = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={SAMPLE_USERS.online}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

export const AwayUser = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={SAMPLE_USERS.away}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

export const BusyUser = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={SAMPLE_USERS.busy}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

export const OfflineUser = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={SAMPLE_USERS.offline}
                onMessage={() => { }}
            />
        );
    },
};

// =============================================================================
// ROLE VARIANTS
// =============================================================================

export const OwnerRole = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={{ ...SAMPLE_USERS.online, role: 'owner', name: 'Project Owner' }}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

export const AdminRole = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={{ ...SAMPLE_USERS.online, role: 'admin', name: 'Team Admin' }}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

export const MemberRole = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={{ ...SAMPLE_USERS.online, role: 'member', name: 'Team Member' }}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

export const ViewerRole = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={{ ...SAMPLE_USERS.online, role: 'viewer', name: 'Guest Viewer' }}
                onMessage={() => { }}
            />
        );
    },
};

// =============================================================================
// WITHOUT ACTIONS
// =============================================================================

export const MinimalActions = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={SAMPLE_USERS.online}
                onMessage={() => { }}
            />
        );
    },
};

export const NoActions = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={SAMPLE_USERS.offline}
            />
        );
    },
};

// =============================================================================
// WITHOUT EMAIL
// =============================================================================

export const WithoutEmail = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const userWithoutEmail = { ...SAMPLE_USERS.online, email: undefined };

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={userWithoutEmail}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
            />
        );
    },
};

// =============================================================================
// LONG NAME
// =============================================================================

export const LongName = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const userWithLongName = {
            ...SAMPLE_USERS.online,
            name: 'Dr. Alexandra Katherine Montgomery-Fitzgerald III',
            email: 'alexandra.montgomery-fitzgerald@longdomainname.example.com',
        };

        return (
            <ProfileModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                user={userWithLongName}
                onMessage={() => { }}
                onInviteToVoice={() => { }}
                onGoToView={() => { }}
            />
        );
    },
};

// =============================================================================
// INITIALS DEMO
// =============================================================================

export const InitialsDemo = {
    render: () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            padding: '24px',
            background: '#1a1a24',
            borderRadius: '8px'
        }}>
            {[
                'John Doe',
                'Sarah Chen',
                'Alice',
                'Bob Smith Jr',
                'Dr. Jane',
                'A B C D',
                'Single',
                ''
            ].map((name, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#2a2a3a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#888'
                    }}>
                        {getInitials(name)}
                    </div>
                    <span style={{ color: '#888', fontSize: '12px' }}>
                        {name || '(empty)'}
                    </span>
                </div>
            ))}
        </div>
    ),
};

// =============================================================================
// INTERACTIVE DEMO
// =============================================================================

export const InteractiveDemo = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [selectedUser, setSelectedUser] = useState(null);
        const [actionLog, setActionLog] = useState([]);

        const users = Object.values(SAMPLE_USERS);

        const logAction = (action) => {
            setActionLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${action}`]);
        };

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Click on a user to view their profile
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {users.map(user => (
                        <Button
                            key={user.id}
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setSelectedUser(user);
                                setIsOpen(true);
                            }}
                        >
                            {user.name.split(' ')[0]}
                        </Button>
                    ))}
                </div>

                {actionLog.length > 0 && (
                    <div style={{
                        padding: '12px',
                        background: '#1a1a24',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>Action Log:</div>
                        {actionLog.map((log, i) => (
                            <div key={i} style={{ color: '#4ade80', fontSize: '12px', fontFamily: 'monospace' }}>
                                {log}
                            </div>
                        ))}
                    </div>
                )}

                <ProfileModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    user={selectedUser}
                    onMessage={() => logAction(`Message ${selectedUser?.name}`)}
                    onInviteToVoice={() => logAction(`Invite ${selectedUser?.name} to voice`)}
                    onGoToView={() => logAction(`Go to ${selectedUser?.currentView}`)}
                />
            </div>
        );
    },
};