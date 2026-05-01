/**
 * @file PopoutManager.jsx
 * @description Manager dropdown for all active popout windows
 *
 * Features:
 * - List of active popouts with bring-to-front and close actions
 * - Edge snap and grid snap toggles
 * - Tile all and close all bulk actions
 * - Only visible when popouts exist
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon, Button } from '@UI/react/components/atoms';
import './PopoutManager.scss';

/**
 * PopoutManager - Manage all active popout windows
 */
const PopoutManager = memo(function PopoutManager({
    popouts = [],
    onBringToFront,
    onClose,
    onTileAll,
    onCloseAll,
    snapEnabled = true,
    onToggleSnap,
    gridSnapEnabled = false,
    onToggleGridSnap,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Don't render if no popouts
    if (popouts.length === 0) return null;

    const handleBringToFront = (id) => {
        onBringToFront?.(id);
    };

    const handleClose = (id) => {
        onClose?.(id);
    };

    const handleTileAll = () => {
        onTileAll?.();
        setIsOpen(false);
    };

    const handleCloseAll = () => {
        onCloseAll?.();
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="popout-manager">
            {/* Trigger button */}
            <button
                className={`popout-manager__trigger ${isOpen ? 'popout-manager__trigger--active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Icon name="externalLink" size={14} />
                <span>{popouts.length}</span>
                <Icon
                    name="chevronDown"
                    size={12}
                    className={`popout-manager__chevron ${isOpen ? 'popout-manager__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="popout-manager__dropdown">
                    <div className="popout-manager__header">
                        Active Popouts ({popouts.length})
                    </div>

                    {/* Snap settings */}
                    <div className="popout-manager__snap-settings">
                        <label className="popout-manager__snap-option">
                            <input
                                type="checkbox"
                                checked={snapEnabled}
                                onChange={onToggleSnap}
                            />
                            <span>Edge Snap</span>
                        </label>
                        <label className="popout-manager__snap-option">
                            <input
                                type="checkbox"
                                checked={gridSnapEnabled}
                                onChange={onToggleGridSnap}
                            />
                            <span>Grid Snap</span>
                        </label>
                    </div>

                    <div className="popout-manager__hint">
                        Hold Shift while dragging to disable snap
                    </div>

                    {/* Popout list */}
                    <div className="popout-manager__list">
                        {popouts.map((popout) => (
                            <div key={popout.id} className="popout-manager__item">
                                <div
                                    className="popout-manager__item-color"
                                    style={{ backgroundColor: popout.color }}
                                />
                                <span className="popout-manager__item-name">
                                    {popout.viewName}
                                </span>
                                <button
                                    className="popout-manager__item-action"
                                    onClick={() => handleBringToFront(popout.id)}
                                    title="Bring to front"
                                >
                                    <Icon name="arrowUp" size={12} />
                                </button>
                                <button
                                    className="popout-manager__item-action popout-manager__item-action--close"
                                    onClick={() => handleClose(popout.id)}
                                    title="Close"
                                >
                                    <Icon name="x" size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Bulk actions */}
                    <div className="popout-manager__actions">
                        <button
                            className="popout-manager__action-btn"
                            onClick={handleTileAll}
                        >
                            <Icon name="layoutGrid" size={12} />
                            <span>Tile All</span>
                        </button>
                        <button
                            className="popout-manager__action-btn popout-manager__action-btn--danger"
                            onClick={handleCloseAll}
                        >
                            <Icon name="x" size={12} />
                            <span>Close All</span>
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
        viewName: PropTypes.string.isRequired,
        viewType: PropTypes.string,
        color: PropTypes.string,
    })),
    onBringToFront: PropTypes.func,
    onClose: PropTypes.func,
    onTileAll: PropTypes.func,
    onCloseAll: PropTypes.func,
    snapEnabled: PropTypes.bool,
    onToggleSnap: PropTypes.func,
    gridSnapEnabled: PropTypes.bool,
    onToggleGridSnap: PropTypes.func,
};

export { PopoutManager };
export default PopoutManager;
