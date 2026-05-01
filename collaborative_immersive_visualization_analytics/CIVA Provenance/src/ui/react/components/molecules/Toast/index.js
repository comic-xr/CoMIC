/**
 * @file index.js
 * @description Public exports for Toast notification components.
 *
 * @example
 * // Import components
 * import { Toast, ToastContainer } from '@UI/react/components/molecules/Toast';
 *
 * @example
 * // Use with toast store (recommended)
 * import { toast } from '@UI/react/store/toastStore';
 * import { ToastContainer } from '@UI/react/components/molecules/Toast';
 *
 * // Show toasts
 * toast.success('File saved!');
 * toast.error('Upload failed', { actionLabel: 'Retry', onAction: retry });
 *
 * // Render container once in app root
 * <ToastContainer />
 */

// Components
export { Toast } from "./Toast.jsx";
export { default as ToastComponent } from "./Toast.jsx";
export { ToastContainer } from "./ToastContainer.jsx";
export { default as ToastContainerComponent } from "./ToastContainer.jsx";
