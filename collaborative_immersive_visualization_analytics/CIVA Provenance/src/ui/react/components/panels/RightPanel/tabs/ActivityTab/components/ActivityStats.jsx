/**
 * @file ActivityStats.jsx
 * @description Quick stats summary for activity feed.
 */

import React, { useMemo } from 'react';

/**
 * @typedef {Object} ActivityStatsProps
 * @property {Array} activities - All activities to summarize
 */

/**
 * Activity stats component.
 * Displays summary statistics of activities.
 *
 * @param {ActivityStatsProps} props - Component props
 * @returns {React.ReactElement} The rendered stats
 */
export function ActivityStats({ activities }) {
    const stats = useMemo(() => ({
        total: activities.length,
        views: activities.filter(a => a.type === 'view').length,
        datasets: activities.filter(a => a.type === 'dataset').length,
        annotations: activities.filter(a => a.type === 'annotation').length,
    }), [activities]);

    return (
        <div className="activity-stats">
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.total}</span>
                <span className="activity-stats__label">Total</span>
            </div>
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.views}</span>
                <span className="activity-stats__label">Views</span>
            </div>
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.datasets}</span>
                <span className="activity-stats__label">Datasets</span>
            </div>
            <div className="activity-stats__item">
                <span className="activity-stats__value">{stats.annotations}</span>
                <span className="activity-stats__label">Notes</span>
            </div>
        </div>
    );
}

export default ActivityStats;