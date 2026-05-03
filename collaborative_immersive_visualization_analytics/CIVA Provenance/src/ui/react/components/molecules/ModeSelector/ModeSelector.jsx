/**
 * ModeSelector Component
 *
 * Three-way toggle for selecting link mode: Follow, Sync, or Broadcast.
 * Shows icon, label, and description for each mode.
 *
 * @module ModeSelector
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { LINK_MODES } from '@UI/react/components/organisms/LinkManagerPanels/linkConstants';
import './ModeSelector.scss';

// Mode order for display
const MODE_ORDER = ['follow', 'sync', 'broadcast'];

/**
 * ModeSelector - Three-way link direction toggle
 *
 * @param {string} currentMode - Currently selected mode ID
 * @param {function} onChange - Mode change handler (modeId) => void
 * @param {string} color - Accent color for active state
 * @param {string} label - Section label (default: "Your Mode in This Group")
 * @param {string} className - Additional CSS classes
 */
export const ModeSelector = memo(function ModeSelector({
    currentMode = 'sync',
    onChange,
    color = 'var(--color-accent-teal)',
    label = 'Your Mode in This Group',
    className = '',
}) {
    return (
        <div className={`mode-selector ${className}`} style={{ '--mode-color': color }}>
            {label && <span className="mode-selector__label">{label}</span>}
            <div className="mode-selector__options">
                {MODE_ORDER.map((modeId) => {
                    const mode = LINK_MODES[modeId];
                    if (!mode) return null;

                    const isActive = currentMode === modeId || (currentMode === 'bidirectional' && modeId === 'sync');

                    return (
                        <button
                            key={modeId}
                            className={`mode-selector__option ${isActive ? 'mode-selector__option--active' : ''}`}
                            onClick={() => onChange(modeId)}
                            title={mode.description}
                        >
                            <span className="mode-selector__icon-char">{mode.iconChar}</span>
                            <span className="mode-selector__name">{mode.label}</span>
                            <span className="mode-selector__desc">{mode.description}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default ModeSelector;
