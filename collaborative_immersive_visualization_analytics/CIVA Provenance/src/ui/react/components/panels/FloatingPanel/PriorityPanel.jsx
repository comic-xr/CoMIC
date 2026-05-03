// src/ui/react/components/panels/FloatingPanel/PriorityPanel.jsx
// Priority floating panel for modal-like dialogs
//
// ARCHITECTURE:
// - Uses same visual styling as FloatingPanel for consistency
// - Centered by default, has backdrop, forces user decision
// - In VR: Follows user gaze, uses controller buttons for interaction
// - Replaces traditional modals for VR compatibility
//
// This component is part of the unified FloatingPanel system where:
// - FloatingPanel with priority={false} = Standard panel (draggable)
// - PriorityPanel (priority={true}) = Modal-like (centered, backdrop)

import React, { useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon, getIconComponent, IconClose } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import './PriorityPanel.scss';

// =============================================================================
// SIZE PRESETS
// =============================================================================

const SIZE_PRESETS = {
    sm: { width: 400, maxWidth: '90vw' },
    md: { width: 520, maxWidth: '90vw' },
    lg: { width: 640, maxWidth: '95vw' },
};

// =============================================================================
// PRIORITY PANEL COMPONENT
// =============================================================================

/**
 * PriorityPanel - A modal-like floating panel that forces user decision
 *
 * Used for confirmations, consent dialogs, and other critical interactions.
 * In VR mode, this panel follows the user's gaze if they look away.
 *
 * @param {string} id - Unique identifier for the panel
 * @param {boolean} isOpen - Whether panel is visible
 * @param {Function} onClose - Close handler (called on backdrop click if allowed, Escape key)
 * @param {string} title - Panel title
 * @param {string|React.Component} icon - Icon name or component
 * @param {'info'|'warning'|'danger'|'success'} severity - Visual severity level
 * @param {'sm'|'md'|'lg'} size - Panel size preset
 * @param {React.ReactNode} children - Panel content
 * @param {React.ReactNode} footer - Footer content (usually buttons)
 * @param {boolean} showCloseButton - Whether to show X button in header (default: true)
 * @param {boolean} closeOnEscape - Whether Escape key closes panel (default: true)
 * @param {boolean} closeOnBackdrop - Whether backdrop click closes panel (default: false for priority)
 * @param {string} className - Additional CSS class names
 * @param {string} testId - Data-testid for testing
 */
export function PriorityPanel({
    id,
    isOpen,
    onClose,
    title,
    icon,
    severity = 'info',
    size = 'md',
    children,
    footer,
    showCloseButton = true,
    closeOnEscape = true,
    closeOnBackdrop = false,
    className = '',
    testId,
}) {
    const panelRef = useRef(null);
    const previousActiveElement = useRef(null);
    const { isVR } = useAdaptive();

    // Get size preset
    const sizeConfig = SIZE_PRESETS[size] || SIZE_PRESETS.md;

    // Get icon component
    const IconComponent = typeof icon === 'string' ? getIconComponent(icon) : icon;

    // ==========================================================================
    // FOCUS MANAGEMENT
    // ==========================================================================

    // Save and restore focus
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement;

            // Focus first focusable element in panel
            const timer = setTimeout(() => {
                const focusable = panelRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable?.length > 0) {
                    focusable[0].focus();
                }
            }, 50);

            return () => clearTimeout(timer);
        } else {
            // Restore focus when closing
            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        }
    }, [isOpen]);

    // ==========================================================================
    // KEYBOARD HANDLING
    // ==========================================================================

    // Handle Escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    // Focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            const focusable = panelRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable || focusable.length === 0) return;

            const firstFocusable = focusable[0];
            const lastFocusable = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // ==========================================================================
    // BODY SCROLL LOCK
    // ==========================================================================

    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // ==========================================================================
    // BACKDROP CLICK
    // ==========================================================================

    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) {
            onClose();
        }
    }, [closeOnBackdrop, onClose]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    if (!isOpen) return null;

    // Build class names
    const panelClasses = [
        'priority-panel',
        `priority-panel--${severity}`,
        `priority-panel--${size}`,
        isVR && 'priority-panel--vr',
        className
    ].filter(Boolean).join(' ');

    const panelContent = (
        <div
            className={`priority-panel-backdrop ${isOpen ? 'priority-panel-backdrop--visible' : ''}`}
            onClick={handleBackdropClick}
            role="presentation"
            data-testid={testId ? `${testId}-backdrop` : undefined}
        >
            <div
                ref={panelRef}
                className={panelClasses}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${id}-title`}
                style={{ width: sizeConfig.width, maxWidth: sizeConfig.maxWidth }}
                data-testid={testId}
            >
                {/* Header */}
                <div className="priority-panel__header">
                    {IconComponent && (
                        <div className={`priority-panel__icon priority-panel__icon--${severity}`}>
                            <IconComponent size={24} />
                        </div>
                    )}
                    <h2 id={`${id}-title`} className="priority-panel__title">
                        {title}
                    </h2>
                    {showCloseButton && (
                        <button
                            type="button"
                            className="priority-panel__close"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <IconClose size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="priority-panel__content">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="priority-panel__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(panelContent, document.body);
}

export default PriorityPanel;
