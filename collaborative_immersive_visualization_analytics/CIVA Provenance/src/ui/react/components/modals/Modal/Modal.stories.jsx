// src/ui/react/components/modals/Modal/Modal.stories.jsx
/**
 * Modal Stories
 *
 * VR MIGRATION NOTE:
 * This Modal component will be migrated to use FloatingPanel internally.
 * See: FloatingPanel_Component_Specification.md
 *
 * Classification for VR:
 * - Standard modals (Help, Settings, Forms) -> FloatingPanel with priority={false}
 * - Confirmation modals -> FloatingPanel with priority={true}
 */
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock Modal for Storybook (avoids portal/focus trap issues)
const MockModal = ({
    isOpen,
    onClose,
    title,
    icon,
    severity = 'info',
    size = 'md',
    showCloseButton = true,
    children,
    footer,
}) => {
    if (!isOpen) return null;

    const sizeMap = { sm: '400px', md: '520px', lg: '640px' };
    const severityColors = {
        info: '#60a5fa',
        warning: '#f59e0b',
        danger: '#ef4444',
        success: '#34d399',
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
        }}>
            <div style={{
                width: sizeMap[size],
                maxWidth: '90vw',
                background: '#1a1a2e',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    {icon && (
                        <div style={{ color: severityColors[severity] }}>
                            <Icon name={icon} size={20} />
                        </div>
                    )}
                    <h2 style={{
                        flex: 1,
                        margin: 0,
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                    }}>
                        {title}
                    </h2>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#6b7280',
                                cursor: 'pointer',
                            }}
                        >
                            <Icon name="close" size={16} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div style={{
                    padding: '20px',
                    color: '#e5e7eb',
                    fontSize: '14px',
                    lineHeight: 1.6,
                }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        padding: '16px 20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(0, 0, 0, 0.2)',
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// Button helper
const Button = ({ variant = 'secondary', children, onClick, disabled }) => {
    const variants = {
        secondary: { bg: 'rgba(255, 255, 255, 0.1)', color: '#e5e7eb' },
        primary: { bg: '#3b82f6', color: 'white' },
        danger: { bg: '#ef4444', color: 'white' },
        warning: { bg: '#f59e0b', color: 'white' },
    };
    const v = variants[variant];
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '10px 20px',
                background: v.bg,
                border: 'none',
                borderRadius: '6px',
                color: v.color,
                fontSize: '13px',
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            {children}
        </button>
    );
};

// Interactive wrapper
const InteractiveModal = (props) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                }}
            >
                Open Modal
            </button>
            <MockModal {...props} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
};

export default {
    title: 'Modals/Modal',
    component: MockModal,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        severity: {
            control: 'select',
            options: ['info', 'warning', 'danger', 'success'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        showCloseButton: { control: 'boolean' },
    },
    decorators: [
        (Story) => (
            <div style={{ minHeight: '400px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => (
        <InteractiveModal
            title="Modal Title"
            icon="info"
            severity="info"
        >
            <p>This is the modal content. It can contain any React elements.</p>
        </InteractiveModal>
    ),
};

export const WithFooter = {
    render: () => (
        <InteractiveModal
            title="Confirm Action"
            icon="warning"
            severity="warning"
            footer={
                <>
                    <Button variant="secondary">Cancel</Button>
                    <Button variant="primary">Confirm</Button>
                </>
            }
        >
            <p>Are you sure you want to proceed with this action?</p>
        </InteractiveModal>
    ),
};

export const DangerSeverity = {
    render: () => (
        <InteractiveModal
            title="Delete Item?"
            icon="trash"
            severity="danger"
            footer={
                <>
                    <Button variant="secondary">Cancel</Button>
                    <Button variant="danger">Delete</Button>
                </>
            }
        >
            <p>This action cannot be undone. The item will be permanently deleted.</p>
        </InteractiveModal>
    ),
};

export const SuccessSeverity = {
    render: () => (
        <InteractiveModal
            title="Success!"
            icon="check"
            severity="success"
            footer={<Button variant="primary">Done</Button>}
        >
            <p>Your changes have been saved successfully.</p>
        </InteractiveModal>
    ),
};

export const SmallSize = {
    render: () => (
        <InteractiveModal
            title="Quick Confirm"
            icon="info"
            size="sm"
            footer={
                <>
                    <Button variant="secondary">No</Button>
                    <Button variant="primary">Yes</Button>
                </>
            }
        >
            <p>Continue with this action?</p>
        </InteractiveModal>
    ),
};

export const LargeSize = {
    render: () => (
        <InteractiveModal
            title="Detailed Information"
            icon="fileText"
            size="lg"
        >
            <p>This is a large modal with more content space.</p>
            <p>It can be used for forms, detailed information, or complex interactions.</p>
            <ul style={{ margin: '16px 0', paddingLeft: '20px' }}>
                <li>Feature one with detailed description</li>
                <li>Feature two with additional information</li>
                <li>Feature three showing more content</li>
            </ul>
        </InteractiveModal>
    ),
};

export const NoCloseButton = {
    render: () => (
        <InteractiveModal
            title="Required Action"
            icon="warning"
            severity="warning"
            showCloseButton={false}
            footer={
                <>
                    <Button variant="secondary">Cancel</Button>
                    <Button variant="primary">Accept</Button>
                </>
            }
        >
            <p>You must complete this action before continuing.</p>
        </InteractiveModal>
    ),
};

export const AllSeverities = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '200px' }}>
            <MockModal isOpen title="Info Modal" icon="info" severity="info" onClose={() => {}}>
                <p>Information message</p>
            </MockModal>
        </div>
    ),
};
