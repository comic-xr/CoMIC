// src/ui/react/components/workspace/Canvas/SelectionContextMenu/SelectionContextMenu.jsx
// Context menu for selected cells per Canvas Area Design Specification
//
// Shows on right-click when cells are selected
// Menu Options:
// - Swap (2 views only), Merge Cells, Align (Left/Right/Top/Bottom)
// - Copy Layout, Save as Bookmark, Link Selected
// - Close All, Delete All (with confirmation)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { MenuItem } from '@UI/react/components/molecules';
import './SelectionContextMenu.scss';

/**
 * SelectionContextMenu - Context menu for cell selection operations
 */
export function SelectionContextMenu({
    isOpen,
    position,  // { x, y } - screen coordinates
    selectedCells,  // Array of { row, col, placement? }
    onClose,
    onSwap,
    onMerge,
    onAlign,
    onCopyLayout,
    onSaveBookmark,
    onLinkSelected,
    onCloseAll,
    onDeleteAll,
}) {
    const menuRef = useRef(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const selectedCount = selectedCells?.length || 0;
    const hasViews = selectedCells?.some(c => c.placement?.content?.type === 'view');
    const viewCount = selectedCells?.filter(c => c.placement?.content?.type === 'view').length || 0;

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose?.();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        // Small delay to prevent immediate close from right-click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Adjust position to keep menu in viewport
    const adjustedPosition = useCallback(() => {
        if (!position || !menuRef.current) return position;

        const menu = menuRef.current;
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = position;

        // Adjust horizontal position
        if (x + menuRect.width > viewportWidth - 8) {
            x = viewportWidth - menuRect.width - 8;
        }

        // Adjust vertical position
        if (y + menuRect.height > viewportHeight - 8) {
            y = viewportHeight - menuRect.height - 8;
        }

        return { x: Math.max(8, x), y: Math.max(8, y) };
    }, [position]);

    if (!isOpen || !position) return null;

    const handleDeleteClick = () => {
        if (showDeleteConfirm) {
            onDeleteAll?.();
            onClose?.();
        } else {
            setShowDeleteConfirm(true);
        }
    };

    const pos = adjustedPosition();

    return (
        <>
            {/* Backdrop */}
            <div className="selection-context-menu__backdrop" onClick={onClose} />

            {/* Menu */}
            <div
                ref={menuRef}
                className="selection-context-menu"
                style={{
                    left: pos?.x,
                    top: pos?.y,
                }}
            >
                {/* Header */}
                <div className="selection-context-menu__header">
                    <span className="selection-context-menu__count">
                        {selectedCount} cell{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                    {viewCount > 0 && (
                        <span className="selection-context-menu__view-count">
                            ({viewCount} view{viewCount !== 1 ? 's' : ''})
                        </span>
                    )}
                </div>

                <div className="selection-context-menu__divider" />

                {/* Arrangement Section */}
                <div className="selection-context-menu__section">
                    {/* Swap - only for exactly 2 views */}
                    <MenuItem
                        icon="arrowLeftRight"
                        label="Swap Positions"
                        disabled={viewCount !== 2}
                        onClick={() => { onSwap?.(); onClose?.(); }}
                        shortcut={viewCount !== 2 ? '2 views' : undefined}
                    />

                    {/* Merge Cells */}
                    <MenuItem
                        icon="combine"
                        label="Merge Cells"
                        disabled={selectedCount < 2}
                        onClick={() => { onMerge?.(); onClose?.(); }}
                    />

                    {/* Align submenu */}
                    <div className="selection-context-menu__submenu-container">
                        <MenuItem
                            icon="alignLeft"
                            label="Align"
                            disabled={selectedCount < 2}
                            shortcut="▶"
                        />
                        <div className="selection-context-menu__submenu">
                            <MenuItem icon="alignLeft" label="Left" onClick={() => { onAlign?.('left'); onClose?.(); }} />
                            <MenuItem icon="alignRight" label="Right" onClick={() => { onAlign?.('right'); onClose?.(); }} />
                            <MenuItem icon="alignStartVertical" label="Top" onClick={() => { onAlign?.('top'); onClose?.(); }} />
                            <MenuItem icon="alignEndVertical" label="Bottom" onClick={() => { onAlign?.('bottom'); onClose?.(); }} />
                        </div>
                    </div>
                </div>

                <div className="selection-context-menu__divider" />

                {/* Actions Section */}
                <div className="selection-context-menu__section">
                    <MenuItem
                        icon="copy"
                        label="Copy Layout"
                        onClick={() => { onCopyLayout?.(); onClose?.(); }}
                    />

                    <MenuItem
                        icon="bookmark"
                        label="Save as Bookmark"
                        onClick={() => { onSaveBookmark?.(); onClose?.(); }}
                    />

                    <MenuItem
                        icon="link"
                        label="Link Selected"
                        disabled={viewCount < 2}
                        onClick={() => { onLinkSelected?.(); onClose?.(); }}
                        shortcut={viewCount < 2 ? '2+ views' : undefined}
                    />
                </div>

                <div className="selection-context-menu__divider" />

                {/* Danger Section */}
                <div className="selection-context-menu__section">
                    <MenuItem
                        icon="close"
                        label="Close All Views"
                        disabled={viewCount === 0}
                        onClick={() => { onCloseAll?.(); onClose?.(); }}
                    />

                    <MenuItem
                        icon="delete"
                        label={showDeleteConfirm ? 'Click again to confirm' : 'Delete All Views'}
                        disabled={viewCount === 0}
                        danger
                        onClick={handleDeleteClick}
                    />
                </div>
            </div>
        </>
    );
}

export default SelectionContextMenu;