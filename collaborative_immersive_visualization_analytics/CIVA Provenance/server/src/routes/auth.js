// server/src/routes/auth.js
// Authentication endpoints

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { createLogger } = require("../utils/logger");

const log = createLogger("auth");

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      externalId: req.user.externalId,
      email: req.user.email,
      name: req.user.name,
      roles: req.user.roles,
    });
  } catch (error) {
    log.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * GET /api/auth/status
 * Check authentication status (no auth required)
 */
router.get("/status", (req, res) => {
  const { DEV_BYPASS_AUTH } = require("../middleware/auth");

  res.json({
    authenticated: false, // Will be true if token provided
    devBypassEnabled: DEV_BYPASS_AUTH,
    keycloakUrl: process.env.KEYCLOAK_URL || "http://localhost:8080",
    realm: process.env.KEYCLOAK_REALM || "cia-web",
  });
});

module.exports = router;
