/**
 * @file GlobalSearchTrigger.jsx
 * @description Button that opens global search modal with keyboard shortcut support.
 */

import React, { useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Global search trigger button with Cmd/Ctrl + K shortcut.
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onOpen] - Callback to open search modal
 */
export function GlobalSearchTrigger({ onOpen }) {
    // Keyboard shortcut: Cmd/Ctrl + K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onOpen?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onOpen]);

    return (
        <button
            className="header__icon-btn"
            onClick={onOpen}
            title="Search (⌘K)"
            aria-label="Open search"
            type="button"
        >
            <Icon name="search" size={18} />
        </button>
    );
}

export default GlobalSearchTrigger;