// src/ui/react/components/panels/SubsetPanel.jsx
// Panel for managing subsets and focus mode
//
// Features:
// - List of saved subsets for the current canvas
// - Enter/exit selection mode for creating new subsets
// - Enter/exit focus mode for deep analysis
// - Subset visibility and sharing controls

import React, { useState, useCallback } from 'react';
import { useSubsets } from '@UI/react/hooks/useCanvas.js';
import { SubsetCard } from '../SubsetCard';
import { CreateSubsetDialog } from '@UI/react/components/modals/CreateSubsetDialog';
import './SubsetPanel.scss';

/**
 * SubsetPanel - Manages subsets and focus mode
 */
export function SubsetPanel({ canvasId, currentViewport }) {
    const {
        subsets,
        loading,
        inFocusMode,
        activeSubset,
        selectionMode,
        selectedIds,
        createSubset,
        enterFocusMode,
        exitFocusMode,
        enterSelectionMode,
        exitSelectionMode,
    } = useSubsets(canvasId);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [expandedSubsetId, setExpandedSubsetId] = useState(null);

    // Handle entering selection mode
    const handleStartSelection = useCallback(() => {
        enterSelectionMode();
    }, [enterSelectionMode]);

    // Handle canceling selection
    const handleCancelSelection = useCallback(() => {
        exitSelectionMode(true);
    }, [exitSelectionMode]);

    // Handle creating subset from selection
    const handleCreateFromSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        setShowCreateDialog(true);
    }, [selectedIds]);

    // Handle subset creation
    const handleCreateSubset = useCallback(
        async (name, description) => {
            await createSubset({
                name,
                description,
                placementIds: selectedIds,
            });
            setShowCreateDialog(false);
            exitSelectionMode(true);
        },
        [createSubset, selectedIds, exitSelectionMode]
    );

    // Handle focus mode
    const handleEnterFocus = useCallback(
        (subsetId) => {
            enterFocusMode(subsetId, currentViewport);
        },
        [enterFocusMode, currentViewport]
    );

    const handleExitFocus = useCallback(() => {
        exitFocusMode();
    }, [exitFocusMode]);

    // Toggle expanded subset
    const handleToggleExpand = useCallback((subsetId) => {
        setExpandedSubsetId((prev) => (prev === subsetId ? null : subsetId));
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="subset-panel subset-panel--loading">
                <div className="subset-panel__loader">Loading subsets...</div>
            </div>
        );
    }

    return (
        <div className="subset-panel">
            {/* Header */}
            <div className="subset-panel__header">
                <h3 className="subset-panel__title">Focus Groups</h3>
                <span className="subset-panel__count">{subsets.length}</span>
            </div>

            {/* Focus mode banner */}
            {inFocusMode && activeSubset && (
                <div className="subset-panel__focus-banner">
                    <div className="subset-panel__focus-info">
                        <span className="subset-panel__focus-label">Focused on:</span>
                        <span className="subset-panel__focus-name">{activeSubset.name}</span>
                    </div>
                    <button
                        className="subset-panel__exit-focus-btn"
                        onClick={handleExitFocus}
                    >
                        Exit Focus
                    </button>
                </div>
            )}

            {/* Selection mode controls */}
            {selectionMode ? (
                <div className="subset-panel__selection-controls">
                    <div className="subset-panel__selection-info">
                        <span className="subset-panel__selection-count">
                            {selectedIds.length} selected
                        </span>
                        <span className="subset-panel__selection-hint">
                            Click views to select
                        </span>
                    </div>
                    <div className="subset-panel__selection-actions">
                        <button
                            className="subset-panel__btn subset-panel__btn--secondary"
                            onClick={handleCancelSelection}
                        >
                            Cancel
                        </button>
                        <button
                            className="subset-panel__btn subset-panel__btn--primary"
                            onClick={handleCreateFromSelection}
                            disabled={selectedIds.length === 0}
                        >
                            Create Group
                        </button>
                    </div>
                </div>
            ) : (
                <div className="subset-panel__actions">
                    <button
                        className="subset-panel__btn subset-panel__btn--primary"
                        onClick={handleStartSelection}
                        disabled={inFocusMode}
                    >
                        + New Focus Group
                    </button>
                </div>
            )}

            {/* Subset list */}
            <div className="subset-panel__list">
                {subsets.length === 0 ? (
                    <div className="subset-panel__empty">
                        <p>No focus groups yet</p>
                        <small>
                            Create a focus group to save a selection of views for deep analysis
                        </small>
                    </div>
                ) : (
                    subsets.map((subset) => (
                        <SubsetCard
                            key={subset.id}
                            subset={subset}
                            isActive={activeSubset?.id === subset.id}
                            isExpanded={expandedSubsetId === subset.id}
                            onToggleExpand={() => handleToggleExpand(subset.id)}
                            onEnterFocus={() => handleEnterFocus(subset.id)}
                            onExitFocus={handleExitFocus}
                            disabled={inFocusMode && activeSubset?.id !== subset.id}
                        />
                    ))
                )}
            </div>

            {/* Create subset dialog */}
            <CreateSubsetDialog
                isOpen={showCreateDialog}
                selectedCount={selectedIds.length}
                onConfirm={handleCreateSubset}
                onCancel={() => setShowCreateDialog(false)}
            />
        </div>
    );
}

export default SubsetPanel;