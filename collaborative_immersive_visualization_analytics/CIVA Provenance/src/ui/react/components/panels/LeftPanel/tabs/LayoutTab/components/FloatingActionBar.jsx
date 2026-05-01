/**
 * @file FloatingActionBar.jsx
 * @description Floating action bar for cell selection in ViewGroup Editor.
 *
 * VR-friendly spatial pattern:
 * - Appears when cells are selected
 * - Positioned at bottom center of editor
 * - Glassmorphism background
 * - 36px+ button heights for VR interaction
 *
 * @example
 * <FloatingActionBar
 *   selectedCount={2}
 *   onMerge={handleMerge}
 *   onSplit={handleSplit}
 *   onAddView={handleAddView}
 *   onRemove={handleRemove}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms';

/**
 * FloatingActionBar component
 *
 * @param {Object} props - Component props
 * @param {number} props.selectedCount - Number of selected cells
 * @param {Function} [props.onMerge] - Merge cells handler (requires 2+ cells)
 * @param {Function} [props.onSplit] - Split cell handler (requires 1 cell)
 * @param {Function} [props.onAddView] - Add view to selected cells handler
 * @param {Function} [props.onRemove] - Remove selected cells/views handler
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement|null}
 */
export const FloatingActionBar = memo(function FloatingActionBar({
    selectedCount,
    onMerge,
    onSplit,
    onAddView,
    onRemove,
    className = '',
}) {
    // Don't render if nothing selected
    if (selectedCount === 0) return null;

    return (
        <div className={`floating-action-bar ${className}`}>
            <span className="floating-action-bar__count">
                {selectedCount} selected
            </span>

            <div className="floating-action-bar__divider" />

            <button
                className="floating-action-bar__action"
                onClick={onMerge}
                disabled={selectedCount < 2}
                title="Merge selected cells into one"
            >
                <Icon name="combine" size={14} />
                <span>Merge</span>
            </button>

            <button
                className="floating-action-bar__action"
                onClick={onSplit}
                disabled={selectedCount !== 1}
                title="Split cell into multiple"
            >
                <Icon name="splitSquareHorizontal" size={14} />
                <span>Split</span>
            </button>

            <button
                className="floating-action-bar__action floating-action-bar__action--add"
                onClick={onAddView}
                title="Add view to selected cells"
            >
                <Icon name="plus" size={14} />
                <span>Add View</span>
            </button>

            <button
                className="floating-action-bar__action floating-action-bar__action--remove"
                onClick={onRemove}
                title="Remove selected cells/views"
            >
                <Icon name="trash" size={14} />
            </button>
        </div>
    );
});

export default FloatingActionBar;
