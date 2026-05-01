/**
 * OverlayPanelHeader - Panel header with context-aware buttons
 *
 * Shows different actions based on panel state:
 * - Preview mode: Shows "Pin" button to convert to pinned
 * - Pinned mode: Shows "Close" button
 * - Always shows pop-out button if onPopOut is provided
 *
 * @module OverlayPanelHeader
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms';
import './OverlayPanelHeader.scss';

/**
 * OverlayPanelHeader Component
 *
 * @param {Object} props
 * @param {string} props.title - Panel title
 * @param {boolean} props.isPreview - Whether in preview mode (default false)
 * @param {Function} props.onClose - Close handler (pinned mode)
 * @param {Function} props.onPin - Pin handler (preview mode)
 * @param {Function} props.onPopOut - Pop-out handler (optional)
 */
export function OverlayPanelHeader({
    title,
    isPreview = false,
    onClose,
    onPin,
    onPopOut,
}) {
    return (
        <div className="overlay-panel-header">
            {title && <h3 className="overlay-panel-header__title">{title}</h3>}

            <div className="overlay-panel-header__actions">
                {/* Pop-out button (always visible if handler provided) */}
                {onPopOut && (
                    <IconButton
                        icon="externalLink"
                        size="sm"
                        variant="ghost"
                        title="Undock panel"
                        onClick={onPopOut}
                    />
                )}

                {/* Context-aware button */}
                {isPreview ? (
                    <button
                        className="overlay-panel-header__pin"
                        onClick={onPin}
                        title="Pin panel open"
                    >
                        <Icon name="push_pin" size={14} />
                        <span>Pin</span>
                    </button>
                ) : (
                    <IconButton
                        icon="close"
                        size="sm"
                        variant="ghost"
                        title="Close panel"
                        onClick={onClose}
                    />
                )}
            </div>
        </div>
    );
}

export default OverlayPanelHeader;
