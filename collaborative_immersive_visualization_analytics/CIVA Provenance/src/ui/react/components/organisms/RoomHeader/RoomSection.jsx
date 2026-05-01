/**
 * @file RoomSection.jsx
 * @description ROOM section of the RoomHeader: viewing dropdown + presence count.
 *
 * Shows which room the user is currently viewing (Eye icon + room name dropdown)
 * and how many users are online in that room.
 */

import React, { memo, useRef, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';

const RoomSection = memo(function RoomSection({
    viewingRoom,
    viewingRoomId,
    voiceRoomId,
    pinnedRoomIds = [],
    mainRooms = [],
    personalRooms = [],
    showDropdown,
    onToggleDropdown,
    onCloseDropdown,
    onSelectRoom,
    onTogglePin,
    onCreateRoom,
}) {
    const dropdownRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roomSort, setRoomSort] = useState('name-asc');
    const [roomFilter, setRoomFilter] = useState('all');
    const [roomTag, setRoomTag] = useState(null);

    useEffect(() => {
        if (!showDropdown) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onCloseDropdown();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown, onCloseDropdown]);

    const allRooms = useMemo(() => (
        [
            ...mainRooms.map((room) => ({ ...room, _group: 'project' })),
            ...personalRooms.map((room) => ({ ...room, _group: 'personal' })),
        ]
    ), [mainRooms, personalRooms]);

    const roomTags = useMemo(() => {
        const tags = new Set();
        allRooms.forEach((room) => {
            if (Array.isArray(room.tags)) {
                room.tags.forEach((tag) => tags.add(tag));
            }
        });
        return Array.from(tags);
    }, [allRooms]);

    const filteredRooms = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const hasQuery = Boolean(query);
        const isPinned = (room) => pinnedRoomIds.includes(room.id);

        let rooms = allRooms.filter((room) => {
            if (hasQuery && !(room.name || '').toLowerCase().includes(query)) return false;
            if (roomFilter === 'project' && room._group !== 'project') return false;
            if (roomFilter === 'personal' && room._group !== 'personal') return false;
            if (roomFilter === 'pinned' && !isPinned(room)) return false;
            if (roomTag && (!Array.isArray(room.tags) || !room.tags.includes(roomTag))) return false;
            return true;
        });

        const sorters = {
            'name-asc': (a, b) => (a.name || '').localeCompare(b.name || ''),
            'name-desc': (a, b) => (b.name || '').localeCompare(a.name || ''),
            'users-desc': (a, b) => (b.usersOnline || 0) - (a.usersOnline || 0),
            'pinned-first': (a, b) => Number(isPinned(b)) - Number(isPinned(a)),
        };

        const sorter = sorters[roomSort] || sorters['name-asc'];
        return rooms.slice().sort(sorter);
    }, [allRooms, searchQuery, roomFilter, roomSort, roomTag, pinnedRoomIds]);

    const filteredProjectRooms = filteredRooms.filter((room) => room._group === 'project');
    const filteredPersonalRooms = filteredRooms.filter((room) => room._group === 'personal');

    useEffect(() => {
        if (!showDropdown) return;
        setSearchQuery('');
        setRoomTag(null);
    }, [showDropdown]);

    return (
        <div className="room-header__section room-header__room-section" ref={dropdownRef}>
            {/* Viewing Room Dropdown Trigger */}
            <button
                className="room-header__viewing-btn"
                onClick={onToggleDropdown}
            >
                <span
                    className="room-header__viewing-icon"
                    style={{ '--room-color': viewingRoom?.color }}
                >
                    <Icon name="eye" size={12} />
                </span>
                <span className="room-header__viewing-name">
                    {viewingRoom?.name || 'No Room'}
                </span>
                <Icon name="chevronDown" size={12} className="room-header__viewing-chevron" />
            </button>

            {/* Presence Count */}
            <div className="room-header__presence">
                <Icon name="users" size={12} />
                <span>{viewingRoom?.usersOnline || 0}</span>
            </div>

            {/* Room Picker Dropdown */}
            {showDropdown && (
                <div className="room-header__room-dropdown">
                    <div className="room-header__dropdown-content">
                        <SearchInput
                            className="room-header__dropdown-search"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search rooms..."
                            size="sm"
                            autoFocus
                        />
                        <div className="room-header__dropdown-controls">
                            <div className="room-header__filter-row">
                                {['all', 'project', 'personal', 'pinned'].map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        className={`room-header__filter-chip ${roomFilter === filter ? 'is-active' : ''}`}
                                        onClick={() => setRoomFilter(filter)}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            {roomTags.length > 0 && (
                                <div className="room-header__tag-row">
                                    {roomTags.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`room-header__tag-chip ${roomTag === tag ? 'is-active' : ''}`}
                                            onClick={() => setRoomTag(roomTag === tag ? null : tag)}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <label className="room-header__sort">
                                <span>Sort</span>
                                <select value={roomSort} onChange={(e) => setRoomSort(e.target.value)}>
                                    <option value="name-asc">Name A–Z</option>
                                    <option value="name-desc">Name Z–A</option>
                                    <option value="users-desc">Users high→low</option>
                                    <option value="pinned-first">Pinned first</option>
                                </select>
                            </label>
                        </div>
                        <div className="room-header__dropdown-divider" />
                        {/* Project Rooms */}
                        {filteredProjectRooms.length > 0 && (
                            <>
                                <div className="room-header__dropdown-group-label room-header__dropdown-group-label--blue">
                                    <Icon name="globe" size={10} />
                                    Project Rooms
                                </div>
                                {filteredProjectRooms.map(room => {
                                    const isViewing = room.id === viewingRoomId;
                                    const isPinned = pinnedRoomIds.includes(room.id);
                                    const isVoice = room.id === voiceRoomId;
                                    return (
                                        <div
                                            key={room.id}
                                            className={`room-header__dropdown-row ${isViewing ? 'room-header__dropdown-row--active' : ''}`}
                                        >
                                            <button
                                                className="room-header__dropdown-item"
                                                onClick={() => {
                                                    onSelectRoom(room.id);
                                                    onCloseDropdown();
                                                }}
                                            >
                                                <span className="room-header__dropdown-dot" style={{ background: room.color }} />
                                                <span className="room-header__dropdown-name">{room.name}</span>
                                                {isViewing && <Icon name="check" size={12} className="room-header__dropdown-check" />}
                                                {isVoice && <Icon name="mic" size={10} className="room-header__dropdown-voice" />}
                                                <span className="room-header__dropdown-count">{room.usersOnline}</span>
                                            </button>
                                            <button
                                                className={`room-header__dropdown-pin ${isPinned ? 'room-header__dropdown-pin--active' : ''}`}
                                                onClick={() => onTogglePin(room.id)}
                                                title={isPinned ? 'Unpin' : 'Pin to header'}
                                            >
                                                <Icon name="pin" size={10} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* Personal Rooms */}
                        {filteredPersonalRooms.length > 0 && (
                            <>
                                <div className="room-header__dropdown-group-label room-header__dropdown-group-label--green">
                                    <Icon name="user" size={10} />
                                    Personal
                                </div>
                                {filteredPersonalRooms.map(room => (
                                    <button
                                        key={room.id}
                                        className={`room-header__dropdown-item room-header__dropdown-item--full ${room.id === viewingRoomId ? 'room-header__dropdown-item--active' : ''}`}
                                        onClick={() => {
                                            onSelectRoom(room.id);
                                            onCloseDropdown();
                                        }}
                                    >
                                        <span className="room-header__dropdown-dot" style={{ background: room.color }} />
                                        <span className="room-header__dropdown-name">{room.name}</span>
                                        {room.id === viewingRoomId && <Icon name="check" size={12} className="room-header__dropdown-check" />}
                                    </button>
                                ))}
                            </>
                        )}

                        {/* Divider + Create Room */}
                        <div className="room-header__dropdown-divider" />
                        <button
                            className="room-header__dropdown-action"
                            onClick={() => {
                                onCreateRoom?.();
                                onCloseDropdown();
                            }}
                        >
                            <Icon name="plus" size={12} />
                            Create Room
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

RoomSection.propTypes = {
    viewingRoom: PropTypes.object,
    viewingRoomId: PropTypes.string,
    voiceRoomId: PropTypes.string,
    pinnedRoomIds: PropTypes.arrayOf(PropTypes.string),
    mainRooms: PropTypes.array,
    personalRooms: PropTypes.array,
    showDropdown: PropTypes.bool,
    onToggleDropdown: PropTypes.func.isRequired,
    onCloseDropdown: PropTypes.func.isRequired,
    onSelectRoom: PropTypes.func.isRequired,
    onTogglePin: PropTypes.func,
    onCreateRoom: PropTypes.func,
};

export { RoomSection };
export default RoomSection;
