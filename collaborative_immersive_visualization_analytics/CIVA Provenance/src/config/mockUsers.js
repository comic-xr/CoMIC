// src/config/mockUsers.js
// Mock users for development and testing collaboration features
//
// These users match the Keycloak test users and seed-test-users.sql database entries.
// When DEV_BYPASS_AUTH is enabled, the user switcher allows
// switching between these identities.

/**
 * System user - for automated processes, seeding, internal operations
 * Not included in MOCK_USERS as it's not meant for human login
 */
export const SYSTEM_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  externalId: "system",
  email: "system@cia-web.local",
  name: "System",
  shortName: "System",
  avatar: null,
  color: "#64748b", // Slate
  roles: ["system", "admin"],
  department: null,
};

/**
 * Mock users available in development mode
 * These MUST match the Keycloak users in docker/keycloak/realm-export.json
 * Note: System user (000001) is excluded - it's for automated processes only
 * @type {Array<MockUser>}
 */
export const MOCK_USERS = [
  {
    id: "00000000-0000-0000-0000-000000000002",
    externalId: "cia-admin",
    email: "admin@cia-web.local",
    name: "CIA Admin",
    shortName: "Admin",
    avatar: null,
    color: "#6366f1", // Indigo
    roles: ["user", "admin"],
    department: "Administration",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    externalId: "alice",
    email: "alice@cia-web.local",
    name: "Alice Analyst",
    shortName: "Alice",
    avatar: null,
    color: "#ec4899", // Pink
    roles: ["user"],
    department: "Research",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    externalId: "bob",
    email: "bob@cia-web.local",
    name: "Bob Builder",
    shortName: "Bob",
    avatar: null,
    color: "#14b8a6", // Teal
    roles: ["user"],
    department: "Engineering",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    externalId: "viewer",
    email: "viewer@cia-web.local",
    name: "View Only",
    shortName: "Viewer",
    avatar: null,
    color: "#f59e0b", // Amber
    roles: ["viewer"],
    department: null,
  },
];

/**
 * Get a mock user by ID
 * @param {string} userId - User ID
 * @returns {MockUser|undefined}
 */
export function getMockUser(userId) {
  return MOCK_USERS.find((u) => u.id === userId);
}

/**
 * Get a mock user by email
 * @param {string} email - User email
 * @returns {MockUser|undefined}
 */
export function getMockUserByEmail(email) {
  return MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Get default mock user
 * @returns {MockUser}
 */
export function getDefaultMockUser() {
  return MOCK_USERS[0];
}

/**
 * Get initials for a user (for avatar fallback)
 * @param {string} name - Full name
 * @returns {string} Initials (e.g., "AC" for "Alice Chen")
 */
export function getUserInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Storage key for persisting selected mock user.
 *
 * Session storage is used first so separate tabs/windows can act as different
 * users during collaboration testing. Local storage remains a fallback seed for
 * older sessions.
 */
export const MOCK_USER_STORAGE_KEY = "cia_dev_mock_user_id";
export const MOCK_USER_SESSION_STORAGE_KEY = "cia_dev_mock_user_id_session";
export const DEV_USER_QUERY_KEY = "devUser";

const DEV_USER_ALIASES = {
  admin: "00000000-0000-0000-0000-000000000002",
  "cia-admin": "00000000-0000-0000-0000-000000000002",
  alice: "00000000-0000-0000-0000-000000000003",
  bob: "00000000-0000-0000-0000-000000000004",
  viewer: "00000000-0000-0000-0000-000000000005",
};

export function getUrlMockUserId() {
  try {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search);
    const rawValue = params.get(DEV_USER_QUERY_KEY);
    if (!rawValue) return null;

    const normalized = rawValue.trim().toLowerCase();
    const resolvedId = DEV_USER_ALIASES[normalized] || rawValue.trim();
    const userId = getMockUser(resolvedId)?.id || null;

    if (userId) {
      sessionStorage.setItem(MOCK_USER_SESSION_STORAGE_KEY, userId);
    }

    return userId;
  } catch {
    return null;
  }
}

/**
 * Get stored mock user ID (persists across page reloads)
 * @returns {string|null}
 */
export function getStoredMockUserId() {
  try {
    const urlValue = getUrlMockUserId();
    if (urlValue) {
      return urlValue;
    }

    const sessionValue = sessionStorage.getItem(MOCK_USER_SESSION_STORAGE_KEY);
    if (sessionValue) {
      return sessionValue;
    }

    const localValue = localStorage.getItem(MOCK_USER_STORAGE_KEY);
    if (localValue) {
      sessionStorage.setItem(MOCK_USER_SESSION_STORAGE_KEY, localValue);
      return localValue;
    }

    return null;
  } catch {
    return null;
  }
}

export function getResolvedMockUserId() {
  return getStoredMockUserId();
}

export function getResolvedMockUser() {
  const resolvedId = getResolvedMockUserId();
  return (resolvedId && getMockUser(resolvedId)) || getDefaultMockUser();
}

export function resolveAndPersistMockUserId() {
  const resolvedUser = getResolvedMockUser();
  storeMockUserId(resolvedUser.id);
  return resolvedUser.id;
}

/**
 * Store mock user ID
 * @param {string} userId
 */
export function storeMockUserId(userId) {
  try {
    sessionStorage.setItem(MOCK_USER_SESSION_STORAGE_KEY, userId);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear stored mock user ID
 */
export function clearStoredMockUserId() {
  try {
    sessionStorage.removeItem(MOCK_USER_SESSION_STORAGE_KEY);
    localStorage.removeItem(MOCK_USER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export default MOCK_USERS;
