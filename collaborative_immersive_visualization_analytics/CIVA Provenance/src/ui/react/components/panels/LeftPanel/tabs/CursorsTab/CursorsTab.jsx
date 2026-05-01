/**
 * @file CursorsTab.jsx
 * @description Cursors tab - cursor visibility and settings.
 *
 * Features:
 * - ALL CAPS header styling like Files/Datasets
 * - ResizableSections for settings and users
 * - CIEDE2000 color distance for accessible differentiation
 * - Admin/user color preferences with fallback
 * - Camera sync modes (Follow, Sync, Independent)
 * - Cursor tracking modes (3D pointer, annotation, selection)
 * - Go to user / Follow user functionality
 * - Presence status indicators (active, idle, away)
 *
 * @see Left_Panel_Design_Specification.docx - Section 8 Cursors Tab
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms/Button';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/organisms/ResizableSections';
import { CURSOR_PALETTE, assignColorsToUsers } from './utils';
import './CursorsTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Camera sync modes
const CAMERA_SYNC_MODES = {
    INDEPENDENT: { id: 'independent', icon: 'eye', label: 'Independent', description: 'Navigate freely' },
    FOLLOW: { id: 'follow', icon: 'userCheck', label: 'Follow', description: 'Follow selected user' },
    SYNC: { id: 'sync', icon: 'link', label: 'Sync All', description: 'Synchronized with room' },
};

// Cursor tracking modes
const TRACKING_MODES = {
    POINTER: { id: 'pointer', icon: 'mousePointer', label: '3D Pointer' },
    ANNOTATION: { id: 'annotation', icon: 'penTool', label: 'Annotation' },
    SELECTION: { id: 'selection', icon: 'boxSelect', label: 'Selection' },
};

// Presence statuses
const PRESENCE_STATUS = {
    ACTIVE: { id: 'active', color: '#22c55e', label: 'Active' },
    IDLE: { id: 'idle', color: '#f59e0b', label: 'Idle' },
    AWAY: { id: 'away', color: '#6b7280', label: 'Away' },
};

// Sample online users - replace with real presence data
const SAMPLE_USERS = [
    { id: 'user-1', name: 'You', isSelf: true, preferredColor: '#2dd4bf', status: 'active' },
    { id: 'user-2', name: 'Dr. Sarah Smith', preferredColor: '#fb7185', status: 'active' },
    { id: 'user-3', name: 'Alex Chen', status: 'idle' },
    { id: 'user-4', name: 'Jordan Park', status: 'away' },
];

const DEFAULT_SECTION_STATES = {
    settings: { expanded: true, flexGrow: 1 },
    camera: { expanded: true, flexGrow: 1 },
    online: { expanded: true, flexGrow: 2 },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * User cursor row component.
 *
 * @param {Object} props
 * @param {Object} props.user - User data
 * @param {string} props.color - Assigned color hex
 * @param {string} props.colorName - Color name for tooltip
 * @param {Function} props.onToggleVisibility - Toggle visibility handler
 * @param {Function} props.onChangeColor - Change color handler
 * @param {Function} props.onGoToUser - Navigate to user's position
 * @param {Function} props.onFollowUser - Start following user
 * @param {string} props.followingUserId - Currently followed user ID
 */
function UserCursorRow({
    user,
    color,
    colorName,
    onToggleVisibility,
    onChangeColor,
    onGoToUser,
    onFollowUser,
    followingUserId,
}) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const isFollowing = followingUserId === user.id;
    const statusInfo = PRESENCE_STATUS[user.status?.toUpperCase()] || PRESENCE_STATUS.ACTIVE;

    return (
        <div
            className={`cursor-row ${user.isSelf ? 'cursor-row--self' : ''} ${isFollowing ? 'cursor-row--following' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowColorPicker(false); }}
        >
            {/* Presence indicator */}
            <div
                className="cursor-row__presence"
                style={{ backgroundColor: statusInfo.color }}
                title={statusInfo.label}
            />

            {/* Color swatch */}
            <div
                className="cursor-row__color"
                style={{ backgroundColor: color }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title={`${colorName} - Click to change`}
            />

            {/* Name and status */}
            <div className="cursor-row__info">
                <span className="cursor-row__name">
                    {user.name}
                    {user.isSelf && <span className="cursor-row__you">(you)</span>}
                </span>
                {isFollowing && (
                    <span className="cursor-row__following-badge">Following</span>
                )}
            </div>

            {/* Action buttons */}
            <div className={`cursor-row__actions ${showActions || isFollowing ? 'cursor-row__actions--visible' : ''}`}>
                {!user.isSelf && (
                    <>
                        <button
                            className="cursor-row__action"
                            onClick={() => onGoToUser?.(user.id)}
                            title="Go to user's view"
                        >
                            <Icon name="navigation" size={12} />
                        </button>
                        <button
                            className={`cursor-row__action ${isFollowing ? 'cursor-row__action--active' : ''}`}
                            onClick={() => onFollowUser?.(isFollowing ? null : user.id)}
                            title={isFollowing ? 'Stop following' : 'Follow user'}
                        >
                            <Icon name={isFollowing ? 'userX' : 'userCheck'} size={12} />
                        </button>
                    </>
                )}
                <button
                    className="cursor-row__action"
                    onClick={() => onToggleVisibility(user.id)}
                    title={user.isVisible ? 'Hide cursor' : 'Show cursor'}
                >
                    <Icon name={user.isVisible ? 'eye' : 'eyeOff'} size={12} />
                </button>
            </div>

            {/* Color picker dropdown */}
            {showColorPicker && (
                <div className="cursor-row__color-picker">
                    {CURSOR_PALETTE.map(paletteColor => (
                        <button
                            key={paletteColor.hex}
                            className={`cursor-row__color-option ${color === paletteColor.hex ? 'cursor-row__color-option--active' : ''}`}
                            style={{ backgroundColor: paletteColor.hex }}
                            title={paletteColor.name}
                            onClick={() => {
                                onChangeColor(user.id, paletteColor.hex);
                                setShowColorPicker(false);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Camera sync mode selector
 */
function CameraSyncSelector({ mode, onChange }) {
    return (
        <div className="camera-sync-selector">
            {Object.values(CAMERA_SYNC_MODES).map(syncMode => (
                <button
                    key={syncMode.id}
                    className={`camera-sync-btn ${mode === syncMode.id ? 'camera-sync-btn--active' : ''}`}
                    onClick={() => onChange(syncMode.id)}
                    title={syncMode.description}
                >
                    <Icon name={syncMode.icon} size={14} />
                    <span>{syncMode.label}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * Tracking mode selector
 */
function TrackingModeSelector({ mode, onChange }) {
    return (
        <div className="tracking-mode-selector">
            <span className="tracking-mode-label">Cursor Mode</span>
            <div className="tracking-mode-options">
                {Object.values(TRACKING_MODES).map(trackMode => (
                    <button
                        key={trackMode.id}
                        className={`tracking-mode-btn ${mode === trackMode.id ? 'tracking-mode-btn--active' : ''}`}
                        onClick={() => onChange(trackMode.id)}
                        title={trackMode.label}
                    >
                        <Icon name={trackMode.icon} size={14} />
                    </button>
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Cursors panel content component.
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Current workspace ID
 */
export function CursorsPanelContent({ workspaceId }) {
    // User state with visibility
    const [users, setUsers] = useState(() =>
        SAMPLE_USERS.map(u => ({ ...u, isVisible: true }))
    );
    const [showAllCursors, setShowAllCursors] = useState(true);
    const [cursorSize, setCursorSize] = useState('medium');
    const [showLabels, setShowLabels] = useState(true);
    const [showTrails, setShowTrails] = useState(false);

    // Camera sync state
    const [cameraSyncMode, setCameraSyncMode] = useState('independent');
    const [followingUserId, setFollowingUserId] = useState(null);
    const [trackingMode, setTrackingMode] = useState('pointer');

    // Section states for resizable sections
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates(DEFAULT_SECTION_STATES);

    // Compute color assignments using CIEDE2000 algorithm
    const colorAssignments = useMemo(() => {
        return assignColorsToUsers(users);
    }, [users]);

    // Get self user color for settings panel
    const selfUser = users.find(u => u.isSelf);
    const selfColor = selfUser ? colorAssignments.get(selfUser.id) : null;

    // Handlers
    const toggleUserVisibility = useCallback((userId) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, isVisible: !u.isVisible } : u
        ));
    }, []);

    const changeUserColor = useCallback((userId, color) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, preferredColor: color } : u
        ));
    }, []);

    const toggleAllCursors = useCallback(() => {
        const newValue = !showAllCursors;
        setShowAllCursors(newValue);
        setUsers(prev => prev.map(u => ({ ...u, isVisible: newValue })));
    }, [showAllCursors]);

    // Go to user's current view position
    const handleGoToUser = useCallback((userId) => {
        console.log('Go to user:', userId);
        // TODO: Emit event to navigate to user's camera position
        window.dispatchEvent(new CustomEvent('cia:go-to-user', {
            detail: { userId }
        }));
    }, []);

    // Follow user (sync camera to their view)
    const handleFollowUser = useCallback((userId) => {
        setFollowingUserId(userId);
        if (userId) {
            setCameraSyncMode('follow');
            // TODO: Start following user's camera
            window.dispatchEvent(new CustomEvent('cia:follow-user', {
                detail: { userId, action: 'start' }
            }));
        } else {
            setCameraSyncMode('independent');
            window.dispatchEvent(new CustomEvent('cia:follow-user', {
                detail: { action: 'stop' }
            }));
        }
    }, []);

    // Handle camera sync mode change
    const handleCameraSyncChange = useCallback((mode) => {
        setCameraSyncMode(mode);
        if (mode !== 'follow') {
            setFollowingUserId(null);
        }
        window.dispatchEvent(new CustomEvent('cia:camera-sync-mode', {
            detail: { mode }
        }));
    }, []);

    // Handle tracking mode change
    const handleTrackingModeChange = useCallback((mode) => {
        setTrackingMode(mode);
        window.dispatchEvent(new CustomEvent('cia:tracking-mode', {
            detail: { mode }
        }));
    }, []);

    // Count visible
    const visibleCount = users.filter(u => u.isVisible).length;
    const activeCount = users.filter(u => u.status === 'active').length;

    return (
        <div className="cursors-tab">
            {/* Header - ALL CAPS like other tabs */}
            <div className="panel-header panel-header--cyan">
                <Icon name="mousePointer" size={16} className="panel-header__icon" />
                <span className="panel-header__title">Cursors</span>
                <span className="panel-header__count">{visibleCount}/{users.length}</span>
            </div>

            {/* Quick toggle */}
            <div className="cursors-tab__quick-toggle">
                <button
                    className={`quick-toggle-btn ${showAllCursors ? 'quick-toggle-btn--active' : ''}`}
                    onClick={toggleAllCursors}
                >
                    {showAllCursors ? <Icon name="eye" size={14} /> : <Icon name="eyeOff" size={14} />}
                    {showAllCursors ? 'Hide All' : 'Show All'}
                </button>
            </div>

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
                onSectionResize={resizeSection}
            >
                {/* Camera Sync Section */}
                <ResizableSection
                    id="camera"
                    icon="video"
                    iconColorClass="icon-blue"
                    label="Camera Sync"
                >
                    <div className="cursors-tab__camera-content">
                        <CameraSyncSelector
                            mode={cameraSyncMode}
                            onChange={handleCameraSyncChange}
                        />
                        {followingUserId && (
                            <div className="following-indicator">
                                <Icon name="userCheck" size={12} />
                                <span>Following {users.find(u => u.id === followingUserId)?.name}</span>
                                <button onClick={() => handleFollowUser(null)}>
                                    <Icon name="x" size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </ResizableSection>

                {/* Settings Section */}
                <ResizableSection
                    id="settings"
                    icon="settings"
                    iconColorClass="icon-amber"
                    label="Display Settings"
                >
                    <div className="cursors-tab__settings-content">
                        {/* Tracking mode */}
                        <TrackingModeSelector
                            mode={trackingMode}
                            onChange={handleTrackingModeChange}
                        />

                        <div className="setting-row">
                            <span>Cursor Size</span>
                            <select
                                value={cursorSize}
                                onChange={(e) => setCursorSize(e.target.value)}
                                className="setting-select"
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                        <div className="setting-row">
                            <span>Show Labels</span>
                            <button
                                className={`setting-toggle ${showLabels ? 'setting-toggle--on' : ''}`}
                                onClick={() => setShowLabels(!showLabels)}
                            >
                                {showLabels ? 'On' : 'Off'}
                            </button>
                        </div>
                        <div className="setting-row">
                            <span>Cursor Trails</span>
                            <button
                                className={`setting-toggle ${showTrails ? 'setting-toggle--on' : ''}`}
                                onClick={() => setShowTrails(!showTrails)}
                            >
                                {showTrails ? 'On' : 'Off'}
                            </button>
                        </div>

                        {/* My Cursor Color */}
                        <div className="setting-row setting-row--colors">
                            <span>My Color</span>
                            <div className="color-swatches">
                                {CURSOR_PALETTE.map(paletteColor => (
                                    <button
                                        key={paletteColor.hex}
                                        className={`color-swatch ${selfColor?.hex === paletteColor.hex ? 'color-swatch--active' : ''}`}
                                        style={{ backgroundColor: paletteColor.hex }}
                                        title={paletteColor.name}
                                        onClick={() => selfUser && changeUserColor(selfUser.id, paletteColor.hex)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </ResizableSection>

                {/* Online Users Section - Collapsible at bottom */}
                <ResizableSection
                    id="online"
                    icon="users"
                    iconColorClass="icon-cyan"
                    label="Online Users"
                    count={`${activeCount}/${users.length}`}
                >
                    <div className="cursors-tab__users-list">
                        {users.map(user => {
                            const colorInfo = colorAssignments.get(user.id);
                            return (
                                <UserCursorRow
                                    key={user.id}
                                    user={user}
                                    color={colorInfo?.hex || '#888888'}
                                    colorName={colorInfo?.name || 'Unknown'}
                                    onToggleVisibility={toggleUserVisibility}
                                    onChangeColor={changeUserColor}
                                    onGoToUser={handleGoToUser}
                                    onFollowUser={handleFollowUser}
                                    followingUserId={followingUserId}
                                />
                            );
                        })}
                    </div>
                </ResizableSection>
            </ResizableSectionsContainer>
        </div>
    );
}

export default CursorsPanelContent;