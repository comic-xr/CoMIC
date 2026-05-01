/**
 * @file CreateSubsetDialog.jsx
 * @description Dialog for creating a new focus group from selection.
 * Uses the FormModal component for consistent form styling.
 *
 * Features:
 * - Selection count display
 * - Name field with default placeholder
 * - Optional description field
 * - Hint explaining focus groups
 *
 * @example
 * <CreateSubsetDialog
 *   isOpen={showCreate}
 *   selectedCount={selectedViews.length}
 *   onConfirm={(name, description) => createFocusGroup(name, description)}
 *   onCancel={() => setShowCreate(false)}
 * />
 */

import React, { useState, useCallback, useEffect } from 'react';
import { getIconComponent } from '@UI/react/components/atoms/Icon';
import { FormModal } from '@UI/react/components/modals/FormModal';
import './CreateSubsetDialog.scss';

/**
 * @typedef {Object} CreateSubsetDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {number} selectedCount - Number of selected views
 * @property {(name: string, description: string) => void} onConfirm - Confirm handler
 * @property {() => void} onCancel - Cancel/close handler
 */

/**
 * Dialog for creating a new focus group from selected views.
 *
 * @param {CreateSubsetDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function CreateSubsetDialog({
    isOpen,
    selectedCount,
    onConfirm,
    onCancel
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
        }
    }, [isOpen]);

    /**
     * Handle form submission.
     */
    const handleSubmit = useCallback(() => {
        const finalName = name.trim() || `Focus Group (${selectedCount} views)`;
        onConfirm(finalName, description.trim());
    }, [name, description, selectedCount, onConfirm]);

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onCancel}
            title="Create Focus Group"
            icon={getIconComponent('users')}
            submitLabel="Create Group"
            onSubmit={handleSubmit}
        >
            {/* Selection info banner */}
            <div className="create-subset-dialog__selection-info">
                <span className="create-subset-dialog__count">{selectedCount}</span>
                <span className="create-subset-dialog__label">
                    view{selectedCount !== 1 ? 's' : ''} selected
                </span>
            </div>

            {/* Name field */}
            <div className="form-field">
                <label htmlFor="subset-name" className="form-field__label">
                    Name
                </label>
                <input
                    id="subset-name"
                    type="text"
                    className="form-field__input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Focus Group (${selectedCount} views)`}
                    autoFocus
                />
            </div>

            {/* Description field */}
            <div className="form-field">
                <label htmlFor="subset-description" className="form-field__label">
                    Description
                    <span className="form-field__optional">(optional)</span>
                </label>
                <textarea
                    id="subset-description"
                    className="form-field__textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Research context, observations, or notes about this group..."
                    rows={3}
                />
            </div>

            {/* Hint */}
            <p className="create-subset-dialog__hint">
                Focus groups let you save a selection of views for deep analysis.
                You can enter "focus mode" to view only these items.
            </p>
        </FormModal>
    );
}

export default CreateSubsetDialog;