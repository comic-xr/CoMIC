// src/ui/react/components/panels/BreakoutPanel/BreakoutPanel.jsx
// Panel for managing breakout rooms from a project
//
// Allows creating, viewing, and merging breakout workspaces

import React, { useState, useCallback, useEffect } from 'react';
import { workspaceManager } from '@Core/data/managers/WorkspaceManager.js';
import { BreakoutTimer, WorkspaceTypeBadge } from '@UI/react/components/workspace';
import { workspace as log } from '@Utils/logger.js';
import './BreakoutPanel.scss';

/**
 * BreakoutPanel - Manage breakout rooms for a project
 */
export function BreakoutPanel({ projectId, userId, onJoinBreakout }) {
    const [breakouts, setBreakouts] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newBreakoutName, setNewBreakoutName] = useState('');
    const [expiresHours, setExpiresHours] = useState(2);
    const [isCreating, setIsCreating] = useState(false);

    // Load breakouts
    useEffect(() => {
        const loadBreakouts = () => {
            const data = workspaceManager.getBreakoutsForProject(projectId);
            setBreakouts(data);
        };

        loadBreakouts();

        const unsubscribe = workspaceManager.subscribe((event) => {
            if (
                event === 'workspace:created' ||
                event === 'workspace:deleted' ||
                event === 'workspace:breakout-merged'
            ) {
                loadBreakouts();
            }
        });

        return unsubscribe;
    }, [projectId]);

    // Create breakout
    const handleCreateBreakout = useCallback(async () => {
        if (!newBreakoutName.trim()) return;

        setIsCreating(true);
        try {
            const breakout = await workspaceManager.createBreakout(
                projectId,
                newBreakoutName.trim(),
                userId,
                expiresHours
            );

            setShowCreateForm(false);
            setNewBreakoutName('');

            if (onJoinBreakout) {
                onJoinBreakout(breakout);
            }
        } catch (err) {
            log.error('Failed to create breakout:', err);
        } finally {
            setIsCreating(false);
        }
    }, [projectId, userId, newBreakoutName, expiresHours, onJoinBreakout]);

    // Join breakout
    const handleJoinBreakout = useCallback(
        (breakout) => {
            workspaceManager.setActiveWorkspace(breakout.getEffectiveId());
            if (onJoinBreakout) {
                onJoinBreakout(breakout);
            }
        },
        [onJoinBreakout]
    );

    // Merge breakout back to project
    const handleMergeBreakout = useCallback(async (breakoutId) => {
        try {
            await workspaceManager.mergeBreakoutToProject(breakoutId);
        } catch (err) {
            log.error('Failed to merge breakout:', err);
        }
    }, []);

    return (
        <div className="breakout-panel">
            <div className="breakout-panel__header">
                <h4>Breakout Rooms</h4>
                <button
                    className="breakout-panel__add-btn"
                    onClick={() => setShowCreateForm(true)}
                >
                    + New Breakout
                </button>
            </div>

            {/* Create form */}
            {showCreateForm && (
                <div className="breakout-panel__create-form">
                    <input
                        type="text"
                        value={newBreakoutName}
                        onChange={(e) => setNewBreakoutName(e.target.value)}
                        placeholder="Breakout room name..."
                        autoFocus
                    />
                    <div className="breakout-panel__duration">
                        <label>Duration:</label>
                        <select
                            value={expiresHours}
                            onChange={(e) => setExpiresHours(Number(e.target.value))}
                        >
                            <option value={1}>1 hour</option>
                            <option value={2}>2 hours</option>
                            <option value={4}>4 hours</option>
                            <option value={8}>8 hours</option>
                        </select>
                    </div>
                    <div className="breakout-panel__create-actions">
                        <button
                            className="breakout-panel__btn breakout-panel__btn--secondary"
                            onClick={() => setShowCreateForm(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="breakout-panel__btn breakout-panel__btn--primary"
                            onClick={handleCreateBreakout}
                            disabled={!newBreakoutName.trim() || isCreating}
                        >
                            {isCreating ? 'Creating...' : 'Create & Join'}
                        </button>
                    </div>
                </div>
            )}

            {/* Breakout list */}
            <div className="breakout-panel__list">
                {breakouts.length === 0 ? (
                    <div className="breakout-panel__empty">
                        <p>No active breakout rooms</p>
                        <small>
                            Create a breakout room for focused small-group collaboration
                        </small>
                    </div>
                ) : (
                    breakouts.map((breakout) => (
                        <div key={breakout.getEffectiveId()} className="breakout-panel__item">
                            <div className="breakout-panel__item-info">
                                <div className="breakout-panel__item-header">
                                    <span className="breakout-panel__item-name">{breakout.name}</span>
                                    <BreakoutTimer expiresAt={breakout.expiresAt} />
                                </div>
                                <div className="breakout-panel__item-meta">
                                    <span>{breakout.members.length + 1} participants</span>
                                    <span>{breakout.canvasIds.length} canvases</span>
                                </div>
                            </div>

                            <div className="breakout-panel__item-actions">
                                <button
                                    className="breakout-panel__btn breakout-panel__btn--small"
                                    onClick={() => handleJoinBreakout(breakout)}
                                >
                                    Join
                                </button>
                                {breakout.ownerId === userId && (
                                    <button
                                        className="breakout-panel__btn breakout-panel__btn--small breakout-panel__btn--merge"
                                        onClick={() => handleMergeBreakout(breakout.getEffectiveId())}
                                        title="Merge changes back to project"
                                    >
                                        Merge
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info */}
            <div className="breakout-panel__info">
                <p>
                    Breakout rooms are temporary collaboration spaces. Changes can be merged
                    back to the main project when finished.
                </p>
            </div>
        </div>
    );
}

export default BreakoutPanel;
