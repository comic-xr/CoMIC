/**
 * TrashedViewItem Component
 * Location: src/ui/react/components/common/ViewItem/TrashedViewItem.jsx
 *
 * Compact view item for the "Recently Deleted" section.
 * Shows view name, expiration time, and restore/delete actions.
 *
 * @module TrashedViewItem
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './ViewItem.scss';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate hours until view expires (30-day retention)
 */
function getExpiresInHours(trashedAt) {
    if (!trashedAt) return 720; // Default 30 days

    const trashedDate = new Date(trashedAt);
    const expiryDate = new Date(trashedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((expiryDate - now) / (1000 * 60 * 60)));

    return hoursRemaining;
}

/**
 * Format expiry time for display
 */
function formatExpiry(hoursRemaining) {
    if (hoursRemaining <= 0) return 'Expires soon';
    if (hoursRemaining < 24) return `Expires in ${hoursRemaining}h`;
    const days = Math.floor(hoursRemaining / 24);
    return `Expires in ${days}d`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TrashedViewItem = memo(function TrashedViewItem({
    view,
    onRestore,
    onPermanentDelete,
    className = '',
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Calculate expiry
    const expiresInHours = view?.expiresInHours || getExpiresInHours(view?.trashedAt);
    const expiryText = formatExpiry(expiresInHours);
    const isExpiringSoon = expiresInHours < 48;

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleRestore = useCallback((e) => {
        e.stopPropagation();
        onRestore?.(view.id);
    }, [view?.id, onRestore]);

    const handleDeleteClick = useCallback((e) => {
        e.stopPropagation();
        if (confirmDelete) {
            onPermanentDelete?.(view.id);
            setConfirmDelete(false);
        } else {
            setConfirmDelete(true);
            // Auto-reset confirmation after 3 seconds
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    }, [view?.id, confirmDelete, onPermanentDelete]);

    // =========================================================================
    // RENDER
    // =========================================================================

    const itemClasses = [
        'trashed-view-item',
        isExpiringSoon && 'trashed-view-item--expiring',
        confirmDelete && 'trashed-view-item--confirm-delete',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={itemClasses}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setConfirmDelete(false); }}
        >
            {/* Info Section */}
            <div className="trashed-view-item__info">
                <span className="trashed-view-item__name">{view?.name || 'Unnamed View'}</span>
                <span className={`trashed-view-item__expires ${isExpiringSoon ? 'trashed-view-item__expires--warning' : ''}`}>
                    {isExpiringSoon && <Icon name="warning" size={10} />}
                    {expiryText}
                </span>
            </div>

            {/* Actions */}
            <div className="trashed-view-item__actions">
                <button
                    className="trashed-view-item__restore"
                    onClick={handleRestore}
                    title="Restore view"
                >
                    <Icon name="restore" size={12} />
                    {isHovered && <span>Restore</span>}
                </button>
                <button
                    className={`trashed-view-item__delete ${confirmDelete ? 'trashed-view-item__delete--confirm' : ''}`}
                    onClick={handleDeleteClick}
                    title={confirmDelete ? 'Click again to confirm' : 'Delete permanently'}
                >
                    <Icon name="deletePermanent" size={12} />
                    {confirmDelete && <span>Confirm?</span>}
                </button>
            </div>
        </div>
    );
});

export default TrashedViewItem;