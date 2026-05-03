/**
 * @file ChatTab.jsx
 * @description Chat tab for real-time messaging in the collaboration hub.
 * Connected to Y.js for real-time sync with other users.
 *
 * Features:
 * - Room chat synced via Y.js (persisted to PostgreSQL)
 * - Message bubbles with user avatars and colors
 * - System messages for annotations/events
 * - Message input with send on Enter
 * - Message deletion for own messages
 *
 * @see Right_Panel_Design_Specification.md - Chat Tab section
 *
 * @example
 * <ChatTab workspaceId="ws-1" />
 */

import React, { useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SubtabBar } from '@UI/react/components/molecules/SubtabBar';
import { sync as log } from '@Utils/logger.js';

import { useChatTab } from './hooks/useChatTab';
import { useMatrixFederation } from './hooks/useMatrixFederation';
import { MessageBubble } from './components/MessageBubble';
import { MessageInput } from './components/MessageInput';
import { RoomDirectory } from './components/RoomDirectory';
import { CreateRoomModal } from './components/CreateRoomModal';
import { DMUserList } from './components/DMUserList';

import './ChatTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} ChatTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Chat tab component.
 * Provides real-time messaging synced via Y.js.
 *
 * @param {ChatTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function ChatTab({ workspaceId, roomId, projectId, availableRooms: roomsFromProps }) {
    const messagesEndRef = useRef(null);
    const [showRoomDirectory, setShowRoomDirectory] = React.useState(false);
    const [showRoomSelector, setShowRoomSelector] = React.useState(false);
    const [showCreateRoomModal, setShowCreateRoomModal] = React.useState(false);
    const [activeDMRoom, setActiveDMRoom] = React.useState(null);
    const [showDMUserList, setShowDMUserList] = React.useState(true);

    const {
        messages,
        isLoading,
        isSynced,
        currentUserId,
        currentUserEmail,
        currentRoomId,
        availableRooms,
        isLoadingRooms,
        activeSubtab,
        setActiveSubtab,
        subtabs,
        handleSend,
        handleEdit,
        handleDelete,
        refreshMessages,
        switchRoom,
        fetchRooms,
    } = useChatTab({ workspaceId, roomId, projectId, roomsFromProps });

    // Matrix federation status (Phase 6)
    const {
        federatedUserCount,
        isFederationEnabled,
        isFederationConnected,
    } = useMatrixFederation(roomId);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get subtab label for display
    const currentSubtabLabel = subtabs.find(t => t.id === activeSubtab)?.label || 'Room';

    // Handle room joined from directory
    const handleRoomJoined = (room) => {
        log.info('Joined external Matrix room:', room);
        setShowRoomDirectory(false);
        // Refresh messages to show new room
        if (refreshMessages) {
            refreshMessages();
        }
    };

    // Handle room created
    const handleRoomCreated = (newRoom) => {
        log.info('Room created:', newRoom);
        // Refresh room list
        if (fetchRooms) {
            fetchRooms();
        }
        // Switch to the new room
        if (switchRoom && newRoom.id) {
            switchRoom(newRoom.id);
        }
    };

    // Handle DM user selected
    const handleDMUserSelected = ({ room, user, isNew }) => {
        log.info('DM user selected:', user.name || user.email, 'Room:', room.id);

        // Switch to the DM room
        setActiveDMRoom({ room, user });
        setShowDMUserList(false);

        if (switchRoom && room.id) {
            switchRoom(room.id);
        }

        // Refresh room list if new DM created
        if (isNew && fetchRooms) {
            fetchRooms();
        }
    };

    // Show user list when switching to DM tab
    useEffect(() => {
        if (activeSubtab === 'dm' && !activeDMRoom) {
            setShowDMUserList(true);
        }
    }, [activeSubtab, activeDMRoom]);

    return (
        <div className="chat-tab">
            {/* Header */}
            <div className="panel-header panel-header--blue">
                <Icon name="messageSquare" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Chat</span>
                <div className="panel-header__spacer" />
                <div className="panel-header__status">
                    {/* Y.js connection status */}
                    {isLoading ? (
                        <span className="chat-status chat-status--loading">
                            <Icon name="loader" size={12} className="spin" />
                            Syncing...
                        </span>
                    ) : isSynced ? (
                        <span className="chat-status chat-status--connected">
                            <Icon name="wifi" size={12} />
                            Connected
                        </span>
                    ) : (
                        <span className="chat-status chat-status--offline">
                            <Icon name="wifiOff" size={12} />
                            Offline
                        </span>
                    )}
                </div>
            </div>

            {/* Matrix Federation Row - Hidden until federation is fully implemented
                TODO: Re-enable when Phase 7 federation is complete
                This would show: Matrix connection status, federated user count, Browse Rooms button
            */}

            {/* Subtab Bar */}
            <SubtabBar
                tabs={subtabs}
                activeTab={activeSubtab}
                onTabChange={setActiveSubtab}
            />

            {/* Chat scope indicator with room selector */}
            <div className="chat-tab__scope-indicator">
                <Icon name={activeSubtab === 'room' ? 'home' : activeSubtab === 'project' ? 'globe' : 'messageSquare'} size={12} />

                {/* Room selector dropdown */}
                {activeSubtab === 'room' && availableRooms.length > 0 ? (
                    <div className="chat-tab__room-selector">
                        <select
                            value={currentRoomId}
                            onChange={(e) => switchRoom(e.target.value)}
                            className="chat-tab__room-select"
                        >
                            {availableRooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                        <Icon name="chevronDown" size={12} />
                    </div>
                ) : activeSubtab === 'dm' && activeDMRoom ? (
                    <div className="chat-tab__dm-info">
                        <span>Chat with {activeDMRoom.user.name || activeDMRoom.user.email}</span>
                        <button
                            className="chat-tab__dm-back-btn"
                            onClick={() => {
                                setActiveDMRoom(null);
                                setShowDMUserList(true);
                            }}
                            title="Back to user list"
                        >
                            <Icon name="arrowLeft" size={12} />
                            Back
                        </button>
                    </div>
                ) : (
                    <span>{currentSubtabLabel} Chat</span>
                )}

                <span className="chat-tab__message-count">{messages.length} messages</span>

                {/* Create room button */}
                {activeSubtab === 'room' && projectId && (
                    <button
                        className="chat-tab__create-room-btn"
                        onClick={() => setShowCreateRoomModal(true)}
                        title="Create new room"
                    >
                        <Icon name="plus" size={12} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="chat-tab__messages">
                {isLoading ? (
                    <div className="chat-tab__loading">
                        <Icon name="loader" size={24} className="spin" />
                        <span>Loading messages...</span>
                    </div>
                ) : activeSubtab === 'dm' && showDMUserList ? (
                    <DMUserList
                        projectId={projectId}
                        currentUserId={currentUserId}
                        onUserSelected={handleDMUserSelected}
                    />
                ) : messages.length === 0 ? (
                    <div className="chat-tab__empty">
                        <Icon name="messageSquare" size={32} />
                        <span>No messages yet</span>
                        <span className="chat-tab__empty-hint">Start the conversation!</span>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            currentUserId={currentUserId}
                            currentUserEmail={currentUserEmail}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput onSend={handleSend} disabled={isLoading || (activeSubtab === 'dm' && !activeDMRoom)} />

            {/* Room Directory Overlay - Hidden until Phase 7 federation is complete
            {showRoomDirectory && (
                <div className="chat-tab__overlay">
                    <RoomDirectory
                        projectId={projectId}
                        onRoomJoined={handleRoomJoined}
                        onClose={() => setShowRoomDirectory(false)}
                    />
                </div>
            )}
            */}

            {/* Create Room Modal */}
            <CreateRoomModal
                isOpen={showCreateRoomModal}
                onClose={() => setShowCreateRoomModal(false)}
                onRoomCreated={handleRoomCreated}
                projectId={projectId}
            />
        </div>
    );
}

// Export with both names for backwards compatibility
export { ChatTab as ChatPanelContent };
export default ChatTab;