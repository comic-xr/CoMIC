/**
 * @file PopoutManager.jsx
 * @description Popout manager section - only visible when popouts exist.
 * Shows a button with count that opens a dropdown to manage floating windows.
 */

import React, { memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const PopoutManager = memo(function PopoutManager({
    popouts = [],
    showDropdown,
    onToggleDropdown,
    onCloseDropdown,
    onFocusPopout,
    onClosePopout,
    onTileAll,
    onCloseAll,
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

    if (popouts.length === 0) return null;

    return (
        <div className="workspace-bar__popout-manager" ref={dropdownRef}>
            <button
                className="workspace-bar__manager-btn"
                onClick={onToggleDropdown}
                title="Manage Popouts"
            >
                <Icon name="copy" size={12} />
                <span>{popouts.length}</span>
            </button>

            {showDropdown && (
                <div className="workspace-bar__manager-dropdown workspace-bar__manager-dropdown--popout">
                    <div className="workspace-bar__manager-dropdown-content">
                        <div className="workspace-bar__manager-dropdown-header">
                            Floating Windows
                        </div>

                        {popouts.map(p => (
                            <div key={p.id} className="workspace-bar__popout-item">
                                <span className="workspace-bar__popout-dot" style={{ background: p.color }} />
                                <span className="workspace-bar__popout-name">{p.name}</span>
                                <button
                                    className="workspace-bar__popout-action"
                                    onClick={() => onFocusPopout?.(p.id)}
                                    title="Focus"
                                >
                                    <Icon name="maximize" size={10} />
                                </button>
                                <button
                                    className="workspace-bar__popout-action"
                                    onClick={() => onClosePopout?.(p.id)}
                                    title="Close"
                                >
                                    <Icon name="close" size={10} />
                                </button>
                            </div>
                        ))}

                        <div className="workspace-bar__manager-dropdown-divider" />

                        <button
                            className="workspace-bar__manager-dropdown-action"
                            onClick={() => { onTileAll?.(); onCloseDropdown(); }}
                        >
                            <Icon name="grid" size={10} />
                            Tile All
                        </button>
                        <button
                            className="workspace-bar__manager-dropdown-action workspace-bar__manager-dropdown-action--danger"
                            onClick={() => { onCloseAll?.(); onCloseDropdown(); }}
                        >
                            <Icon name="close" size={10} />
                            Close All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

PopoutManager.propTypes = {
    popouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    })),
    showDropdown: PropTypes.bool,
    onToggleDropdown: PropTypes.func,
    onCloseDropdown: PropTypes.func,
    onFocusPopout: PropTypes.func,
    onClosePopout: PropTypes.func,
    onTileAll: PropTypes.func,
    onCloseAll: PropTypes.func,
};

export { PopoutManager };
export default PopoutManager;
