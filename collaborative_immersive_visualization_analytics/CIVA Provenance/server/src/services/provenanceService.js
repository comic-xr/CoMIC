const crypto = require("crypto");
const { createLogger } = require("../utils/logger");

const log = createLogger("provenance");

const SNAPSHOT_STATE_FIELDS = [
  "camera",
  "filters",
  "widgets",
  "color_maps",
  "annotation_display",
  "annotations_visible",
  "links",
  "broadcast",
  "following",
  "applied_presets",
];

function buildSnapshotState(view) {
  return {
    viewId: view.id,
    projectId: view.project_id || null,
    datasetId: view.dataset_id || null,
    branchId: view.branch_id || null,
    name: view.name || "Untitled View",
    description: view.description || "",
    state: SNAPSHOT_STATE_FIELDS.reduce((acc, field) => {
      acc[field] = view[field] ?? null;
      return acc;
    }, {}),
  };
}

function hashSnapshotState(snapshotState) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshotState))
    .digest("hex")
    .slice(0, 16);
}

class ProvenanceService {
  constructor(pool) {
    this.pool = pool;
  }

  async _withClient(fn, client = null) {
    if (client) {
      return fn(client);
    }

    const ownedClient = await this.pool.connect();
    try {
      return await fn(ownedClient);
    } finally {
      ownedClient.release();
    }
  }

  async getLatestNode(projectId, viewId, client = null) {
    return this._withClient(async (db) => {
      const result = await db.query(
        `
          SELECT *
          FROM provenance_nodes
          WHERE project_id = $1 AND view_id = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [projectId, viewId]
      );

      return result.rows[0] || null;
    }, client);
  }

  async captureViewTransition({
    projectId,
    view,
    user,
    actionType,
    actionIntent,
    actionSummary,
    metadata = {},
    snapshotName = null,
    snapshotDescription = "",
    client = null,
  }) {
    const resolvedProjectId = projectId || view.project_id;
    if (!resolvedProjectId || !view?.id) {
      throw new Error("captureViewTransition requires projectId and view.id");
    }

    return this._withClient(async (db) => {
      const snapshotState = buildSnapshotState(view);
      const stateHash = hashSnapshotState(snapshotState);
      const latestNode = await this.getLatestNode(resolvedProjectId, view.id, db);

      await db.query("BEGIN");
      try {
        const snapshotResult = await db.query(
          `
            INSERT INTO analysis_snapshots (
              project_id,
              view_id,
              dataset_id,
              name,
              description,
              created_by,
              created_by_name,
              snapshot_data,
              state_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `,
          [
            resolvedProjectId,
            view.id,
            view.dataset_id || null,
            snapshotName || `${view.name || "Untitled View"} Snapshot`,
            snapshotDescription,
            user?.id || null,
            user?.name || user?.email || "Unknown",
            JSON.stringify(snapshotState),
            stateHash,
          ]
        );

        const snapshot = snapshotResult.rows[0];

        const nodeResult = await db.query(
          `
            INSERT INTO provenance_nodes (
              project_id,
              view_id,
              snapshot_id,
              label,
              state_hash,
              created_by,
              created_by_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `,
          [
            resolvedProjectId,
            view.id,
            snapshot.id,
            snapshot.name,
            stateHash,
            user?.id || null,
            user?.name || user?.email || "Unknown",
          ]
        );

        const node = nodeResult.rows[0];

        let edge = null;
        if (latestNode) {
          const edgeResult = await db.query(
            `
              INSERT INTO provenance_edges (
                project_id,
                view_id,
                from_node_id,
                to_node_id,
                action_type,
                action_intent,
                action_parameters,
                created_by,
                created_by_name
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING *
            `,
            [
              resolvedProjectId,
              view.id,
              latestNode.id,
              node.id,
              actionType,
              actionIntent || null,
              JSON.stringify(metadata),
              user?.id || null,
              user?.name || user?.email || "Unknown",
            ]
          );
          edge = edgeResult.rows[0];
        }

        const historyResult = await db.query(
          `
            INSERT INTO action_history (
              project_id,
              view_id,
              snapshot_id,
              provenance_node_id,
              provenance_edge_id,
              action_type,
              action_intent,
              action_summary,
              actor_user_id,
              actor_name,
              metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `,
          [
            resolvedProjectId,
            view.id,
            snapshot.id,
            node.id,
            edge?.id || null,
            actionType,
            actionIntent || null,
            actionSummary || actionType,
            user?.id || null,
            user?.name || user?.email || "Unknown",
            JSON.stringify(metadata),
          ]
        );

        await db.query("COMMIT");

        return {
          snapshot,
          node,
          edge,
          history: historyResult.rows[0],
        };
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    }, client);
  }

  async listHistory(projectId, { viewId = null, limit = 50, offset = 0 } = {}) {
    return this._withClient(async (db) => {
      const values = [projectId];
      let paramIndex = 2;
      let whereClause = "WHERE h.project_id = $1";

      if (viewId) {
        whereClause += ` AND h.view_id = $${paramIndex++}`;
        values.push(viewId);
      }

      values.push(limit, offset);
      const result = await db.query(
        `
          SELECT
            h.*,
            s.name AS snapshot_name
          FROM action_history h
          LEFT JOIN analysis_snapshots s ON s.id = h.snapshot_id
          ${whereClause}
          ORDER BY h.created_at DESC
          LIMIT $${paramIndex++}
          OFFSET $${paramIndex}
        `,
        values
      );

      return result.rows;
    });
  }

  async getGraph(projectId, { viewId = null } = {}) {
    return this._withClient(async (db) => {
      const values = [projectId];
      let nodeWhere = "WHERE project_id = $1";
      let edgeWhere = "WHERE project_id = $1";

      if (viewId) {
        values.push(viewId);
        nodeWhere += " AND view_id = $2";
        edgeWhere += " AND view_id = $2";
      }

      const [nodesResult, edgesResult] = await Promise.all([
        db.query(
          `
            SELECT *
            FROM provenance_nodes
            ${nodeWhere}
            ORDER BY created_at ASC
          `,
          values
        ),
        db.query(
          `
            SELECT *
            FROM provenance_edges
            ${edgeWhere}
            ORDER BY created_at ASC
          `,
          values
        ),
      ]);

      return {
        nodes: nodesResult.rows,
        edges: edgesResult.rows,
      };
    });
  }

  async listSnapshots(projectId, { viewId = null, limit = 100, offset = 0 } = {}) {
    return this._withClient(async (db) => {
      const values = [projectId];
      let whereClause = "WHERE project_id = $1";
      let paramIndex = 2;

      if (viewId) {
        whereClause += ` AND view_id = $${paramIndex++}`;
        values.push(viewId);
      }

      values.push(limit, offset);

      const result = await db.query(
        `
          SELECT *
          FROM analysis_snapshots
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++}
          OFFSET $${paramIndex}
        `,
        values
      );

      return result.rows;
    });
  }

  async getSnapshot(projectId, snapshotId, client = null) {
    return this._withClient(async (db) => {
      const result = await db.query(
        `
          SELECT *
          FROM analysis_snapshots
          WHERE project_id = $1 AND id = $2
          LIMIT 1
        `,
        [projectId, snapshotId]
      );

      return result.rows[0] || null;
    }, client);
  }

  async restoreSnapshot({ projectId, snapshotId, user }) {
    return this._withClient(async (db) => {
      const snapshot = await this.getSnapshot(projectId, snapshotId, db);
      if (!snapshot) {
        throw new Error("Snapshot not found");
      }

      const snapshotData = snapshot.snapshot_data || {};
      const viewState = snapshotData.state || {};

      const updatedViewResult = await db.query(
        `
          UPDATE view_configurations
          SET
            camera = $1,
            filters = $2,
            widgets = $3,
            color_maps = $4,
            annotation_display = $5,
            annotations_visible = $6,
            links = $7,
            broadcast = $8,
            following = $9,
            applied_presets = $10,
            updated_at = NOW()
          WHERE id = $11 AND project_id = $12
          RETURNING *
        `,
        [
          JSON.stringify(viewState.camera ?? null),
          JSON.stringify(viewState.filters ?? []),
          JSON.stringify(viewState.widgets ?? []),
          JSON.stringify(viewState.color_maps ?? null),
          JSON.stringify(viewState.annotation_display ?? null),
          viewState.annotations_visible ?? true,
          JSON.stringify(viewState.links ?? {}),
          JSON.stringify(viewState.broadcast ?? null),
          JSON.stringify(viewState.following ?? null),
          JSON.stringify(viewState.applied_presets ?? []),
          snapshot.view_id,
          projectId,
        ]
      );

      if (updatedViewResult.rows.length === 0) {
        throw new Error("Snapshot view not found");
      }

      const view = updatedViewResult.rows[0];

      const transition = await this.captureViewTransition({
        projectId,
        view,
        user,
        actionType: "snapshot:restore",
        actionIntent: "restore_state",
        actionSummary: `Restored snapshot "${snapshot.name}"`,
        metadata: {
          restoredSnapshotId: snapshot.id,
          restoredSnapshotName: snapshot.name,
        },
        snapshotName: `${snapshot.name} (Restored)`,
        snapshotDescription: `State restored from snapshot ${snapshot.name}`,
        client: db,
      });

      return {
        restoredFrom: snapshot,
        view,
        ...transition,
      };
    });
  }
}

function createProvenanceService(pool) {
  return new ProvenanceService(pool);
}

module.exports = {
  ProvenanceService,
  createProvenanceService,
  buildSnapshotState,
};
