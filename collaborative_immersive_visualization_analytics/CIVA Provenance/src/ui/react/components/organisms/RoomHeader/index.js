/**
 * RoomHeader
 * Room-level header bar with section-based layout.
 * Layout: ROOM (viewing + presence) | PINNED | VOICE | CHAT
 */

export { RoomHeader } from './RoomHeader';
export { default } from './RoomHeader';

// Sub-components
export { RoomSection } from './RoomSection';
export { PinnedSection } from './PinnedSection';
export { VoiceSection } from './VoiceSection';
export { ChatSection } from './ChatSection';

// Logic exports
export {
    useRoomSection,
    usePinnedSection,
    useVoiceState,
    useDropdowns,
    ROOM_HEADER_CONFIG,
} from './RoomHeader.logic';
