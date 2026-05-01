const { createLogger } = require("../utils/logger");
const log = createLogger("files");

// GET /api/datasets - List all datasets
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        filename,
        storage_key,
        public_path,
        hash,
        point_count,
        bounds,
        uploaded_by,
        uploaded_at,
        mime_type
      FROM datasets
      ORDER BY uploaded_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    log.error("Error listing datasets:", error);
    res.status(500).json({ error: "Failed to list datasets" });
  }
});
