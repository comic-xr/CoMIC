/**
 * @file ParticipantCard.jsx
 * @description Voice participant display with status indicators.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} Participant
 * @property {string} id - Participant ID
 * @property {string} [name] - Display name
 * @property {string} [identity] - Participant identity
 * @property {string} [color] - Accent color
 * @property {boolean} isSpeaking - Whether currently speaking
 * @property {boolean} isMuted - Whether muted
 * @property {boolean} isLocal - Whether this is the local user
 */

/**
 * @typedef {Object} ParticipantCardProps
 * @property {Participant} participant - The participant to display
 * @property {function} [onAdjustVolume] - Callback to adjust volume
 */

/**
 * Participant card component.
 * Displays voice participant with status and controls.
 *
 * @param {ParticipantCardProps} props - Component props
 * @returns {React.ReactElement} The rendered card
 */
export function ParticipantCard({ participant, onAdjustVolume }) {
    return (
        <div className={`participant-card ${participant.isSpeaking ? 'participant-card--speaking' : ''}`}>
            <div
                className="participant-card__avatar"
                style={{ '--user-color': participant.color }}
            >
                {(participant.name || participant.identity || '?').charAt(0).toUpperCase()}
                {participant.isSpeaking && (
                    <div className="participant-card__speaking-indicator">
                        <Icon name="circle" size={8} />
                    </div>
                )}
            </div>

            <div className="participant-card__info">
                <div className="participant-card__name">
                    {participant.name || participant.identity}
                    {participant.isLocal && <span className="participant-card__you"> (You)</span>}
                </div>
                <div className="participant-card__status">
                    {participant.isMuted && <Icon name="micOff" size={10} />}
                    {!participant.isMuted && (
                        <span className={`participant-card__status-text ${participant.isSpeaking ? 'participant-card__status-text--speaking' : ''}`}>
                            {participant.isSpeaking ? 'Talking now' : 'Connected'}
                        </span>
                    )}
                </div>
            </div>

            {!participant.isLocal && (
                <div className="participant-card__actions">
                    <button
                        className="participant-card__volume-btn"
                        title="Adjust volume"
                        onClick={() => onAdjustVolume?.(participant.id)}
                    >
                        <Icon name="volume" size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default ParticipantCard;