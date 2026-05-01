/**
 * @file ShareeList.jsx
 * @description Displays list of users/groups a view is shared with.
 * Each item shows avatar, name, email, permission dropdown, and remove button.
 *
 * Features:
 * - Avatar with initials fallback
 * - Group avatar styling
 * - Permission dropdown (viewer, editor, can-share)
 * - Remove button with hover reveal
 * - Empty state message
 *
 * @example
 * <ShareeList
 *   sharees={view.sharedWith}
 *   onPermissionChange={(userId, permission) => updatePermission(userId, permission)}
 *   onRemove={(userId) => removeSharee(userId)}
 *   disabled={isSubmitting}
 * />
 */

import React, { memo, useCallback } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { DropdownSelect } from '@UI/react/components/atoms/Dropdown';
import { getInitials } from './PersonSearch';

/**
 * Permission options for the dropdown
 */
const PERMISSION_OPTIONS = [
    { value: 'viewer', label: 'Viewer' },
    { value: 'editor', label: 'Editor' },
    { value: 'can-share', label: 'Can Share' },
];

/**
 * @typedef {Object} Sharee
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} [avatar] - Avatar URL
 * @property {'viewer'|'editor'|'can-share'} permission - Permission level
 * @property {boolean} [isGroup] - Whether this is a group
 */

/**
 * @typedef {Object} ShareeListProps
 * @property {Sharee[]} sharees - List of sharees
 * @property {(userId: string, permission: string) => void} onPermissionChange - Permission change handler
 * @property {(userId: string) => void} onRemove - Remove handler
 * @property {boolean} [disabled] - Disable all controls
 * @property {string} [className] - Additional CSS class
 */

/**
 * Individual sharee item component.
 */
const ShareeItem = memo(function ShareeItem({
    sharee,
    onPermissionChange,
    onRemove,
    disabled
}) {
    /**
     * Handle permission change
     */
    const handlePermissionChange = useCallback((newPermission) => {
        onPermissionChange(sharee.id, newPermission);
    }, [sharee.id, onPermissionChange]);

    /**
     * Handle remove click
     */
    const handleRemove = useCallback(() => {
        onRemove(sharee.id);
    }, [sharee.id, onRemove]);

    // Build avatar class names
    const avatarClassNames = [
        'sharee-item__avatar',
        sharee.isGroup && 'sharee-item__avatar--group'
    ].filter(Boolean).join(' ');

    return (
        <div className="sharee-item">
            {/* Avatar */}
            <div className={avatarClassNames}>
                {sharee.avatar ? (
                    <img src={sharee.avatar} alt="" />
                ) : sharee.isGroup ? (
                    <Icon name="users" size={18} />
                ) : (
                    getInitials(sharee.name)
                )}
            </div>

            {/* Info */}
            <div className="sharee-item__info">
                <div className="sharee-item__name">{sharee.name}</div>
                <div className="sharee-item__email">{sharee.email}</div>
            </div>

            {/* Permission dropdown */}
            <div className="sharee-item__permission">
                <DropdownSelect
                    options={PERMISSION_OPTIONS}
                    value={sharee.permission}
                    onChange={handlePermissionChange}
                    disabled={disabled}
                    size="sm"
                />
            </div>

            {/* Remove button */}
            <button
                type="button"
                className="sharee-item__remove"
                onClick={handleRemove}
                disabled={disabled}
                aria-label={`Remove ${sharee.name}`}
                title={`Remove ${sharee.name}`}
            >
                <Icon name="close" size={16} />
            </button>
        </div>
    );
});

/**
 * Sharee list component showing all users/groups with access.
 *
 * @param {ShareeListProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
function ShareeList({
    sharees = [],
    onPermissionChange,
    onRemove,
    disabled = false,
    className = ''
}) {
    // Build class names
    const containerClassNames = [
        'sharee-list',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClassNames}>
            <div className="sharee-list__header">
                People with access
            </div>

            {sharees.length > 0 ? (
                <div className="sharee-list__items">
                    {sharees.map((sharee) => (
                        <ShareeItem
                            key={sharee.id}
                            sharee={sharee}
                            onPermissionChange={onPermissionChange}
                            onRemove={onRemove}
                            disabled={disabled}
                        />
                    ))}
                </div>
            ) : (
                <div className="sharee-list__empty">
                    This view hasn't been shared with anyone yet.
                </div>
            )}
        </div>
    );
}

export default memo(ShareeList);
export { ShareeList, PERMISSION_OPTIONS };