/**
 * @file ShareViewModal.stories.jsx
 * @description Storybook stories for ShareViewModal and subcomponents.
 */

import React, { useState } from 'react';
import ShareViewModal from './ShareViewModal';
import PersonSearch from './PersonSearch';
import ShareeList from './ShareeList';

export default {
    title: 'Modals/ShareViewModal',
    component: ShareViewModal,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Modal for sharing views with project members, managing permissions, and generating share links.',
            },
        },
    },
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Whether modal is visible',
        },
        onClose: {
            action: 'closed',
            description: 'Close handler',
        },
        onSave: {
            action: 'saved',
            description: 'Save changes handler',
        },
        onCopyLink: {
            action: 'copy-link',
            description: 'Copy link handler',
        },
        onStopSharing: {
            action: 'stop-sharing',
            description: 'Stop sharing handler',
        },
    },
};

// Sample data
const SAMPLE_VIEW = {
    id: 'view-1',
    name: 'Dataset Analysis View',
    sharedWith: [
        {
            id: 'user-1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            permission: 'editor',
        },
        {
            id: 'user-2',
            name: 'Sarah Chen',
            email: 'sarah.chen@example.com',
            permission: 'viewer',
        },
    ],
};

const SAMPLE_MEMBERS = [
    { id: 'user-1', name: 'John Doe', email: 'john.doe@example.com' },
    { id: 'user-2', name: 'Sarah Chen', email: 'sarah.chen@example.com' },
    { id: 'user-3', name: 'Mike Johnson', email: 'mike.johnson@example.com' },
    { id: 'user-4', name: 'Emily Brown', email: 'emily.brown@example.com' },
    { id: 'user-5', name: 'Alex Wilson', email: 'alex.wilson@example.com' },
    { id: 'user-6', name: 'Lisa Anderson', email: 'lisa.anderson@example.com' },
    { id: 'user-7', name: 'David Martinez', email: 'david.martinez@example.com' },
    { id: 'group-1', name: 'Team Alpha', email: 'team-alpha@example.com', isGroup: true },
];

// Interactive wrapper for modal stories
const ModalWrapper = ({ children, ...props }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '10px 20px',
                    background: '#ec4899',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                Open Share Modal
            </button>
            {React.cloneElement(children, {
                ...props,
                isOpen,
                onClose: () => setIsOpen(false),
            })}
        </>
    );
};

/**
 * Default state with existing shares.
 */
export const Default = {
    render: (args) => (
        <ModalWrapper>
            <ShareViewModal {...args} />
        </ModalWrapper>
    ),
    args: {
        view: SAMPLE_VIEW,
        projectMembers: SAMPLE_MEMBERS,
        onSave: async (updates) => {
            console.log('Save updates:', updates);
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
        onCopyLink: async () => {
            console.log('Copy link');
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'https://app.example.com/share/abc123';
        },
        onStopSharing: async () => {
            console.log('Stop sharing');
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
    },
};

/**
 * Empty state with no current shares.
 */
export const EmptyState = {
    render: (args) => (
        <ModalWrapper>
            <ShareViewModal {...args} />
        </ModalWrapper>
    ),
    args: {
        view: {
            id: 'view-2',
            name: 'New Analysis View',
            sharedWith: [],
        },
        projectMembers: SAMPLE_MEMBERS,
        onSave: async (updates) => {
            console.log('Save updates:', updates);
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
        onCopyLink: async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'https://app.example.com/share/xyz789';
        },
        onStopSharing: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
    },
};

/**
 * Modal with many sharees.
 */
export const ManySharees = {
    render: (args) => (
        <ModalWrapper>
            <ShareViewModal {...args} />
        </ModalWrapper>
    ),
    args: {
        view: {
            id: 'view-3',
            name: 'Shared Research Data',
            sharedWith: [
                { id: 'user-1', name: 'John Doe', email: 'john.doe@example.com', permission: 'editor' },
                { id: 'user-2', name: 'Sarah Chen', email: 'sarah.chen@example.com', permission: 'viewer' },
                { id: 'user-3', name: 'Mike Johnson', email: 'mike.johnson@example.com', permission: 'can-share' },
                { id: 'user-4', name: 'Emily Brown', email: 'emily.brown@example.com', permission: 'viewer' },
                { id: 'user-5', name: 'Alex Wilson', email: 'alex.wilson@example.com', permission: 'editor' },
                { id: 'group-1', name: 'Team Alpha', email: 'team-alpha@example.com', permission: 'viewer', isGroup: true },
            ],
        },
        projectMembers: SAMPLE_MEMBERS,
        onSave: async (updates) => {
            console.log('Save updates:', updates);
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
        onCopyLink: async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'https://app.example.com/share/def456';
        },
        onStopSharing: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
    },
};

/**
 * Modal that simulates an error during save.
 */
export const WithError = {
    render: (args) => (
        <ModalWrapper>
            <ShareViewModal {...args} />
        </ModalWrapper>
    ),
    args: {
        view: SAMPLE_VIEW,
        projectMembers: SAMPLE_MEMBERS,
        onSave: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            throw new Error('Failed to update sharing settings. Please try again.');
        },
        onCopyLink: async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'https://app.example.com/share/abc123';
        },
        onStopSharing: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
        },
    },
};

// =============================================================================
// PERSON SEARCH STORIES
// =============================================================================

export const PersonSearchDefault = {
    render: () => {
        const [selectedUsers, setSelectedUsers] = useState([]);

        const handleSelect = (user) => {
            setSelectedUsers((prev) => [...prev, user]);
        };

        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <PersonSearch
                    users={SAMPLE_MEMBERS}
                    excludeIds={selectedUsers.map((u) => u.id)}
                    onSelect={handleSelect}
                    placeholder="Add people or groups..."
                />
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
                    Selected: {selectedUsers.length === 0 ? 'None' : selectedUsers.map((u) => u.name).join(', ')}
                </div>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Person search autocomplete for adding users to share with.',
            },
        },
    },
};

export const PersonSearchWithExclusions = {
    render: () => {
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <PersonSearch
                    users={SAMPLE_MEMBERS}
                    excludeIds={['user-1', 'user-2', 'user-3']}
                    onSelect={(user) => console.log('Selected:', user)}
                    placeholder="Add people or groups..."
                />
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
                    John, Sarah, and Mike are excluded from search results.
                </div>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Person search with some users excluded (already shared with).',
            },
        },
    },
};

// =============================================================================
// SHAREE LIST STORIES
// =============================================================================

export const ShareeListDefault = {
    render: () => {
        const [sharees, setSharees] = useState([
            { id: 'user-1', name: 'John Doe', email: 'john.doe@example.com', permission: 'editor' },
            { id: 'user-2', name: 'Sarah Chen', email: 'sarah.chen@example.com', permission: 'viewer' },
            { id: 'group-1', name: 'Team Alpha', email: 'team-alpha@example.com', permission: 'can-share', isGroup: true },
        ]);

        const handlePermissionChange = (userId, permission) => {
            setSharees((prev) =>
                prev.map((s) => (s.id === userId ? { ...s, permission } : s))
            );
        };

        const handleRemove = (userId) => {
            setSharees((prev) => prev.filter((s) => s.id !== userId));
        };

        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <ShareeList
                    sharees={sharees}
                    onPermissionChange={handlePermissionChange}
                    onRemove={handleRemove}
                />
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'List of users and groups with shared access and permission controls.',
            },
        },
    },
};

export const ShareeListEmpty = {
    render: () => {
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <ShareeList
                    sharees={[]}
                    onPermissionChange={() => { }}
                    onRemove={() => { }}
                />
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty sharee list showing placeholder message.',
            },
        },
    },
};

export const ShareeListDisabled = {
    render: () => {
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <ShareeList
                    sharees={[
                        { id: 'user-1', name: 'John Doe', email: 'john.doe@example.com', permission: 'editor' },
                        { id: 'user-2', name: 'Sarah Chen', email: 'sarah.chen@example.com', permission: 'viewer' },
                    ]}
                    onPermissionChange={() => { }}
                    onRemove={() => { }}
                    disabled
                />
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
                    Controls are disabled during save operations.
                </div>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Sharee list with disabled controls (during save).',
            },
        },
    },
};