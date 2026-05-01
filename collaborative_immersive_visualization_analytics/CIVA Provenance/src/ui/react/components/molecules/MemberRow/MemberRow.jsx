/**
 * @file MemberRow.jsx
 * @description Reusable member/user row component for displaying user info.
 * Used in People tab, Voice tab participants, Chat conversations, etc.
 *
 * Features:
 * - Avatar with presence indicator
 * - Name and optional status message
 * - Contextual info (viewing, in voice, etc.)
 * - Hover actions
 * - Selection state
 *
 * @example
 * // Basic usage
 * <MemberRow user={user} onSelect={handleSelect} />
 *
 * @example
 * // With voice indicators
 * <MemberRow user={user} showVoiceStatus showActions />
 *
 * @example
 * // Compact mode
 * <MemberRow user={user} variant="compact" />
 */

import React, { memo, useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { PresenceIndicator } from '@UI/react/components/atoms/PresenceIndicator';
import { UserAvatar } from '@UI/react/components/atoms/UserAvatar';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import './MemberRow.scss';

/**
 * @typedef {Object} User
 * @property {string} odbc - Unique client ID
 * @property {string} [userId] - User ID
 * @property {string} userName - Display name
 * @property {string} [userColor] - User's assigned color
 * @property {string} [status] - Presence status
 * @property {string} [statusMessage] - Custom status message
 * @property {boolean} [isYou] - Whether this is the current user
 * @property {boolean} [inVoice] - Whether user is in voice
 * @property {boolean} [isMuted] - Whether user is muted
 * @property {boolean} [isSpeaking] - Whether user is speaking
 * @property {boolean} [isRoomOwner] - Whether user is room owner
 * @property {string} [viewingDataset] - Dataset user is viewing
 * @property {string} [viewingView] - View user is looking at
 * @property {boolean} [inVR] - Whether user is in a VR session
 * @property {Object} [vrSession] - VR session details
 * @property {string} [vrSession.type] - Session type: 'open', 'invite', 'closed'
 * @property {string} [vrSession.dataset] - Dataset being viewed
 * @property {number} [vrSession.participants] - Number of participants
 * @property {Object} [capabilities] - Device capability profile
 * @property {string} [deviceType] - Device type (desktop, vr, ar)
 * @property {string} [deviceLabel] - Display label for device type
 * @property {Object} [activity] - Current activity badge
 */

/**
 * @typedef {Object} MemberRowProps
 * @property {User} user - User data
 * @property {boolean} [isSelected=false] - Whether row is selected
 * @property {'default'|'compact'} [variant='default'] - Display variant
 * @property {boolean} [showVoiceStatus=false] - Show voice indicators
 * @property {boolean} [showViewing=false] - Show what user is viewing
 * @property {boolean} [showActions=false] - Show hover actions
 * @property {(userId: string) => void} [onSelect] - Selection handler
 * @property {(userId: string) => void} [onMessage] - Message action handler
 * @property {(userId: string) => void} [onGoToView] - Go to view handler
 * @property {(userId: string, visible: boolean) => void} [onToggleCursor] - Toggle cursor visibility
 * @property {(userId: string, e: React.MouseEvent) => void} [onMoreMenu] - More menu handler
 * @property {(userId: string) => void} [onJoinVR] - Join VR session handler
 * @property {(userId: string) => void} [onRequestInvite] - Request VR invite handler
 * @property {boolean} [showVRSession=false] - Show VR session card
 * @property {string} [className] - Additional CSS classes
 * @property {Object|null} [localCapabilities] - Capability profile of current user
 */

/**
 * Member/user row component.
 *
 * @param {MemberRowProps} props - Component props
 * @returns {React.ReactElement} The rendered row
 */
export const MemberRow = memo(function MemberRow({
    user,
    isSelected = false,
    variant = 'default',
    showVoiceStatus = false,
    showViewing = false,
    showActions = false,
    showVRSession = false,
    onSelect,
    onMessage,
    onGoToView,
    onToggleCursor,
    onMoreMenu,
    onJoinVR,
    onRequestInvite,
    className = '',
    localCapabilities = null,
}) {
    const {
        odbc,
        userId,
        userName,
        userColor,
        status = 'online',
        statusMessage,
        isYou,
        inVoice,
        isMuted,
        isSpeaking,
        isRoomOwner,
        viewingDataset,
        viewingView,
        cursorVisible = true,
        inVR = false,
        vrSession,
        activity,
        deviceType,
        deviceLabel,
        capabilities,
        handRaised,
        role,
    } = user;

    const id = odbc || userId;
    const localProps = localCapabilities?.properties || null;
    const userProps = capabilities?.properties || null;
    const hasLimitedSync =
        localProps &&
        userProps &&
        localProps.some((prop) => !userProps.includes(prop));

    const handleClick = useCallback(() => {
        onSelect?.(id);
    }, [id, onSelect]);

    const handleMessage = useCallback((e) => {
        e.stopPropagation();
        onMessage?.(id);
    }, [id, onMessage]);

    const handleGoToView = useCallback((e) => {
        e.stopPropagation();
        onGoToView?.(id);
    }, [id, onGoToView]);

    const handleToggleCursor = useCallback((e) => {
        e.stopPropagation();
        onToggleCursor?.(id, !cursorVisible);
    }, [id, cursorVisible, onToggleCursor]);

    const handleMoreClick = useCallback((e) => {
        e.stopPropagation();
        onMoreMenu?.(id, e);
    }, [id, onMoreMenu]);

    const handleJoinVR = useCallback((e) => {
        e.stopPropagation();
        onJoinVR?.(id);
    }, [id, onJoinVR]);

    const handleRequestInvite = useCallback((e) => {
        e.stopPropagation();
        onRequestInvite?.(id);
    }, [id, onRequestInvite]);

    // Determine presence status for indicator
    const presenceStatus = inVR ? 'vr' : inVoice ? 'active' : status;

    return (
        <div
            className={`member-row member-row--${variant} ${isSelected ? 'member-row--selected' : ''} ${isYou ? 'member-row--you' : ''} ${className}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            {/* Avatar with presence */}
            <div className={`member-row__avatar-wrapper ${isSpeaking ? 'member-row__avatar-wrapper--speaking' : ''}`} style={isSpeaking ? { boxShadow: `0 0 0 2px ${userColor || '#10b981'}`, borderRadius: '50%' } : {}}>
                <UserAvatar userName={userName} color={userColor} size="sm" />
                <PresenceIndicator
                    status={presenceStatus}
                    size="xs"
                    pulse={isSpeaking}
                    className="member-row__presence"
                />
            </div>

            {/* Info */}
            <div className="member-row__info">
                <div className="member-row__name-row">
                    <span className="member-row__name" style={{ color: userColor }}>
                        {userName}
                    </span>
                    {isYou && <span className="member-row__you-badge">(You)</span>}
                    {isRoomOwner && (
                        <Tooltip content="Room Owner">
                            <Icon name="crown" size={10} className="member-row__crown" />
                        </Tooltip>
                    )}
                </div>

                {/* Voice status */}
                {showVoiceStatus && inVoice && (
                    <div className="member-row__voice-status">
                        {isMuted ? <Icon name="micOff" size={10} /> : <Icon name="mic" size={10} />}
                        <span>{isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'In Voice'}</span>
                    </div>
                )}

                {/* Hand Raised state */}
                {handRaised && (
                    <div className="member-row__hand-raised" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                        <Icon name="hand" size={10} />
                        <span>Hand Raised</span>
                    </div>
                )}

                {/* Role badge */}
                {role && role !== 'viewer' && (
                    <div className="member-row__role" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                        <Icon name={role === 'presenter' ? 'star' : 'edit'} size={10} />
                        <span>{role === 'presenter' ? 'Presenter' : 'Editor'}</span>
                    </div>
                )}

                {/* Viewing info */}
                {showViewing && viewingView && (
                    <div className="member-row__viewing">
                        <Icon name="eye" size={10} />
                        <span>{viewingView}</span>
                    </div>
                )}

                {/* Activity badge */}
                {activity?.label && (
                    <div className="member-row__activity">
                        <Icon name="activity" size={10} />
                        <span>{activity.label}</span>
                    </div>
                )}

                {/* Device badges */}
                {(deviceLabel || deviceType) && (
                    <div className="member-row__device" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                        <Icon name={(deviceType === 'vr' || capabilities?.xrCapable) ? 'vr' : 'monitor'} size={10} />
                        <span>{deviceLabel || deviceType}</span>
                    </div>
                )}

                {hasLimitedSync && (
                    <div className="member-row__sync-warning">
                        <Icon name="alertTriangle" size={10} />
                        <span>Limited sync</span>
                    </div>
                )}

                {/* VR Session Card */}
                {showVRSession && inVR && vrSession && (
                    <div className="member-row__vr-session">
                        <div className="member-row__vr-info">
                            <Icon name="vr" size={12} className="member-row__vr-icon" />
                            <span className="member-row__vr-dataset">{vrSession.dataset || 'VR Session'}</span>
                            {vrSession.participants > 1 && (
                                <span className="member-row__vr-participants">
                                    +{vrSession.participants - 1}
                                </span>
                            )}
                        </div>
                        {!isYou && (
                            <div className="member-row__vr-actions">
                                {vrSession.type === 'open' && onJoinVR && (
                                    <LabeledButton
                                        label="Join VR"
                                        onClick={handleJoinVR}
                                        size="xs"
                                        variant="primary"
                                        className="member-row__vr-btn member-row__vr-btn--join"
                                    />
                                )}
                                {vrSession.type === 'invite' && onRequestInvite && (
                                    <LabeledButton
                                        label="Request Invite"
                                        onClick={handleRequestInvite}
                                        size="xs"
                                        variant="ghost"
                                        className="member-row__vr-btn member-row__vr-btn--request"
                                    />
                                )}
                                {vrSession.type === 'closed' && (
                                    <span className="member-row__vr-private">Private</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Status message */}
                {statusMessage && variant !== 'compact' && (
                    <div className="member-row__status-message">{statusMessage}</div>
                )}
            </div>

            {/* Actions (show on hover) */}
            {showActions && !isYou && (
                <div className="member-row__actions">
                    {onGoToView && (
                        <IconButton
                            icon="mapPin"
                            onClick={handleGoToView}
                            tooltip="Go to View"
                            size="xs"
                            variant="ghost"
                            className="member-row__action"
                        />
                    )}
                    {onMessage && (
                        <IconButton
                            icon="message"
                            onClick={handleMessage}
                            tooltip="Message"
                            size="xs"
                            variant="ghost"
                            className="member-row__action"
                        />
                    )}
                    {onToggleCursor && (
                        <IconButton
                            icon={cursorVisible ? 'eye' : 'eyeOff'}
                            onClick={handleToggleCursor}
                            tooltip={cursorVisible ? 'Hide Cursor' : 'Show Cursor'}
                            size="xs"
                            variant="ghost"
                            className="member-row__action"
                        />
                    )}
                    {onMoreMenu && (
                        <IconButton
                            icon="moreHorizontal"
                            onClick={handleMoreClick}
                            tooltip="More options"
                            size="xs"
                            variant="ghost"
                            className="member-row__action member-row__action--more"
                        />
                    )}
                </div>
            )}
        </div>
    );
});

export default MemberRow;
