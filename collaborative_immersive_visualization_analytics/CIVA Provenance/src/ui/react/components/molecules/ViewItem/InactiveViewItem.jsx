/**
 * InactiveViewItem Component
 * Location: src/ui/react/components/common/ViewItem/InactiveViewItem.jsx
 *
 * Wrapper component for views that are NOT currently placed on canvas.
 * Uses the unified ViewItem component with appropriate defaults.
 *
 * @deprecated Use ViewItem directly with a view that has `position: null`
 * @module InactiveViewItem
 */

import React, { memo } from 'react';
import { ViewItem } from './ViewItem';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const InactiveViewItem = memo(function InactiveViewItem({
    view,
    mode = 'desktop',
    isSelected = false,
    isDragging = null,
    dragOverIndex = null,
    index,
    totalItems,
    // Event handlers
    onPlace,
    onTrash,
    onSelect,
    onDuplicate,
    onLink,
    onSnapshot,
    onSettings,
    onRename,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    className = '',
}) {
    // Ensure view is treated as inactive (no position)
    const inactiveView = {
        ...view,
        position: null,
        status: view?.status !== 'trashed' ? 'inactive' : view.status,
    };

    return (
        <ViewItem
            view={inactiveView}
            mode={mode}
            isSelected={isSelected}
            isDragging={isDragging}
            dragOverIndex={dragOverIndex}
            index={index}
            totalItems={totalItems}
            onPlace={onPlace}
            onTrash={onTrash}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onLink={onLink}
            onSnapshot={onSnapshot}
            onSettings={onSettings}
            onRename={onRename}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            className={className}
        />
    );
});

export default InactiveViewItem;
