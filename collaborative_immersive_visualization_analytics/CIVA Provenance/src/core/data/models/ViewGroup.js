// src/core/data/models/ViewGroup.js
// v1.0: Server-authoritative ViewGroup model
//
// ARCHITECTURAL PRINCIPLES:
// 1. ViewGroups are SERVER-AUTHORITATIVE - server generates IDs
// 2. ViewGroups CONTAIN Views - a ViewGroup has 1+ views arranged in a layout
// 3. ViewGroups can be LINKED - camera/filter sync between groups
// 4. ViewGroups have CANVAS POSITIONS - placed on the workspace canvas grid
// 5. FULL AUDIT TRAIL - track changes, ownership, timestamps

import { EventEmitter } from 'events';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

// Link modes - align with backend spec
export const VIEWGROUP_LINK_MODES = Object.freeze({
    FOLLOW: 'follow',       // ← Target receives from source only
    SYNC: 'sync',           // ↔ Bidirectional
    BROADCAST: 'broadcast', // → Source sends to target only
});

// Link status
export const VIEWGROUP_LINK_STATUS = Object.freeze({
    ACTIVE: 'active',
    BROKEN: 'broken',
    PAUSED: 'paused',
});

// ViewGroup states based on view count and naming
export const VIEWGROUP_STATES = Object.freeze({
    SOLO: 'solo',                 // 1 view, no name - hidden in UI
    NAMED: 'named',               // 2+ views, required name - full UI
    EXPLICIT_SOLO: 'explicit_solo', // 1 view, has name - user chose this
    EMPTY: 'empty',               // 0 views, has name - template/placeholder
});

// Link properties that can be synced between views
export const LINK_PROPERTIES = Object.freeze({
    CAMERA: 'camera',             // All types
    FILTERS: 'filters',           // All types
    COLORS: 'colors',             // vtk, chart
    WIDGETS: 'widgets',           // All types
    CURSORS: 'cursors',           // All types
    ANNOTATIONS: 'annotations',   // vtk, image
    WINDOW_LEVEL: 'windowLevel',  // vtk-slice, vtk-volume
    SLICE_POSITION: 'slicePosition', // vtk-slice
    TIME_POSITION: 'timePosition',   // vtk-4d, timeseries
});

// Property applicability by view type
export const PROPERTY_APPLICABLE_TYPES = Object.freeze({
    camera: ['*'],                              // All types
    filters: ['*'],
    colors: ['vtk-*', 'plotly-*'],
    widgets: ['*'],
    cursors: ['*'],
    annotations: ['vtk-*', 'image'],
    windowLevel: ['vtk-slice', 'vtk-volume'],
    slicePosition: ['vtk-slice'],
    timePosition: ['vtk-4d', 'timeseries'],
});

export const BUILTIN_LAYOUTS = Object.freeze([
    { id: 'single', name: 'Single', rows: 1, cols: 1 },
    { id: 'side-by-side', name: 'Side by Side', rows: 1, cols: 2 },
    { id: 'stacked', name: 'Stacked', rows: 2, cols: 1 },
    { id: '2x2', name: '2x2 Grid', rows: 2, cols: 2 },
    { id: '1+2', name: '1 + 2', rows: 2, cols: 2, merged: 'top' },
    { id: '2+1', name: '2 + 1', rows: 2, cols: 2, merged: 'right' },
    { id: '3-up', name: '3-up', rows: 1, cols: 3 },
    { id: '3x3', name: '3x3 Grid', rows: 3, cols: 3 },
]);

export const VIEWGROUP_COLORS = Object.freeze([
    '#a855f7', // purple
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // amber
    '#ec4899', // pink
    '#22d3ee', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
]);

// =============================================================================
// VIEW-TO-VIEW LINK (Foundation Layer)
// Individual links between specific views - the building blocks
// =============================================================================

export class ViewLink {
    constructor(config = {}) {
        this.id = config.id || null;
        this.sourceViewId = config.sourceViewId || null;  // Leader (sends updates)
        this.targetViewId = config.targetViewId || null;  // Follower (receives updates)
        this.property = config.property || LINK_PROPERTIES.CAMERA;
        this.mode = config.mode || VIEWGROUP_LINK_MODES.FOLLOW;
        this.active = config.active ?? true;

        // Pause state (for VG link override)
        this.pausedByVGLink = config.pausedByVGLink || null;

        // Reconciliation tracking (for unidirectional followers)
        this.followerLastSyncedAt = config.followerLastSyncedAt || Date.now();
        this.followerDivergedAt = config.followerDivergedAt || null;
        this.leaderStateHash = config.leaderStateHash || null;

        // Timestamps
        this.createdAt = config.createdAt || Date.now();
        this.createdBy = config.createdBy || null;
    }

    isActive() {
        return this.active && !this.pausedByVGLink;
    }

    isPaused() {
        return this.pausedByVGLink !== null;
    }

    pause(vgLinkId) {
        this.pausedByVGLink = vgLinkId;
    }

    resume() {
        this.pausedByVGLink = null;
    }

    markDiverged() {
        this.followerDivergedAt = Date.now();
    }

    clearDivergence(leaderStateHash) {
        this.followerDivergedAt = null;
        this.followerLastSyncedAt = Date.now();
        this.leaderStateHash = leaderStateHash;
    }

    needsReconciliation() {
        return this.mode === VIEWGROUP_LINK_MODES.FOLLOW && this.followerDivergedAt !== null;
    }

    toJSON() {
        return {
            id: this.id,
            sourceViewId: this.sourceViewId,
            targetViewId: this.targetViewId,
            property: this.property,
            mode: this.mode,
            active: this.active,
            pausedByVGLink: this.pausedByVGLink,
            followerLastSyncedAt: this.followerLastSyncedAt,
            followerDivergedAt: this.followerDivergedAt,
            leaderStateHash: this.leaderStateHash,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
        };
    }

    static fromJSON(data) {
        return data ? new ViewLink(data) : null;
    }

    static fromServerResponse(data) {
        if (!data) return null;
        return new ViewLink({
            id: data.id,
            sourceViewId: data.source_view_id || data.sourceViewId,
            targetViewId: data.target_view_id || data.targetViewId,
            property: data.property,
            mode: data.mode,
            active: data.active,
            pausedByVGLink: data.paused_by_vg_link || data.pausedByVGLink,
            followerLastSyncedAt: data.follower_last_synced_at ? new Date(data.follower_last_synced_at).getTime() : Date.now(),
            followerDivergedAt: data.follower_diverged_at ? new Date(data.follower_diverged_at).getTime() : null,
            leaderStateHash: data.leader_state_hash || data.leaderStateHash,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            createdBy: data.created_by || data.createdBy,
        });
    }
}

// =============================================================================
// VIEWGROUP-TO-VIEWGROUP LINK (Convenience Layer)
// Links entire groups together, following the Originator Principle
// =============================================================================

export class ViewGroupLinkConfig {
    constructor(config = {}) {
        this.id = config.id || null;

        // Originator Principle: who initiated determines whose links pause
        this.originatorGroupId = config.originatorGroupId || null;  // Group that initiated - their links pause
        this.targetGroupId = config.targetGroupId || null;          // Group being linked to - unaffected
        this.targetGroupName = config.targetGroupName || null;

        this.mode = config.mode || VIEWGROUP_LINK_MODES.SYNC;
        this.properties = config.properties || config.linkedProperties || ['camera', 'filters'];
        this.active = config.active ?? true;
        this.status = config.status || VIEWGROUP_LINK_STATUS.ACTIVE;
        this.statusReason = config.statusReason || null;

        // Timestamps
        this.createdAt = config.createdAt || config.linkedAt || Date.now();
        this.createdBy = config.createdBy || null;
        this.lastSyncAt = config.lastSyncAt || null;
    }

    isActive() {
        return this.active && this.status === VIEWGROUP_LINK_STATUS.ACTIVE;
    }

    markBroken(reason) {
        this.status = VIEWGROUP_LINK_STATUS.BROKEN;
        this.statusReason = reason;
    }

    pause() {
        this.status = VIEWGROUP_LINK_STATUS.PAUSED;
        this.statusReason = 'user_paused';
    }

    resume() {
        this.status = VIEWGROUP_LINK_STATUS.ACTIVE;
        this.statusReason = 'user_resumed';
    }

    updateLastSync() {
        this.lastSyncAt = Date.now();
    }

    toJSON() {
        return {
            id: this.id,
            originatorGroupId: this.originatorGroupId,
            targetGroupId: this.targetGroupId,
            targetGroupName: this.targetGroupName,
            mode: this.mode,
            properties: this.properties,
            active: this.active,
            status: this.status,
            statusReason: this.statusReason,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
            lastSyncAt: this.lastSyncAt,
        };
    }

    static fromJSON(data) {
        return data ? new ViewGroupLinkConfig(data) : null;
    }

    static fromServerResponse(data) {
        if (!data) return null;
        return new ViewGroupLinkConfig({
            id: data.id,
            originatorGroupId: data.originator_group_id || data.originatorGroupId,
            targetGroupId: data.target_group_id || data.targetGroupId,
            targetGroupName: data.target_group_name || data.targetGroupName,
            mode: data.mode,
            properties: data.properties || data.linkedProperties,
            active: data.active ?? true,
            status: data.status || VIEWGROUP_LINK_STATUS.ACTIVE,
            statusReason: data.status_reason || data.statusReason,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            createdBy: data.created_by || data.createdBy,
            lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at).getTime() : null,
        });
    }
}

// =============================================================================
// VIEWGROUP VIEW SLOT
// Represents a view placed in a specific cell of the ViewGroup's layout
// =============================================================================

export class ViewGroupSlot {
    constructor(config = {}) {
        this.position = config.position || 0;  // Index in the layout grid
        this.viewId = config.viewId || null;   // Reference to ViewConfiguration
        this.viewName = config.viewName || null;
        this.viewType = config.viewType || null;
        this.datasetId = config.datasetId || null;
    }

    isEmpty() {
        return !this.viewId;
    }

    clear() {
        this.viewId = null;
        this.viewName = null;
        this.viewType = null;
        this.datasetId = null;
    }

    setView(viewId, viewName, viewType, datasetId = null) {
        this.viewId = viewId;
        this.viewName = viewName;
        this.viewType = viewType;
        this.datasetId = datasetId;
    }

    toJSON() {
        return {
            position: this.position,
            viewId: this.viewId,
            viewName: this.viewName,
            viewType: this.viewType,
            datasetId: this.datasetId,
        };
    }

    static fromJSON(data) {
        return data ? new ViewGroupSlot(data) : null;
    }
}

// =============================================================================
// VIEWGROUP CLASS
// =============================================================================

export class ViewGroup extends EventEmitter {
    constructor(config = {}) {
        super();

        // Server-generated ID (null until created on server)
        this.id = config.id || null;
        this.serverId = config.serverId || null;

        // Identity - name can be null for implicit solo ViewGroups
        this.name = config.name !== undefined ? config.name : null;
        this.color = config.color || VIEWGROUP_COLORS[0];

        // Explicit flag - true if user explicitly created/named this group
        this.isExplicit = config.isExplicit ?? false;

        // Layout configuration
        this.layoutId = config.layoutId || 'single';
        this._layout = this._resolveLayout(this.layoutId);

        // Views in this group (array of ViewGroupSlot)
        this.slots = this._initializeSlots(config.slots || []);

        // Linking to other ViewGroups
        this.link = config.link ? ViewGroupLinkConfig.fromJSON(config.link) : null;

        // Canvas position (where on the workspace canvas grid)
        this.canvasPosition = config.canvasPosition || {
            row: 0,
            col: 0,
            rowSpan: 1,
            colSpan: 1,
        };

        // Ownership & sharing
        this.ownerId = config.ownerId || null;
        this.ownerName = config.ownerName || null;
        this.workspaceId = config.workspaceId || null;
        this.visibility = config.visibility || 'group';
        this.sharedWith = config.sharedWith || [];

        // Timestamps
        this.createdAt = config.createdAt || Date.now();
        this.updatedAt = config.updatedAt || Date.now();

        // Dirty tracking for sync
        this._isDirty = false;
        this._dirtyFields = new Set();
    }

    // =========================================================================
    // LAYOUT MANAGEMENT
    // =========================================================================

    _resolveLayout(layoutId) {
        return BUILTIN_LAYOUTS.find(l => l.id === layoutId) || BUILTIN_LAYOUTS[0];
    }

    _initializeSlots(existingSlots) {
        const capacity = this.getLayoutCapacity();
        const slots = [];

        for (let i = 0; i < capacity; i++) {
            const existing = existingSlots.find(s => s?.position === i);
            slots.push(existing ? ViewGroupSlot.fromJSON(existing) : new ViewGroupSlot({ position: i }));
        }

        return slots;
    }

    getLayoutCapacity() {
        if (!this._layout) return 1;
        if (this._layout.merged === 'top' || this._layout.merged === 'right') return 3;
        return this._layout.rows * this._layout.cols;
    }

    getLayout() {
        return this._layout;
    }

    setLayout(layoutId) {
        const oldLayoutId = this.layoutId;
        this.layoutId = layoutId;
        this._layout = this._resolveLayout(layoutId);

        // Re-initialize slots for new capacity
        const oldSlots = this.slots;
        this.slots = this._initializeSlots(oldSlots);

        this._markDirty('layoutId');
        this.emit('layoutChanged', { oldLayoutId, newLayoutId: layoutId });
    }

    // =========================================================================
    // STATE COMPUTATION
    // Based on view count and naming per spec
    // =========================================================================

    /**
     * Compute ViewGroup state based on view count and name
     * - solo: 1 view, no name - hidden in UI
     * - named: 2+ views, name required - full ViewGroup UI
     * - explicit_solo: 1 view with name - user chose this
     * - empty: 0 views with name - template/placeholder
     */
    getState() {
        const viewCount = this.getViewCount();
        const hasName = this.name !== null;

        if (viewCount === 0) return VIEWGROUP_STATES.EMPTY;
        if (viewCount === 1 && !hasName) return VIEWGROUP_STATES.SOLO;
        if (viewCount === 1 && hasName) return VIEWGROUP_STATES.EXPLICIT_SOLO;
        if (viewCount >= 2) return VIEWGROUP_STATES.NAMED;

        return VIEWGROUP_STATES.SOLO; // Fallback
    }

    /**
     * Check if this ViewGroup should be visible in UI
     * Solo groups are hidden unless explicitly created
     */
    isVisibleInUI() {
        const state = this.getState();
        return state !== VIEWGROUP_STATES.SOLO;
    }

    /**
     * Auto-generate name when transitioning from solo to named (2+ views)
     */
    autoGenerateName() {
        const views = this.getViews();
        if (views.length === 0) return 'Untitled Group';

        const firstView = views[0];
        if (firstView.viewName) {
            return `${firstView.viewName} Group`;
        }

        const typeDisplayNames = {
            'vtk-slice': 'Slice',
            'vtk-volume': 'Volume Render',
            'vtk-mesh': 'Mesh',
            'plotly-scatter': 'Scatter Plot',
            'plotly-line': 'Line Chart',
            'plotly-bar': 'Bar Chart',
            'image': 'Image',
        };

        const typeName = typeDisplayNames[firstView.viewType] || 'View';
        return `${typeName} Group`;
    }

    // =========================================================================
    // VIEW MANAGEMENT
    // =========================================================================

    getViews() {
        return this.slots.filter(s => !s.isEmpty());
    }

    getViewCount() {
        return this.getViews().length;
    }

    getViewIds() {
        return this.slots.filter(s => !s.isEmpty()).map(s => s.viewId);
    }

    getSlotAt(position) {
        return this.slots.find(s => s.position === position) || null;
    }

    setViewAtSlot(position, viewId, viewName, viewType, datasetId = null) {
        const slot = this.getSlotAt(position);
        if (slot) {
            slot.setView(viewId, viewName, viewType, datasetId);
            this._markDirty('slots');
            this.emit('viewAdded', { position, viewId, viewName, viewType });
        }
    }

    removeViewFromSlot(position) {
        const slot = this.getSlotAt(position);
        if (slot && !slot.isEmpty()) {
            const viewId = slot.viewId;
            slot.clear();
            this._markDirty('slots');
            this.emit('viewRemoved', { position, viewId });
        }
    }

    findSlotByViewId(viewId) {
        return this.slots.find(s => s.viewId === viewId) || null;
    }

    hasView(viewId) {
        return this.slots.some(s => s.viewId === viewId);
    }

    getFirstEmptySlot() {
        return this.slots.find(s => s.isEmpty()) || null;
    }

    addView(viewId, viewName, viewType, datasetId = null) {
        const previousCount = this.getViewCount();
        const emptySlot = this.getFirstEmptySlot();
        if (emptySlot) {
            this.setViewAtSlot(emptySlot.position, viewId, viewName, viewType, datasetId);

            // State transition: solo → named (auto-generate name)
            const newCount = this.getViewCount();
            if (previousCount === 1 && newCount === 2 && this.name === null) {
                this.name = this.autoGenerateName();
                this._markDirty('name');
                this.emit('stateChanged', { oldState: VIEWGROUP_STATES.SOLO, newState: VIEWGROUP_STATES.NAMED });
            }

            return emptySlot.position;
        }
        return -1; // No empty slot
    }

    removeView(viewId) {
        const slot = this.findSlotByViewId(viewId);
        if (slot) {
            this.removeViewFromSlot(slot.position);
            return true;
        }
        return false;
    }

    // =========================================================================
    // VIEWGROUP-TO-VIEWGROUP LINKING
    // Follows the Originator Principle: who initiates determines whose links pause
    // =========================================================================

    /**
     * Check if this group is involved in any VG link (as originator or target)
     */
    isLinked() {
        return this.link !== null && this.link.isActive();
    }

    /**
     * Check if this group is the originator of a VG link
     * (i.e., this group's individual links get paused)
     */
    isLinkOriginator() {
        return this.link !== null && this.link.originatorGroupId === this.id;
    }

    /**
     * Check if this group is the target of a VG link
     * (i.e., this group is unaffected by the link)
     */
    isLinkTarget() {
        return this.link !== null && this.link.targetGroupId === this.id;
    }

    getLinkedGroupId() {
        if (!this.link) return null;
        // Return the "other" group in the link
        return this.link.originatorGroupId === this.id
            ? this.link.targetGroupId
            : this.link.originatorGroupId;
    }

    /**
     * Link this ViewGroup to another (this group becomes the originator)
     * Originator Principle: This group's incoming follow links will be paused
     */
    linkTo(targetGroupId, targetGroupName, mode = VIEWGROUP_LINK_MODES.SYNC, properties = ['camera', 'filters']) {
        this.link = new ViewGroupLinkConfig({
            originatorGroupId: this.id,  // We are the originator
            targetGroupId,
            targetGroupName,
            mode,
            properties,
        });
        this._markDirty('link');
        this.emit('linked', { targetGroupId, mode, isOriginator: true });
    }

    /**
     * Set link config when this group is the target (set by another group linking to us)
     */
    setAsLinkTarget(originatorGroupId, originatorGroupName, mode, properties) {
        this.link = new ViewGroupLinkConfig({
            originatorGroupId,
            targetGroupId: this.id,  // We are the target
            targetGroupName: this.name,
            mode,
            properties,
        });
        // Don't mark dirty - target's state isn't really "changed" by being linked to
        this.emit('linkedAsTarget', { originatorGroupId, mode });
    }

    unlink() {
        if (this.link) {
            const wasOriginator = this.isLinkOriginator();
            const otherGroupId = this.getLinkedGroupId();
            this.link = null;
            this._markDirty('link');
            this.emit('unlinked', { otherGroupId, wasOriginator });
        }
    }

    pauseLink() {
        if (this.link) {
            this.link.pause();
            this._markDirty('link');
            this.emit('linkPaused');
        }
    }

    resumeLink() {
        if (this.link) {
            this.link.resume();
            this._markDirty('link');
            this.emit('linkResumed');
        }
    }

    // =========================================================================
    // CANVAS POSITION
    // =========================================================================

    setCanvasPosition(row, col, rowSpan = 1, colSpan = 1) {
        this.canvasPosition = { row, col, rowSpan, colSpan };
        this._markDirty('canvasPosition');
        this.emit('positionChanged', this.canvasPosition);
    }

    getCanvasPosition() {
        return { ...this.canvasPosition };
    }

    // =========================================================================
    // PROPERTY UPDATES
    // =========================================================================

    setName(name) {
        if (this.name !== name) {
            this.name = name;
            this._markDirty('name');
            this.emit('nameChanged', name);
        }
    }

    setColor(color) {
        if (this.color !== color) {
            this.color = color;
            this._markDirty('color');
            this.emit('colorChanged', color);
        }
    }

    // =========================================================================
    // DIRTY TRACKING
    // =========================================================================

    _markDirty(field) {
        this._isDirty = true;
        this._dirtyFields.add(field);
        this.updatedAt = Date.now();
        this.emit('changed', { field, viewGroup: this });
    }

    isDirty() {
        return this._isDirty;
    }

    getDirtyFields() {
        return Array.from(this._dirtyFields);
    }

    clearDirty() {
        this._isDirty = false;
        this._dirtyFields.clear();
    }

    // =========================================================================
    // SERIALIZATION
    // =========================================================================

    toJSON() {
        return {
            id: this.id,
            serverId: this.serverId,
            name: this.name,
            color: this.color,
            layoutId: this.layoutId,
            slots: this.slots.map(s => s.toJSON()),
            link: this.link?.toJSON() || null,
            canvasPosition: this.canvasPosition,
            ownerId: this.ownerId,
            ownerName: this.ownerName,
            workspaceId: this.workspaceId,
            visibility: this.visibility,
            sharedWith: this.sharedWith,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    toServerPayload() {
        // Minimal payload for server sync
        return {
            id: this.serverId || this.id,
            name: this.name,
            color: this.color,
            layoutId: this.layoutId,
            slots: this.slots.map(s => s.toJSON()),
            link: this.link?.toJSON() || null,
            canvasPosition: this.canvasPosition,
            workspaceId: this.workspaceId,
            visibility: this.visibility,
            sharedWith: this.sharedWith,
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        return new ViewGroup({
            ...data,
            slots: data.slots || [],
            link: data.link,
        });
    }

    static fromServerResponse(data) {
        if (!data) return null;
        return new ViewGroup({
            id: data.id,
            serverId: data.id,
            name: data.name,
            color: data.color,
            layoutId: data.layout_id || data.layoutId,
            slots: data.slots || [],
            link: data.link,
            canvasPosition: data.canvas_position || data.canvasPosition || { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
            ownerId: data.owner_id || data.ownerId,
            ownerName: data.owner_name || data.ownerName,
            workspaceId: data.workspace_id || data.workspaceId,
            visibility: data.visibility,
            sharedWith: data.shared_with || data.sharedWith || [],
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
        });
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    clone() {
        const cloned = ViewGroup.fromJSON(this.toJSON());
        cloned.id = null;
        cloned.serverId = null;
        cloned.name = `${this.name} (Copy)`;
        cloned.link = null;
        cloned.createdAt = Date.now();
        cloned.updatedAt = Date.now();
        return cloned;
    }

    matchLayout(sourceGroup) {
        this.setLayout(sourceGroup.layoutId);
    }
}

// =============================================================================
// VIEWPORT CLASS
// Represents a user's viewing window on the canvas
// =============================================================================

export class Viewport extends EventEmitter {
    constructor(config = {}) {
        super();

        this.id = config.id || null;
        this.serverId = config.serverId || null;
        this.name = config.name || 'My Viewport';
        this.userId = config.userId || null;
        this.userName = config.userName || null;
        this.workspaceId = config.workspaceId || null;

        // Position and size on canvas
        this.position = config.position || { row: 0, col: 0 };
        this.size = config.size || { rows: 2, cols: 2 };

        // Mode: snap to grid or free positioning
        this.mode = config.mode || 'snap';

        // If snapped to a ViewGroup
        this.snappedTo = config.snappedTo || null;

        // Flags
        this.isPrimary = config.isPrimary ?? true;
        this.isShared = config.isShared ?? false;

        // Timestamps
        this.createdAt = config.createdAt || Date.now();
        this.updatedAt = config.updatedAt || Date.now();

        this._isDirty = false;
    }

    setPosition(row, col) {
        this.position = { row, col };
        this.updatedAt = Date.now();
        this._isDirty = true;
        this.emit('positionChanged', this.position);
    }

    setSize(rows, cols) {
        this.size = { rows, cols };
        this.updatedAt = Date.now();
        this._isDirty = true;
        this.emit('sizeChanged', this.size);
    }

    snapTo(viewGroupId) {
        this.snappedTo = viewGroupId;
        this.mode = 'snap';
        this.updatedAt = Date.now();
        this._isDirty = true;
        this.emit('snapped', { viewGroupId });
    }

    unsnap() {
        const wasSnappedTo = this.snappedTo;
        this.snappedTo = null;
        this.mode = 'free';
        this.updatedAt = Date.now();
        this._isDirty = true;
        this.emit('unsnapped', { wasSnappedTo });
    }

    setShared(isShared) {
        this.isShared = isShared;
        this.updatedAt = Date.now();
        this._isDirty = true;
        this.emit('sharingChanged', isShared);
    }

    isDirty() {
        return this._isDirty;
    }

    clearDirty() {
        this._isDirty = false;
    }

    toJSON() {
        return {
            id: this.id,
            serverId: this.serverId,
            name: this.name,
            userId: this.userId,
            userName: this.userName,
            workspaceId: this.workspaceId,
            position: this.position,
            size: this.size,
            mode: this.mode,
            snappedTo: this.snappedTo,
            isPrimary: this.isPrimary,
            isShared: this.isShared,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    static fromJSON(data) {
        return data ? new Viewport(data) : null;
    }

    static fromServerResponse(data) {
        if (!data) return null;
        return new Viewport({
            id: data.id,
            serverId: data.id,
            name: data.name,
            userId: data.user_id || data.userId,
            userName: data.user_name || data.userName,
            workspaceId: data.workspace_id || data.workspaceId,
            position: data.position || { row: data.position_row || 0, col: data.position_col || 0 },
            size: data.size || { rows: data.size_rows || 2, cols: data.size_cols || 2 },
            mode: data.mode || 'snap',
            snappedTo: data.snapped_to || data.snappedTo,
            isPrimary: data.is_primary ?? data.isPrimary ?? true,
            isShared: data.is_shared ?? data.isShared ?? false,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
        });
    }
}

export default ViewGroup;
