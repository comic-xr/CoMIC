// src/ui/react/components/workspace/Canvas/IsolationOverlay/IsolationOverlay.jsx
// Frosted glass overlay for working with cells that are too small
//
// ARCHITECTURE:
// When viewport shows many cells (e.g., 7×7+), individual cells become too small
// for direct interaction. Isolation mode lets users:
// 1. Click a small cell to "isolate" it
// 2. Cell renders at usable size in center of screen
// 3. Canvas remains visible but blurred/dimmed underneath
// 4. Exit button returns to normal view
//
// This enables the "bird's eye → drill down" workflow without losing context.

import React, { useCallback, useEffect, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './IsolationOverlay.scss';

/**
 * IsolationOverlay - Full-screen overlay for working with isolated cells
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the overlay is visible
 * @param {Function} props.onClose - Callback when overlay is closed
 * @param {Object} props.cell - The isolated cell data
 * @param {string} props.cell.id - Cell/placement ID
 * @param {string} props.cell.viewId - ViewConfiguration ID
 * @param {string} props.cell.name - Display name
 * @param {number} props.cell.row - Cell row position
 * @param {number} props.cell.col - Cell column position
 * @param {React.ReactNode} props.children - The cell content to render in isolation
 * @param {string} props.renderSize - Size of isolated cell ('medium' | 'large' | 'fullscreen')
 * @param {Function} props.onPopOut - Optional: Pop out to new window
 * @param {Function} props.onFullscreen - Optional: Enter true fullscreen
 */
export function IsolationOverlay({
    isOpen,
    onClose,
    cell,
    children,
    renderSize = 'large',
    onPopOut,
    onFullscreen,
}) {
    const overlayRef = useRef(null);
    const contentRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Close when clicking the backdrop (not the content)
    const handleBackdropClick = useCallback((e) => {
        if (e.target === overlayRef.current) {
            onClose?.();
        }
    }, [onClose]);

    // Prevent scroll on body when overlay is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Focus trap - keep focus within overlay
    useEffect(() => {
        if (!isOpen || !contentRef.current) return;

        const focusableElements = contentRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Size classes for the isolated content
    const sizeClass = `isolation-overlay__content--${renderSize}`;

    return (
        <div
            ref={overlayRef}
            className="isolation-overlay"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label={`Isolated view: ${cell?.name || 'Cell'}`}
        >
            {/* Frosted glass backdrop */}
            <div className="isolation-overlay__backdrop" />

            {/* Content container */}
            <div
                ref={contentRef}
                className={`isolation-overlay__content ${sizeClass}`}
            >
                {/* Header */}
                <div className="isolation-overlay__header">
                    <div className="isolation-overlay__title">
                        <Icon name="zoomIn" size={14} className="isolation-overlay__icon" />
                        <span className="isolation-overlay__name">
                            {cell?.name || 'Isolated View'}
                        </span>
                        {cell && (
                            <span className="isolation-overlay__coords">
                                [{cell.row}, {cell.col}]
                            </span>
                        )}
                    </div>

                    <div className="isolation-overlay__actions">
                        {onPopOut && (
                            <button
                                className="isolation-overlay__action-btn"
                                onClick={onPopOut}
                                title="Pop out to new window"
                            >
                                <Icon name="externalLink" size={14} />
                            </button>
                        )}
                        {onFullscreen && (
                            <button
                                className="isolation-overlay__action-btn"
                                onClick={onFullscreen}
                                title="Enter fullscreen"
                            >
                                <Icon name="maximize" size={14} />
                            </button>
                        )}
                        <button
                            className="isolation-overlay__close-btn"
                            onClick={onClose}
                            title="Exit isolation (Esc)"
                        >
                            <Icon name="close" size={16} />
                            <span>Exit</span>
                        </button>
                    </div>
                </div>

                {/* Cell content rendered at usable size */}
                <div className="isolation-overlay__body">
                    {children}
                </div>

                {/* Footer with hint */}
                <div className="isolation-overlay__footer">
                    <span className="isolation-overlay__hint">
                        Press <kbd>Esc</kbd> or click outside to return to canvas
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * useIsolationMode - Hook for managing isolation state
 *
 * @param {Object} options
 * @param {string} options.renderMode - Current render mode from useCanvasDimensions
 * @returns {Object} Isolation state and controls
 */
export function useIsolationMode({ renderMode } = {}) {
    const [isolatedCell, setIsolatedCell] = React.useState(null);
    const [renderSize, setRenderSize] = React.useState('large');

    // Should cell clicks trigger isolation?
    const shouldTriggerIsolation = useCallback((cellRenderMode) => {
        // Trigger isolation for thumbnail and snapshot modes
        return cellRenderMode === 'thumbnail' || cellRenderMode === 'snapshot';
    }, []);

    // Enter isolation mode for a cell
    const isolateCell = useCallback((cellData) => {
        setIsolatedCell(cellData);
    }, []);

    // Exit isolation mode
    const exitIsolation = useCallback(() => {
        setIsolatedCell(null);
    }, []);

    // Check if a specific cell is isolated
    const isCellIsolated = useCallback((cellId) => {
        return isolatedCell?.id === cellId;
    }, [isolatedCell]);

    return {
        // State
        isolatedCell,
        isIsolationOpen: isolatedCell !== null,
        renderSize,

        // Actions
        isolateCell,
        exitIsolation,
        setRenderSize,

        // Helpers
        shouldTriggerIsolation,
        isCellIsolated,
    };
}

export default IsolationOverlay;