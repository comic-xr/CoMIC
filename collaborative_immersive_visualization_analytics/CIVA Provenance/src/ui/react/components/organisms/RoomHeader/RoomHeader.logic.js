/**
 * @file RoomHeader.logic.js
 * @description Business logic hooks for the new RoomHeader component.
 *
 * Manages viewing room, pinned rooms, voice/breakout state, and dropdown visibility.
 * Key architectural concept: viewing room and voice room are INDEPENDENT.
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Configuration constants
 */
export const ROOM_HEADER_CONFIG = {
    maxPinnedRooms: 4,
    pinnedPillMaxWidth: 50,
};

/**
 * Hook to manage the Room section (viewing dropdown + presence).
 * Returns viewing room data and room categorization.
 */
export function useRoomSection(rooms, viewingRoomId, voiceRoomId, pinnedRoomIds) {
    const viewingRoom = useMemo(() =>
        rooms.find(r => r.id === viewingRoomId) || null,
        [rooms, viewingRoomId]
    );

    const mainRooms = useMemo(() =>
        rooms.filter(r => r.type === 'main'),
        [rooms]
    );

    const personalRooms = useMemo(() =>
        rooms.filter(r => r.type === 'personal'),
        [rooms]
    );

    return { viewingRoom, mainRooms, personalRooms };
}

/**
 * Hook to manage the Pinned section.
 * Pinned rooms exclude the currently viewing room.
 */
export function usePinnedSection(rooms, viewingRoomId, pinnedRoomIds) {
    const pinnedRooms = useMemo(() =>
        rooms.filter(r => pinnedRoomIds.includes(r.id) && r.id !== viewingRoomId),
        [rooms, pinnedRoomIds, viewingRoomId]
    );

    return { pinnedRooms };
}

/**
 * Hook to manage voice state including breakouts.
 * Voice room and breakout are mutually exclusive.
 */
export function useVoiceState(rooms, voiceRoomId, activeBreakoutId, breakouts) {
    const voiceRoom = useMemo(() =>
        rooms.find(r => r.id === voiceRoomId) || null,
        [rooms, voiceRoomId]
    );

    const activeBreakout = useMemo(() =>
        (breakouts || []).find(b => b.id === activeBreakoutId) || null,
        [breakouts, activeBreakoutId]
    );

    const isInVoice = !!voiceRoomId || !!activeBreakoutId;
    const isInBreakout = !!activeBreakoutId;

    const currentVoiceName = isInBreakout
        ? activeBreakout?.name
        : voiceRoom?.name;

    const currentVoiceUsers = isInBreakout
        ? activeBreakout?.usersInVoice
        : voiceRoom?.usersInVoice;

    const availableVoiceRooms = useMemo(() =>
        rooms.filter(r => r.id !== voiceRoomId && r.type !== 'personal'),
        [rooms, voiceRoomId]
    );

    return {
        voiceRoom,
        activeBreakout,
        isInVoice,
        isInBreakout,
        currentVoiceName,
        currentVoiceUsers,
        availableVoiceRooms,
    };
}

/**
 * Hook to manage all dropdown visibility states.
 * Only one dropdown open at a time.
 */
export function useDropdowns() {
    const [showViewingDropdown, setShowViewingDropdown] = useState(false);
    const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
    const [showJoinDropdown, setShowJoinDropdown] = useState(false);

    const closeAll = useCallback(() => {
        setShowViewingDropdown(false);
        setShowVoiceDropdown(false);
        setShowJoinDropdown(false);
    }, []);

    const toggleViewing = useCallback(() => {
        setShowViewingDropdown(prev => !prev);
        setShowVoiceDropdown(false);
        setShowJoinDropdown(false);
    }, []);

    const toggleVoice = useCallback(() => {
        setShowVoiceDropdown(prev => !prev);
        setShowViewingDropdown(false);
        setShowJoinDropdown(false);
    }, []);

    const toggleJoin = useCallback(() => {
        setShowJoinDropdown(prev => !prev);
        setShowViewingDropdown(false);
        setShowVoiceDropdown(false);
    }, []);

    return {
        showViewingDropdown,
        showVoiceDropdown,
        showJoinDropdown,
        toggleViewing,
        toggleVoice,
        toggleJoin,
        closeAll,
    };
}
