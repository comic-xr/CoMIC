/**
 * @file RoomHeader.jsx
 * @description Room-level header bar with section-based layout.
 *
 * Architecture: Viewing room and voice room are INDEPENDENT.
 * Users can view one room while being in voice for another.
 *
 * Layout: ROOM (viewing + presence) | PINNED | VOICE | CHAT
 * Height: 62px total (18px section labels + 44px content)
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { RoomSection } from './RoomSection';
import { PinnedSection } from './PinnedSection';
import { VoiceSection } from './VoiceSection';
import { ChatSection } from './ChatSection';
import {
    useRoomSection,
    usePinnedSection,
    useVoiceState,
    useDropdowns,
} from './RoomHeader.logic';
import './RoomHeader.scss';

const RoomHeader = memo(function RoomHeader({
    rooms = [],
    viewingRoomId,
    voiceRoomId,
    activeBreakoutId,
    breakouts = [],
    pinnedRoomIds = [],
    onSelectRoom,
    onJoinVoice,
    onJoinBreakout,
    onLeaveVoice,
    onTogglePin,
    isMuted = false,
    isDeafened = false,
    onToggleMute,
    onToggleDeafen,
    unreadMessages = 0,
    onOpenChat,
    onCreateRoom,
    // Layout props (injected by ThreeEdgeLayout cloneElement)
    style,
    ...layoutProps
}) {
    const { viewingRoom, mainRooms, personalRooms } = useRoomSection(
        rooms, viewingRoomId, voiceRoomId, pinnedRoomIds
    );

    const { pinnedRooms } = usePinnedSection(
        rooms, viewingRoomId, pinnedRoomIds
    );

    const {
        voiceRoom,
        activeBreakout,
        isInVoice,
        isInBreakout,
        currentVoiceName,
        currentVoiceUsers,
    } = useVoiceState(rooms, voiceRoomId, activeBreakoutId, breakouts);

    const {
        showViewingDropdown,
        showVoiceDropdown,
        showJoinDropdown,
        toggleViewing,
        toggleVoice,
        toggleJoin,
        closeAll,
    } = useDropdowns();

    const handleSelectRoom = useCallback((roomId) => {
        onSelectRoom?.(roomId);
    }, [onSelectRoom]);

    const handleTogglePin = useCallback((roomId) => {
        onTogglePin?.(roomId);
    }, [onTogglePin]);

    return (
        <div className="room-header" style={style}>
            {/* Section Labels Row */}
            <div className="room-header__labels">
                <span className="room-header__label room-header__label--room">Room</span>
                <span className="room-header__label-divider" />
                <span className="room-header__label room-header__label--pinned">Pinned</span>
                <span className="room-header__label-spacer" />
                <span className="room-header__label-divider" />
                <span className="room-header__label room-header__label--voice">Voice</span>
                <span className="room-header__label-divider" />
                <span className="room-header__label room-header__label--chat">Chat</span>
            </div>

            {/* Content Row */}
            <div className="room-header__content">
                <RoomSection
                    viewingRoom={viewingRoom}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    pinnedRoomIds={pinnedRoomIds}
                    mainRooms={mainRooms}
                    personalRooms={personalRooms}
                    showDropdown={showViewingDropdown}
                    onToggleDropdown={toggleViewing}
                    onCloseDropdown={closeAll}
                    onSelectRoom={handleSelectRoom}
                    onTogglePin={handleTogglePin}
                    onCreateRoom={onCreateRoom}
                />

                <div className="room-header__divider" />

                <PinnedSection
                    pinnedRooms={pinnedRooms}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={handleSelectRoom}
                />

                <div className="room-header__spacer" />
                <div className="room-header__divider" />

                <VoiceSection
                    viewingRoom={viewingRoom}
                    viewingRoomId={viewingRoomId}
                    voiceRoom={voiceRoom}
                    voiceRoomId={voiceRoomId}
                    isInVoice={isInVoice}
                    isInBreakout={isInBreakout}
                    activeBreakoutId={activeBreakoutId}
                    activeBreakout={activeBreakout}
                    currentVoiceName={currentVoiceName}
                    currentVoiceUsers={currentVoiceUsers}
                    breakouts={breakouts}
                    rooms={rooms}
                    isMuted={isMuted}
                    isDeafened={isDeafened}
                    onJoinVoice={onJoinVoice}
                    onJoinBreakout={onJoinBreakout}
                    onLeaveVoice={onLeaveVoice}
                    onToggleMute={onToggleMute}
                    onToggleDeafen={onToggleDeafen}
                    showVoiceDropdown={showVoiceDropdown}
                    showJoinDropdown={showJoinDropdown}
                    onToggleVoice={toggleVoice}
                    onToggleJoin={toggleJoin}
                    onCloseDropdowns={closeAll}
                />

                <div className="room-header__divider" />

                <ChatSection
                    unreadMessages={unreadMessages}
                    onOpenChat={onOpenChat}
                />
            </div>
        </div>
    );
});

RoomHeader.propTypes = {
    rooms: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
        type: PropTypes.oneOf(['main', 'breakout', 'personal']),
        usersOnline: PropTypes.number,
        usersInVoice: PropTypes.number,
    })),
    viewingRoomId: PropTypes.string,
    voiceRoomId: PropTypes.string,
    activeBreakoutId: PropTypes.string,
    breakouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        workspaceId: PropTypes.string,
        usersInVoice: PropTypes.number,
    })),
    pinnedRoomIds: PropTypes.arrayOf(PropTypes.string),
    onSelectRoom: PropTypes.func,
    onJoinVoice: PropTypes.func,
    onJoinBreakout: PropTypes.func,
    onLeaveVoice: PropTypes.func,
    onTogglePin: PropTypes.func,
    isMuted: PropTypes.bool,
    isDeafened: PropTypes.bool,
    onToggleMute: PropTypes.func,
    onToggleDeafen: PropTypes.func,
    unreadMessages: PropTypes.number,
    onOpenChat: PropTypes.func,
    onCreateRoom: PropTypes.func,
    style: PropTypes.object,
};

export { RoomHeader };
export default RoomHeader;
