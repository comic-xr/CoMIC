// ProcessesTab.jsx
// Sub-tab showing running compute processes/jobs

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useComputeJobs } from '@UI/react/hooks/useComputeJobs.js';

/**
 * Status icon for a process
 */
function ProcessStatusIcon({ status }) {
    switch (status) {
        case 'running':
            return <Icon name="loader" size={14} className="spin icon-amber" />;
        case 'completed':
            return <Icon name="success" size={14} className="icon-green" />;
        case 'failed':
            return <Icon name="cancel" size={14} className="icon-red" />;
        case 'queued':
            return <Icon name="clock" size={14} className="icon-blue" />;
        case 'paused':
            return <Icon name="pause" size={14} className="icon-gray" />;
        default:
            return <Icon name="clock" size={14} className="icon-gray" />;
    }
}

/**
 * Individual process item
 */
function ProcessItem({ job, onCancel, onRetry }) {
    const progress = job.progress || 0;

    return (
        <div className={`process-item process-item--${job.status}`}>
            <ProcessStatusIcon status={job.status} />

            <div className="process-item__content">
                <span className="process-item__name">{job.name || job.operation}</span>
                <span className="process-item__file">{job.filename}</span>

                {job.status === 'running' && (
                    <div className="process-item__progress">
                        <div
                            className="process-item__progress-bar"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {job.error && (
                    <span className="process-item__error">{job.error}</span>
                )}
            </div>

            <div className="process-item__actions">
                {job.status === 'running' && (
                    <button
                        className="process-item__action-btn"
                        onClick={() => onCancel?.(job.id)}
                        title="Cancel"
                    >
                        <Icon name="close" size={10} />
                    </button>
                )}
                {job.status === 'failed' && (
                    <button
                        className="process-item__action-btn"
                        onClick={() => onRetry?.(job.id)}
                        title="Retry"
                    >
                        <Icon name="play" size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * ProcessesTab - Shows running compute jobs
 */
export function ProcessesTab({ workspaceId }) {
    const { jobs, isLoading, cancelJob, retryJob } = useComputeJobs({ workspaceId });

    if (isLoading) {
        return (
            <div className="processes-tab__loading">
                <Icon name="loader" size={24} className="spin" />
                <span>Loading processes...</span>
            </div>
        );
    }

    if (!jobs || jobs.length === 0) {
        return (
            <div className="processes-tab__empty">
                <Icon name="clock" size={24} />
                <p>No active processes</p>
                <span>Compute jobs will appear here</span>
            </div>
        );
    }

    // Group by status
    const running = jobs.filter(j => j.status === 'running');
    const queued = jobs.filter(j => j.status === 'queued');
    const recent = jobs.filter(j => j.status === 'completed' || j.status === 'failed').slice(0, 5);

    return (
        <div className="processes-tab">
            {running.length > 0 && (
                <div className="processes-tab__section">
                    <div className="processes-tab__section-header">
                        <Icon name="loader" size={12} className="spin icon-amber" />
                        Running ({running.length})
                    </div>
                    {running.map(job => (
                        <ProcessItem
                            key={job.id}
                            job={job}
                            onCancel={cancelJob}
                        />
                    ))}
                </div>
            )}

            {queued.length > 0 && (
                <div className="processes-tab__section">
                    <div className="processes-tab__section-header">
                        <Icon name="clock" size={12} className="icon-blue" />
                        Queued ({queued.length})
                    </div>
                    {queued.map(job => (
                        <ProcessItem
                            key={job.id}
                            job={job}
                            onCancel={cancelJob}
                        />
                    ))}
                </div>
            )}

            {recent.length > 0 && (
                <div className="processes-tab__section">
                    <div className="processes-tab__section-header">
                        Recent
                    </div>
                    {recent.map(job => (
                        <ProcessItem
                            key={job.id}
                            job={job}
                            onRetry={retryJob}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProcessesTab;