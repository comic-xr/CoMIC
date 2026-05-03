const express = require("express");
const { AccessToken } = require("livekit-server-sdk");

const router = express.Router({ mergeParams: true });

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiKey: LIVEKIT_API_KEY,
  });
});

router.post("/token", async (req, res) => {
  try {
    const { roomName, userName, userId } = req.body || {};
    const requestedRoomName = roomName || "main";
    // Prefer the explicit per-tab identity/name passed by the client so local
    // multi-user testing doesn't collapse participants into one fallback user.
    const effectiveIdentity =
      userId || req.get("x-user-id") || req.user?.id || userName || `user-${Date.now()}`;
    const effectiveName =
      userName || req.get("x-user-name") || req.user?.name || req.user?.email || "Anonymous User";

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: effectiveIdentity,
      name: effectiveName,
    });

    at.addGrant({
      roomJoin: true,
      room: requestedRoomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to generate token" });
  }
});

module.exports = router;
