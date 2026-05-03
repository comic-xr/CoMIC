// src/ui/react/components/dev/DevUserSwitcher.jsx
// Development-only component for switching between mock users
//
// This component provides a dropdown to switch between test users
// for collaboration testing. Only renders in dev mode.
//
// Place this in the Header for easy access.

import React, { useState, useRef, useEffect, memo } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { useDevUser } from "@UI/react/context/DevUserContext.jsx";
import { getUserInitials } from "@Config/mockUsers.js";
import "./DevUserSwitcher.scss";

// =============================================================================
// AVATAR COMPONENT
// =============================================================================

const UserAvatar = memo(function UserAvatar({ user, size = "md" }) {
    const initials = getUserInitials(user.name);

    return (
        <div
            className={`dev-user-avatar dev-user-avatar--${size}`}
            style={{ "--user-color": user.color }}
            title={user.name}
        >
            {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
            ) : (
                <span className="dev-user-avatar__initials">{initials}</span>
            )}
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const DevUserSwitcher = memo(function DevUserSwitcher({
    showLabel = true,
    compact = false,
    className = "",
}) {
    const { isDevMode, currentUser, allUsers, switchUser } = useDevUser();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen]);

    // Don't render in production
    if (!isDevMode) return null;

    const handleSelectUser = (userId) => {
        if (userId !== currentUser?.id) {
            switchUser(userId);
            // Reload the page to reinitialize with new user context
            // This ensures all managers pick up the new user ID
            window.location.reload();
        }
        setIsOpen(false);
    };

    const rootClasses = [
        "dev-user-switcher",
        compact && "dev-user-switcher--compact",
        isOpen && "dev-user-switcher--open",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={rootClasses} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                className="dev-user-switcher__trigger"
                onClick={() => setIsOpen(!isOpen)}
                title={`Logged in as ${currentUser?.name} (Click to switch)`}
            >
                <UserAvatar user={currentUser} size="sm" />

                {showLabel && !compact && (
                    <span className="dev-user-switcher__name">
                        {currentUser?.shortName || currentUser?.name}
                    </span>
                )}

                <Icon
                    name="chevronDown"
                    size={12}
                    className={`dev-user-switcher__chevron ${isOpen ? "dev-user-switcher__chevron--open" : ""}`}
                />

                {/* Dev mode indicator */}
                <span className="dev-user-switcher__badge">DEV</span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="dev-user-switcher__dropdown">
                    <div className="dev-user-switcher__header">
                        <Icon name="users" size={14} />
                        <span>Switch User</span>
                    </div>

                    <div className="dev-user-switcher__list">
                        {allUsers.map((user) => {
                            const isSelected = user.id === currentUser?.id;

                            return (
                                <button
                                    key={user.id}
                                    className={`dev-user-switcher__option ${isSelected ? "dev-user-switcher__option--selected" : ""}`}
                                    onClick={() => handleSelectUser(user.id)}
                                >
                                    <UserAvatar user={user} size="sm" />

                                    <div className="dev-user-switcher__option-info">
                                        <span className="dev-user-switcher__option-name">
                                            {user.name}
                                        </span>
                                        {user.department && (
                                            <span className="dev-user-switcher__option-dept">
                                                <Icon name="building" size={10} />
                                                {user.department}
                                            </span>
                                        )}
                                    </div>

                                    {isSelected && (
                                        <Icon name="check" size={14} className="dev-user-switcher__check" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="dev-user-switcher__footer">
                        <span className="dev-user-switcher__hint">
                            Page will reload on switch
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default DevUserSwitcher;