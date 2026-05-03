/**
 * @file ModeToggle.jsx
 * @description Toggle between Tile and Tabs canvas display modes
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

/**
 * Mode configurations
 */
const MODES = [
    { id: 'tile', icon: 'layoutGrid', label: 'Tile' },
    { id: 'tabs', icon: 'square', label: 'Tabs' },
];

/**
 * ModeToggle - Switch between tile and tabs canvas modes
 */
const ModeToggle = memo(function ModeToggle({ mode, onModeChange }) {
    return (
        <div className="mode-toggle">
            {MODES.map(m => (
                <button
                    key={m.id}
                    className={`mode-toggle__btn ${mode === m.id ? 'mode-toggle__btn--active' : ''}`}
                    onClick={() => onModeChange?.(m.id)}
                >
                    <Icon name={m.icon} size={14} />
                    <span>{m.label}</span>
                </button>
            ))}
        </div>
    );
});

ModeToggle.propTypes = {
    mode: PropTypes.oneOf(['tile', 'tabs']).isRequired,
    onModeChange: PropTypes.func,
};

export { ModeToggle };
export default ModeToggle;
