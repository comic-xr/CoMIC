const express = require("express");
const { AccessToken } = require("livekit-server-sdk");
const cors = require("cors");
const { createLogger } = require("./server/src/utils/logger");
const { DEV_BYPASS_AUTH, verifyJwtToken } = require("./server/src/middleware/auth");

const log = createLogger("server");

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

async function requireAuth(req, res, next) {
  const authDisabled = !DEV_BYPASS_AUTH;

  if (DEV_BYPASS_AUTH || authDisabled) {
    req.user = {
      id:
        req.get("x-user-id") ||
        req.body?.userId ||
        "00000000-0000-0000-0000-000000000002",
      name:
        req.get("x-user-name") ||
        req.body?.userName ||
        "CIA Admin",
      email:
        req.get("x-user-email") ||
        req.body?.userEmail ||
        "admin@cia-web.local",
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const token = authHeader.substring(7);
    req.user = await verifyJwtToken(token);
    return next();
  } catch (error) {
    log.warn("Token server auth failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ⚠️ WARNING: These are development-only credentials!
// "devkey" and "secret" are LiveKit's default dev mode keys.
// For production, use environment variables with real credentials:
//   export LIVEKIT_API_KEY="your-real-key"
//   export LIVEKIT_API_SECRET="your-real-secret"
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

app.post("/token", requireAuth, async (req, res) => {
  try {
    const { roomName, userName } = req.body;
    const tokenUserName = req.user?.name || req.user?.email || req.user?.id;

    // Ensure we have a valid user name (fallback to "User" with timestamp if empty)
    const effectiveName =
      tokenUserName ||
      userName ||
      `User-${Date.now().toString(36).slice(-4)}`;

    log.info("Generating token for user:", effectiveName, "in room:", roomName);
    log.debug("Using API Key:", LIVEKIT_API_KEY);

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: req.user?.id || effectiveName,
      name: effectiveName, // Also set display name
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    log.trace("Token typeof:", typeof token);
    log.trace("Token is string:", typeof token === "string");

    if (typeof token === "string") {
      log.info("Token generated successfully");
      res.json({ token });
    } else {
      log.error("Token is not a string! Type:", typeof token);
      res.status(500).json({ error: "Token generation failed" });
    }
  } catch (error) {
    log.error("Error generating token:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiKey: LIVEKIT_API_KEY,
    authMode: DEV_BYPASS_AUTH ? "dev-bypass" : "fallback-local",
  });
});

const PORT = 3002;
app.listen(PORT, "0.0.0.0", () => {
  log.info("Token server running on port:", PORT);
  log.debug("API Key:", LIVEKIT_API_KEY);
  log.debug("API Secret:", LIVEKIT_API_SECRET ? "[SET]" : "[NOT SET]");
});
