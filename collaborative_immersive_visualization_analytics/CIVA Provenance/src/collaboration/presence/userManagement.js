import { generateUserId } from "@Utils/idGenerator.js";
import { presence as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import { authService } from "@Services/authService.js";
import { getResolvedMockUser, getResolvedMockUserId } from "@Config/mockUsers.js";

// Initialize or retrieve per-tab user ID from sessionStorage
// IMPORTANT: sessionStorage is per-tab, so each tab gets DIFFERENT ID
let userId = null;
let tabOwnerId = null;

try {
  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    const forceFreshInviteIdentity = searchParams.get("inviteFresh") === "1";

    if (forceFreshInviteIdentity) {
      sessionStorage.removeItem("cia_user_id");
      sessionStorage.removeItem("cia_user_tab_owner");
      sessionStorage.removeItem("cia_username");
      sessionStorage.removeItem("cia_username_custom");
    }

    // Duplicated tabs can inherit both sessionStorage and window.name.
    // Stamp a fresh CIA tab owner on each page load so every browser context
    // gets a distinct presence identity after refresh/reopen.
    window.name = `cia-tab-${generateUserId()}`;

    tabOwnerId = window.name;
    const storedOwner = sessionStorage.getItem("cia_user_tab_owner");
    const storedUserId = sessionStorage.getItem("cia_user_id");

    if (!storedUserId || storedOwner !== tabOwnerId) {
      userId = generateUserId();
      sessionStorage.setItem("cia_user_id", userId);
      sessionStorage.setItem("cia_user_tab_owner", tabOwnerId);
      console.log("[CIA] Generated new per-tab user ID:", userId);
    } else {
      userId = storedUserId;
      console.log("[CIA] Retrieved existing per-tab user ID:", userId);
    }
  }
} catch (e) {
  // Fallback if sessionStorage fails
  userId = generateUserId();
  console.log("[CIA] SessionStorage error, using generated ID:", userId);
}

if (!userId) {
  userId = generateUserId();
  console.log("[CIA] Fallback: Generated new user ID:", userId);
}

// Display name (can be changed, stored in sessionStorage for per-tab)
let userName = sessionStorage.getItem("cia_username");
let userColor = null;

function hasCustomSessionIdentity() {
  if (typeof window === "undefined") return false;
  const stored = sessionStorage.getItem("cia_username");
  const isCustom = sessionStorage.getItem("cia_username_custom") === "true";
  return Boolean(stored && isCustom);
}

function isMockUserMode() {
  return authService.isDevMode?.() ||
    config.devBypassAuth === true ||
    config.devBypassAuth === "true";
}

export function isDevPresenceMode() {
  return isMockUserMode() || hasCustomSessionIdentity();
}

export function getUserId() {
  // In local collaboration mode, use the sessionStorage ID for per-tab uniqueness
  if (isMockUserMode() || hasCustomSessionIdentity()) {
    return userId;  // sessionStorage-based, per-tab
  }
  const authUser = authService.getUser?.();
  if (authUser?.id) {
    return authUser.id;
  }
  return userId;
}

export function getUserName() {
  // If user entered a name, use it
  if (userName) {
    return userName;
  }

  // In dev mode, use short sessionStorage ID as display name (per-tab unique)
  if (isMockUserMode()) {
    // Show unique identifier per tab: "user-abc1d..."
    return userId.substring(0, 16);
  }

  const authUser = authService.getUser?.();
  if (authUser) {
    return (
      authUser.name ||
      authUser.username ||
      authUser.email?.split("@")[0]
    );
  }

  return userId.substring(0, 16);  // Fallback to user id
}

export function getUserEmail() {
  if (isMockUserMode()) {
    return getResolvedMockUser().email;
  }
  const authUser = authService.getUser?.();
  if (authUser?.email) {
    return authUser.email;
  }
  return null;
}

// Check if username is set
export function hasUserName() {
  if (typeof window !== "undefined") {
    const forceFreshInviteIdentity =
      new URLSearchParams(window.location.search).get("inviteFresh") === "1";
    if (forceFreshInviteIdentity) {
      return false;
    }
  }

  if (isMockUserMode()) {
    return true;
  }
  return !!userName;
}

// Called by React modal to set the username
export function setUserName(name) {
  userName = name;
  userColor = getUserColor();

  log.debug(`Username set: ${userName}`);

  // Store for this session/tab
  sessionStorage.setItem("cia_username", userName);
  sessionStorage.setItem("cia_username_custom", "true");
}

// Check if username exists, but DON'T block if it doesn't
export async function setupUserName() {
  if (isMockUserMode()) {
    const stored = sessionStorage.getItem("cia_username");
    const isCustom = sessionStorage.getItem("cia_username_custom") === "true";
    if (stored && isCustom) {
      userName = stored;
      userColor = getUserColor();
      log.debug(`Username loaded from custom dev session: ${userName}`);
      return true;
    }

    const mockUser = getResolvedMockUser();
    userName = mockUser.name;
    userColor = getUserColor(mockUser.id);
    sessionStorage.setItem("cia_username", userName);
    sessionStorage.removeItem("cia_username_custom");
    log.debug(`Username resolved from dev user: ${userName}`);
    return true;
  }

  // Try to load from sessionStorage
  const stored = sessionStorage.getItem("cia_username");
  if (stored) {
    userName = stored;
    userColor = getUserColor();
    log.debug(`Username loaded from session: ${userName}`);
    return true; // Username ready
  }

  // No username yet - React modal will handle it
  log.debug(`No username in session - modal will prompt`);
  return false; // Username not ready (but don't block)
}

// Allow changing username later
export function changeUserName() {
  sessionStorage.removeItem("cia_username");
  sessionStorage.removeItem("cia_username_custom");
  userName = null;
  // Reload to show modal again
  window.location.reload();
}

export function clearUserName() {
  userName = null;
  sessionStorage.removeItem("cia_username");
  sessionStorage.removeItem("cia_username_custom");
  log.debug("Username cleared from sessionStorage");
}

export function getUserColor(uid = null) {
  const targetId = uid || getUserId();

  // Generate consistent color from user ID
  let hash = 0;
  for (let i = 0; i < targetId.length; i++) {
    hash = targetId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}
