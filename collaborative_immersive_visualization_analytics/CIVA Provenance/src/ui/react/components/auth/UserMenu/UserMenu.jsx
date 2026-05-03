// src/ui/react/components/auth/UserMenu.jsx
// User menu dropdown with profile, settings, and sign out options

import React, { useState, useRef, useEffect } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAuth } from "@UI/react/hooks/useAuth.js";
import "./UserMenu.scss";

/**
 * UserMenu - Displays user avatar with dropdown menu when authenticated
 *
 * @param {Object} props
 * @param {string} props.userColor - User's color for avatar
 * @param {boolean} props.inVoice - Whether user is in voice chat
 * @param {Function} props.onProfileClick - Callback when profile is clicked
 * @param {Function} props.onSettingsClick - Callback when settings is clicked
 */
export function UserMenu({
    userColor = "#2dd4bf",
    inVoice = false,
    onProfileClick,
    onSettingsClick,
}) {
    const { user, userName, userEmail, userRoles, logout, isDevBypass } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    // Close menu on escape
    useEffect(() => {
        function handleEscape(event) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [isOpen]);

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
    };

    const handleProfileClick = () => {
        setIsOpen(false);
        onProfileClick?.();
    };

    const handleSettingsClick = () => {
        setIsOpen(false);
        onSettingsClick?.();
    };

    const displayName = userName || user?.email?.split("@")[0] || "User";
    const initial = displayName[0].toUpperCase();
    const isAdmin = userRoles.includes("admin");

    return (
        <div className="user-menu" ref={menuRef}>
            {/* Avatar button */}
            <button
                className={`user-menu__trigger ${inVoice ? "in-voice" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ "--user-color": userColor }}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <span className="user-menu__avatar">{initial}</span>
                <Icon name="chevronDown"
                    size={14}
                    className={`user-menu__chevron ${isOpen ? "open" : ""}`}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="user-menu__dropdown">
                    {/* User info header */}
                    <div className="user-menu__header">
                        <div
                            className="user-menu__header-avatar"
                            style={{ "--user-color": userColor }}
                        >
                            {initial}
                        </div>
                        <div className="user-menu__header-info">
                            <span className="user-menu__header-name">{displayName}</span>
                            {userEmail && (
                                <span className="user-menu__header-email">{userEmail}</span>
                            )}
                            {isDevBypass && (
                                <span className="user-menu__header-badge user-menu__header-badge--dev">
                                    Dev Mode
                                </span>
                            )}
                            {isAdmin && !isDevBypass && (
                                <span className="user-menu__header-badge user-menu__header-badge--admin">
                                    <Icon name="shield" size={10} /> Admin
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="user-menu__divider" />

                    {/* Menu items */}
                    <div className="user-menu__items">
                        <button
                            className="user-menu__item"
                            onClick={handleProfileClick}
                        >
                            <Icon name="user" size={16} />
                            <span>Profile</span>
                        </button>

                        <button
                            className="user-menu__item"
                            onClick={handleSettingsClick}
                        >
                            <Icon name="userCog" size={16} />
                            <span>Settings</span>
                        </button>
                    </div>

                    <div className="user-menu__divider" />

                    {/* Sign out */}
                    <div className="user-menu__items">
                        <button
                            className="user-menu__item user-menu__item--danger"
                            onClick={handleLogout}
                        >
                            <Icon name="logout" size={16} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserMenu;