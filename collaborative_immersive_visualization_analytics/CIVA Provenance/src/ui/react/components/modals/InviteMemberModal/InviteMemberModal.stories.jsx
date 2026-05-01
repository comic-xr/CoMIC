/**
 * @file InviteMemberModal.stories.jsx
 * @description Storybook stories for InviteMemberModal and EmailTagInput components.
 */

import React, { useState } from 'react';
import InviteMemberModal from './InviteMemberModal';
import EmailTagInput from './EmailTagInput';

export default {
    title: 'Modals/InviteMemberModal',
    component: InviteMemberModal,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Form modal for inviting members to a project with email tag input and role selection.',
            },
        },
    },
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Whether modal is visible',
        },
        projectName: {
            control: 'text',
            description: 'Name of the project to display in title',
        },
        onClose: {
            action: 'closed',
            description: 'Close handler',
        },
        onInvite: {
            action: 'invited',
            description: 'Invite callback with emails, role, and message',
        },
    },
};

// Interactive wrapper for modal stories
const ModalWrapper = ({ children, ...props }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                Open Invite Modal
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
 * Default state of the InviteMemberModal.
 */
export const Default = {
    render: (args) => (
        <ModalWrapper>
            <InviteMemberModal {...args} />
        </ModalWrapper>
    ),
    args: {
        projectName: 'Research Project Alpha',
        onInvite: async (data) => {
            console.log('Invite data:', data);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        },
    },
};

/**
 * Modal with existing members to show duplicate warnings.
 */
export const WithExistingMembers = {
    render: (args) => (
        <ModalWrapper>
            <InviteMemberModal {...args} />
        </ModalWrapper>
    ),
    args: {
        projectName: 'Team Workspace',
        existingMembers: [
            { email: 'alice@example.com' },
            { email: 'bob@example.com' },
            { email: 'charlie@example.com' },
        ],
        onInvite: async (data) => {
            console.log('Invite data:', data);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        },
    },
};

/**
 * Modal that simulates an error during invite.
 */
export const WithError = {
    render: (args) => (
        <ModalWrapper>
            <InviteMemberModal {...args} />
        </ModalWrapper>
    ),
    args: {
        projectName: 'Test Project',
        onInvite: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            throw new Error('Failed to send invitations. Please try again.');
        },
    },
};

/**
 * Modal for a long project name.
 */
export const LongProjectName = {
    render: (args) => (
        <ModalWrapper>
            <InviteMemberModal {...args} />
        </ModalWrapper>
    ),
    args: {
        projectName: 'Comprehensive Data Analysis and Machine Learning Research Project for Q4 2024',
        onInvite: async (data) => {
            console.log('Invite data:', data);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        },
    },
};

// =============================================================================
// EMAIL TAG INPUT STORIES
// =============================================================================

export const EmailTagInputDefault = {
    render: () => {
        const [emails, setEmails] = useState([]);
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <EmailTagInput
                    value={emails}
                    onChange={setEmails}
                    placeholder="Enter email addresses"
                />
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                    Current emails: {emails.length === 0 ? 'None' : emails.join(', ')}
                </p>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty email tag input ready to accept email addresses.',
            },
        },
    },
};

export const EmailTagInputWithEmails = {
    render: () => {
        const [emails, setEmails] = useState([
            'alice@example.com',
            'bob@example.com',
            'charlie@example.com',
        ]);
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <EmailTagInput
                    value={emails}
                    onChange={setEmails}
                    placeholder="Enter email addresses"
                />
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Email tag input pre-populated with valid email addresses.',
            },
        },
    },
};

export const EmailTagInputWithInvalidEmails = {
    render: () => {
        const [emails, setEmails] = useState([
            'valid@example.com',
            'invalid-email',
            'another@test.com',
            'not-an-email',
        ]);
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <EmailTagInput
                    value={emails}
                    onChange={setEmails}
                    placeholder="Enter email addresses"
                    error="Some emails are invalid"
                />
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#f87171' }}>
                    Invalid emails are highlighted in red.
                </p>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Email tag input showing invalid email styling.',
            },
        },
    },
};

export const EmailTagInputDisabled = {
    render: () => {
        const [emails] = useState([
            'alice@example.com',
            'bob@example.com',
        ]);
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <EmailTagInput
                    value={emails}
                    onChange={() => { }}
                    placeholder="Enter email addresses"
                    disabled
                />
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Disabled email tag input that cannot be modified.',
            },
        },
    },
};

export const EmailTagInputManyEmails = {
    render: () => {
        const [emails, setEmails] = useState([
            'alice@example.com',
            'bob@example.com',
            'charlie@example.com',
            'david@example.com',
            'eve@example.com',
            'frank@example.com',
            'grace@example.com',
            'henry@example.com',
        ]);
        return (
            <div style={{ width: '400px', padding: '20px', background: '#1a1a2e' }}>
                <EmailTagInput
                    value={emails}
                    onChange={setEmails}
                    placeholder="Enter email addresses"
                />
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                    Input expands to accommodate multiple email tags.
                </p>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Email tag input with many emails showing wrap behavior.',
            },
        },
    },
};