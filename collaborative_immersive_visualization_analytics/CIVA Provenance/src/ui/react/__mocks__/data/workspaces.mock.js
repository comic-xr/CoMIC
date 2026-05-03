// src/ui/react/__mocks__/data/workspaces.mock.js
// Workspace mock data for LayoutTab and workspace selector Storybook stories
//
// Workspaces are organizational containers for views and instances.
// Types: personal (private), shared (team), project (org-wide)

import { MOCK_USERS } from "./users.mock.js";

/**
 * Mock workspaces matching the Workspace model shape
 */
export const MOCK_WORKSPACES = [
  {
    id: "ws-personal",
    name: "My Workspace",
    description: "Personal analysis workspace",
    type: "personal",
    color: "#60a5fa", // Blue
    members: [MOCK_USERS.current],
    viewCount: 4,
    instanceCount: 2,
    isDefault: true,
    layout: {
      type: "grid",
      columns: 2,
      rows: 2,
    },
    createdBy: MOCK_USERS.current,
    createdAt: "2025-10-01T00:00:00Z",
    updatedAt: "2025-11-28T15:00:00Z",
  },
  {
    id: "ws-radiology-team",
    name: "Radiology Team",
    description: "Shared workspace for radiology department",
    type: "shared",
    color: "#34d399", // Green
    members: [MOCK_USERS.current, MOCK_USERS.drSmith, MOCK_USERS.drJones],
    viewCount: 8,
    instanceCount: 3,
    isDefault: false,
    layout: {
      type: "grid",
      columns: 3,
      rows: 2,
    },
    createdBy: MOCK_USERS.drSmith,
    createdAt: "2025-09-15T10:00:00Z",
    updatedAt: "2025-11-27T09:00:00Z",
  },
  {
    id: "ws-research-project",
    name: "Brain Study 2025",
    description: "Research project workspace",
    type: "project",
    color: "#c084fc", // Purple
    members: [
      MOCK_USERS.current,
      MOCK_USERS.drSmith,
      MOCK_USERS.alexChen,
      MOCK_USERS.emilyDavis,
    ],
    viewCount: 12,
    instanceCount: 4,
    isDefault: false,
    layout: {
      type: "flow",
      direction: "horizontal",
    },
    createdBy: MOCK_USERS.emilyDavis,
    createdAt: "2025-08-01T08:00:00Z",
    updatedAt: "2025-11-26T14:00:00Z",
  },
  {
    id: "ws-teaching",
    name: "Teaching Demo",
    description: "Workspace for student demonstrations",
    type: "shared",
    color: "#fbbf24", // Amber
    members: [MOCK_USERS.current, MOCK_USERS.alexChen],
    viewCount: 3,
    instanceCount: 1,
    isDefault: false,
    layout: {
      type: "single",
    },
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-01T12:00:00Z",
    updatedAt: "2025-11-20T16:00:00Z",
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get workspace by ID
 */
export function getWorkspaceById(workspaceId) {
  return MOCK_WORKSPACES.find((w) => w.id === workspaceId);
}

/**
 * Get workspaces by type
 */
export function getWorkspacesByType(type) {
  return MOCK_WORKSPACES.filter((w) => w.type === type);
}

/**
 * Get workspaces the current user is a member of
 */
export function getUserWorkspaces(userId = MOCK_USERS.current.id) {
  return MOCK_WORKSPACES.filter((w) => w.members.some((m) => m.id === userId));
}

/**
 * Get the default workspace
 */
export function getDefaultWorkspace() {
  return MOCK_WORKSPACES.find((w) => w.isDefault) || MOCK_WORKSPACES[0];
}

// =============================================================================
// WORKSPACE TYPE CONFIG (for UI rendering)
// =============================================================================

export const WORKSPACE_TYPE_CONFIG = {
  personal: {
    name: "Personal",
    icon: "user",
    color: "#60a5fa",
    description: "Private workspace, only visible to you",
  },
  shared: {
    name: "Shared",
    icon: "users",
    color: "#34d399",
    description: "Shared with selected team members",
  },
  project: {
    name: "Project",
    icon: "folderKanban",
    color: "#c084fc",
    description: "Organization-wide project workspace",
  },
};
