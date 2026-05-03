/**
 * @file AnnotationContextMenu.jsx
 * @description Context menu for annotation actions (edit, move, delete, toggle visibility).
 *
 * This is a positioned context menu that appears on right-click of annotations
 * in the 3D view. Unlike a modal dialog, it renders at the click position
 * and closes on outside click or escape.
 *
 * Features:
 * - Positioned at click location with viewport boundary detection
 * - Edit, Move, Delete, and Toggle Visibility actions
 * - Closes on outside click or Escape key
 * - Smooth enter animation
 *
 * Note: This component uses createPortal directly (not the base Modal)
 * because it's a positioned context menu, not a centered dialog.
 *
 * @example
 * <AnnotationContextMenu
 *     isOpen={showMenu}
 *     onClose={() => setShowMenu(false)}
 *     annotation={selectedAnnotation}
 *     screenPosition={{ x: clickX, y: clickY }}
 *     onEdit={handleEdit}
 *     onMove={handleMove}
 *     onDelete={handleDelete}
 *     onToggleVisibility={handleToggle}
 * />
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { createPortal } from 'react-dom';
import './AnnotationContextMenu.scss';

/**
 * @typedef {Object} Annotation
 * @property {string} id - Unique annotation ID
 * @property {string} [label] - Annotation label
 * @property {string} [text] - Annotation text content
 * @property {boolean} [visible] - Whether annotation is visible (default true)
 */

/**
 * @typedef {Object} AnnotationContextMenuProps
 * @property {boolean} isOpen - Whether menu is visible
 * @property {() => void} onClose - Callback when menu should close
 * @property {Annotation} annotation - The annotation to show actions for
 * @property {{x: number, y: number}} screenPosition - Screen coordinates for menu
 * @property {() => void} [onEdit] - Callback for edit action
 * @property {() => void} [onMove] - Callback for move action
 * @property {() => void} [onDelete] - Callback for delete action
 * @property {() => void} [onToggleVisibility] - Callback for visibility toggle
 */

/**
 * Context menu for annotation actions.
 *
 * @param {AnnotationContextMenuProps} props - Component props
 * @returns {React.ReactPortal|null} Portal with menu, or null if closed
 */
export function AnnotationContextMenu({
    isOpen,
    onClose,
    annotation,
    screenPosition = { x: 0, y: 0 },
    onEdit,
    onMove,
    onDelete,
    onToggleVisibility,
}) {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Delay adding listener to prevent immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Handle menu item click
    const handleAction = useCallback((action) => {
        action?.();
        onClose();
    }, [onClose]);

    if (!isOpen || !annotation) return null;

    const isVisible = annotation.visible !== false;

    // Position the menu, ensuring it stays within viewport
    const menuStyle = {
        left: Math.min(screenPosition.x, window.innerWidth - 180),
        top: Math.min(screenPosition.y, window.innerHeight - 200),
    };

    const content = (
        <div
            ref={menuRef}
            className="annotation-context-menu"
            style={menuStyle}
        >
            <div className="annotation-context-menu__header">
                <span className="annotation-context-menu__title">
                    {annotation.label || annotation.text?.substring(0, 20) || 'Annotation'}
                </span>
                <button
                    className="annotation-context-menu__close"
                    onClick={onClose}
                >
                    <Icon name="close" size={12} />
                </button>
            </div>

            <div className="annotation-context-menu__items">
                <button
                    className="annotation-context-menu__item"
                    onClick={() => handleAction(onEdit)}
                >
                    <Icon name="edit3" size={14} />
                    <span>Edit</span>
                </button>

                <button
                    className="annotation-context-menu__item"
                    onClick={() => handleAction(onMove)}
                >
                    <Icon name="move" size={14} />
                    <span>Move</span>
                </button>

                <button
                    className="annotation-context-menu__item"
                    onClick={() => handleAction(onToggleVisibility)}
                >
                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{isVisible ? 'Hide' : 'Show'}</span>
                </button>

                <div className="annotation-context-menu__divider" />

                <button
                    className="annotation-context-menu__item annotation-context-menu__item--danger"
                    onClick={() => handleAction(onDelete)}
                >
                    <Icon name="trash" size={14} />
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

export default AnnotationContextMenu;