// In src/core/instances/InstanceStates.js
export const InstanceStatus = {
  ACTIVE: "active", // Currently being viewed by owner
  SHARED_ACTIVE: "shared_active", // Being viewed by collaborators
  INACTIVE: "inactive", // Exists but no one viewing
  SAVED: "saved", // Explicitly saved for later
  EPHEMERAL: "ephemeral", // Temporary, can be auto-deleted
};
