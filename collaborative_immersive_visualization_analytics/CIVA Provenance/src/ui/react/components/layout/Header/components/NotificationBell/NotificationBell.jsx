/**
 * @file NotificationBell.jsx
 * @description Notification bell with unread badge and dropdown list.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Dropdown } from '@UI/react/components/atoms/Dropdown';

/**
 * Notification bell component with dropdown.
 *
 * @param {Object} props - Component props
 * @param {Array} [props.notifications] - List of notifications
 * @param {number} [props.unreadCount] - Count of unread notifications
 * @param {Function} [props.onNotificationClick] - Callback when notification is clicked
 */
export function NotificationBell({
    notifications = [],
    unreadCount = 0,
    onNotificationClick,
}) {
    const handleNotificationClick = (notification) => {
        onNotificationClick?.(notification);
    };

    return (
        <Dropdown
            trigger={
                <button
                    className="header__icon-btn notification-bell"
                    type="button"
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                    <Icon name="bell" size={18} />
                    {unreadCount > 0 && (
                        <span className="notification-bell__badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            }
            placement="bottom-end"
        >
            <div className="notification-bell__dropdown">
                <div className="notification-bell__header">
                    Notifications
                </div>
                {notifications.length === 0 ? (
                    <div className="notification-bell__empty">
                        No new notifications
                    </div>
                ) : (
                    <div className="notification-bell__list">
                        {notifications.slice(0, 10).map((notif) => (
                            <button
                                key={notif.id}
                                className={`notification-bell__item ${notif.read ? '' : 'unread'
                                    }`}
                                onClick={() =>
                                    handleNotificationClick(notif)
                                }
                                type="button"
                            >
                                <span className="notification-bell__title">
                                    {notif.title}
                                </span>
                                <span className="notification-bell__time">
                                    {notif.timeAgo}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Dropdown>
    );
}

export default NotificationBell;