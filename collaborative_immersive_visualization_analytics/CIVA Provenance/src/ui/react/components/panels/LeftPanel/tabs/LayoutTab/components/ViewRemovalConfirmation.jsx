/**
 * @file ViewRemovalConfirmation.jsx
 * @description Floating confirmation dialog for view removal when changing layouts.
 *
 * Triggered when changing to a layout with fewer slots than current views.
 * User must select exactly N views to remove before confirming.
 *
 * VR-friendly:
 * - Floating card, not modal
 * - Large tap targets (48px+ for list items)
 * - Clear visual selection feedback
 *
 * @example
 * <ViewRemovalConfirmation
 *   isOpen={!!pendingLayoutChange}
 *   onClose={() => setPendingLayoutChange(null)}
 *   onConfirm={handleConfirmRemoval}
 *   currentViews={viewGroup.views}
 *   newCapacity={3}
 *   viewGroupName={viewGroup.name}
 *   newLayoutName="2×2 Grid"
 * />
 */

import React, { memo, useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { VIEW_TYPES } from '../constants/layouts.js';

/**
 * ViewRemovalConfirmation component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Close dialog handler
 * @param {Function} props.onConfirm - Confirm removal handler (receives array of view IDs to remove)
 * @param {Array} props.currentViews - Array of current views in the ViewGroup
 * @param {number} props.newCapacity - Capacity of the new layout
 * @param {string} props.viewGroupName - Name of the ViewGroup
 * @param {string} props.newLayoutName - Name of the new layout
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement|null}
 */
export const ViewRemovalConfirmation = memo(function ViewRemovalConfirmation({
    isOpen,
    onClose,
    onConfirm,
    currentViews,
    newCapacity,
    viewGroupName,
    newLayoutName,
    className = '',
}) {
    const viewsToRemoveCount = currentViews.length - newCapacity;
    const [selectedToRemove, setSelectedToRemove] = useState([]);

    // Pre-select the last N views as default removal candidates
    useEffect(() => {
        if (isOpen && viewsToRemoveCount > 0) {
            const defaultSelected = currentViews
                .slice(-viewsToRemoveCount)
                .map(v => v.id);
            setSelectedToRemove(defaultSelected);
        }
    }, [isOpen, viewsToRemoveCount, currentViews]);

    // Don't render if not open or no views need to be removed
    if (!isOpen || viewsToRemoveCount <= 0) return null;

    const toggleView = (viewId) => {
        setSelectedToRemove(prev =>
            prev.includes(viewId)
                ? prev.filter(id => id !== viewId)
                : [...prev, viewId]
        );
    };

    const canConfirm = selectedToRemove.length === viewsToRemoveCount;

    const handleConfirm = () => {
        if (canConfirm) {
            onConfirm(selectedToRemove);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="view-removal-confirmation__backdrop"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className={`view-removal-confirmation ${className}`}>
                {/* Header */}
                <div className="view-removal-confirmation__header">
                    <Icon name="alertTriangle" size={20} />
                    <span>Views Will Be Removed</span>
                </div>

                {/* Content */}
                <div className="view-removal-confirmation__content">
                    <p className="view-removal-confirmation__message">
                        Changing <strong>"{viewGroupName}"</strong> to <strong>{newLayoutName}</strong> will remove{' '}
                        <span className="view-removal-confirmation__count">
                            {viewsToRemoveCount} view{viewsToRemoveCount > 1 ? 's' : ''}
                        </span>
                        . Select which to remove:
                    </p>

                    {/* View list */}
                    <div className="view-removal-confirmation__list">
                        {currentViews.map(view => {
                            const viewType = VIEW_TYPES[view.type];
                            const isSelected = selectedToRemove.includes(view.id);

                            return (
                                <button
                                    key={view.id}
                                    className={`view-removal-confirmation__item ${isSelected ? 'view-removal-confirmation__item--selected' : ''}`}
                                    onClick={() => toggleView(view.id)}
                                >
                                    <div className={`view-removal-confirmation__checkbox ${isSelected ? 'view-removal-confirmation__checkbox--checked' : ''}`}>
                                        {isSelected && <Icon name="x" size={14} />}
                                    </div>
                                    <div
                                        className="view-removal-confirmation__icon"
                                        style={{ '--view-color': viewType?.color || '#a855f7' }}
                                    >
                                        <Icon name={viewType?.icon || 'box'} size={18} />
                                    </div>
                                    <span className="view-removal-confirmation__name">
                                        {view.name}
                                    </span>
                                    <span className="view-removal-confirmation__type">
                                        {viewType?.name || 'Unknown'}
                                    </span>
                                    {isSelected && (
                                        <span className="view-removal-confirmation__badge">
                                            REMOVE
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status */}
                    <div className={`view-removal-confirmation__status ${canConfirm ? 'view-removal-confirmation__status--ready' : ''}`}>
                        {canConfirm
                            ? `✓ ${viewsToRemoveCount} view${viewsToRemoveCount > 1 ? 's' : ''} selected`
                            : `Select ${viewsToRemoveCount - selectedToRemove.length} more`
                        }
                    </div>
                </div>

                {/* Footer */}
                <div className="view-removal-confirmation__footer">
                    <button
                        className="view-removal-confirmation__cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="view-removal-confirmation__confirm"
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                    >
                        Remove & Apply
                    </button>
                </div>
            </div>
        </>
    );
});

export default ViewRemovalConfirmation;
