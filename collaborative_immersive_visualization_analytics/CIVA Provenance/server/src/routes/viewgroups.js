// server/src/routes/viewgroups.js
// ViewGroup management endpoints
// ViewGroups are containers for organizing and linking views on the canvas

const express = require('express');
// mergeParams: true allows access to :workspaceId from parent mount
const router = express.Router({ mergeParams: true });
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getUser } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');

const log = createLogger('viewgroups');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compute a short hash for property values (for reconciliation)
 */
function computePropertyHash(value) {
    if (value === null || value === undefined) return 'null';
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ============================================================================
// VIEWGROUP CRUD ENDPOINTS
// ============================================================================

/**
 * GET /api/viewgroups
 * List ViewGroups with optional workspace filter
 */
router.get('/', async (req, res, next) => {
    try {
        const user = getUser(req);
        const { pool } = req.app.locals;
        // workspaceId can come from route params (when mounted at /api/workspaces/:workspaceId/viewgroups)
        // or from query params (when mounted at /api/viewgroups)
        const workspaceId = req.params.workspaceId || req.query.workspaceId;
        const { projectId, includeImplicit = 'false' } = req.query;

        let query = `
            SELECT vg.*,
                   u.email as owner_email,
                   w.name as workspace_name,
                   (SELECT COUNT(*) FROM view_configurations vc WHERE vc.view_group_id = vg.id) as view_count
            FROM viewgroups vg
            LEFT JOIN users u ON vg.owner_id = u.id
            LEFT JOIN workspaces w ON vg.workspace_id = w.id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        // Filter by workspace
        if (workspaceId) {
            query += ` AND vg.workspace_id = $${paramIndex++}`;
            values.push(workspaceId);
        }

        // Filter by project
        if (projectId) {
            query += ` AND w.project_id = $${paramIndex++}`;
            values.push(projectId);
        }

        // Only show explicit groups unless includeImplicit=true
        if (includeImplicit !== 'true') {
            query += ` AND (vg.is_explicit = true OR (SELECT COUNT(*) FROM view_configurations vc WHERE vc.view_group_id = vg.id) > 1)`;
        }

        // Filter by visibility
        query += ` AND (
            vg.owner_id = $${paramIndex++} OR
            vg.visibility IN ('group', 'public')
        )`;
        values.push(user.id);

        query += ` ORDER BY vg.updated_at DESC`;

        const result = await pool.query(query, values);

        // Get views for each ViewGroup
        const viewGroups = await Promise.all(result.rows.map(async (vg) => {
            const viewsResult = await pool.query(
                `SELECT vc.id, vc.name, vc.view_type, vc.dataset_id
                 FROM view_configurations vc
                 WHERE vc.view_group_id = $1
                 ORDER BY vc.created_at`,
                [vg.id]
            );

            // Get VG links
            const linksResult = await pool.query(
                `SELECT vgl.*
                 FROM view_group_links vgl
                 WHERE vgl.originator_group_id = $1 OR vgl.target_group_id = $1`,
                [vg.id]
            );

            return {
                id: vg.id,
                workspaceId: vg.workspace_id,
                name: vg.name,
                color: vg.color,
                layoutId: vg.layout_id,
                slots: vg.slots || [],
                canvasPosition: vg.canvas_position || { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
                ownerId: vg.owner_id,
                ownerEmail: vg.owner_email,
                visibility: vg.visibility,
                isExplicit: vg.is_explicit,
                viewCount: parseInt(vg.view_count) || 0,
                views: viewsResult.rows.map(v => ({
                    id: v.id,
                    name: v.name,
                    viewType: v.view_type,
                    datasetId: v.dataset_id,
                })),
                link: linksResult.rows.length > 0 ? {
                    id: linksResult.rows[0].id,
                    originatorGroupId: linksResult.rows[0].originator_group_id,
                    targetGroupId: linksResult.rows[0].target_group_id,
                    mode: linksResult.rows[0].mode,
                    properties: linksResult.rows[0].properties,
                } : null,
                createdAt: vg.created_at,
                updatedAt: vg.updated_at,
            };
        }));

        res.json({
            viewGroups,
            count: viewGroups.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/viewgroups/:id
 * Get single ViewGroup details
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { pool } = req.app.locals;

        const result = await pool.query(
            `SELECT vg.*,
                    u.email as owner_email,
                    w.name as workspace_name
             FROM viewgroups vg
             LEFT JOIN users u ON vg.owner_id = u.id
             LEFT JOIN workspaces w ON vg.workspace_id = w.id
             WHERE vg.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'ViewGroup not found' });
        }

        const vg = result.rows[0];

        // Get views in this ViewGroup
        const viewsResult = await pool.query(
            `SELECT vc.id, vc.name, vc.view_type, vc.dataset_id
             FROM view_configurations vc
             WHERE vc.view_group_id = $1
             ORDER BY vc.created_at`,
            [id]
        );

        // Get VG links
        const linksResult = await pool.query(
            `SELECT vgl.*
             FROM view_group_links vgl
             WHERE vgl.originator_group_id = $1 OR vgl.target_group_id = $1`,
            [id]
        );

        const viewGroup = {
            id: vg.id,
            workspaceId: vg.workspace_id,
            name: vg.name,
            color: vg.color,
            layoutId: vg.layout_id,
            slots: vg.slots || [],
            canvasPosition: vg.canvas_position || { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
            ownerId: vg.owner_id,
            ownerEmail: vg.owner_email,
            visibility: vg.visibility,
            isExplicit: vg.is_explicit,
            views: viewsResult.rows.map(v => ({
                id: v.id,
                name: v.name,
                viewType: v.view_type,
                datasetId: v.dataset_id,
            })),
            link: linksResult.rows.length > 0 ? {
                id: linksResult.rows[0].id,
                originatorGroupId: linksResult.rows[0].originator_group_id,
                targetGroupId: linksResult.rows[0].target_group_id,
                mode: linksResult.rows[0].mode,
                properties: linksResult.rows[0].properties,
            } : null,
            createdAt: vg.created_at,
            updatedAt: vg.updated_at,
        };

        res.json({ viewGroup });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/workspaces/:workspaceId/viewgroups
 * Create a new ViewGroup
 *
 * Note: This route handles both:
 * - POST /api/viewgroups/workspaces/:workspaceId/viewgroups (when mounted at /api/viewgroups)
 * - POST /api/workspaces/:workspaceId/viewgroups/ (when mounted at /api/workspaces/:workspaceId/viewgroups)
 */
router.post(['/', '/workspaces/:workspaceId/viewgroups'], async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const user = getUser(req);
        // workspaceId can come from route params or from the parent mount
        const workspaceId = req.params.workspaceId;
        const {
            name = 'New Group',
            layoutId = 'single',
            color = '#a855f7',
            canvasPosition = { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
            visibility = 'group',
            isExplicit = true,
            slots = [],
        } = req.body;

        const id = uuidv4();

        // Insert ViewGroup with JSONB fields
        const result = await pool.query(
            `INSERT INTO viewgroups (
                id, workspace_id, name, layout_id, color,
                canvas_position, slots,
                owner_id, visibility, is_explicit,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *`,
            [
                id,
                workspaceId,
                name,
                layoutId,
                color,
                JSON.stringify(canvasPosition),
                JSON.stringify(slots),
                user.id,
                visibility,
                isExplicit,
            ]
        );

        const viewGroup = result.rows[0];

        log.info(`Created ViewGroup ${id} in workspace ${workspaceId}`);

        // Broadcast to connected clients
        if (wsManager) {
            wsManager.broadcastToWorkspace(workspaceId, 'viewgroup:created', {
                viewGroup: {
                    id: viewGroup.id,
                    workspaceId: viewGroup.workspace_id,
                    name: viewGroup.name,
                    color: viewGroup.color,
                    layoutId: viewGroup.layout_id,
                    canvasPosition: viewGroup.canvas_position,
                    slots: viewGroup.slots,
                    ownerId: viewGroup.owner_id,
                    visibility: viewGroup.visibility,
                    isExplicit: viewGroup.is_explicit,
                    createdAt: viewGroup.created_at,
                    updatedAt: viewGroup.updated_at,
                },
            });
        }

        res.status(201).json({
            id: viewGroup.id,
            workspaceId: viewGroup.workspace_id,
            name: viewGroup.name,
            color: viewGroup.color,
            layoutId: viewGroup.layout_id,
            canvasPosition: viewGroup.canvas_position,
            slots: viewGroup.slots,
            ownerId: viewGroup.owner_id,
            visibility: viewGroup.visibility,
            isExplicit: viewGroup.is_explicit,
            createdAt: viewGroup.created_at,
            updatedAt: viewGroup.updated_at,
        });
    } catch (error) {
        log.error('Failed to create ViewGroup:', error);
        next(error);
    }
});

/**
 * PUT /api/viewgroups/:id
 * Update a ViewGroup
 */
router.put('/:id', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const { id } = req.params;
        const {
            name,
            layoutId,
            color,
            canvasPosition,
            visibility,
            slots,
            isExplicit,
        } = req.body;

        // Build update query dynamically
        const updates = ['updated_at = NOW()'];
        const values = [id];
        let paramIndex = 2;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (layoutId !== undefined) {
            updates.push(`layout_id = $${paramIndex++}`);
            values.push(layoutId);
        }
        if (color !== undefined) {
            updates.push(`color = $${paramIndex++}`);
            values.push(color);
        }
        if (canvasPosition !== undefined) {
            updates.push(`canvas_position = $${paramIndex++}`);
            values.push(JSON.stringify(canvasPosition));
        }
        if (visibility !== undefined) {
            updates.push(`visibility = $${paramIndex++}`);
            values.push(visibility);
        }
        if (slots !== undefined) {
            updates.push(`slots = $${paramIndex++}`);
            values.push(JSON.stringify(slots));
        }
        if (isExplicit !== undefined) {
            updates.push(`is_explicit = $${paramIndex++}`);
            values.push(isExplicit);
        }

        const result = await pool.query(
            `UPDATE viewgroups SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'ViewGroup not found' });
        }

        const viewGroup = result.rows[0];

        log.info(`Updated ViewGroup ${id}`);

        // Broadcast to connected clients
        if (wsManager && viewGroup.workspace_id) {
            wsManager.broadcastToWorkspace(viewGroup.workspace_id, 'viewgroup:updated', {
                viewGroup: {
                    id: viewGroup.id,
                    workspaceId: viewGroup.workspace_id,
                    name: viewGroup.name,
                    color: viewGroup.color,
                    layoutId: viewGroup.layout_id,
                    canvasPosition: viewGroup.canvas_position,
                    slots: viewGroup.slots,
                    ownerId: viewGroup.owner_id,
                    visibility: viewGroup.visibility,
                    isExplicit: viewGroup.is_explicit,
                    updatedAt: viewGroup.updated_at,
                },
            });
        }

        res.json({
            id: viewGroup.id,
            workspaceId: viewGroup.workspace_id,
            name: viewGroup.name,
            color: viewGroup.color,
            layoutId: viewGroup.layout_id,
            canvasPosition: viewGroup.canvas_position,
            slots: viewGroup.slots,
            ownerId: viewGroup.owner_id,
            visibility: viewGroup.visibility,
            isExplicit: viewGroup.is_explicit,
            updatedAt: viewGroup.updated_at,
        });
    } catch (error) {
        log.error('Failed to update ViewGroup:', error);
        next(error);
    }
});

/**
 * DELETE /api/viewgroups/:id
 * Delete a ViewGroup
 */
router.delete('/:id', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const { id } = req.params;

        // Get workspace ID for broadcast before deleting
        const vgResult = await pool.query(
            'SELECT workspace_id FROM viewgroups WHERE id = $1',
            [id]
        );

        if (vgResult.rows.length === 0) {
            return res.status(404).json({ error: 'ViewGroup not found' });
        }

        const workspaceId = vgResult.rows[0].workspace_id;

        // Remove view_group_id from any views in this group
        await pool.query(
            'UPDATE view_configurations SET view_group_id = NULL WHERE view_group_id = $1',
            [id]
        );

        // Delete any VG links
        await pool.query(
            'DELETE FROM view_group_links WHERE originator_group_id = $1 OR target_group_id = $1',
            [id]
        );

        // Delete the ViewGroup
        await pool.query('DELETE FROM viewgroups WHERE id = $1', [id]);

        log.info(`Deleted ViewGroup ${id}`);

        // Broadcast to connected clients
        if (wsManager && workspaceId) {
            wsManager.broadcastToWorkspace(workspaceId, 'viewgroup:deleted', {
                viewGroupId: id,
            });
        }

        res.status(204).send();
    } catch (error) {
        log.error('Failed to delete ViewGroup:', error);
        next(error);
    }
});

/**
 * POST /api/viewgroups/:id/duplicate
 * Duplicate a ViewGroup with link options
 */
router.post('/:id/duplicate', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const user = getUser(req);
        const { id } = req.params;
        const {
            name,
            linkOption = 'link_to_original', // 'keep_individual', 'link_to_original', 'no_links'
            linkDirection = 'duplicate_follows',
        } = req.body;

        // Get original ViewGroup
        const originalResult = await pool.query(
            'SELECT * FROM viewgroups WHERE id = $1',
            [id]
        );

        if (originalResult.rows.length === 0) {
            return res.status(404).json({ error: 'ViewGroup not found' });
        }

        const original = originalResult.rows[0];
        const newId = uuidv4();

        // Create duplicate
        const duplicateResult = await pool.query(
            `INSERT INTO viewgroups (
                id, workspace_id, name, layout_id, color,
                canvas_position, slots,
                owner_id, visibility, is_explicit,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *`,
            [
                newId,
                original.workspace_id,
                name || `${original.name} (Copy)`,
                original.layout_id,
                original.color,
                JSON.stringify(original.canvas_position || { row: 0, col: 0, rowSpan: 1, colSpan: 1 }),
                JSON.stringify(original.slots || []),
                user.id,
                original.visibility,
                original.is_explicit,
            ]
        );

        const duplicate = duplicateResult.rows[0];

        // Handle link option
        if (linkOption === 'link_to_original') {
            // Create VG link between duplicate and original
            const originatorId = linkDirection === 'duplicate_follows' ? newId : id;
            const targetId = linkDirection === 'duplicate_follows' ? id : newId;

            await pool.query(
                `INSERT INTO view_group_links (
                    id, originator_group_id, target_group_id, mode, properties, active, created_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)`,
                [uuidv4(), originatorId, targetId, 'follow', JSON.stringify(['camera', 'filters']), user.id]
            );
        }

        log.info(`Duplicated ViewGroup ${id} -> ${newId} with linkOption=${linkOption}`);

        // Broadcast to connected clients
        if (wsManager && duplicate.workspace_id) {
            wsManager.broadcastToWorkspace(duplicate.workspace_id, 'viewgroup:created', {
                viewGroup: {
                    id: duplicate.id,
                    workspaceId: duplicate.workspace_id,
                    name: duplicate.name,
                    color: duplicate.color,
                    layoutId: duplicate.layout_id,
                    canvasPosition: duplicate.canvas_position,
                    slots: duplicate.slots,
                    ownerId: duplicate.owner_id,
                    visibility: duplicate.visibility,
                    isExplicit: duplicate.is_explicit,
                    createdAt: duplicate.created_at,
                    updatedAt: duplicate.updated_at,
                },
            });
        }

        res.status(201).json({
            viewGroup: {
                id: duplicate.id,
                workspaceId: duplicate.workspace_id,
                name: duplicate.name,
                color: duplicate.color,
                layoutId: duplicate.layout_id,
                canvasPosition: duplicate.canvas_position,
                slots: duplicate.slots,
                ownerId: duplicate.owner_id,
                visibility: duplicate.visibility,
                isExplicit: duplicate.is_explicit,
                createdAt: duplicate.created_at,
                updatedAt: duplicate.updated_at,
            },
            originalId: id,
            linkOption,
        });
    } catch (error) {
        log.error('Failed to duplicate ViewGroup:', error);
        next(error);
    }
});

// ============================================================================
// VIEW LINK ENDPOINTS
// ============================================================================

/**
 * POST /api/links/view
 * Create a View-to-View link
 */
router.post('/links/view', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const user = getUser(req);
        const {
            sourceViewId,
            targetViewId,
            property,
            mode = 'follow',
        } = req.body;

        if (!sourceViewId || !targetViewId || !property) {
            return res.status(400).json({ error: 'sourceViewId, targetViewId, and property are required' });
        }

        const id = uuidv4();

        const result = await pool.query(
            `INSERT INTO view_links (
                id, source_view_id, target_view_id, property, mode, active,
                follower_last_synced_at, created_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
            ON CONFLICT (source_view_id, target_view_id, property)
            DO UPDATE SET mode = $5, active = true, follower_last_synced_at = NOW()
            RETURNING *`,
            [id, sourceViewId, targetViewId, property, mode, user.id]
        );

        const link = result.rows[0];

        log.info(`Created view link: ${sourceViewId} -> ${targetViewId} (${property}, ${mode})`);

        // Get workspace for broadcast
        const viewResult = await pool.query(
            `SELECT w.id as workspace_id FROM view_configurations vc
             JOIN canvases c ON vc.canvas_id = c.id
             JOIN workspaces w ON c.workspace_id = w.id
             WHERE vc.id = $1`,
            [sourceViewId]
        );

        if (wsManager && viewResult.rows[0]?.workspace_id) {
            wsManager.broadcastToWorkspace(viewResult.rows[0].workspace_id, 'viewlink:created', {
                link: {
                    id: link.id,
                    sourceViewId: link.source_view_id,
                    targetViewId: link.target_view_id,
                    property: link.property,
                    mode: link.mode,
                    active: link.active,
                },
            });
        }

        res.status(201).json({
            link: {
                id: link.id,
                sourceViewId: link.source_view_id,
                targetViewId: link.target_view_id,
                property: link.property,
                mode: link.mode,
                active: link.active,
            },
        });
    } catch (error) {
        log.error('Failed to create view link:', error);
        next(error);
    }
});

/**
 * DELETE /api/links/view/:id
 * Delete a View-to-View link
 */
router.delete('/links/view/:id', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const { id } = req.params;

        // Get link details before deleting
        const linkResult = await pool.query('SELECT * FROM view_links WHERE id = $1', [id]);

        if (linkResult.rows.length === 0) {
            return res.status(404).json({ error: 'View link not found' });
        }

        const link = linkResult.rows[0];

        await pool.query('DELETE FROM view_links WHERE id = $1', [id]);

        log.info(`Deleted view link ${id}`);

        // Get workspace for broadcast
        const viewResult = await pool.query(
            `SELECT w.id as workspace_id FROM view_configurations vc
             JOIN canvases c ON vc.canvas_id = c.id
             JOIN workspaces w ON c.workspace_id = w.id
             WHERE vc.id = $1`,
            [link.source_view_id]
        );

        if (wsManager && viewResult.rows[0]?.workspace_id) {
            wsManager.broadcastToWorkspace(viewResult.rows[0].workspace_id, 'viewlink:deleted', {
                linkId: id,
                sourceViewId: link.source_view_id,
                targetViewId: link.target_view_id,
            });
        }

        res.status(204).send();
    } catch (error) {
        log.error('Failed to delete view link:', error);
        next(error);
    }
});

// ============================================================================
// VIEWGROUP LINK ENDPOINTS
// ============================================================================

/**
 * POST /api/links/viewgroup
 * Create a ViewGroup-to-ViewGroup link (implements Originator Principle)
 */
router.post('/links/viewgroup', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const user = getUser(req);
        const {
            originatorGroupId,
            targetGroupId,
            mode = 'follow',
            properties = ['camera', 'filters'],
        } = req.body;

        if (!originatorGroupId || !targetGroupId) {
            return res.status(400).json({ error: 'originatorGroupId and targetGroupId are required' });
        }

        const id = uuidv4();

        // Create VG link
        const result = await client.query(
            `INSERT INTO view_group_links (
                id, originator_group_id, target_group_id, mode, properties, active,
                created_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)
            RETURNING *`,
            [id, originatorGroupId, targetGroupId, mode, JSON.stringify(properties), user.id]
        );

        const vgLink = result.rows[0];

        // ORIGINATOR PRINCIPLE: Pause originator's incoming follow links
        await client.query(
            `UPDATE view_links SET paused_by_vg_link = $1
             WHERE target_view_id IN (
                 SELECT id FROM view_configurations WHERE view_group_id = $2
             )
             AND mode = 'follow'
             AND paused_by_vg_link IS NULL`,
            [id, originatorGroupId]
        );

        // Create individual view links for all matching views
        // (Links from originator views to target views for specified properties)
        const originatorViews = await client.query(
            'SELECT id FROM view_configurations WHERE view_group_id = $1',
            [originatorGroupId]
        );
        const targetViews = await client.query(
            'SELECT id FROM view_configurations WHERE view_group_id = $1',
            [targetGroupId]
        );

        for (const sourceView of originatorViews.rows) {
            for (const targetView of targetViews.rows) {
                for (const property of properties) {
                    await client.query(
                        `INSERT INTO view_links (
                            id, source_view_id, target_view_id, property, mode, active,
                            follower_last_synced_at, created_at, created_by
                        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
                        ON CONFLICT (source_view_id, target_view_id, property) DO NOTHING`,
                        [uuidv4(), sourceView.id, targetView.id, property, mode, user.id]
                    );
                }
            }
        }

        await client.query('COMMIT');

        log.info(`Created VG link: ${originatorGroupId} -> ${targetGroupId} (${mode})`);

        // Get workspace for broadcast
        const vgResult = await client.query(
            'SELECT workspace_id FROM viewgroups WHERE id = $1',
            [originatorGroupId]
        );

        if (wsManager && vgResult.rows[0]?.workspace_id) {
            wsManager.broadcastToWorkspace(vgResult.rows[0].workspace_id, 'vglink:created', {
                link: {
                    id: vgLink.id,
                    originatorGroupId: vgLink.originator_group_id,
                    targetGroupId: vgLink.target_group_id,
                    mode: vgLink.mode,
                    properties: vgLink.properties,
                    active: vgLink.active,
                },
            });
        }

        res.status(201).json({
            link: {
                id: vgLink.id,
                originatorGroupId: vgLink.originator_group_id,
                targetGroupId: vgLink.target_group_id,
                mode: vgLink.mode,
                properties: vgLink.properties,
                active: vgLink.active,
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        log.error('Failed to create VG link:', error);
        next(error);
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/links/viewgroup/:id
 * Delete a ViewGroup-to-ViewGroup link (restores paused links)
 */
router.delete('/links/viewgroup/:id', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Get link details before deleting
        const linkResult = await client.query('SELECT * FROM view_group_links WHERE id = $1', [id]);

        if (linkResult.rows.length === 0) {
            return res.status(404).json({ error: 'ViewGroup link not found' });
        }

        const link = linkResult.rows[0];

        // Restore paused links (clear paused_by_vg_link)
        await client.query(
            'UPDATE view_links SET paused_by_vg_link = NULL WHERE paused_by_vg_link = $1',
            [id]
        );

        // Delete the VG link
        await client.query('DELETE FROM view_group_links WHERE id = $1', [id]);

        await client.query('COMMIT');

        log.info(`Deleted VG link ${id}`);

        // Get workspace for broadcast
        const vgResult = await client.query(
            'SELECT workspace_id FROM viewgroups WHERE id = $1',
            [link.originator_group_id]
        );

        if (wsManager && vgResult.rows[0]?.workspace_id) {
            wsManager.broadcastToWorkspace(vgResult.rows[0].workspace_id, 'vglink:deleted', {
                linkId: id,
                originatorGroupId: link.originator_group_id,
                targetGroupId: link.target_group_id,
            });
        }

        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        log.error('Failed to delete VG link:', error);
        next(error);
    } finally {
        client.release();
    }
});

// ============================================================================
// RECONCILIATION ENDPOINTS
// ============================================================================

/**
 * GET /api/views/:viewId/reconciliation-status
 * Check if a view needs reconciliation (has diverged from leader)
 */
router.get('/views/:viewId/reconciliation-status', async (req, res, next) => {
    try {
        const { viewId } = req.params;
        const { pool } = req.app.locals;

        // Find all follow links where this view is the follower (source)
        const linksResult = await pool.query(
            `SELECT vl.*, vc.name as leader_name
             FROM view_links vl
             JOIN view_configurations vc ON vl.target_view_id = vc.id
             WHERE vl.source_view_id = $1
             AND vl.mode = 'follow'
             AND vl.active = true
             AND vl.paused_by_vg_link IS NULL
             AND vl.follower_diverged_at IS NOT NULL`,
            [viewId]
        );

        const divergedLinks = linksResult.rows.map(link => ({
            linkId: link.id,
            property: link.property,
            leaderViewId: link.target_view_id,
            leaderName: link.leader_name,
            divergedAt: link.follower_diverged_at,
            lastSyncedAt: link.follower_last_synced_at,
        }));

        res.json({
            needsReconciliation: divergedLinks.length > 0,
            divergedLinks,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/views/:viewId/reconcile
 * Reconcile a diverged follower view
 */
router.post('/views/:viewId/reconcile', async (req, res, next) => {
    const { pool, wsManager } = req.app.locals;

    try {
        const { viewId } = req.params;
        const { linkId, action } = req.body; // action: 'sync_to_leader' | 'keep_mine'

        if (!linkId || !action) {
            return res.status(400).json({ error: 'linkId and action are required' });
        }

        if (action === 'sync_to_leader') {
            // Clear diverged state - sync will happen on next property update
            await pool.query(
                `UPDATE view_links
                 SET follower_diverged_at = NULL,
                     follower_last_synced_at = NOW()
                 WHERE id = $1`,
                [linkId]
            );
        } else if (action === 'keep_mine') {
            // Break the link (delete it)
            await pool.query('DELETE FROM view_links WHERE id = $1', [linkId]);
        }

        log.info(`Reconciled view ${viewId}, link ${linkId}, action=${action}`);

        res.json({ success: true, action });
    } catch (error) {
        log.error('Failed to reconcile:', error);
        next(error);
    }
});

/**
 * POST /api/views/:viewId/mark-diverged
 * Mark a follower view as diverged from its leader
 */
router.post('/views/:viewId/mark-diverged', async (req, res, next) => {
    const { pool } = req.app.locals;

    try {
        const { viewId } = req.params;
        const { property } = req.body;

        if (!property) {
            return res.status(400).json({ error: 'property is required' });
        }

        // Find the follow link for this property and mark as diverged
        await pool.query(
            `UPDATE view_links
             SET follower_diverged_at = NOW()
             WHERE source_view_id = $1
             AND property = $2
             AND mode = 'follow'
             AND active = true
             AND paused_by_vg_link IS NULL
             AND follower_diverged_at IS NULL`,
            [viewId, property]
        );

        log.info(`Marked view ${viewId} as diverged for property ${property}`);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/views/:viewId/activity
 * Record view activity for reconciliation tracking
 */
router.post('/views/:viewId/activity', async (req, res, next) => {
    const { pool } = req.app.locals;

    try {
        const user = getUser(req);
        const { viewId } = req.params;
        const { active } = req.body;

        if (active) {
            // Start activity session
            await pool.query(
                `INSERT INTO view_activity (view_id, user_id, active_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (view_id, user_id, active_at) DO NOTHING`,
                [viewId, user.id]
            );
        } else {
            // End activity session
            await pool.query(
                `UPDATE view_activity
                 SET inactive_at = NOW()
                 WHERE view_id = $1 AND user_id = $2 AND inactive_at IS NULL`,
                [viewId, user.id]
            );
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/views/:viewId/is-active
 * Check if any user is currently active on a view
 */
router.get('/views/:viewId/is-active', async (req, res, next) => {
    try {
        const { viewId } = req.params;
        const { pool } = req.app.locals;

        const result = await pool.query(
            `SELECT COUNT(*) as active_count
             FROM view_activity
             WHERE view_id = $1 AND inactive_at IS NULL`,
            [viewId]
        );

        res.json({
            isActive: parseInt(result.rows[0].active_count) > 0,
            activeCount: parseInt(result.rows[0].active_count),
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
