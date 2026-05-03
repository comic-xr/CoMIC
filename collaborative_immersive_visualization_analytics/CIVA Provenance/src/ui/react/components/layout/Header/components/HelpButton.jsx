/**
 * @file HelpButton.jsx
 * @description Button that opens the help modal.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Help button that opens help modal.
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onOpen] - Callback to open help modal
 */
export function HelpButton({ onOpen }) {
    return (
        <button
            className="header__icon-btn"
            onClick={onOpen}
            title="Help"
            aria-label="Open help"
            type="button"
        >
            <Icon name="help" size={18} />
        </button>
    );
}

export default HelpButton;