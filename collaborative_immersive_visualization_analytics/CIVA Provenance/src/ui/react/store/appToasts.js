/**
 * @file appToasts.js
 * @description Pre-built toast configurations for general app events in CIA Web.
 * Provides convenient factory functions for common application notifications.
 *
 * @example
 * import { toast } from '@UI/react/store/toastStore';
 * import { appToasts } from '@UI/react/store/appToasts';
 *
 * // Show a file uploaded toast
 * const options = appToasts.fileUploaded('data.csv');
 * useToastStore.getState().addToast(options);
 *
 * // Or use with the convenience methods
 * toast.success(appToasts.fileUploaded('data.csv').message);
 */

/**
 * Pre-built toasts for general app events.
 * Each function returns a toast options object ready to be passed to addToast.
 */
export const appToasts = {
    /**
     * File uploaded successfully.
     * @param {string} fileName - Name of the uploaded file
     * @returns {Object} Toast options
     */
    fileUploaded: (fileName) => ({
        type: 'success',
        message: 'File uploaded',
        description: fileName,
        duration: 3000,
    }),

    /**
     * Dataset loaded successfully.
     * @param {string} datasetName - Name of the loaded dataset
     * @returns {Object} Toast options
     */
    datasetLoaded: (datasetName) => ({
        type: 'success',
        message: 'Dataset loaded',
        description: datasetName,
        duration: 3000,
    }),

    /**
     * View created successfully.
     * @param {string} viewName - Name of the created view
     * @param {string} viewColor - Color of the created view
     * @returns {Object} Toast options
     */
    viewCreated: (viewName, viewColor) => ({
        type: 'success',
        message: 'View created',
        viewColor,
        viewName,
        duration: 3000,
    }),

    /**
     * View deleted.
     * @param {string} viewName - Name of the deleted view
     * @returns {Object} Toast options
     */
    viewDeleted: (viewName) => ({
        type: 'info',
        message: 'View deleted',
        description: viewName,
        duration: 3000,
    }),

    /**
     * Annotation saved.
     * @returns {Object} Toast options
     */
    annotationSaved: () => ({
        type: 'success',
        message: 'Annotation saved',
        duration: 2000,
    }),

    /**
     * Compute job started.
     * @param {string} jobName - Name of the compute job
     * @returns {Object} Toast options
     */
    computeStarted: (jobName) => ({
        type: 'info',
        message: 'Processing started',
        description: jobName,
        duration: 3000,
    }),

    /**
     * Compute job completed.
     * @param {string} jobName - Name of the completed job
     * @returns {Object} Toast options
     */
    computeCompleted: (jobName) => ({
        type: 'success',
        message: 'Processing complete',
        description: jobName,
        duration: 3000,
    }),

    /**
     * Compute job failed.
     * @param {string} jobName - Name of the failed job
     * @param {string} [error] - Error message
     * @returns {Object} Toast options
     */
    computeFailed: (jobName, error) => ({
        type: 'error',
        message: 'Processing failed',
        description: error || jobName,
        duration: 5000,
    }),

    /**
     * User joined the session.
     * @param {string} userName - Name of the user who joined
     * @returns {Object} Toast options
     */
    userJoined: (userName) => ({
        type: 'info',
        message: `${userName} joined`,
        duration: 3000,
    }),

    /**
     * User left the session.
     * @param {string} userName - Name of the user who left
     * @returns {Object} Toast options
     */
    userLeft: (userName) => ({
        type: 'info',
        message: `${userName} left`,
        duration: 3000,
    }),

    /**
     * Session saved.
     * @returns {Object} Toast options
     */
    sessionSaved: () => ({
        type: 'success',
        message: 'Session saved',
        duration: 2000,
    }),

    /**
     * Network error / connection lost.
     * @returns {Object} Toast options
     */
    networkError: () => ({
        type: 'error',
        message: 'Connection lost',
        description: 'Attempting to reconnect...',
        duration: 0, // Persistent until dismissed
    }),

    /**
     * Successfully reconnected.
     * @returns {Object} Toast options
     */
    reconnected: () => ({
        type: 'success',
        message: 'Reconnected',
        duration: 2000,
    }),

    /**
     * Copied to clipboard.
     * @param {string} [what='Copied'] - What was copied
     * @returns {Object} Toast options
     */
    copied: (what = 'Copied') => ({
        type: 'success',
        message: what,
        duration: 1500,
    }),

    /**
     * Undo action available.
     * @param {string} action - Description of the action that can be undone
     * @param {() => void} onUndo - Callback to execute undo
     * @returns {Object} Toast options
     */
    undoAvailable: (action, onUndo) => ({
        type: 'info',
        message: action,
        actionLabel: 'Undo',
        onAction: onUndo,
        duration: 5000,
    }),

    /**
     * Settings updated.
     * @returns {Object} Toast options
     */
    settingsUpdated: () => ({
        type: 'success',
        message: 'Settings updated',
        duration: 2000,
    }),

    /**
     * Export started.
     * @param {string} format - Export format (e.g., 'PNG', 'CSV')
     * @returns {Object} Toast options
     */
    exportStarted: (format) => ({
        type: 'info',
        message: `Exporting ${format}...`,
        duration: 2000,
    }),

    /**
     * Export completed.
     * @param {string} format - Export format
     * @returns {Object} Toast options
     */
    exportCompleted: (format) => ({
        type: 'success',
        message: `${format} exported`,
        duration: 3000,
    }),

    /**
     * Permission denied.
     * @param {string} [reason] - Reason for denial
     * @returns {Object} Toast options
     */
    permissionDenied: (reason) => ({
        type: 'error',
        message: 'Permission denied',
        description: reason,
        duration: 4000,
    }),
};

export default appToasts;
