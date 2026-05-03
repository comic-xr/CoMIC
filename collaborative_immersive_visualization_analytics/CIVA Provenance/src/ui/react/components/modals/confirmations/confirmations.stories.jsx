// src/ui/react/components/modals/confirmations/confirmations.stories.jsx
/**
 * Confirmation Dialogs Overview
 *
 * VR MIGRATION NOTE:
 * ALL confirmation dialogs use FloatingPanel with priority={true}
 * See: FloatingPanel_Component_Specification.md
 *
 * VR Classification: PRIORITY PANEL
 * - Force decision, follow gaze
 * - Cannot be dismissed by backdrop click
 * - Escape key = Cancel action
 *
 * Dialogs in this folder:
 * - DeleteViewDialog: Soft delete with 30-day restore
 * - CloseAllViewsDialog: With "don't ask again" option
 * - DeleteNoteDialog: Three-button (Cancel/Archive/Delete)
 * - LeaveRoomDialog: Collaboration disconnect
 * - DeleteRecordingDialog: Shows recording metadata
 * - ClearChatDialog: Admin action, audit logged
 * - ArchiveProjectDialog: Shows impact list
 * - TransferOwnershipDialog: Dropdown selector
 * - DeleteProjectDialog: Type-to-confirm
 */
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Shared mock dialog component
const MockDialog = ({
    isOpen,
    onClose,
    title,
    description,
    icon,
    severity = 'danger',
    buttons = [],
    children,
}) => {
    if (!isOpen) return null;

    const severityColors = {
        info: '#60a5fa',
        warning: '#f59e0b',
        danger: '#ef4444',
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
        }}>
            <div style={{
                width: '400px',
                background: '#1a1a2e',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <div style={{ color: severityColors[severity] }}>
                        <Icon name={icon} size={20} />
                    </div>
                    <h2 style={{ flex: 1, margin: 0, color: 'white', fontSize: '16px' }}>{title}</h2>
                </div>
                <div style={{ padding: '20px', color: '#e5e7eb', fontSize: '14px' }}>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{description}</p>
                    {children}
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.2)',
                }}>
                    {buttons.map((btn, i) => (
                        <button
                            key={i}
                            onClick={btn.onClick || onClose}
                            style={{
                                padding: '10px 16px',
                                background: btn.variant === 'danger' ? '#ef4444' :
                                    btn.variant === 'warning' ? '#f59e0b' :
                                        btn.variant === 'primary' ? '#3b82f6' :
                                            'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: btn.variant ? 'white' : '#e5e7eb',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Interactive wrapper
const InteractiveShowcase = ({ dialogs }) => {
    const [active, setActive] = useState(null);

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px',
            }}>
                {dialogs.map((d, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        style={{
                            padding: '12px 16px',
                            background: '#1a1a2e',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <Icon name={d.icon} size={16} style={{ marginRight: '8px', color: d.color }} />
                        {d.name}
                    </button>
                ))}
            </div>
            {active !== null && dialogs[active] && (
                <MockDialog
                    isOpen={true}
                    onClose={() => setActive(null)}
                    {...dialogs[active].props}
                />
            )}
        </div>
    );
};

export default {
    title: 'Modals/Confirmations',
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ minHeight: '500px', padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const AllDialogs = {
    render: () => (
        <InteractiveShowcase
            dialogs={[
                {
                    name: 'Delete View',
                    icon: 'trash',
                    color: '#ef4444',
                    props: {
                        title: 'Delete View?',
                        description: '"Axial Slice" will be moved to Recently Deleted and can be restored for 30 days.',
                        icon: 'trash',
                        severity: 'danger',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Delete View', variant: 'danger' },
                        ],
                    },
                },
                {
                    name: 'Close All Views',
                    icon: 'x',
                    color: '#f59e0b',
                    props: {
                        title: 'Close All Views?',
                        description: 'This will close all 5 open views. Unsaved changes will be lost.',
                        icon: 'x',
                        severity: 'warning',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Close All', variant: 'warning' },
                        ],
                    },
                },
                {
                    name: 'Delete Note',
                    icon: 'stickyNote',
                    color: '#f59e0b',
                    props: {
                        title: 'Delete Note?',
                        description: '"Meeting Notes" will be removed. You can archive it to restore later.',
                        icon: 'stickyNote',
                        severity: 'warning',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Archive', variant: 'warning' },
                            { label: 'Delete', variant: 'danger' },
                        ],
                    },
                },
                {
                    name: 'Leave Room',
                    icon: 'logout',
                    color: '#f59e0b',
                    props: {
                        title: 'Leave Room?',
                        description: 'You will be disconnected from the collaborative session. Other members will continue.',
                        icon: 'logout',
                        severity: 'warning',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Leave Room', variant: 'warning' },
                        ],
                    },
                },
                {
                    name: 'Delete Recording',
                    icon: 'video',
                    color: '#ef4444',
                    props: {
                        title: 'Delete Recording?',
                        description: 'This 45-minute recording (2.3 GB) will be permanently deleted.',
                        icon: 'video',
                        severity: 'danger',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Delete Recording', variant: 'danger' },
                        ],
                    },
                },
                {
                    name: 'Clear Chat',
                    icon: 'messageSquare',
                    color: '#ef4444',
                    props: {
                        title: 'Clear Chat History?',
                        description: 'All 127 messages will be deleted. This action will be logged.',
                        icon: 'messageSquare',
                        severity: 'danger',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Clear Chat', variant: 'danger' },
                        ],
                    },
                },
                {
                    name: 'Archive Project',
                    icon: 'archive',
                    color: '#f59e0b',
                    props: {
                        title: 'Archive Project?',
                        description: '"Brain Study" will be archived. Collaborators will lose access.',
                        icon: 'archive',
                        severity: 'warning',
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Archive Project', variant: 'warning' },
                        ],
                    },
                },
                {
                    name: 'Transfer Ownership',
                    icon: 'userCheck',
                    color: '#f59e0b',
                    props: {
                        title: 'Transfer Ownership',
                        description: 'Select a new owner for "Brain Study". You will become an Admin.',
                        icon: 'userCheck',
                        severity: 'warning',
                        children: (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '6px',
                                color: '#6b7280',
                                fontSize: '12px',
                            }}>
                                [Dropdown selector for new owner]
                            </div>
                        ),
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Transfer', variant: 'warning' },
                        ],
                    },
                },
                {
                    name: 'Delete Project',
                    icon: 'trash',
                    color: '#ef4444',
                    props: {
                        title: 'Delete Project?',
                        description: 'This will PERMANENTLY delete "Brain Study" and ALL its data.',
                        icon: 'trash',
                        severity: 'danger',
                        children: (
                            <div style={{ marginTop: '16px' }}>
                                <input
                                    type="text"
                                    placeholder='Type "DELETE" to confirm'
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>
                        ),
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Delete Forever', variant: 'danger' },
                        ],
                    },
                },
            ]}
        />
    ),
};

export const DeleteView = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        return (
            <>
                <button onClick={() => setIsOpen(true)} style={{ padding: '10px 20px', background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                    Delete View
                </button>
                <MockDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title="Delete View?"
                    description='"Axial Slice" will be moved to Recently Deleted and can be restored for 30 days.'
                    icon="trash"
                    severity="danger"
                    buttons={[
                        { label: 'Cancel' },
                        { label: 'Delete View', variant: 'danger' },
                    ]}
                />
            </>
        );
    },
};

export const ThreeButtonLayout = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        return (
            <>
                <button onClick={() => setIsOpen(true)} style={{ padding: '10px 20px', background: '#f59e0b', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                    Delete Note
                </button>
                <MockDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title="Delete Note?"
                    description='"Meeting Notes" can be archived to restore later, or deleted permanently.'
                    icon="stickyNote"
                    severity="warning"
                    buttons={[
                        { label: 'Cancel' },
                        { label: 'Archive', variant: 'warning' },
                        { label: 'Delete', variant: 'danger' },
                    ]}
                />
            </>
        );
    },
};
