// src/core/data/managers/ViewGroupManager.js
// Manages ViewGroups - containers for Views on the workspace canvas
//
// SERVER-AUTHORITY ARCHITECTURE:
// - Server is source of truth for ViewGroup state
// - REST API for CRUD, WebSocket for real-time sync
// - Handles linking, layout changes, batch operations

import { viewGroup as log } from '@Utils/logger.js';
import {
    ViewGroup,
    ViewLink,
    Viewport,
    VIEWGROUP_LINK_MODES,
    VIEWGROUP_COLORS,
    VIEWGROUP_STATES,
} from '@Core/data/models/ViewGroup.js';
import { getUserId, getUserName } from '@Collaboration/presence/userManagement.js';
import { config } from '@Core/config/clientConfig.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { apiClient } from '@Services/apiClient.js';
import { BaseManager } from '@Core/data/managers/BaseManager.js';

// Create logger if not exists
const createFallbackLog = () => ({
    info: (...args) => console.log('[ViewGroupManager]', ...args),
    debug: (...args) => console.debug('[ViewGroupManager]', ...args),
    warn: (...args) => console.warn('[ViewGroupManager]', ...args),
    error: (...args) => console.error('[ViewGroupManager]', ...args),
});

export class ViewGroupManager extends BaseManager {
    constructor(managerConfig = {}) {
        super({
            events: [
                'ready',
                'viewGroupCreated',
                'viewGroupUpdated',
                'viewGroupDeleted',
                'viewGroupLinked',
                'viewGroupUnlinked',
                'layoutChanged',
                'viewAdded',
                'viewRemoved',
                'positionChanged',
                'viewportCreated',
                'viewportUpdated',
                'viewportDeleted',
                // View-to-View link events
                'viewLinkCreated',
                'viewLinkUpdated',
                'viewLinkDeleted',
                'viewLinkPaused',
                'viewLinkResumed',
                // Reconciliation events
                'reconciliationNeeded',
                'reconciliationComplete',
            ],
            logCategory: 'viewGroup',
        });

        // Use the passed log or create a fallback
        this._log = log || createFallbackLog();

        // State
        this._viewGroups = new Map();
        this._viewports = new Map();
        this._isReady = false;

        // View-to-View links (Foundation Layer)
        this._viewLinks = new Map();  // linkId -> ViewLink
        this._viewLinksBySource = new Map();  // sourceViewId -> Set of linkIds
        this._viewLinksByTarget = new Map();  // targetViewId -> Set of linkIds

        // Sync configuration
        this._pendingSyncs = new Map();
        this._syncThrottleMs = managerConfig.syncThrottleMs || 200;

        // ViewGroup-to-ViewGroup link tracking: targetGroupId -> Set of originator groupIds
        this._linkObservers = new Map();

        // Project/workspace context
        this._projectId = null;
        this._workspaceId = null;
    }

    // ===========================================================================
    // INITIALIZATION
    // ===========================================================================

    /** UUID v4 pattern for validating workspace IDs before API calls */
    static _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    initialize(workspaceId = null) {
        this._log.info('Initializing ViewGroupManager...');

        this._projectId = sessionManager?.getProjectId?.() || config?.defaultSessionId;
        this._workspaceId = workspaceId;

        this._log.info(`Initialized for project: ${this._projectId}, workspace: ${this._workspaceId}`);
    }

    /**
     * Load ViewGroups from server
     */
    async loadFromServer(workspaceId = null) {
        const wsId = workspaceId || this._workspaceId;
        this._log.info(`Loading ViewGroups from server for workspace: ${wsId}`);

        // Skip server calls if workspace ID is not a valid UUID (pending workspace)
        if (wsId && !ViewGroupManager._UUID_RE.test(wsId)) {
            this._log.warn(`Workspace ID "${wsId}" is not a UUID — skipping server load`);
            this._isReady = true;
            this._emit('ready', { count: 0 });
            return 0;
        }

        try {
            // Use query param — matches the GET / route in viewgroups router
            const endpoint = wsId
                ? `/viewgroups?workspaceId=${wsId}`
                : `/viewgroups?projectId=${this._projectId}`;

            const data = await apiClient.get(endpoint);
            const serverGroups = data.viewGroups || data || [];

            this._log.debug(`Found ${serverGroups.length} ViewGroup(s) on server`);

            let addedCount = 0;
            for (const serverGroup of serverGroups) {
                if (this._viewGroups.has(serverGroup.id)) {
                    continue;
                }

                try {
                    const viewGroup = ViewGroup.fromServerResponse(serverGroup);
                    this._viewGroups.set(viewGroup.id, viewGroup);
                    this._setupLinkObservers(viewGroup);
                    addedCount++;
                } catch (error) {
                    this._log.error(`Failed to load ViewGroup ${serverGroup.id}:`, error);
                }
            }

            this._log.info(`Loaded ${addedCount} ViewGroup(s) from server`);

            this._isReady = true;
            this._emit('ready', { count: this._viewGroups.size });

            return serverGroups.length;
        } catch (error) {
            this._log.error('Failed to load ViewGroups from server:', error);
            this._isReady = true;
            this._emit('ready', { count: 0, error: error.message });
            throw error;
        }
    }

    /**
     * Handle broadcast from server (via WebSocket)
     */
    handleServerBroadcast(type, data) {
        switch (type) {
            case 'viewgroup:created':
                this._handleRemoteCreated(data.viewGroup);
                break;
            case 'viewgroup:updated':
                this._handleRemoteUpdated(data.viewGroup);
                break;
            case 'viewgroup:deleted':
                this._handleRemoteDeleted(data.viewGroupId);
                break;
            case 'viewgroup:linked':
                this._handleRemoteLinked(data);
                break;
            case 'viewgroup:unlinked':
                this._handleRemoteUnlinked(data);
                break;
            default:
                this._log.warn(`Unknown broadcast type: ${type}`);
        }
    }

    // ===========================================================================
    // CRUD OPERATIONS
    // ===========================================================================

    /**
     * Create a new ViewGroup
     */
    async createViewGroup(options = {}) {
        const {
            name = 'New Group',
            layoutId = 'single',
            color = this._getNextColor(),
            workspaceId = this._workspaceId,
            canvasPosition = { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
        } = options;

        // Guard: workspace must be a valid UUID for server persistence
        if (!workspaceId || !ViewGroupManager._UUID_RE.test(workspaceId)) {
            throw new Error(`Cannot create ViewGroup: workspace ID "${workspaceId}" is not a valid UUID (workspace may still be syncing)`);
        }

        this._log.info(`Creating ViewGroup: ${name}`);

        const viewGroup = new ViewGroup({
            name,
            layoutId,
            color,
            workspaceId,
            canvasPosition,
            ownerId: getUserId(),
            ownerName: getUserName(),
        });

        try {
            // Send to server
            const response = await apiClient.post(
                `/workspaces/${workspaceId}/viewgroups`,
                viewGroup.toServerPayload()
            );

            // Update with server-assigned ID
            viewGroup.id = response.id;
            viewGroup.serverId = response.id;
            viewGroup.createdAt = new Date(response.created_at).getTime();

            // Store locally
            this._viewGroups.set(viewGroup.id, viewGroup);
            this._setupLinkObservers(viewGroup);

            viewGroup.clearDirty();
            this._emit('viewGroupCreated', { viewGroup });

            this._log.info(`Created ViewGroup: ${viewGroup.id}`);
            return viewGroup;
        } catch (error) {
            this._log.error('Failed to create ViewGroup:', error);
            throw error;
        }
    }

    /**
     * Get a ViewGroup by ID
     */
    getViewGroup(id) {
        return this._viewGroups.get(id) || null;
    }

    /**
     * Get all ViewGroups
     */
    getAllViewGroups() {
        return Array.from(this._viewGroups.values());
    }

    /**
     * Get ViewGroups for a specific workspace
     */
    getViewGroupsForWorkspace(workspaceId) {
        return this.getAllViewGroups().filter(vg => vg.workspaceId === workspaceId);
    }

    /**
     * Update a ViewGroup
     */
    async updateViewGroup(id, updates) {
        const viewGroup = this._viewGroups.get(id);
        if (!viewGroup) {
            this._log.warn(`ViewGroup not found: ${id}`);
            return null;
        }

        // Apply updates locally
        if (updates.name !== undefined) viewGroup.setName(updates.name);
        if (updates.color !== undefined) viewGroup.setColor(updates.color);
        if (updates.layoutId !== undefined) viewGroup.setLayout(updates.layoutId);
        if (updates.canvasPosition !== undefined) {
            const { row, col, rowSpan, colSpan } = updates.canvasPosition;
            viewGroup.setCanvasPosition(row, col, rowSpan, colSpan);
        }

        // Schedule sync to server
        this._scheduleSync(viewGroup);

        return viewGroup;
    }

    /**
     * Delete a ViewGroup
     */
    async deleteViewGroup(id) {
        const viewGroup = this._viewGroups.get(id);
        if (!viewGroup) {
            this._log.warn(`ViewGroup not found: ${id}`);
            return false;
        }

        this._log.info(`Deleting ViewGroup: ${id}`);

        try {
            await apiClient.delete(`/viewgroups/${id}`);

            // Remove from local state
            this._viewGroups.delete(id);
            this._removeLinkObservers(viewGroup);

            // Unlink any groups that were linked to this one
            this._handleTargetDeleted(id);

            this._emit('viewGroupDeleted', { viewGroupId: id });

            return true;
        } catch (error) {
            this._log.error(`Failed to delete ViewGroup ${id}:`, error);
            throw error;
        }
    }

    // ===========================================================================
    // VIEW MANAGEMENT
    // ===========================================================================

    /**
     * Add a view to a ViewGroup
     */
    async addViewToGroup(groupId, viewId, viewName, viewType, datasetId = null) {
        const viewGroup = this._viewGroups.get(groupId);
        if (!viewGroup) {
            this._log.warn(`ViewGroup not found: ${groupId}`);
            return -1;
        }

        const position = viewGroup.addView(viewId, viewName, viewType, datasetId);

        if (position >= 0) {
            this._scheduleSync(viewGroup);
            this._emit('viewAdded', { groupId, viewId, position });
        }

        return position;
    }

    /**
     * Remove a view from a ViewGroup
     */
    async removeViewFromGroup(groupId, viewId) {
        const viewGroup = this._viewGroups.get(groupId);
        if (!viewGroup) {
            this._log.warn(`ViewGroup not found: ${groupId}`);
            return false;
        }

        const removed = viewGroup.removeView(viewId);

        if (removed) {
            this._scheduleSync(viewGroup);
            this._emit('viewRemoved', { groupId, viewId });
        }

        return removed;
    }

    /**
     * Set a view at a specific slot
     */
    async setViewAtSlot(groupId, position, viewId, viewName, viewType, datasetId = null) {
        const viewGroup = this._viewGroups.get(groupId);
        if (!viewGroup) {
            this._log.warn(`ViewGroup not found: ${groupId}`);
            return false;
        }

        viewGroup.setViewAtSlot(position, viewId, viewName, viewType, datasetId);
        this._scheduleSync(viewGroup);

        return true;
    }

    /**
     * Find which ViewGroup contains a view
     */
    findGroupContainingView(viewId) {
        for (const viewGroup of this._viewGroups.values()) {
            if (viewGroup.hasView(viewId)) {
                return viewGroup;
            }
        }
        return null;
    }

    // ===========================================================================
    // LAYOUT OPERATIONS
    // ===========================================================================

    /**
     * Change ViewGroup layout
     */
    async changeLayout(groupId, layoutId) {
        const viewGroup = this._viewGroups.get(groupId);
        if (!viewGroup) {
            this._log.warn(`ViewGroup not found: ${groupId}`);
            return false;
        }

        viewGroup.setLayout(layoutId);
        this._scheduleSync(viewGroup);
        this._emit('layoutChanged', { groupId, layoutId });

        return true;
    }

    /**
     * Match layout to another ViewGroup
     */
    async matchLayout(sourceGroupId, targetGroupId) {
        const source = this._viewGroups.get(sourceGroupId);
        const target = this._viewGroups.get(targetGroupId);

        if (!source || !target) {
            this._log.warn('Source or target ViewGroup not found');
            return false;
        }

        target.matchLayout(source);
        this._scheduleSync(target);
        this._emit('layoutChanged', { groupId: targetGroupId, layoutId: target.layoutId });

        return true;
    }

    // ===========================================================================
    // LINKING OPERATIONS
    // ===========================================================================

    /**
     * Link two ViewGroups (Originator Principle)
     * The originator group initiates the link and their incoming follow links get paused
     * @param {string} originatorGroupId - Group that initiates (their links pause)
     * @param {string} targetGroupId - Group being linked to (unaffected)
     * @param {string} mode - Link mode (follow, sync, broadcast)
     * @param {string[]} properties - Properties to link
     */
    async linkViewGroups(originatorGroupId, targetGroupId, mode = VIEWGROUP_LINK_MODES.SYNC, properties = ['camera', 'filters']) {
        const originator = this._viewGroups.get(originatorGroupId);
        const target = this._viewGroups.get(targetGroupId);

        if (!originator || !target) {
            this._log.warn('Originator or target ViewGroup not found');
            return false;
        }

        this._log.info(`Linking ViewGroup ${originatorGroupId} (originator) to ${targetGroupId} (target)`);

        // Create the VG link with originator tracking
        originator.linkTo(targetGroupId, target.name, mode, properties);
        this._addLinkObserver(targetGroupId, originatorGroupId);

        try {
            const response = await apiClient.post('/links/viewgroup', {
                originatorGroupId,
                targetGroupId,
                mode,
                properties,
            });

            // Update link with server ID
            if (originator.link) {
                originator.link.id = response.id;
            }

            // Pause originator's incoming follow links (Originator Principle)
            this._pauseOriginatorViewLinks(originatorGroupId, response.id, properties);

            this._emit('viewGroupLinked', {
                vgLinkId: response.id,
                originatorGroupId,
                targetGroupId,
                mode,
                properties,
            });

            return true;
        } catch (error) {
            this._log.error('Failed to link ViewGroups:', error);
            originator.unlink();
            throw error;
        }
    }

    /**
     * Unlink a ViewGroup
     * If this group was the originator, resume their paused individual links
     */
    async unlinkViewGroup(groupId) {
        const viewGroup = this._viewGroups.get(groupId);
        if (!viewGroup || !viewGroup.isLinked()) {
            return false;
        }

        const vgLinkId = viewGroup.link?.id;
        const wasOriginator = viewGroup.isLinkOriginator();
        const otherGroupId = viewGroup.getLinkedGroupId();

        this._log.info(`Unlinking ViewGroup ${groupId} (was ${wasOriginator ? 'originator' : 'target'})`);

        viewGroup.unlink();

        // Update observer tracking
        if (wasOriginator && otherGroupId) {
            this._removeLinkObserver(otherGroupId, groupId);
        }

        try {
            if (vgLinkId) {
                await apiClient.delete(`/links/viewgroup/${vgLinkId}`);

                // Resume paused links if this was the originator
                if (wasOriginator) {
                    this._resumePausedViewLinks(vgLinkId);
                }
            }

            this._emit('viewGroupUnlinked', { groupId, otherGroupId, vgLinkId, wasOriginator });
            return true;
        } catch (error) {
            this._log.error('Failed to unlink ViewGroup:', error);
            throw error;
        }
    }

    /**
     * Get all ViewGroups linked to a target
     */
    getLinkedGroups(targetGroupId) {
        const observers = this._linkObservers.get(targetGroupId);
        if (!observers) return [];

        return Array.from(observers)
            .map(id => this._viewGroups.get(id))
            .filter(Boolean);
    }

    // ===========================================================================
    // VIEW-TO-VIEW LINK OPERATIONS (Foundation Layer)
    // ===========================================================================

    /**
     * Create a View-to-View link
     */
    async createViewLink(sourceViewId, targetViewId, property, mode = VIEWGROUP_LINK_MODES.FOLLOW) {
        this._log.info(`Creating view link: ${sourceViewId} -> ${targetViewId} (${property})`);

        const viewLink = new ViewLink({
            sourceViewId,
            targetViewId,
            property,
            mode,
        });

        try {
            const response = await apiClient.post('/links/view', {
                sourceViewId,
                targetViewId,
                property,
                mode,
            });

            viewLink.id = response.id;
            viewLink.createdAt = new Date(response.created_at).getTime();

            // Store locally
            this._addViewLink(viewLink);
            this._emit('viewLinkCreated', { viewLink });

            return viewLink;
        } catch (error) {
            this._log.error('Failed to create view link:', error);
            throw error;
        }
    }

    /**
     * Get all links for a view
     */
    getViewLinks(viewId, direction = 'all') {
        const links = [];

        if (direction === 'all' || direction === 'outgoing') {
            const outgoing = this._viewLinksBySource.get(viewId);
            if (outgoing) {
                for (const linkId of outgoing) {
                    const link = this._viewLinks.get(linkId);
                    if (link) links.push(link);
                }
            }
        }

        if (direction === 'all' || direction === 'incoming') {
            const incoming = this._viewLinksByTarget.get(viewId);
            if (incoming) {
                for (const linkId of incoming) {
                    const link = this._viewLinks.get(linkId);
                    if (link) links.push(link);
                }
            }
        }

        return links;
    }

    /**
     * Update a View-to-View link
     */
    async updateViewLink(linkId, updates) {
        const link = this._viewLinks.get(linkId);
        if (!link) {
            this._log.warn(`View link not found: ${linkId}`);
            return null;
        }

        if (updates.mode !== undefined) link.mode = updates.mode;
        if (updates.active !== undefined) link.active = updates.active;

        try {
            await apiClient.patch(`/links/view/${linkId}`, updates);
            this._emit('viewLinkUpdated', { viewLink: link });
            return link;
        } catch (error) {
            this._log.error('Failed to update view link:', error);
            throw error;
        }
    }

    /**
     * Delete a View-to-View link
     */
    async deleteViewLink(linkId) {
        const link = this._viewLinks.get(linkId);
        if (!link) {
            this._log.warn(`View link not found: ${linkId}`);
            return false;
        }

        try {
            await apiClient.delete(`/links/view/${linkId}`);
            this._removeViewLink(link);
            this._emit('viewLinkDeleted', { linkId, viewLink: link });
            return true;
        } catch (error) {
            this._log.error('Failed to delete view link:', error);
            throw error;
        }
    }

    /**
     * Pause incoming follow links on originator's views (for VG link)
     * Only pauses Follow mode links, not Sync or Broadcast
     */
    _pauseOriginatorViewLinks(originatorGroupId, vgLinkId, properties) {
        const originator = this._viewGroups.get(originatorGroupId);
        if (!originator) return;

        const viewIds = originator.getViewIds();

        for (const link of this._viewLinks.values()) {
            // Only pause incoming links to originator's views
            if (!viewIds.includes(link.targetViewId)) continue;

            // Only pause if property matches
            if (!properties.includes(link.property)) continue;

            // Only pause Follow mode links (unidirectional incoming)
            // Sync and Broadcast are NOT paused
            if (link.mode === VIEWGROUP_LINK_MODES.FOLLOW && !link.pausedByVGLink) {
                link.pause(vgLinkId);
                this._emit('viewLinkPaused', { linkId: link.id, vgLinkId });
            }
        }
    }

    /**
     * Resume links that were paused by a specific VG link
     */
    _resumePausedViewLinks(vgLinkId) {
        for (const link of this._viewLinks.values()) {
            if (link.pausedByVGLink === vgLinkId) {
                link.resume();
                this._emit('viewLinkResumed', { linkId: link.id, vgLinkId });
            }
        }
    }

    _addViewLink(link) {
        this._viewLinks.set(link.id, link);

        // Index by source
        if (!this._viewLinksBySource.has(link.sourceViewId)) {
            this._viewLinksBySource.set(link.sourceViewId, new Set());
        }
        this._viewLinksBySource.get(link.sourceViewId).add(link.id);

        // Index by target
        if (!this._viewLinksByTarget.has(link.targetViewId)) {
            this._viewLinksByTarget.set(link.targetViewId, new Set());
        }
        this._viewLinksByTarget.get(link.targetViewId).add(link.id);
    }

    _removeViewLink(link) {
        this._viewLinks.delete(link.id);

        // Remove from source index
        const sourceLinks = this._viewLinksBySource.get(link.sourceViewId);
        if (sourceLinks) {
            sourceLinks.delete(link.id);
            if (sourceLinks.size === 0) {
                this._viewLinksBySource.delete(link.sourceViewId);
            }
        }

        // Remove from target index
        const targetLinks = this._viewLinksByTarget.get(link.targetViewId);
        if (targetLinks) {
            targetLinks.delete(link.id);
            if (targetLinks.size === 0) {
                this._viewLinksByTarget.delete(link.targetViewId);
            }
        }
    }

    // ===========================================================================
    // RECONCILIATION OPERATIONS
    // For unidirectional followers that have diverged from their leader
    // ===========================================================================

    /**
     * Check if a view needs reconciliation with its leaders
     * @returns {Object} { needsReconciliation, divergedLinks }
     */
    async checkReconciliationStatus(viewId) {
        try {
            const response = await apiClient.get(`/views/${viewId}/reconciliation-status`);

            if (response.needsReconciliation) {
                this._emit('reconciliationNeeded', {
                    viewId,
                    divergedLinks: response.divergedLinks,
                });
            }

            return response;
        } catch (error) {
            this._log.error('Failed to check reconciliation status:', error);
            throw error;
        }
    }

    /**
     * Perform reconciliation for a specific link
     * @param {string} viewId - The follower view ID
     * @param {string} linkId - The link to reconcile
     * @param {string} action - 'sync_to_leader' or 'keep_mine'
     */
    async reconcileView(viewId, linkId, action) {
        this._log.info(`Reconciling view ${viewId}, link ${linkId}, action: ${action}`);

        try {
            const response = await apiClient.post(`/views/${viewId}/reconcile`, {
                linkId,
                action,
            });

            // Update local link state
            const link = this._viewLinks.get(linkId);
            if (link) {
                link.clearDivergence(null); // Hash will be updated on next sync
            }

            this._emit('reconciliationComplete', {
                viewId,
                linkId,
                action,
                property: response.property,
            });

            return response;
        } catch (error) {
            this._log.error('Failed to reconcile view:', error);
            throw error;
        }
    }

    /**
     * Mark a view as diverged from its leader (when follower makes local changes)
     */
    async markViewDiverged(viewId, property) {
        try {
            // Update local state immediately
            for (const link of this._viewLinks.values()) {
                if (link.targetViewId === viewId &&
                    link.property === property &&
                    link.mode === VIEWGROUP_LINK_MODES.FOLLOW &&
                    !link.isPaused()) {
                    link.markDiverged();
                }
            }

            // Notify server
            await apiClient.post(`/views/${viewId}/mark-diverged`, { property });
        } catch (error) {
            this._log.error('Failed to mark view as diverged:', error);
            // Don't throw - local state is already updated
        }
    }

    /**
     * Record that user is actively interacting with a view
     */
    async recordViewActivity(viewId, active) {
        try {
            await apiClient.post(`/views/${viewId}/activity`, { active });
        } catch (error) {
            this._log.error('Failed to record view activity:', error);
            // Don't throw - activity tracking is not critical
        }
    }

    /**
     * Check if any user is currently active on a view
     */
    async isViewActive(viewId) {
        try {
            const response = await apiClient.get(`/views/${viewId}/is-active`);
            return response.isActive;
        } catch (error) {
            this._log.error('Failed to check view activity:', error);
            return false;
        }
    }

    // ===========================================================================
    // BATCH OPERATIONS
    // ===========================================================================

    /**
     * Combine multiple ViewGroups into one
     */
    async combineViewGroups(groupIds, options = {}) {
        if (groupIds.length < 2) {
            this._log.warn('Need at least 2 groups to combine');
            return null;
        }

        const groups = groupIds.map(id => this._viewGroups.get(id)).filter(Boolean);
        if (groups.length < 2) {
            this._log.warn('Not enough valid groups to combine');
            return null;
        }

        const { name = `Combined Group`, keepFirst = true } = options;

        // Create new combined group
        const primaryGroup = keepFirst ? groups[0] : null;
        const allViews = groups.flatMap(g => g.getViews());

        const combinedGroup = await this.createViewGroup({
            name,
            layoutId: this._getLayoutForViewCount(allViews.length),
            color: primaryGroup?.color || this._getNextColor(),
            workspaceId: groups[0].workspaceId,
            canvasPosition: primaryGroup?.canvasPosition,
        });

        // Add all views to combined group
        for (const slot of allViews) {
            combinedGroup.addView(slot.viewId, slot.viewName, slot.viewType, slot.datasetId);
        }

        // Delete original groups
        for (const group of groups) {
            await this.deleteViewGroup(group.id);
        }

        this._scheduleSync(combinedGroup);

        return combinedGroup;
    }

    /**
     * Swap positions of two ViewGroups
     */
    async swapViewGroups(groupId1, groupId2) {
        const group1 = this._viewGroups.get(groupId1);
        const group2 = this._viewGroups.get(groupId2);

        if (!group1 || !group2) {
            this._log.warn('One or both ViewGroups not found');
            return false;
        }

        const pos1 = group1.getCanvasPosition();
        const pos2 = group2.getCanvasPosition();

        group1.setCanvasPosition(pos2.row, pos2.col, pos2.rowSpan, pos2.colSpan);
        group2.setCanvasPosition(pos1.row, pos1.col, pos1.rowSpan, pos1.colSpan);

        this._scheduleSync(group1);
        this._scheduleSync(group2);

        this._emit('positionChanged', { groupId: groupId1, position: pos2 });
        this._emit('positionChanged', { groupId: groupId2, position: pos1 });

        return true;
    }

    // ===========================================================================
    // VIEWPORT OPERATIONS
    // ===========================================================================

    /**
     * Create a viewport for current user
     */
    async createViewport(options = {}) {
        const {
            name = 'My Viewport',
            workspaceId = this._workspaceId,
            position = { row: 0, col: 0 },
            size = { rows: 2, cols: 2 },
        } = options;

        const viewport = new Viewport({
            name,
            workspaceId,
            position,
            size,
            userId: getUserId(),
            userName: getUserName(),
            isPrimary: this._viewports.size === 0,
        });

        try {
            const response = await apiClient.post(
                `/workspaces/${workspaceId}/viewports`,
                viewport.toJSON()
            );

            viewport.id = response.id;
            viewport.serverId = response.id;

            this._viewports.set(viewport.id, viewport);
            viewport.clearDirty();

            this._emit('viewportCreated', { viewport });

            return viewport;
        } catch (error) {
            this._log.error('Failed to create viewport:', error);
            throw error;
        }
    }

    /**
     * Get current user's primary viewport
     */
    getMyViewport() {
        const userId = getUserId();
        for (const viewport of this._viewports.values()) {
            if (viewport.userId === userId && viewport.isPrimary) {
                return viewport;
            }
        }
        return null;
    }

    /**
     * Get all viewports for a workspace
     */
    getViewportsForWorkspace(workspaceId) {
        return Array.from(this._viewports.values())
            .filter(vp => vp.workspaceId === workspaceId);
    }

    // ===========================================================================
    // PRIVATE HELPERS
    // ===========================================================================

    _getNextColor() {
        const usedColors = new Set(this.getAllViewGroups().map(vg => vg.color));
        for (const color of VIEWGROUP_COLORS) {
            if (!usedColors.has(color)) {
                return color;
            }
        }
        return VIEWGROUP_COLORS[this._viewGroups.size % VIEWGROUP_COLORS.length];
    }

    _getLayoutForViewCount(count) {
        if (count <= 1) return 'single';
        if (count === 2) return 'side-by-side';
        if (count === 3) return '1+2';
        if (count <= 4) return '2x2';
        return '3x3';
    }

    _setupLinkObservers(viewGroup) {
        if (viewGroup.isLinked()) {
            this._addLinkObserver(viewGroup.getLinkedGroupId(), viewGroup.id);
        }
    }

    _removeLinkObservers(viewGroup) {
        if (viewGroup.isLinked()) {
            this._removeLinkObserver(viewGroup.getLinkedGroupId(), viewGroup.id);
        }
    }

    _addLinkObserver(targetGroupId, observerGroupId) {
        if (!this._linkObservers.has(targetGroupId)) {
            this._linkObservers.set(targetGroupId, new Set());
        }
        this._linkObservers.get(targetGroupId).add(observerGroupId);
    }

    _removeLinkObserver(targetGroupId, observerGroupId) {
        const observers = this._linkObservers.get(targetGroupId);
        if (observers) {
            observers.delete(observerGroupId);
            if (observers.size === 0) {
                this._linkObservers.delete(targetGroupId);
            }
        }
    }

    _handleTargetDeleted(targetGroupId) {
        const observers = this._linkObservers.get(targetGroupId);
        if (!observers) return;

        for (const observerId of observers) {
            const observer = this._viewGroups.get(observerId);
            if (observer && observer.isLinked() && observer.getLinkedGroupId() === targetGroupId) {
                observer.link.markBroken('target_deleted');
                this._emit('viewGroupUnlinked', { groupId: observerId, reason: 'target_deleted' });
            }
        }

        this._linkObservers.delete(targetGroupId);
    }

    _scheduleSync(viewGroup) {
        const existingTimeout = this._pendingSyncs.get(viewGroup.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
            this._syncToServer(viewGroup);
            this._pendingSyncs.delete(viewGroup.id);
        }, this._syncThrottleMs);

        this._pendingSyncs.set(viewGroup.id, timeout);
    }

    async _syncToServer(viewGroup) {
        if (!viewGroup.isDirty()) return;

        try {
            await apiClient.put(
                `/viewgroups/${viewGroup.id}`,
                viewGroup.toServerPayload()
            );
            viewGroup.clearDirty();
            this._log.debug(`Synced ViewGroup ${viewGroup.id} to server`);
        } catch (error) {
            this._log.error(`Failed to sync ViewGroup ${viewGroup.id}:`, error);
        }
    }

    // ===========================================================================
    // REMOTE EVENT HANDLERS
    // ===========================================================================

    _handleRemoteCreated(serverData) {
        if (this._viewGroups.has(serverData.id)) return;

        const viewGroup = ViewGroup.fromServerResponse(serverData);
        this._viewGroups.set(viewGroup.id, viewGroup);
        this._setupLinkObservers(viewGroup);

        this._emit('viewGroupCreated', { viewGroup, isRemote: true });
    }

    _handleRemoteUpdated(serverData) {
        const existing = this._viewGroups.get(serverData.id);
        if (!existing) {
            this._handleRemoteCreated(serverData);
            return;
        }

        // Update local state from server
        const updated = ViewGroup.fromServerResponse(serverData);
        this._viewGroups.set(updated.id, updated);
        this._setupLinkObservers(updated);

        this._emit('viewGroupUpdated', { viewGroup: updated, isRemote: true });
    }

    _handleRemoteDeleted(viewGroupId) {
        const viewGroup = this._viewGroups.get(viewGroupId);
        if (!viewGroup) return;

        this._viewGroups.delete(viewGroupId);
        this._removeLinkObservers(viewGroup);
        this._handleTargetDeleted(viewGroupId);

        this._emit('viewGroupDeleted', { viewGroupId, isRemote: true });
    }

    _handleRemoteLinked(data) {
        const { sourceGroupId, targetGroupId, mode } = data;
        const source = this._viewGroups.get(sourceGroupId);
        const target = this._viewGroups.get(targetGroupId);

        if (source && target) {
            source.linkTo(targetGroupId, target.name, mode);
            this._addLinkObserver(targetGroupId, sourceGroupId);
            this._emit('viewGroupLinked', { sourceGroupId, targetGroupId, mode, isRemote: true });
        }
    }

    _handleRemoteUnlinked(data) {
        const { groupId, targetGroupId } = data;
        const viewGroup = this._viewGroups.get(groupId);

        if (viewGroup) {
            viewGroup.unlink();
            this._removeLinkObserver(targetGroupId, groupId);
            this._emit('viewGroupUnlinked', { groupId, targetGroupId, isRemote: true });
        }
    }

    // ===========================================================================
    // CLEANUP
    // ===========================================================================

    dispose() {
        // Clear pending syncs
        for (const timeout of this._pendingSyncs.values()) {
            clearTimeout(timeout);
        }
        this._pendingSyncs.clear();

        // Clear state
        this._viewGroups.clear();
        this._viewports.clear();
        this._linkObservers.clear();

        // Clear view links
        this._viewLinks.clear();
        this._viewLinksBySource.clear();
        this._viewLinksByTarget.clear();

        super.dispose();
    }
}

// Export singleton instance
export const viewGroupManager = new ViewGroupManager();

export default ViewGroupManager;
