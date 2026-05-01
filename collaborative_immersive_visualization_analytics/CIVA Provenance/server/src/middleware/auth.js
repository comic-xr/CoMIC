// server/src/middleware/auth.js
// Keycloak JWT validation middleware with development bypass

const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");
const { createLogger } = require("../utils/logger");

const log = createLogger("auth");

// Database pool for user lookups (injected from index.js)
let dbPool = null;

/**
 * Set the database pool for user lookups
 * Called from index.js after pool is created
 */
function setPool(pool) {
  dbPool = pool;
  log.debug("Database pool set for auth middleware");
}

/**
 * Look up user in database by external_id (Keycloak UUID)
 * Returns the database user with proper internal ID
 */
async function lookupUserByExternalId(externalId, email, name) {
  if (!dbPool) {
    log.warn("Database pool not set, skipping user lookup");
    return null;
  }

  try {
    // First try to find by external_id
    let result = await dbPool.query(
      "SELECT id, external_id, email, display_name FROM users WHERE external_id = $1",
      [externalId]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      log.debug(`Found user by external_id: ${user.id} (${user.email})`);
      return user;
    }

    // Try by email as fallback
    result = await dbPool.query(
      "SELECT id, external_id, email, display_name FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Update external_id if it was missing
      if (!user.external_id) {
        await dbPool.query(
          "UPDATE users SET external_id = $1 WHERE id = $2",
          [externalId, user.id]
        );
        log.info(`Updated external_id for user ${user.email}`);
      }
      log.debug(`Found user by email: ${user.id} (${user.email})`);
      return user;
    }

    // User doesn't exist - create them
    log.info(`Creating new user: ${email} (external_id: ${externalId})`);
    result = await dbPool.query(
      `INSERT INTO users (external_id, email, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, external_id, email, display_name`,
      [externalId, email, name || email.split("@")[0]]
    );

    return result.rows[0];
  } catch (err) {
    log.error("Failed to lookup/create user:", err.message);
    return null;
  }
}

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || null;
const INTERNAL_PATH_PREFIXES = [
  "/api/compute/internal",
  "/api/compute/workers",
  "/api/vr/preprocessing/internal",
  "/api/thumbnails/callback",
];

// Keycloak configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "cia-web";

// Allow tokens from both Docker internal hostname and localhost (browser)
// This is needed because browser gets tokens from localhost:8080 but server
// runs inside Docker where Keycloak is accessed via the service name
const ALLOWED_ISSUERS = [
  `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  `http://localhost:8080/realms/${KEYCLOAK_REALM}`,
  `http://keycloak:8080/realms/${KEYCLOAK_REALM}`,
].filter((v, i, a) => a.indexOf(v) === i); // dedupe

// Development bypass - allows testing without Keycloak
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === "development" &&
  process.env.DEV_BYPASS_AUTH === "true";

// Mock user for development bypass (defaults to CIA Admin)
// System user (000001) is reserved for automated processes
const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000002",
  externalId: "cia-admin",
  email: "admin@cia-web.local",
  name: "CIA Admin",
  roles: ["user", "admin"],
};

function isAuthDisabled() {
  // Current collaboration builds allow fallback auth when Keycloak bypass
  // is not explicitly enabled. Keep write/read middleware behavior aligned.
  return !DEV_BYPASS_AUTH;
}

function getFallbackUser(req) {
  const userId = req.get("x-user-id") || DEV_USER.id;
  const userName = req.get("x-user-name") || DEV_USER.name;
  const userEmail = req.get("x-user-email") || DEV_USER.email;

  return {
    id: userId,
    externalId: userId,
    email: userEmail,
    name: userName,
    roles: DEV_USER.roles,
  };
}

async function resolveFallbackUser(req) {
  const fallbackUser = getFallbackUser(req);
  const dbUser = await lookupUserByExternalId(
    fallbackUser.externalId,
    fallbackUser.email,
    fallbackUser.name
  );

  if (!dbUser) {
    log.warn(
      `Falling back to header-based user without database mapping: ${fallbackUser.externalId}`
    );
    return fallbackUser;
  }

  return {
    id: dbUser.id,
    externalId: fallbackUser.externalId,
    email: dbUser.email || fallbackUser.email,
    // Keep the live collaboration display name from the request when present.
    name: fallbackUser.name || dbUser.display_name || dbUser.email || DEV_USER.name,
    roles: fallbackUser.roles,
  };
}

/**
 * Get user ID from request
 */
function getUserId(req) {
  if (req.user?.id) return req.user.id;
  
  if (DEV_BYPASS_AUTH) {
    const userId = req.get("x-user-id") || DEV_USER.id;
    if (typeof userId === "object") {
      log.warn("getUserId received object instead of string");
      return userId.id || DEV_USER.id;
    }
    return userId;
  }
  return null;
}

/**
 * Get full user info from request
 */
function getUser(req) {
  if (req.user) return req.user;
  
  if (DEV_BYPASS_AUTH) {
    return {
      id: getUserId(req),
      email: req.get("x-user-email") || DEV_USER.email,
      name: req.get("x-user-name") || DEV_USER.name,
    };
  }
  return null;
}

/**
 * Check if user has access to project
 * @returns {string|null} User's role or null if no access
 */
async function checkProjectAccess(pool, projectId, userId) {
  const result = await pool.query(
    `SELECT pm.role FROM projects p
     LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
     WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id IS NOT NULL)`,
    [projectId, userId]
  );
  return result.rows.length > 0 ? result.rows[0].role : null;
}

/**
 * Check if user is a member of a project (ignores public visibility)
 * @returns {string|null} User's role or null if no membership
 */
async function checkProjectMembership(pool, projectId, userId) {
  const result = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return result.rows.length > 0 ? result.rows[0].role : null;
}

/**
 * Get workspace IDs user can access in a project
 */
async function getUserWorkspaceIds(pool, projectId, userId) {
  const result = await pool.query(
    `SELECT w.id FROM workspaces w
     LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE w.project_id = $1
       AND (w.owner_id = $2 OR wm.user_id = $2 OR w.type = 'project')`,
    [projectId, userId]
  );
  return result.rows.map((r) => r.id);
}

/**
 * Extract full user info from request
 */
function getUserInfo(req) {
  if (req.user) {
    return req.user;
  }

  if (DEV_BYPASS_AUTH) {
    return {
      id: getUserId(req),
      email: req.headers["x-user-email"] || DEV_USER.email,
      name: req.headers["x-user-name"] || DEV_USER.name,
    };
  }

  return null;
}

// JWKS client for fetching Keycloak public keys
const jwksClient = jwksRsa({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

// Get signing key from JWKS
function getKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 * In dev bypass mode, uses mock user (from headers if provided)
 */
async function authenticate(req, res, next) {
  // Development bypass
  if (DEV_BYPASS_AUTH) {
    const fallbackUser = await resolveFallbackUser(req);
    log.debug(`Dev bypass mode - using user: ${fallbackUser.name}`);
    req.user = fallbackUser;
    return next();
  }

  // Token authentication disabled - allow all requests
  // All users connect as default dev user for collaboration
  log.debug("Authentication disabled - using fallback user for all requests");
  req.user = await resolveFallbackUser(req);
  return next();
}

// Old JWT verification logic disabled - keeping only for reference if needed later
async function verifyJwtTokenDisabled(token) {
  // JWT verification disabled to allow collaboration without Keycloak
  return DEV_USER;
}

/**
 * Verify a JWT access token and return normalized user info
 */
async function verifyJwtToken(token) {
  if (!token) {
    throw new Error("Missing access token");
  }

  const decoded = await new Promise((resolve, reject) => {
    // Don't validate issuer in jwt.verify - we'll check it manually
    // This allows tokens from both localhost:8080 (browser) and keycloak:8080 (docker)
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
      },
      (err, verified) => {
        if (err) reject(err);
        else resolve(verified);
      }
    );
  });

  // Manually validate issuer against allowed list
  if (!decoded.iss || !ALLOWED_ISSUERS.includes(decoded.iss)) {
    throw new Error(`jwt issuer invalid. expected: ${ALLOWED_ISSUERS.join(' or ')}`);
  }

  const externalId = decoded.sub;
  const email = decoded.email;
  const name = decoded.name || decoded.preferred_username;
  const roles = decoded.realm_access?.roles || [];

  // Look up user in database to get internal ID
  const dbUser = await lookupUserByExternalId(externalId, email, name);

  if (dbUser) {
    log.debug(`Mapped Keycloak user ${externalId} to database user ${dbUser.id}`);
    return {
      id: dbUser.id,           // Use database ID for authorization
      externalId: externalId,  // Keep Keycloak ID for reference
      email: dbUser.email,
      name: dbUser.display_name,
      roles,
      token,
    };
  }

  // Fallback if database lookup fails (shouldn't happen normally)
  log.warn(`Database lookup failed for user ${externalId}, using Keycloak ID`);
  return {
    id: externalId,
    externalId: externalId,
    email,
    name,
    roles,
    token,
  };
}

/**
 * Require auth (or internal token) for write methods
 */
async function requireWriteAuth(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  if (req.user) {
    return next();
  }

  if (isAuthDisabled()) {
    req.user = await resolveFallbackUser(req);
    return next();
  }

  if (INTERNAL_API_TOKEN) {
    const internalToken = req.get("x-internal-token");
    if (
      internalToken &&
      internalToken === INTERNAL_API_TOKEN &&
      INTERNAL_PATH_PREFIXES.some((prefix) =>
        req.originalUrl.startsWith(prefix)
      )
    ) {
      req.isInternalRequest = true;
      return next();
    }
  }

  log.debug(`requireWriteAuth: Rejecting ${req.method} ${req.path} - no user`);
  return res.status(401).json({ error: "Authentication required" });
}

/**
 * Optional authentication - populates req.user if token present
 * Useful for endpoints that work both authenticated and anonymously
 */
async function optionalAuth(req, res, next) {
  // In dev bypass, always set user (from headers if provided)
  if (DEV_BYPASS_AUTH) {
    req.user = await resolveFallbackUser(req);
    return next();
  }

  if (isAuthDisabled()) {
    req.user = await resolveFallbackUser(req);
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    log.debug(`Optional auth: No auth header for ${req.method} ${req.path}, using local dev fallback`);

    const userId = req.get("x-user-id");
    const userName = req.get("x-user-name");
    const userEmail = req.get("x-user-email");

    if (userId && userName) {
      req.user = await resolveFallbackUser(req);
    } else {
      req.user = await resolveFallbackUser(req);
    }

    return next();
  }

  // Try to verify token directly (don't use authenticate which sends 401 on failure)
  const token = authHeader.substring(7);
  try {
    req.user = await verifyJwtToken(token);
    log.debug(`Optional auth succeeded for user ${req.user.id}`);
  } catch (error) {
    log.debug(`Optional auth failed (continuing without user): ${error.message}`);
    req.user = null;
  }
  next();
}

/**
 * Require specific role
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: role,
      });
    }

    next();
  };
}

// Log auth mode on startup
if (DEV_BYPASS_AUTH) {
  log.info("Development bypass mode ENABLED");
} else {
  log.info("Keycloak authentication enabled");
  log.debug("Keycloak URL:", KEYCLOAK_URL);
  log.debug("Realm:", KEYCLOAK_REALM);
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  getUserId,
  getUser,
  checkProjectAccess,
  checkProjectMembership,
  getUserWorkspaceIds,
  DEV_BYPASS_AUTH,
  verifyJwtToken,
  requireWriteAuth,
  setPool,
};
