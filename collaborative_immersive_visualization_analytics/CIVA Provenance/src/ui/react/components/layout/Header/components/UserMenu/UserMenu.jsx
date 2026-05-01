/**
 * @file UserMenu.jsx
 * @description User menu dropdown with profile, settings, and sign out options.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Dropdown } from '@UI/react/components/atoms/Dropdown';

/**
 * User menu dropdown component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.user] - Current user object
 * @param {string} [props.user.name] - User's display name
 * @param {string} [props.user.email] - User's email
 * @param {string} [props.user.avatar] - User's avatar URL
 * @param {string} [props.user.status] - User's status (online, away, busy, offline)
 * @param {boolean} [props.user.isAdmin] - Whether user is an admin
 * @param {Function} [props.onNavigate] - Navigation callback
 * @param {Function} [props.onSignOut] - Sign out callback
 */
export function UserMenu({ user, onNavigate, onSignOut }) {
    const menuItems = [
        {
            id: 'profile',
            icon: 'user',
            label: 'Profile',
            path: '/profile',
        },
        {
            id: 'settings',
            icon: 'settings',
            label: 'Settings',
            path: '/settings',
        },
        {
            id: 'shortcuts',
            icon: 'keyboard',
            label: 'Keyboard Shortcuts',
            action: 'shortcuts',
        },
    ];

    // Add admin if user is admin
    if (user?.isAdmin) {
        menuItems.push({
            id: 'admin',
            icon: 'shield',
            label: 'Admin',
            path: '/admin',
        });
    }

    const handleItemClick = (item) => {
        if (item.path) {
            onNavigate?.(item.path);
        } else if (item.action === 'shortcuts') {
            // Dispatch event to open shortcuts modal
            window.dispatchEvent(
                new CustomEvent('cia:open-keyboard-shortcuts')
            );
        }
    };

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        // Dispatch event for status change
        window.dispatchEvent(
            new CustomEvent('cia:user-status-change', {
                detail: { status: newStatus },
            })
        );
    };

    return (
        <Dropdown
            trigger={
                <button
                    className="user-menu__trigger"
                    type="button"
                    aria-label="User menu"
                >
                    <div className="user-menu__avatar">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                        ) : (
                            <Icon name="user" size={16} />
                        )}
                    </div>
                    <Icon name="chevronDown" size={14} />
                </button>
            }
            placement="bottom-end"
        >
            <div className="user-menu__dropdown">
                {/* User Info */}
                <div className="user-menu__info">
                    <span className="user-menu__name">
                        {user?.name || 'User'}
                    </span>
                    <span className="user-menu__email">
                        {user?.email || ''}
                    </span>
                </div>

                {/* Status Selector */}
                <div className="user-menu__status">
                    <div className="user-menu__status-options">
                        {[
                            { value: 'online', label: 'Online', color: 'green' },
                            { value: 'away', label: 'Away', color: 'amber' },
                            { value: 'busy', label: 'Do Not Disturb', color: 'red' },
                            { value: 'offline', label: 'Appear Offline', color: 'gray' },
                        ].map((status) => (
                            <button
                                key={status.value}
                                type="button"
                                className={`user-menu__status-option ${(user?.status || 'online') === status.value ? 'user-menu__status-option--active' : ''}`}
                                onClick={() => handleStatusChange({ target: { value: status.value } })}
                                data-color={status.color}
                            >
                                <span className="user-menu__status-dot" />
                                {status.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="user-menu__divider" />

                {/* Menu Items */}
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className="user-menu__item"
                        onClick={() => handleItemClick(item)}
                        type="button"
                    >
                        {typeof item.icon === 'string' ? (
                            <Icon name={item.icon} size={16} />
                        ) : (
                            <item.icon size={16} />
                        )}
                        {item.label}
                    </button>
                ))}

                <div className="user-menu__divider" />

                {/* Sign Out */}
                <button
                    className="user-menu__item user-menu__item--danger"
                    onClick={onSignOut}
                    type="button"
                >
                    <Icon name="logout" size={16} />
                    Sign Out
                </button>
            </div>
        </Dropdown>
    );
}

export default UserMenu;