// server/src/middleware/validateUUID.js
// Reusable UUID validation middleware

const { createLogger } = require("../utils/logger");
const log = createLogger("validation");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if string is valid UUID
 */
function isValidUUID(id) {
  return id && typeof id === "string" && UUID_REGEX.test(id);
}

/**
 * Create middleware that validates a specific param is a UUID
 * @param {string} paramName - Name of the param to validate
 * @param {string} [friendlyName] - Human-readable name for error messages
 */
function validateUUIDParam(paramName, friendlyName = paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!isValidUUID(value)) {
      log.warn(`Invalid ${friendlyName} format: ${value}`);
      return res.status(400).json({
        error: `Invalid ${friendlyName} format`,
        message: `${friendlyName} must be a valid UUID`,
        param: paramName,
        received:
          typeof value === "string" ? value.substring(0, 50) : typeof value,
      });
    }

    next();
  };
}

/**
 * Validate projectId param
 */
const validateProjectId = validateUUIDParam("projectId", "project ID");

/**
 * Validate roomId param
 */
const validateRoomId = validateUUIDParam("roomId", "room ID");

/**
 * Validate userId from headers or params
 */
function validateUserId(req, res, next) {
  const { getUserId } = require("./auth");
  const userId = getUserId(req);

  if (!isValidUUID(userId)) {
    log.warn(`Invalid userId format: ${userId}`);
    return res.status(400).json({
      error: "Invalid user ID format",
      message: "User ID must be a valid UUID",
      hint: "Ensure x-user-id header contains a valid UUID string",
    });
  }

  next();
}

module.exports = {
  isValidUUID,
  validateUUIDParam,
  validateProjectId,
  validateRoomId,
  validateUserId,
};
