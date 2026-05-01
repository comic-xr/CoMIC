/**
 * @file ShareViewModal.jsx
 * @description Modal for sharing a view with project members, managing permissions,
 * and generating share links.
 *
 * Features:
 * - Search and add project members
 * - Display current sharees with permission dropdowns
 * - Change or remove permissions
 * - Copy shareable link to clipboard
 * - Stop sharing (remove all access)
 * - Auto-save changes on modification
 * - Confirmation before stopping sharing
 *
 * @example
 * <ShareViewModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   view={currentView}
 *   projectMembers={members}
 *   onSave={handleSaveChanges}
 *   onCopyLink={handleCopyLink}
 *   onStopSharing={handleStopSharing}
 * />
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { Modal } from '../Modal';
import { Button } from '@UI/react/components/atoms/Button';
import PersonSearch from './PersonSearch';
import ShareeList from './ShareeList';
import './ShareViewModal.scss';

/**
 * @typedef {Object} View
 * @property {string} id - View ID
 * @property {string} name - View name
 * @property {Sharee[]} sharedWith - Current shares
 */

/**
 * @typedef {Object} Sharee
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} [avatar] - Avatar URL
 * @property {'viewer'|'editor'|'can-share'} permission - Permission level
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} [avatar] - Avatar URL
 */

/**
 * @typedef {Object} ShareUpdates
 * @property {Array<{userId: string, permission: string}>} added - New shares
 * @property {Array<{userId: string, permission: string}>} updated - Changed permissions
 * @property {string[]} removed - Removed user IDs
 */

/**
 * @typedef {Object} ShareViewModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {View} view - The view being shared
 * @property {User[]} projectMembers - Available members to share with
 * @property {(updates: ShareUpdates) => Promise<void>} onSave - Save changes
 * @property {() => Promise<string>} onCopyLink - Generate and copy share link
 * @property {() => Promise<void>} onStopSharing - Remove all shares
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Modal for sharing a view with project members.
 *
 * @param {ShareViewModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function ShareViewModal({
    isOpen,
    onClose,
    view,
    projectMembers = [],
    onSave,
    onCopyLink,
    onStopSharing,
    className = '',
    testId
}) {
    // Track local changes
    const [sharees, setSharees] = useState([]);
    const [pendingChanges, setPendingChanges] = useState({
        added: [],
        updated: [],
        removed: []
    });

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [showStopConfirm, setShowStopConfirm] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [error, setError] = useState('');

    /**
     * Initialize sharees from view when modal opens
     */
    useEffect(() => {
        if (isOpen && view) {
            setSharees(view.sharedWith || []);
            setPendingChanges({ added: [], updated: [], removed: [] });
            setError('');
            setShowStopConfirm(false);
            setLinkCopied(false);
        }
    }, [isOpen, view]);

    /**
     * Get IDs of current sharees to exclude from search
     */
    const excludeIds = useMemo(() => {
        return sharees.map(s => s.id);
    }, [sharees]);

    /**
     * Check if there are unsaved changes
     */
    const hasChanges = useMemo(() => {
        const { added, updated, removed } = pendingChanges;
        return added.length > 0 || updated.length > 0 || removed.length > 0;
    }, [pendingChanges]);

    /**
     * Save changes to server
     */
    const saveChanges = useCallback(async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        setError('');

        try {
            await onSave(pendingChanges);
            // Reset pending changes after successful save
            setPendingChanges({ added: [], updated: [], removed: [] });
        } catch (err) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    }, [hasChanges, pendingChanges, onSave]);

    /**
     * Handle adding a new sharee
     */
    const handleAddSharee = useCallback((user, permission) => {
        // Create new sharee object
        const newSharee = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            permission
        };

        // Add to local list
        setSharees(prev => [...prev, newSharee]);

        // Track as added change
        setPendingChanges(prev => ({
            ...prev,
            added: [...prev.added, { userId: user.id, permission }]
        }));
    }, []);

    /**
     * Handle permission change
     */
    const handlePermissionChange = useCallback((userId, newPermission) => {
        // Update local list
        setSharees(prev =>
            prev.map(s =>
                s.id === userId ? { ...s, permission: newPermission } : s
            )
        );

        // Check if this was a newly added user
        setPendingChanges(prev => {
            const addedIndex = prev.added.findIndex(a => a.userId === userId);

            if (addedIndex >= 0) {
                // Update the added entry
                const newAdded = [...prev.added];
                newAdded[addedIndex] = { userId, permission: newPermission };
                return { ...prev, added: newAdded };
            }

            // Check if already in updated
            const updatedIndex = prev.updated.findIndex(u => u.userId === userId);
            if (updatedIndex >= 0) {
                const newUpdated = [...prev.updated];
                newUpdated[updatedIndex] = { userId, permission: newPermission };
                return { ...prev, updated: newUpdated };
            }

            // Add to updated
            return {
                ...prev,
                updated: [...prev.updated, { userId, permission: newPermission }]
            };
        });
    }, []);

    /**
     * Handle removing a sharee
     */
    const handleRemoveSharee = useCallback((userId) => {
        // Remove from local list
        setSharees(prev => prev.filter(s => s.id !== userId));

        // Track removal
        setPendingChanges(prev => {
            // If it was just added, just remove from added
            const addedIndex = prev.added.findIndex(a => a.userId === userId);
            if (addedIndex >= 0) {
                const newAdded = [...prev.added];
                newAdded.splice(addedIndex, 1);
                return { ...prev, added: newAdded };
            }

            // Remove from updated if there
            const newUpdated = prev.updated.filter(u => u.userId !== userId);

            // Add to removed
            return {
                ...prev,
                updated: newUpdated,
                removed: [...prev.removed, userId]
            };
        });
    }, []);

    /**
     * Handle copy link click
     */
    const handleCopyLink = useCallback(async () => {
        setIsCopying(true);
        setError('');

        try {
            await onCopyLink();
            setLinkCopied(true);
            // Reset copied state after 2 seconds
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            setError(err.message || 'Failed to copy link');
        } finally {
            setIsCopying(false);
        }
    }, [onCopyLink]);

    /**
     * Handle stop sharing click
     */
    const handleStopSharingClick = useCallback(() => {
        if (sharees.length === 0) return;
        setShowStopConfirm(true);
    }, [sharees.length]);

    /**
     * Confirm stop sharing
     */
    const handleConfirmStopSharing = useCallback(async () => {
        setIsStopping(true);
        setError('');

        try {
            await onStopSharing();
            setSharees([]);
            setPendingChanges({ added: [], updated: [], removed: [] });
            setShowStopConfirm(false);
        } catch (err) {
            setError(err.message || 'Failed to stop sharing');
        } finally {
            setIsStopping(false);
        }
    }, [onStopSharing]);

    /**
     * Cancel stop sharing
     */
    const handleCancelStopSharing = useCallback(() => {
        setShowStopConfirm(false);
    }, []);

    /**
     * Handle close - save any pending changes first
     */
    const handleClose = useCallback(async () => {
        if (hasChanges) {
            await saveChanges();
        }
        onClose();
    }, [hasChanges, saveChanges, onClose]);

    // Build class names
    const contentClassNames = [
        'share-view-modal',
        className
    ].filter(Boolean).join(' ');

    // Modal title
    const modalTitle = view ? `Share "${view.name}"` : 'Share View';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={modalTitle}
            icon={getIconComponent('share')}
            severity="info"
            size="md"
            testId={testId}
            footer={
                <div className="share-view-modal__footer">
                    {/* Copy Link button */}
                    <Button
                        variant="secondary"
                        icon={getIconComponent(linkCopied ? 'check' : 'link')}
                        onClick={handleCopyLink}
                        loading={isCopying}
                        disabled={isStopping}
                    >
                        {linkCopied ? 'Copied!' : 'Copy Link'}
                    </Button>

                    <div className="share-view-modal__footer__spacer" />

                    {/* Stop Sharing button */}
                    {!showStopConfirm ? (
                        <Button
                            variant="ghost"
                            icon={getIconComponent('userX')}
                            onClick={handleStopSharingClick}
                            disabled={sharees.length === 0 || isSaving || isStopping}
                        >
                            Stop Sharing
                        </Button>
                    ) : (
                        <div className="share-view-modal__confirm">
                            <span className="share-view-modal__confirm-text">
                                <Icon name="warning" size={14} /> Remove all access?
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelStopSharing}
                                disabled={isStopping}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleConfirmStopSharing}
                                loading={isStopping}
                            >
                                Remove All
                            </Button>
                        </div>
                    )}

                    {/* Done button */}
                    {!showStopConfirm && (
                        <Button
                            variant="primary"
                            onClick={handleClose}
                            loading={isSaving}
                        >
                            Done
                        </Button>
                    )}
                </div>
            }
        >
            <div className={contentClassNames}>
                {/* Error message */}
                {error && (
                    <div className="share-view-modal__error" role="alert">
                        {error}
                    </div>
                )}

                {/* Person search */}
                <PersonSearch
                    users={projectMembers}
                    excludeIds={excludeIds}
                    onSelect={handleAddSharee}
                    placeholder="Add people or groups..."
                    disabled={isSaving || isStopping}
                />

                {/* Sharee list */}
                <ShareeList
                    sharees={sharees}
                    onPermissionChange={handlePermissionChange}
                    onRemove={handleRemoveSharee}
                    disabled={isSaving || isStopping}
                />
            </div>
        </Modal>
    );
}

export default memo(ShareViewModal);
export { ShareViewModal };