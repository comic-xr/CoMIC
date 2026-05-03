/**
 * @file ChannelSelector.jsx
 * @description Dropdown to select voice channel/room.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} Channel
 * @property {string} id - Channel ID
 * @property {string} name - Channel name
 * @property {number} [participants] - Number of participants
 */

/**
 * @typedef {Object} ChannelSelectorProps
 * @property {Array<Channel>} channels - Available channels
 * @property {string} currentChannel - Current channel ID
 * @property {function} onSelect - Callback when channel is selected
 * @property {boolean} [disabled] - Whether selector is disabled
 */

/**
 * Channel selector component.
 * Provides dropdown to select voice channel.
 *
 * @param {ChannelSelectorProps} props - Component props
 * @returns {React.ReactElement} The rendered selector
 */
export function ChannelSelector({ channels, currentChannel, onSelect, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = channels.find(c => c.id === currentChannel) || channels[0];

    return (
        <div className="channel-selector">
            <button
                className="channel-selector__trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <Icon name="radio" size={14} className="channel-selector__icon" />
                <span className="channel-selector__name">{current?.name || 'Select Room'}</span>
                {current?.participants > 0 && (
                    <span className="channel-selector__count">{current.participants}</span>
                )}
                <Icon name="chevronDown" size={12} className={`channel-selector__chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="channel-selector__backdrop" onClick={() => setIsOpen(false)} />
                    <div className="channel-selector__dropdown">
                        {channels.map(channel => (
                            <button
                                key={channel.id}
                                className={`channel-selector__option ${channel.id === currentChannel ? 'active' : ''}`}
                                onClick={() => {
                                    onSelect(channel.id);
                                    setIsOpen(false);
                                }}
                            >
                                <Icon name="radio" size={12} />
                                <span className="channel-selector__option-name">{channel.name}</span>
                                {channel.participants > 0 && (
                                    <span className="channel-selector__option-count">{channel.participants}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default ChannelSelector;