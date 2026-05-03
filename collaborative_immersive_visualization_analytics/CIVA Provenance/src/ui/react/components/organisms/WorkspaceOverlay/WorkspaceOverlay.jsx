/**
 * WorkspaceOverlay Component
 *
 * A generic overlay that covers the canvas area (not side panels).
 * Used for expanded Grid Preview, Isolation mode, Subset mode, etc.
 *
 * Features:
 * - ESC or ⌘E to close
 * - Glassmorphism styling
 * - Customizable title and content
 * - Optional header actions
 *
 * @param {boolean} isOpen - Whether the overlay is visible
 * @param {string} title - Overlay title
 * @param {function} onClose - Callback when overlay is closed
 * @param {ReactNode} children - Content to render in the overlay
 * @param {ReactNode} headerActions - Optional actions for the header
 * @param {string} className - Additional CSS class
 */

import { useEffect, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import './WorkspaceOverlay.scss';

export const WorkspaceOverlay = memo(function WorkspaceOverlay({
    isOpen,
    title = 'Overlay',
    onClose,
    children,
    headerActions = null,
    className = '',
}) {
    const overlayRef = useRef(null);

    // Handle keyboard shortcuts (ESC or ⌘E to close)
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose?.();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
            e.preventDefault();
            onClose?.();
        }
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        document.addEventListener('keydown', handleKeyDown);

        // Focus the overlay for keyboard events
        if (overlayRef.current) {
            overlayRef.current.focus();
        }

        // Prevent body scroll when overlay is open
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    }, [onClose]);

    if (!isOpen) return null;

    const overlayContent = (
        <div
            ref={overlayRef}
            className={`workspace-overlay ${className}`}
            onClick={handleBackdropClick}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="workspace-overlay__container">
                {/* Header */}
                <div className="workspace-overlay__header">
                    <h2 className="workspace-overlay__title">{title}</h2>

                    <div className="workspace-overlay__header-actions">
                        {headerActions}

                        <button
                            className="workspace-overlay__close-btn"
                            onClick={onClose}
                            aria-label="Close overlay (ESC or ⌘E)"
                            title="Close (ESC or ⌘E)"
                        >
                            <Icon name="minimize" size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="workspace-overlay__content">
                    {children}
                </div>
            </div>
        </div>
    );

    // Render in portal to ensure proper stacking
    return createPortal(overlayContent, document.body);
});

export default WorkspaceOverlay;