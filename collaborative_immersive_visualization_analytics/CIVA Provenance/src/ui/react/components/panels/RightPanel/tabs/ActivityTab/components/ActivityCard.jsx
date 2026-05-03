/**
 * @file ActivityCard.jsx
 * @description Single activity item display.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatTimestamp } from '@Utils/formatters.js';

/**
 * Get icon for activity type
 */
function getActivityIcon(type) {
    switch (type) {
        case 'view': return 'eye';
        case 'dataset': return 'database';
        case 'annotation': return 'messageSquare';
        case 'share': return 'share';
        case 'upload': return 'upload';
        case 'download': return 'download';
        case 'delete': return 'delete';
        case 'edit': return 'edit';
        case 'join': return 'user';
        case 'system': return 'refresh';
        default: return 'circle';
    }
}

/**
 * @typedef {Object} Activity
 * @property {string} id - Activity ID
 * @property {string} type - Activity type
 * @property {string} action - Action description
 * @property {string} [target] - Target of action
 * @property {Object} [user] - User who performed action
 * @property {number} timestamp - When action occurred
 */

/**
 * @typedef {Object} ActivityCardProps
 * @property {Activity} activity - The activity to display
 */

/**
 * Activity card component.
 * Displays a single activity item with icon and details.
 *
 * @param {ActivityCardProps} props - Component props
 * @returns {React.ReactElement} The rendered card
 */
export function ActivityCard({ activity }) {
    const iconName = getActivityIcon(activity.type);
    const isSystem = activity.type === 'system';

    return (
        <div className={`activity-card ${isSystem ? 'activity-card--system' : ''}`}>
            <div className="activity-card__icon" data-type={activity.type}>
                <Icon name={iconName} size={14} />
            </div>

            <div className="activity-card__content">
                <div className="activity-card__text">
                    {activity.user && (
                        <span
                            className="activity-card__user"
                            style={{ color: activity.user.color }}
                        >
                            {activity.user.name}
                        </span>
                    )}
                    <span className="activity-card__action">{activity.action}</span>
                    {activity.target && (
                        <span className="activity-card__target">{activity.target}</span>
                    )}
                </div>
                <div className="activity-card__time">
                    <Icon name="clock" size={10} />
                    <span>{formatTimestamp(activity.timestamp)}</span>
                </div>
            </div>
        </div>
    );
}

export default ActivityCard;