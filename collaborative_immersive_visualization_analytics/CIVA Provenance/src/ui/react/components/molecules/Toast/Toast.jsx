/**
 * @file Toast.jsx
 * @description Adaptive toast notification component for CIA Web.
 * Displays a single toast with icon, message, optional action button, and dismiss button.
 *
 * Features:
 * - Four severity types with distinct icons and colors
 * - Optional action button for undo/retry operations
 * - Animated enter and exit transitions
 * - Accessible with proper ARIA attributes
 * - VR mode: larger touch targets, bigger text
 * - Memoized handlers for performance
 *
 * @example
 * <Toast
 *   id="toast-1"
 *   type="success"
 *   message="File uploaded successfully"
 *   onDismiss={handleDismiss}
 * />
 *
 * @example
 * // With action button
 * <Toast
 *   id="toast-2"
 *   type="info"
 *   message="View moved to trash"
 *   actionLabel="Undo"
 *   onAction={handleUndo}
 *   onDismiss={handleDismiss}
 * />
 */

import React, { useState, useCallback, memo } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import "./Toast.scss";

/**
 * Icon name mapping for each toast type.
 */
const TOAST_ICONS = {
    info: 'info',
    success: 'check',
    warning: 'warning',
    error: 'error',
    sync: 'link'
};

/**
 * Icon sizes for different modes
 */
const ICON_SIZES = {
    desktop: { icon: 18, close: 14 },
    vr: { icon: 24, close: 20 },
};

/**
 * Animation duration for exit transition in milliseconds.
 * Must match the CSS animation duration.
 */
const EXIT_ANIMATION_DURATION = 150;

/**
 * @typedef {Object} ToastProps
 * @property {string} id - Unique toast identifier
 * @property {'info'|'success'|'warning'|'error'|'sync'} [type='info'] - Toast type
 * @property {string} message - Toast message
 * @property {string} [description] - Optional secondary description
 * @property {string} [actionLabel] - Text for action button
 * @property {() => void} [onAction] - Callback when action button is clicked
 * @property {boolean} [dismissible=true] - Whether to show dismiss button
 * @property {string} [mode] - Display mode: 'desktop' | 'vr' (default: from context)
 * @property {string} [viewColor] - Optional view color indicator (for link toasts)
 * @property {string} [viewName] - Optional view name (for link toasts)
 * @property {string} [userName] - Optional user name (for link toasts)
 * @property {(id: string) => void} onDismiss - Callback to dismiss the toast
 */

/**
 * Adaptive toast notification component.
 * Handles its own exit animation state before calling onDismiss.
 *
 * @param {ToastProps} props - Component props
 * @returns {React.ReactElement} The rendered toast
 */
function Toast({
    id,
    type = "info",
    message,
    description,
    actionLabel,
    onAction,
    dismissible = true,
    mode: modeProp,
    viewColor,
    viewName,
    userName,
    onDismiss
}) {
    // Track whether the toast is in exit animation
    const [isExiting, setIsExiting] = useState(false);

    // Get adaptive context
    const adaptive = useAdaptive();
    const mode = modeProp || adaptive.mode || 'desktop';
    const isVR = mode === 'vr';

    // Get the appropriate icon for this toast type
    const iconName = TOAST_ICONS[type] || 'info';
    const iconSizes = ICON_SIZES[mode] || ICON_SIZES.desktop;

    /**
     * Initiates the exit animation and then calls onDismiss.
     * Uses a timeout to allow the CSS animation to complete.
     */
    const handleDismiss = useCallback(() => {
        if (isExiting) return; // Prevent double-dismiss

        setIsExiting(true);
        setTimeout(() => {
            onDismiss(id);
        }, EXIT_ANIMATION_DURATION);
    }, [id, isExiting, onDismiss]);

    /**
     * Handles the action button click.
     * Calls the onAction callback and then dismisses the toast.
     */
    const handleAction = useCallback(() => {
        if (onAction) {
            onAction();
        }
        handleDismiss();
    }, [onAction, handleDismiss]);

    // Build class names
    const classNames = [
        "toast",
        `toast--${type}`,
        isVR && "toast--vr",
        isExiting && "toast--exiting"
    ].filter(Boolean).join(" ");

    // Determine aria-live based on toast type
    // Warning and error are more urgent, so use "assertive"
    const ariaLive = type === "warning" || type === "error" ? "assertive" : "polite";

    return (
        <div
            className={classNames}
            role="alert"
            aria-live={ariaLive}
            data-testid={`toast-${id}`}
        >
            {/* Icon */}
            <div className="toast__icon" aria-hidden="true">
                <Icon name={iconName} size={iconSizes.icon} />
            </div>

            {/* Content */}
            <div className="toast__content">
                <p className="toast__message">{message}</p>

                {/* Description (optional) */}
                {description && (
                    <p className="toast__description">{description}</p>
                )}

                {/* View indicator (for link toasts) */}
                {viewColor && (
                    <div className="toast__view-indicator">
                        <span
                            className="toast__view-color"
                            style={{ backgroundColor: viewColor }}
                        />
                        {viewName && <span className="toast__view-name">{viewName}</span>}
                        {userName && <span className="toast__user-name">• {userName}</span>}
                    </div>
                )}

                {/* Action button */}
                {actionLabel && onAction && (
                    <button
                        type="button"
                        className="toast__action"
                        onClick={handleAction}
                    >
                        {actionLabel}
                    </button>
                )}
            </div>

            {/* Dismiss button */}
            {dismissible && (
                <button
                    type="button"
                    className="toast__close"
                    onClick={handleDismiss}
                    aria-label="Dismiss notification"
                >
                    <Icon name="close" size={iconSizes.close} aria-hidden={true} />
                </button>
            )}
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export default memo(Toast);

// Also export as named export for backward compatibility
export { Toast };