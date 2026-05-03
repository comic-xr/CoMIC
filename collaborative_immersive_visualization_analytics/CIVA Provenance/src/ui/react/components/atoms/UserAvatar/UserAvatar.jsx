/**
 * @file UserAvatar.jsx
 * @description Reusable avatar component with initials fallback (Google/Slack style).
 * Displays user avatars as colored circles with initials, supporting various sizes
 * and an optional border variant. Includes UserAvatarGroup for stacked avatar displays.
 *
 * Features:
 * - Automatic initials generation from user name
 * - Consistent color generation from name (deterministic)
 * - Multiple size variants (xs, sm, md, lg)
 * - Border variant for outlined style
 * - Image avatar support with fallback
 * - Avatar group component for overlapping displays
 *
 * @example
 * import { UserAvatar, UserAvatarGroup } from '@UI/react/components/atoms/UserAvatar';
 *
 * // Basic usage
 * <UserAvatar userName="Beth Smith" />
 *
 * // With custom color and size
 * <UserAvatar userName="Claude" color="#9C27B0" size="lg" />
 *
 * // Border variant
 * <UserAvatar userName="Alex" showBorder />
 *
 * // Avatar group
 * <UserAvatarGroup
 *   users={[
 *     { userName: "Beth", userColor: "#F44336" },
 *     { userName: "Claude", userColor: "#2196F3" },
 *   ]}
 *   max={3}
 * />
 */

import React, { memo, useMemo } from "react";
import "./UserAvatar.scss";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default avatar colors used when no color is provided.
 * Colors are selected based on a hash of the user's name for consistency.
 */
const AVATAR_COLORS = [
    "#F44336", // Red
    "#E91E63", // Pink
    "#9C27B0", // Purple
    "#673AB7", // Deep Purple
    "#3F51B5", // Indigo
    "#2196F3", // Blue
    "#03A9F4", // Light Blue
    "#00BCD4", // Cyan
    "#009688", // Teal
    "#4CAF50", // Green
    "#8BC34A", // Light Green
    "#CDDC39", // Lime
    "#FFC107", // Amber
    "#FF9800", // Orange
    "#FF5722", // Deep Orange
];

/**
 * Size configuration for avatars
 */
const SIZE_CONFIG = {
    xs: { size: 20, font: 9 },
    sm: { size: 28, font: 11 },
    md: { size: 36, font: 14 },
    lg: { size: 48, font: 18 },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate initials from a name.
 * - "Beth Smith" → "BS"
 * - "Claude" → "CL"
 * - "A" → "A"
 *
 * @param {string} name - User's display name
 * @returns {string} 1-2 character initials
 */
function getInitials(name) {
    if (!name) return "?";

    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

/**
 * Generate a consistent color from a name using simple hash.
 * Same name always produces same color.
 *
 * @param {string} name - User's display name
 * @returns {string} Hex color from AVATAR_COLORS
 */
function getColorFromName(name) {
    if (!name) return AVATAR_COLORS[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Determine if text should be light or dark based on background color.
 * Uses relative luminance calculation for accessibility.
 *
 * @param {string} hexColor - Background color in hex format
 * @returns {string} "#1a1a1a" for light backgrounds, "#ffffff" for dark
 */
function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace("#", "");

    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance (WCAG formula)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Return dark text for light backgrounds, light text for dark
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * @typedef {Object} UserAvatarProps
 * @property {string} userName - User's display name (used for initials)
 * @property {string} [color] - Custom background color (hex). If not provided, generated from name
 * @property {'xs'|'sm'|'md'|'lg'} [size='sm'] - Size variant
 * @property {boolean} [showBorder=false] - Show as border-only style
 * @property {string} [imageUrl] - Optional image URL (falls back to initials on error)
 * @property {string} [className=''] - Additional CSS classes
 * @property {Object} [style] - Additional inline styles
 */

/**
 * @typedef {Object} UserAvatarGroupProps
 * @property {Array<{userName: string, userColor?: string, clientId?: string, odbc?: string}>} users - Array of user objects
 * @property {number} [max=3] - Maximum avatars to show before "+N" overflow
 * @property {'xs'|'sm'|'md'|'lg'} [size='sm'] - Size variant for all avatars
 * @property {string} [className=''] - Additional CSS classes
 */

// =============================================================================
// USERAVATAR COMPONENT
// =============================================================================

/**
 * UserAvatar Component
 *
 * Displays a user avatar as a colored circle with initials.
 * Supports custom colors, multiple sizes, and border variants.
 *
 * @param {UserAvatarProps} props - Component props
 * @returns {React.ReactElement} The rendered avatar
 */
function UserAvatar({
    userName,
    color,
    size = "sm",
    showBorder = false,
    imageUrl,
    className = "",
    style,
}) {
    // Memoize computed values for performance
    const initials = useMemo(() => getInitials(userName), [userName]);

    const backgroundColor = useMemo(
        () => color || getColorFromName(userName),
        [color, userName]
    );

    const textColor = useMemo(
        () => getContrastColor(backgroundColor),
        [backgroundColor]
    );

    // Size class
    const sizeClass = `user-avatar--${size}`;

    // Image avatar variant
    if (imageUrl) {
        return (
            <div
                className={`user-avatar ${sizeClass} user-avatar--image ${className}`}
                style={{
                    ...(showBorder ? { borderColor: backgroundColor } : {}),
                    ...style,
                }}
                title={userName}
            >
                <img
                    src={imageUrl}
                    alt={`${userName}'s avatar`}
                    onError={(e) => {
                        // Hide image and show fallback initials on load error
                        e.target.style.display = "none";
                    }}
                />
                {/* Fallback initials (shown if image fails) */}
                <span
                    className="user-avatar__fallback"
                    style={{ backgroundColor, color: textColor }}
                >
                    {initials}
                </span>
            </div>
        );
    }

    // Initials avatar (default)
    return (
        <div
            className={`user-avatar ${sizeClass} ${showBorder ? "user-avatar--border" : ""} ${className}`}
            style={{
                ...(showBorder
                    ? { borderColor: backgroundColor, backgroundColor: "transparent" }
                    : { backgroundColor }),
                ...style,
            }}
            title={userName}
        >
            <span
                className="user-avatar__initials"
                style={{ color: showBorder ? backgroundColor : textColor }}
            >
                {initials}
            </span>
        </div>
    );
}

// =============================================================================
// USERAVATARGROUP COMPONENT
// =============================================================================

/**
 * UserAvatarGroup Component
 *
 * Displays a stack of overlapping avatars with an overflow indicator.
 * Commonly used in presence displays and participant lists.
 *
 * @param {UserAvatarGroupProps} props - Component props
 * @returns {React.ReactElement} The rendered avatar group
 */
function UserAvatarGroup({
    users = [],
    max = 3,
    size = "sm",
    className = "",
}) {
    const visibleUsers = users.slice(0, max);
    const remainingCount = Math.max(0, users.length - max);

    return (
        <div className={`user-avatar-group ${className}`}>
            {visibleUsers.map((user, index) => (
                <UserAvatar
                    key={user.clientId || user.odbc || user.userId || index}
                    userName={user.userName}
                    color={user.userColor}
                    size={size}
                    className="user-avatar-group__item"
                    style={{ zIndex: visibleUsers.length - index }}
                />
            ))}
            {remainingCount > 0 && (
                <div
                    className={`user-avatar-group__overflow user-avatar--${size}`}
                    title={`${remainingCount} more user${remainingCount > 1 ? "s" : ""}`}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

// Memoize for performance (avatars often appear in lists)
const MemoizedUserAvatar = memo(UserAvatar);
const MemoizedUserAvatarGroup = memo(UserAvatarGroup);

export {
    MemoizedUserAvatar as UserAvatar,
    MemoizedUserAvatarGroup as UserAvatarGroup,
    // Export helpers for external use if needed
    getInitials,
    getColorFromName,
    getContrastColor,
    AVATAR_COLORS,
    SIZE_CONFIG,
};

export default MemoizedUserAvatar;