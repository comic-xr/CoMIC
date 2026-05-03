// src/ui/react/__mocks__/data/users.mock.js
// Shared user mock data used across all Storybook stories
//
// This provides consistent user data for:
// - People panels
// - File ownership
// - Room members
// - Presence indicators

/**
 * Individual user objects with full profile data
 */
export const MOCK_USERS = {
  current: {
    id: "current-user",
    name: "You",
    email: "you@example.com",
    color: "#2dd4bf",
    avatar: null,
    role: "admin",
    status: "online",
  },
  drSmith: {
    id: "user-smith",
    name: "Dr. Sarah Smith",
    email: "sarah@hospital.org",
    color: "#fb7185",
    avatar: null,
    role: "member",
    status: "online",
  },
  drJones: {
    id: "user-jones",
    name: "Dr. Michael Jones",
    email: "mjones@hospital.org",
    color: "#fbbf24",
    avatar: null,
    role: "member",
    status: "idle",
  },
  alexChen: {
    id: "user-alex",
    name: "Alex Chen",
    email: "alex@research.edu",
    color: "#60a5fa",
    avatar: null,
    role: "viewer",
    status: "online",
  },
  bobWilson: {
    id: "user-bob",
    name: "Bob Wilson",
    email: "bob@lab.edu",
    color: "#c084fc",
    avatar: null,
    role: "member",
    status: "offline",
  },
  emilyDavis: {
    id: "user-emily",
    name: "Dr. Emily Davis",
    email: "emily@hospital.org",
    color: "#34d399",
    avatar: null,
    role: "admin",
    status: "online",
  },
};

/**
 * Array of all users (excluding current)
 */
export const MOCK_OTHER_USERS = [
  MOCK_USERS.drSmith,
  MOCK_USERS.drJones,
  MOCK_USERS.alexChen,
  MOCK_USERS.bobWilson,
  MOCK_USERS.emilyDavis,
];

/**
 * Array of all users including current
 */
export const MOCK_ALL_USERS = [MOCK_USERS.current, ...MOCK_OTHER_USERS];

/**
 * Online users for presence display
 */
export const MOCK_ONLINE_USERS = MOCK_ALL_USERS.filter(
  (u) => u.status === "online"
);

/**
 * Get a random subset of users (for story variations)
 * @param {number} count - Number of users to return
 * @param {boolean} includeCurrentUser - Whether to include current user
 */
export function getRandomUsers(count = 3, includeCurrentUser = false) {
  const pool = includeCurrentUser ? MOCK_ALL_USERS : MOCK_OTHER_USERS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

/**
 * User presence data for workspace/room display
 */
export const MOCK_PRESENCE = {
  workspace: [
    {
      ...MOCK_USERS.current,
      cursorVisible: true,
      cursorPosition: { x: 100, y: 200 },
    },
    {
      ...MOCK_USERS.drSmith,
      cursorVisible: true,
      cursorPosition: { x: 300, y: 150 },
    },
    { ...MOCK_USERS.alexChen, cursorVisible: false, cursorPosition: null },
  ],
  room: [
    { ...MOCK_USERS.current, inVoice: true, isMuted: false, isSpeaking: false },
    { ...MOCK_USERS.drSmith, inVoice: true, isMuted: true, isSpeaking: false },
    {
      ...MOCK_USERS.drJones,
      inVoice: false,
      isMuted: false,
      isSpeaking: false,
    },
    { ...MOCK_USERS.alexChen, inVoice: true, isMuted: false, isSpeaking: true },
  ],
};
