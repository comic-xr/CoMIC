/**
 * @file Header.jsx
 * @description Primary header bar with global application controls.
 * Height: 48px | z-index: 100
 *
 * Layout:
 * - Left: Logo, Project Selector
 * - Right: Search, Help, Notifications, Theme, VR, User
 *
 * FIX: Added `compact` prop to ViewModeToggle to prevent text overflow
 *
 * @example
 * <Header
 *   currentProject={project}
 *   user={currentUser}
 *   onNavigate={navigate}
 * />
 */

import React from 'react';
import { Logo } from './components/Logo';
import { ProjectSelector } from './components/ProjectSelector';
import { GlobalSearchTrigger } from './components/GlobalSearchTrigger';
import { HelpButton } from './components/HelpButton';
import { NotificationBell } from './components/NotificationBell';
import { ThemeToggle } from './components/ThemeToggle';
import { UserMenu } from './components/UserMenu';
import { ViewModeToggle } from '@UI/react/components/organisms';

import './Header.scss';

/**
 * Primary Header bar component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.currentProject] - Currently selected project
 * @param {Array} [props.projects] - List of available projects
 * @param {Object} [props.user] - Current user object
 * @param {Array} [props.notifications] - List of notifications
 * @param {number} [props.unreadCount] - Count of unread notifications
 * @param {string} [props.viewMode] - Current view mode ('desktop' or 'vr')
 * @param {boolean} [props.vrAvailable] - Whether VR mode is available
 * @param {Function} [props.onProjectChange] - Callback when project is selected
 * @param {Function} [props.onCreateProject] - Callback to create new project
 * @param {Function} [props.onOpenSearch] - Callback to open global search
 * @param {Function} [props.onOpenHelp] - Callback to open help modal
 * @param {Function} [props.onNotificationClick] - Callback when notification is clicked
 * @param {Function} [props.onViewModeChange] - Callback when view mode changes
 * @param {Function} [props.onNavigate] - Navigation callback
 * @param {Function} [props.onSignOut] - Sign out callback
 */
export function Header({
    currentProject = null,
    projects = [],
    user = null,
    notifications = [],
    unreadCount = 0,
    viewMode = 'desktop',
    vrAvailable = true,
    onProjectChange,
    onCreateProject,
    onOpenSearch,
    onOpenHelp,
    onNotificationClick,
    onViewModeChange,
    onNavigate,
    onSignOut,
}) {
    return (
        <header className="header" role="banner">
            {/* Left Section */}
            <div className="header__left">
                <Logo onNavigate={onNavigate} />
                <ProjectSelector
                    currentProject={currentProject}
                    projects={projects}
                    onSelect={onProjectChange}
                    onCreate={onCreateProject}
                />
            </div>

            {/* Right Section */}
            <div className="header__right">
                <GlobalSearchTrigger onOpen={onOpenSearch} />
                <HelpButton onOpen={onOpenHelp} />
                <NotificationBell
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onNotificationClick={onNotificationClick}
                />
                <ThemeToggle />
                {/* FIX: Added compact prop to prevent text overflow in header */}
                <ViewModeToggle
                    mode={viewMode}
                    onChange={onViewModeChange}
                    vrAvailable={vrAvailable}
                    compact
                />
                <UserMenu
                    user={user}
                    onNavigate={onNavigate}
                    onSignOut={onSignOut}
                />
            </div>
        </header>
    );
}

export default Header;