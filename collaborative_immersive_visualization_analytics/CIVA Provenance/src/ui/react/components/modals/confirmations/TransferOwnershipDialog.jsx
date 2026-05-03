/**
 * @file TransferOwnershipDialog.jsx
 * @description Dialog for transferring project ownership.
 * Owner only action. Includes dropdown to select new owner from admins.
 * Uses Modal directly due to custom content with dropdown selector.
 *
 * @example
 * <TransferOwnershipDialog
 *   isOpen={showTransfer}
 *   onClose={() => setShowTransfer(false)}
 *   projectName="Brain Study"
 *   admins={[
 *     { id: '1', name: 'Alice', email: 'alice@example.com' },
 *     { id: '2', name: 'Bob', email: 'bob@example.com' }
 *   ]}
 *   onConfirm={(newOwnerId) => transferOwnership(newOwnerId)}
 * />
 */

import React, { useState, useEffect } from 'react';
import { LabeledButton } from '@UI/react/components/molecules';
import { getIconComponent } from '@UI/react/components/atoms/Icon';
import { Modal } from '../Modal';
import { DropdownSelect } from '@UI/react/components/atoms/Dropdown';

/**
 * @typedef {Object} Admin
 * @property {string} id - Admin user ID
 * @property {string} name - Admin display name
 * @property {string} email - Admin email address
 */

/**
 * @typedef {Object} TransferOwnershipDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {string} projectName - Name of the project
 * @property {Admin[]} admins - List of admins who can become owner
 * @property {(newOwnerId: string) => void} onConfirm - Called with new owner ID
 */

/**
 * Dialog for transferring project ownership to another admin.
 *
 * @param {TransferOwnershipDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function TransferOwnershipDialog({
    isOpen,
    onClose,
    projectName,
    admins = [],
    onConfirm,
}) {
    const [selectedAdmin, setSelectedAdmin] = useState(null);

    // Reset selection when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedAdmin(null);
        }
    }, [isOpen]);

    /**
     * Convert admins to dropdown options.
     */
    const adminOptions = admins.map(admin => ({
        value: admin.id,
        label: admin.name,
        description: admin.email,
    }));

    /**
     * Handle confirm action.
     */
    const handleConfirm = () => {
        if (selectedAdmin) {
            onConfirm(selectedAdmin);
            onClose();
        }
    };

    /**
     * Render footer with action buttons.
     */
    const renderFooter = () => (
        <>
            <LabeledButton
                label="Cancel"
                onClick={onClose}
                variant="ghost"
            />
            <LabeledButton
                label="Transfer Ownership"
                onClick={handleConfirm}
                disabled={!selectedAdmin}
                variant="primary"
                color="amber"
            />
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transfer Ownership"
            icon={getIconComponent('userCheck')}
            severity="warning"
            size="md"
            footer={renderFooter()}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Select a new owner for "<strong>{projectName}</strong>".
                    You will become an Admin after the transfer.
                </p>

                <DropdownSelect
                    options={adminOptions}
                    value={selectedAdmin}
                    onChange={setSelectedAdmin}
                    placeholder="Select new owner..."
                    fullWidth
                />

                {admins.length === 0 && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: 0 }}>
                        No admins available. Promote a member to Admin first.
                    </p>
                )}
            </div>
        </Modal>
    );
}

export default TransferOwnershipDialog;