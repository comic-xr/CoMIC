// src/ui/react/components/modals/ConfirmationDialog/ConfirmationDialog.stories.jsx
/**
 * ConfirmationDialog Stories
 *
 * VR MIGRATION NOTE:
 * All confirmation dialogs should use FloatingPanel with priority={true}
 * See: FloatingPanel_Component_Specification.md
 *
 * VR Classification: PRIORITY PANEL
 * - Forces decision, follows gaze
 * - Cannot be dismissed by clicking backdrop
 * - Escape key maps to Cancel action
 */
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock ConfirmationDialog for Storybook
const MockConfirmationDialog = ({
    isOpen,
    onClose,
    title,
    description,
    icon,
    severity = 'info',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    confirmDisabled = false,
    showInput = false,
    inputPlaceholder = '',
    inputMatchValue = '',
    showCheckbox = false,
    checkboxLabel = "Don't ask me again",
    itemList = [],
}) => {
    const [inputValue, setInputValue] = useState('');
    const [checkboxChecked, setCheckboxChecked] = useState(false);

    if (!isOpen) return null;

    const severityColors = {
        info: '#60a5fa',
        warning: '#f59e0b',
        danger: '#ef4444',
    };

    const isInputValid = !showInput || (inputMatchValue ? inputValue === inputMatchValue : inputValue.trim().length > 0);
    const isDisabled = confirmDisabled || (showInput && !isInputValid);

    const buttonVariants = {
        info: { bg: '#3b82f6', color: 'white' },
        warning: { bg: '#f59e0b', color: 'white' },
        danger: { bg: '#ef4444', color: 'white' },
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
                width: '400px',
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
                    <div style={{ color: severityColors[severity] }}>
                        <Icon name={icon || (severity === 'danger' ? 'trash' : severity === 'warning' ? 'warning' : 'info')} size={20} />
                    </div>
                    <h2 style={{
                        flex: 1,
                        margin: 0,
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                    }}>
                        {title}
                    </h2>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                    <p style={{ color: '#e5e7eb', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                        {description}
                    </p>

                    {/* Item list */}
                    {itemList.length > 0 && (
                        <ul style={{
                            margin: '16px 0 0',
                            padding: '12px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '6px',
                            listStyle: 'none',
                        }}>
                            {itemList.slice(0, 5).map((item, i) => (
                                <li key={i} style={{ color: '#9ca3af', fontSize: '13px', padding: '4px 0' }}>
                                    {item}
                                </li>
                            ))}
                            {itemList.length > 5 && (
                                <li style={{ color: '#6b7280', fontSize: '12px', paddingTop: '8px' }}>
                                    and {itemList.length - 5} more items
                                </li>
                            )}
                        </ul>
                    )}

                    {/* Input */}
                    {showInput && (
                        <div style={{ marginTop: '16px' }}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={inputPlaceholder}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: `1px solid ${isInputValid ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.5)'}`,
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                            {inputMatchValue && (
                                <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
                                    Type <strong style={{ color: '#9ca3af' }}>{inputMatchValue}</strong> to confirm
                                </p>
                            )}
                        </div>
                    )}

                    {/* Checkbox */}
                    {showCheckbox && (
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '16px',
                            color: '#9ca3af',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}>
                            <input
                                type="checkbox"
                                checked={checkboxChecked}
                                onChange={(e) => setCheckboxChecked(e.target.checked)}
                                style={{ width: '16px', height: '16px' }}
                            />
                            {checkboxLabel}
                        </label>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.2)',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#e5e7eb',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => { onConfirm?.(); onClose(); }}
                        disabled={isDisabled}
                        style={{
                            padding: '10px 20px',
                            background: buttonVariants[severity].bg,
                            border: 'none',
                            borderRadius: '6px',
                            color: buttonVariants[severity].color,
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Interactive wrapper
const InteractiveDialog = (props) => {
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
                Open Dialog
            </button>
            <MockConfirmationDialog
                {...props}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
};

export default {
    title: 'Modals/ConfirmationDialog',
    component: MockConfirmationDialog,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        severity: {
            control: 'select',
            options: ['info', 'warning', 'danger'],
        },
        showInput: { control: 'boolean' },
        showCheckbox: { control: 'boolean' },
        onConfirm: { action: 'confirmed' },
    },
    decorators: [
        (Story) => (
            <div style={{ minHeight: '400px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Info = {
    render: () => (
        <InteractiveDialog
            title="Close All Tabs?"
            description="This will close all open tabs in your workspace. Unsaved changes will be lost."
            severity="info"
            confirmLabel="Close All"
        />
    ),
};

export const Warning = {
    render: () => (
        <InteractiveDialog
            title="Leave Room?"
            description="You will be disconnected from the collaborative session. Other members will continue working."
            severity="warning"
            confirmLabel="Leave Room"
        />
    ),
};

export const Danger = {
    render: () => (
        <InteractiveDialog
            title="Delete View?"
            description="This view will be moved to Recently Deleted and can be restored for 30 days."
            severity="danger"
            confirmLabel="Delete View"
        />
    ),
};

export const WithTypeToConfirm = {
    render: () => (
        <InteractiveDialog
            title="Delete Project?"
            description="This will permanently delete the project and ALL its data. This action cannot be undone."
            severity="danger"
            confirmLabel="Delete Forever"
            showInput
            inputPlaceholder="Type DELETE to confirm"
            inputMatchValue="DELETE"
        />
    ),
};

export const WithItemList = {
    render: () => (
        <InteractiveDialog
            title="Delete Selected Views?"
            description="The following views will be permanently deleted:"
            severity="danger"
            confirmLabel="Delete All"
            itemList={[
                'Axial Slice View',
                'Sagittal Slice View',
                'Volume Render',
                '3D Surface Mesh',
                'Time Series Analysis',
                'Statistical Overlay',
                'Comparison View',
            ]}
        />
    ),
};

export const WithCheckbox = {
    render: () => (
        <InteractiveDialog
            title="Close All Tabs?"
            description="This will close all open tabs in your workspace."
            severity="warning"
            confirmLabel="Close All"
            showCheckbox
            checkboxLabel="Don't ask me again"
        />
    ),
};

export const DangerWithAllFeatures = {
    render: () => (
        <InteractiveDialog
            title="Archive Project?"
            description="This project will be archived. You can restore it later from the archive."
            severity="warning"
            confirmLabel="Archive"
            itemList={['All views', 'All datasets', 'All collaborators']}
            showCheckbox
            checkboxLabel="Also archive related recordings"
        />
    ),
};
