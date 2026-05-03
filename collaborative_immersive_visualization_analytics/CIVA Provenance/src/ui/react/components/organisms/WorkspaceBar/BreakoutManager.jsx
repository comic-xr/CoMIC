/**
 * @file BreakoutManager.jsx
 * @description Breakout manager section - only visible when breakouts exist.
 * Purple themed button with count that opens a dropdown to manage voice breakouts.
 */

import React, { memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const BreakoutManager = memo(function BreakoutManager({
    breakouts = [],
    showDropdown,
    onToggleDropdown,
    onCloseDropdown,
    onJoinBreakout,
    onCreateBreakout,
}) {
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!showDropdown) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onCloseDropdown();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown, onCloseDropdown]);

    if (breakouts.length === 0) return null;

    return (
        <div className="workspace-bar__breakout-manager" ref={dropdownRef}>
            <button
                className="workspace-bar__manager-btn workspace-bar__manager-btn--breakout"
                onClick={onToggleDropdown}
                title="Manage Breakouts"
            >
                <Icon name="gitBranch" size={12} />
                <span>{breakouts.length}</span>
            </button>

            {showDropdown && (
                <div className="workspace-bar__manager-dropdown workspace-bar__manager-dropdown--breakout">
                    <div className="workspace-bar__manager-dropdown-content">
                        <div className="workspace-bar__manager-dropdown-header workspace-bar__manager-dropdown-header--purple">
                            Workspace Breakouts
                        </div>

                        {breakouts.map(b => (
                            <div key={b.id} className="workspace-bar__breakout-item">
                                <Icon name="gitBranch" size={12} className="workspace-bar__breakout-item-icon" />
                                <div className="workspace-bar__breakout-item-info">
                                    <span className="workspace-bar__breakout-item-name">{b.name}</span>
                                    <span className="workspace-bar__breakout-item-count">{b.usersInVoice} in voice</span>
                                </div>
                                <button
                                    className="workspace-bar__breakout-join"
                                    onClick={() => { onJoinBreakout?.(b.id); onCloseDropdown(); }}
                                >
                                    Join
                                </button>
                            </div>
                        ))}

                        <div className="workspace-bar__manager-dropdown-divider" />

                        <button
                            className="workspace-bar__manager-dropdown-action workspace-bar__manager-dropdown-action--purple"
                            onClick={() => { onCreateBreakout?.(); onCloseDropdown(); }}
                        >
                            <Icon name="plus" size={10} />
                            Create Breakout for Current Workspace
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

BreakoutManager.propTypes = {
    breakouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        usersInVoice: PropTypes.number,
    })),
    showDropdown: PropTypes.bool,
    onToggleDropdown: PropTypes.func,
    onCloseDropdown: PropTypes.func,
    onJoinBreakout: PropTypes.func,
    onCreateBreakout: PropTypes.func,
};

export { BreakoutManager };
export default BreakoutManager;
