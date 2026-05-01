// src/ui/react/components/panels/FloatingPanel/PopOutButton.jsx
// Button to pop out a panel from the docked position

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { usePanelPopOut } from './FloatingPanelContext';
import './FloatingPanel.scss';

/**
 * PopOutButton - Button to toggle panel pop-out state
 *
 * @param {string} panelId - Unique panel identifier
 * @param {string} title - Panel title for the floating window
 * @param {React.Element} icon - Icon component
 * @param {string} color - Accent color
 * @param {string} className - Additional CSS classes
 */
export function PopOutButton({
    panelId,
    title,
    icon,
    color = 'blue',
    className = '',
}) {
    const { poppedOut, popOut, dock } = usePanelPopOut(panelId, {
        title,
        icon,
        color,
    });

    const handleClick = (e) => {
        e.stopPropagation();
        if (poppedOut) {
            dock();
        } else {
            // Calculate initial position based on click location
            const rect = e.currentTarget.getBoundingClientRect();
            popOut({
                x: rect.left,
                y: rect.bottom + 8,
            });
        }
    };

    return (
        <button
            className={`panel-pop-out-btn ${poppedOut ? 'panel-pop-out-btn--active' : ''} ${className}`}
            onClick={handleClick}
            title={poppedOut ? 'Dock panel' : 'Pop out panel'}
            aria-label={poppedOut ? 'Dock panel' : 'Pop out panel'}
        >
            {poppedOut ? <Icon name="pin" size={14} /> : <Icon name="externalLink" size={14} />}
        </button>
    );
}

export default PopOutButton;