/**
 * @file linkToasts.js
 * @description Pre-built toast configurations for link events in CIA Web.
 * Provides convenient factory functions for common link-related notifications.
 *
 * @example
 * import { toast } from '@UI/react/store/toastStore';
 * import { linkToasts } from '@UI/react/store/linkToasts';
 *
 * // Show a link created toast
 * toast.sync(linkToasts.viewLinked('Camera', 'Bones', '#4ade80').message, {
 *   ...linkToasts.viewLinked('Camera', 'Bones', '#4ade80')
 * });
 *
 * // Or use with showToast for full options
 * const options = linkToasts.viewLinked('Camera', 'Bones', '#4ade80');
 * useToastStore.getState().addToast(options);
 */

/**
 * Pre-built toasts for common link events.
 * Each function returns a toast options object ready to be passed to addToast.
 */
export const linkToasts = {
    /**
     * View successfully linked to another view.
     * @param {string} property - The linked property name (e.g., 'Camera')
     * @param {string} targetViewName - Name of the target view
     * @param {string} targetViewColor - Color of the target view
     * @returns {Object} Toast options
     */
    viewLinked: (property, targetViewName, targetViewColor) => ({
        type: 'sync',
        message: `${property} linked`,
        description: `Now syncing with "${targetViewName}"`,
        viewColor: targetViewColor,
        viewName: targetViewName,
        duration: 3000,
    }),

    /**
     * View unlinked from another view.
     * @param {string} property - The unlinked property name
     * @param {string} targetViewName - Name of the target view
     * @returns {Object} Toast options
     */
    viewUnlinked: (property, targetViewName) => ({
        type: 'info',
        message: `${property} unlinked`,
        description: `Stopped syncing with "${targetViewName}"`,
        duration: 3000,
    }),

    /**
     * Joined a sync group.
     * @param {string} property - The property being synced
     * @param {string} hubViewName - Name of the hub view
     * @param {string} hubViewColor - Color of the hub view
     * @param {number} memberCount - Number of members in the group
     * @returns {Object} Toast options
     */
    joinedGroup: (property, hubViewName, hubViewColor, memberCount) => ({
        type: 'sync',
        message: `Joined ${property} sync group`,
        description: `${memberCount} views syncing with "${hubViewName}"`,
        viewColor: hubViewColor,
        viewName: hubViewName,
        duration: 3500,
    }),

    /**
     * Became hub of a sync group.
     * @param {string} property - The property for which you became hub
     * @param {number} memberCount - Number of followers
     * @returns {Object} Toast options
     */
    becameHub: (property, memberCount) => ({
        type: 'success',
        message: `You're now the ${property} hub`,
        description: `${memberCount} view${memberCount === 1 ? '' : 's'} syncing to you`,
        duration: 4000,
    }),

    /**
     * Link broken (target deleted/offline).
     * @param {string} property - The broken link property
     * @param {string} targetViewName - Name of the unavailable target
     * @param {string} [reason] - Optional reason for the break
     * @returns {Object} Toast options
     */
    linkBroken: (property, targetViewName, reason) => ({
        type: 'warning',
        message: `${property} link broken`,
        description: reason || `"${targetViewName}" is no longer available`,
        duration: 5000,
    }),

    /**
     * Received sync update from another user.
     * @param {string} property - The property that was updated
     * @param {string} userName - Name of the user who made the change
     * @param {string} viewName - Name of the source view
     * @param {string} viewColor - Color of the source view
     * @returns {Object} Toast options
     */
    syncReceived: (property, userName, viewName, viewColor) => ({
        type: 'sync',
        message: `${property} updated`,
        description: `${userName} changed the ${property.toLowerCase()}`,
        viewColor: viewColor,
        viewName: viewName,
        userName: userName,
        duration: 2500, // Shorter for frequent syncs
    }),

    /**
     * User started following you.
     * @param {string} userName - Name of the follower
     * @param {string} property - The property they're following
     * @returns {Object} Toast options
     */
    followerJoined: (userName, property) => ({
        type: 'info',
        message: `${userName} is following your ${property}`,
        duration: 3000,
    }),

    /**
     * All properties linked at once.
     * @param {string} targetViewName - Name of the target view
     * @param {string} targetViewColor - Color of the target view
     * @returns {Object} Toast options
     */
    allPropertiesLinked: (targetViewName, targetViewColor) => ({
        type: 'success',
        message: 'All properties linked',
        description: `Fully synced with "${targetViewName}"`,
        viewColor: targetViewColor,
        viewName: targetViewName,
        duration: 4000,
    }),

    /**
     * Hub transferred to another view.
     * @param {string} property - The property whose hub changed
     * @param {string} newHubName - Name of the new hub
     * @param {string} newHubColor - Color of the new hub
     * @returns {Object} Toast options
     */
    hubTransferred: (property, newHubName, newHubColor) => ({
        type: 'info',
        message: `${property} hub changed`,
        description: `"${newHubName}" is now the source of truth`,
        viewColor: newHubColor,
        viewName: newHubName,
        duration: 4000,
    }),

    /**
     * Cannot create link (validation error).
     * @param {string} reason - Reason why the link cannot be created
     * @returns {Object} Toast options
     */
    cannotLink: (reason) => ({
        type: 'error',
        message: 'Cannot create link',
        description: reason,
        duration: 5000,
    }),

    /**
     * Link mode changed.
     * @param {string} property - The property whose mode changed
     * @param {'follow'|'sync'|'broadcast'} mode - The new link mode
     * @returns {Object} Toast options
     */
    modeChanged: (property, mode) => ({
        type: 'info',
        message: `${property} mode changed`,
        description: `Now in ${mode} mode`,
        duration: 2500,
    }),
};

export default linkToasts;
