/**
 * @file RoomDirectory.jsx
 * @description Matrix room directory component for discovering and joining external rooms.
 * Phase 7: Room Directory & Discovery
 *
 * Features:
 * - Search public Matrix rooms
 * - Filter by homeserver
 * - View room details (topic, member count)
 * - Join external Matrix rooms
 * - Creates CIA Web room mapping automatically
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { sync as log } from '@Utils/logger.js';
import './RoomDirectory.scss';

/**
 * Room Directory component.
 * Allows users to search and join public Matrix rooms.
 *
 * @param {Object} props - Component props
 * @param {string} props.projectId - Current project ID
 * @param {function} props.onRoomJoined - Callback when room is joined
 * @param {function} props.onClose - Callback to close directory
 * @returns {React.ReactElement} The rendered component
 */
export function RoomDirectory({ projectId, onRoomJoined, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [servers, setServers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available servers on mount
  useEffect(() => {
    fetchServers();
  }, []);

  // Fetch servers list
  const fetchServers = async () => {
    try {
      const response = await fetch('/api/matrix/directory/servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      log.warn('Failed to fetch servers:', err.message);
    }
  };

  // Search for rooms
  const searchRooms = async () => {
    if (!searchQuery && !selectedServer) {
      setError('Please enter a search term or select a server');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedServer) params.append('server', selectedServer);
      params.append('limit', '20');

      const response = await fetch(`/api/matrix/directory/search?${params}`);

      if (!response.ok) {
        throw new Error('Failed to search rooms');
      }

      const data = await response.json();
      setRooms(data.rooms || []);
      log.info('Found rooms:', data.rooms.length);

    } catch (err) {
      log.error('Error searching rooms:', err);
      setError('Failed to search rooms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Join a Matrix room
  const joinRoom = async (room) => {
    if (!projectId) {
      setError('Please select a project first');
      return;
    }

    setIsJoining(true);
    setJoiningRoomId(room.roomId);
    setError(null);

    try {
      const response = await fetch('/api/matrix/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomIdOrAlias: room.alias || room.roomId,
          projectId: projectId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join room');
      }

      const data = await response.json();
      log.info('Joined Matrix room:', data);

      // Notify parent component
      if (onRoomJoined) {
        onRoomJoined(data.ciaRoom);
      }

      // Close directory
      if (onClose) {
        onClose();
      }

    } catch (err) {
      log.error('Error joining room:', err);
      setError(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
      setJoiningRoomId(null);
    }
  };

  return (
    <div className="room-directory">
      {/* Header */}
      <div className="room-directory__header">
        <div className="room-directory__title">
          <Icon name="globe" size={16} />
          <span>Matrix Room Directory</span>
        </div>
        {onClose && (
          <button className="room-directory__close" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {/* Search Controls */}
      <div className="room-directory__search">
        <SearchInput
          className="room-directory__search-input"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search public rooms..."
          size="sm"
          onSubmit={searchRooms}
        />

        <select
          className="room-directory__server-select"
          value={selectedServer}
          onChange={(e) => setSelectedServer(e.target.value)}
        >
          <option value="">All servers</option>
          {servers.map(server => (
            <option key={server.name} value={server.name}>
              {server.name}
            </option>
          ))}
        </select>

        <button
          className="room-directory__search-btn"
          onClick={searchRooms}
          disabled={isLoading}
        >
          {isLoading ? (
            <Icon name="loader" size={14} className="spin" />
          ) : (
            <Icon name="search" size={14} />
          )}
          Search
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="room-directory__error">
          <Icon name="alertCircle" size={14} />
          {error}
        </div>
      )}

      {/* Results */}
      <div className="room-directory__results">
        {isLoading ? (
          <div className="room-directory__loading">
            <Icon name="loader" size={24} className="spin" />
            <span>Searching rooms...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="room-directory__empty">
            <Icon name="messageSquare" size={32} />
            <span>No rooms found</span>
            <span className="room-directory__empty-hint">
              Try searching or selecting a different server
            </span>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.roomId} className="room-directory__room">
              <div className="room-directory__room-info">
                <div className="room-directory__room-header">
                  <span className="room-directory__room-name">
                    {room.name}
                  </span>
                  <span className="room-directory__room-members">
                    <Icon name="users" size={12} />
                    {room.memberCount}
                  </span>
                </div>

                {room.alias && (
                  <div className="room-directory__room-alias">
                    {room.alias}
                  </div>
                )}

                {room.topic && (
                  <div className="room-directory__room-topic">
                    {room.topic}
                  </div>
                )}

                <div className="room-directory__room-badges">
                  {room.isWorldReadable && (
                    <span className="room-directory__badge room-directory__badge--readable">
                      <Icon name="eye" size={10} />
                      Public
                    </span>
                  )}
                  {room.guestCanJoin && (
                    <span className="room-directory__badge room-directory__badge--guest">
                      <Icon name="userPlus" size={10} />
                      Guests allowed
                    </span>
                  )}
                </div>
              </div>

              <button
                className="room-directory__join-btn"
                onClick={() => joinRoom(room)}
                disabled={isJoining && joiningRoomId === room.roomId}
              >
                {isJoining && joiningRoomId === room.roomId ? (
                  <>
                    <Icon name="loader" size={14} className="spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Icon name="logIn" size={14} />
                    Join
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Help Text */}
      <div className="room-directory__help">
        <Icon name="info" size={12} />
        <span>
          Join public Matrix rooms from other servers. Rooms will be added to your current project.
        </span>
      </div>
    </div>
  );
}

export default RoomDirectory;
