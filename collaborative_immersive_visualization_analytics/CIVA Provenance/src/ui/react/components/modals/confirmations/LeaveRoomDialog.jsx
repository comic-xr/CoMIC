/**
 * @file LeaveRoomDialog.jsx
 * @description Confirmation dialog for leaving a collaboration room.
 * Warns user about disconnection from real-time collaboration session.
 *
 * @see Modal_Design_Specification.md - Group 1: Confirmation Dialogs
 *
 * @example
 * <LeaveRoomDialog
 *   isOpen={showLeaveRoom}
 *   onClose={() => setShowLeaveRoom(false)}
 *   room={{ id: 'room-1', name: 'Team Analysis Session' }}
 *   onConfirm={() => leaveRoom(room.id)}
 * />
 */

import React from 'react';
import ConfirmationDialog from '../ConfirmationDialog';

/**
 * @typedef {Object} Room
 * @property {string} id - Room ID
 * @property {string} name - Room name
 * @property {number} [participantCount] - Number of current participants
 */

/**
 * @typedef {Object} LeaveRoomDialogProps
 * @property {boolean} isOpen - Whether dialog is visible
 * @property {() => void} onClose - Close handler
 * @property {Room} room - Room to leave
 * @property {() => void} onConfirm - Leave confirmation handler
 */

/**
 * Confirmation dialog for leaving a collaboration room.
 * Informs user they will be disconnected from the real-time session.
 *
 * @param {LeaveRoomDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered dialog
 */
export function LeaveRoomDialog({
    isOpen,
    onClose,
    room,
    onConfirm,
}) {
    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    const roomName = room?.name || 'this room';
    const participantInfo = room?.participantCount > 1
        ? ` ${room.participantCount - 1} other participant${room.participantCount > 2 ? 's' : ''} will remain in the session.`
        : '';

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Leave Room?"
            description={`You will be disconnected from "${roomName}" and stop receiving real-time updates.${participantInfo}`}
            severity="warning"
            confirmLabel="Leave Room"
            onConfirm={handleConfirm}
            testId="leave-room-dialog"
        />
    );
}

export default LeaveRoomDialog;
