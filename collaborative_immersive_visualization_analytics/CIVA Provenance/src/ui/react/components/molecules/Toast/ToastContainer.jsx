/**
 * @file ToastContainer.jsx
 * @description Container component that renders all active toast notifications.
 * Should be rendered once at the app root level (e.g., in Bootstrap.jsx).
 *
 * Features:
 * - Renders toasts from the global toast store
 * - Fixed positioning at bottom-right of viewport
 * - Stacks toasts with newest at bottom
 * - Handles toast dismissal
 * - Portal rendering for proper z-index stacking
 *
 * @example
 * // In your app's root component (Bootstrap.jsx)
 * import { ToastContainer } from '@UI/react/components/molecules/Toast';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainContent />
 *       <ToastContainer />
 *     </>
 *   );
 * }
 */

import React, { useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useToastStore } from "@UI/react/store/toastStore.js";
import Toast from "./Toast.jsx";
import "./Toast.scss";

/**
 * Container component for rendering toast notifications.
 * Subscribes to the toast store and renders all active toasts.
 *
 * The container is positioned fixed at the bottom-right of the viewport,
 * above the status bar (bottom: 60px).
 *
 * @returns {React.ReactPortal|null} Portal with toasts, or null if no toasts
 */
function ToastContainer() {
    // Subscribe to toast store
    const toasts = useToastStore((state) => state.toasts);
    const removeToast = useToastStore((state) => state.removeToast);

    /**
     * Handles dismissing a toast.
     * Called by the Toast component after its exit animation completes.
     */
    const handleDismiss = useCallback((id) => {
        removeToast(id);
    }, [removeToast]);

    // Don't render anything if there are no toasts
    if (toasts.length === 0) {
        return null;
    }

    // Render toast container
    const content = (
        <div
            className="toast-container"
            aria-label="Notifications"
            data-testid="toast-container"
        >
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    type={toast.type}
                    message={toast.message}
                    actionLabel={toast.actionLabel}
                    onAction={toast.onAction}
                    dismissible={toast.dismissible}
                    onDismiss={handleDismiss}
                />
            ))}
        </div>
    );

    // Render via portal to document.body for proper z-index stacking
    return createPortal(content, document.body);
}

// Memoize to prevent unnecessary re-renders
export default memo(ToastContainer);

// Also export as named export for backward compatibility
export { ToastContainer };