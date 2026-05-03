// src/ui/react/components/panels/FocusModeOverlay.jsx
// Overlay UI shown when in focus mode
//
// Provides focus mode info and exit button

import React from 'react';
import { useSubsets } from '@UI/react/hooks/useCanvas.js';
import { Icon } from '@UI/react/components/atoms/Icon';
import './FocusModeOverlay.scss';

/**
 * FocusModeOverlay - UI overlay during focus mode
 */
export function FocusModeOverlay({ canvasId }) {
    const {
        inFocusMode,
        activeSubset,
        exitFocusMode,
    } = useSubsets(canvasId);

    if (!inFocusMode || !activeSubset) {
        return null;
    }

    const layout = activeSubset.calculateFocusLayout();

    return (
        <div className="focus-mode-overlay">
            {/* Top bar */}
            <div className="focus-mode-overlay__top-bar">
                <div className="focus-mode-overlay__info">
                    <span className="focus-mode-overlay__badge">FOCUS MODE</span>
                    <span className="focus-mode-overlay__name">{activeSubset.name}</span>
                    <span className="focus-mode-overlay__count">
                        {activeSubset.placementIds.length} view
                        {activeSubset.placementIds.length !== 1 ? 's' : ''} • {layout.rows}×
                        {layout.cols} grid
                    </span>
                </div>

                <div className="focus-mode-overlay__actions">
                    {activeSubset.description && (
                        <button
                            className="focus-mode-overlay__btn focus-mode-overlay__btn--icon"
                            title={activeSubset.description}
                        >
                            <Icon name="info" size={14} />
                        </button>
                    )}
                    <button
                        className="focus-mode-overlay__btn focus-mode-overlay__btn--exit"
                        onClick={exitFocusMode}
                    >
                        Exit Focus Mode
                    </button>
                </div>
            </div>

            {/* Attached content sidebar (if any) */}
            {activeSubset.hasAttachedContent() && (
                <div className="focus-mode-overlay__sidebar">
                    <div className="focus-mode-overlay__sidebar-header">
                        <span>Attached Content</span>
                    </div>
                    <div className="focus-mode-overlay__sidebar-content">
                        {activeSubset.attachedNotes.length > 0 && (
                            <div className="focus-mode-overlay__attached-section">
                                <h4><Icon name="note" size={14} /> Notes</h4>
                                {activeSubset.attachedNotes.map((noteId) => (
                                    <div key={noteId} className="focus-mode-overlay__attached-item">
                                        Note: {noteId.slice(0, 8)}...
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeSubset.attachedImages.length > 0 && (
                            <div className="focus-mode-overlay__attached-section">
                                <h4><Icon name="image" size={14} /> Images</h4>
                                {activeSubset.attachedImages.map((imageId) => (
                                    <div key={imageId} className="focus-mode-overlay__attached-item">
                                        Image: {imageId.slice(0, 8)}...
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Keyboard hint */}
            <div className="focus-mode-overlay__hint">
                Press <kbd>Escape</kbd> to exit focus mode
            </div>
        </div>
    );
}

export default FocusModeOverlay;