/**
 * @file ProfileModal.jsx
 * @description Modal component for displaying user profile information.
 * Shows avatar, name, status, role, and provides quick actions.
 *
 * Features:
 * - User avatar with fallback initials
 * - Status indicator (online, away, busy, offline)
 * - Role badge (owner, admin, member, viewer)
 * - Email with copy to clipboard
 * - Last active time display
 * - Current view indicator
 * - Quick actions (message, invite to voice, go to view)
 *
 * @example
 * import { ProfileModal } from '@UI/react/components/modals/ProfileModal';
 *
 * <ProfileModal
 *   isOpen={!!selectedUser}
 *   onClose={() => setSelectedUser(null)}
 *   user={selectedUser}
 *   onMessage={() => openChat(selectedUser.id)}
 *   onInviteToVoice={() => inviteToVoice(selectedUser.id)}
 *   onGoToView={() => navigateTo(selectedUser.currentView)}
 * />
 */

import React, { memo, useCallback, useState } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import Modal from '../Modal/Modal';
import { Button } from '@UI/react/components/atoms/Button';
import { STATUS_CONFIG, getStatusLabel } from '@UI/react/utils/statusConfig';
import './ProfileModal.scss';

/**
 * Role configuration with icons and labels
 */
const ROLE_CONFIG = {
    owner: { label: 'Owner', icon: Crown },
    admin: { label: 'Admin', icon: Shield },
    member: { label: 'Member', icon: UserCheck },
    viewer: { label: 'Viewer', icon: User },
};

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
function getInitials(name) {
    if (!name) return '?';

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format relative time from ISO timestamp
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';

    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
        return 'Active now';
    } else if (diffMinutes < 60) {
        return `Active ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `Active ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `Active ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return `Active on ${date.toLocaleDateString()}`;
    }
}

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - Display name
 * @property {string} [email] - Email address
 * @property {string} [avatar] - Avatar URL
 * @property {'online'|'away'|'busy'|'offline'} status - Current status
 * @property {'owner'|'admin'|'member'|'viewer'} role - Project role
 * @property {string} [currentView] - Name of view user is currently viewing
 * @property {string} [lastActive] - ISO timestamp of last activity
 */

/**
 * @typedef {Object} ProfileModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 * @property {User} user - User data to display
 * @property {() => void} [onMessage] - Callback to open chat with user
 * @property {() => void} [onInviteToVoice] - Callback to invite user to voice
 * @property {() => void} [onGoToView] - Callback to navigate to user's current view
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Modal displaying user profile information.
 *
 * @param {ProfileModalProps} props - Component props
 * @returns {React.ReactElement|null} The rendered modal
 */
function ProfileModal({
    isOpen,
    onClose,
    user,
    onMessage,
    onInviteToVoice,
    onGoToView,
    className = '',
    testId
}) {
    // State for copy feedback
    const [copied, setCopied] = useState(false);

    /**
     * Copy email to clipboard
     */
    const handleCopyEmail = useCallback(async () => {
        if (!user?.email) return;

        try {
            await navigator.clipboard.writeText(user.email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy email:', err);
        }
    }, [user?.email]);

    /**
     * Handle message button click
     */
    const handleMessage = useCallback(() => {
        onMessage?.();
        onClose();
    }, [onMessage, onClose]);

    /**
     * Handle invite to voice button click
     */
    const handleInviteToVoice = useCallback(() => {
        onInviteToVoice?.();
        onClose();
    }, [onInviteToVoice, onClose]);

    /**
     * Handle go to view button click
     */
    const handleGoToView = useCallback(() => {
        onGoToView?.();
        onClose();
    }, [onGoToView, onClose]);

    // Don't render if no user
    if (!user) return null;

    // Get user data with defaults
    const {
        name = 'Unknown User',
        email,
        avatar,
        status = 'offline',
        role = 'viewer',
        currentView,
        lastActive
    } = user;

    const statusLabel = getStatusLabel(status);
    const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
    const RoleIcon = roleConfig.icon;
    const initials = getInitials(name);
    const lastActiveText = status === 'online' ? 'Active now' : formatRelativeTime(lastActive);

    // Build class names
    const modalClassNames = [
        'profile-modal',
        className
    ].filter(Boolean).join(' ');

    // Custom modal content (no standard header)
    const modalContent = (
        <div className={modalClassNames} data-testid={testId}>
            {/* Header with avatar */}
            <div className="profile-modal__header">
                <div className="profile-modal__avatar">
                    {avatar ? (
                        <img src={avatar} alt={`${name}'s avatar`} />
                    ) : (
                        <span className="profile-modal__avatar__initials">{initials}</span>
                    )}
                </div>

                <div className="profile-modal__name">
                    <span
                        className={`profile-modal__status-dot profile-modal__status-dot--${status}`}
                        aria-label={statusLabel}
                        title={statusLabel}
                    />
                    <span>{name}</span>
                </div>

                <div className={`profile-modal__role-badge profile-modal__role-badge--${role}`}>
                    <RoleIcon size={12} />
                    <span>{roleConfig.label}</span>
                </div>
            </div>

            {/* Info section */}
            <div className="profile-modal__info">
                {/* Email */}
                {email && (
                    <div className="profile-modal__info-row">
                        <span className="profile-modal__info-row__icon">
                            <Mail size={16} />
                        </span>
                        <span className="profile-modal__info-row__value">{email}</span>
                        <button
                            type="button"
                            className="profile-modal__info-row__action"
                            onClick={handleCopyEmail}
                            aria-label={copied ? 'Copied to clipboard' : 'Copy email to clipboard'}
                            title={copied ? 'Copied!' : 'Copy email'}
                        >
                            {copied ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}
                        </button>
                    </div>
                )}

                {/* Last active */}
                <div className="profile-modal__info-row">
                    <span className="profile-modal__info-row__icon">
                        <Clock size={16} />
                    </span>
                    <span className="profile-modal__info-row__value">{lastActiveText}</span>
                </div>

                {/* Current view */}
                {currentView && (
                    <div className="profile-modal__info-row">
                        <span className="profile-modal__info-row__icon">
                            <Eye size={16} />
                        </span>
                        <span className="profile-modal__info-row__label">Viewing:</span>
                        <span className="profile-modal__info-row__value">{currentView}</span>
                    </div>
                )}
            </div>

            {/* Quick actions */}
            <div className="profile-modal__actions">
                {onMessage && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="messageSquare"
                        onClick={handleMessage}
                        className="profile-modal__action-btn"
                    >
                        Message
                    </Button>
                )}
                {onInviteToVoice && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="phone"
                        onClick={handleInviteToVoice}
                        className="profile-modal__action-btn"
                    >
                        Invite to Voice
                    </Button>
                )}
                {onGoToView && currentView && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="navigation"
                        onClick={handleGoToView}
                        className="profile-modal__action-btn"
                    >
                        Go to View
                    </Button>
                )}
            </div>

            {/* Footer */}
            <div className="profile-modal__footer">
                <Button variant="secondary" onClick={onClose}>
                    Close
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${name}'s Profile`}
            severity="info"
            size="sm"
            showCloseButton={false}
            testId={testId ? `${testId}-modal` : undefined}
        >
            {modalContent}
        </Modal>
    );
}

export default memo(ProfileModal);
export { ProfileModal, getInitials, formatRelativeTime, STATUS_CONFIG, ROLE_CONFIG };