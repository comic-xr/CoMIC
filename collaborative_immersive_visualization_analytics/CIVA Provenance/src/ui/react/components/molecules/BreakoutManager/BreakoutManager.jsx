/**
 * @file BreakoutManager.jsx
 * @description Manager dropdown for workspace voice breakouts
 *
 * Features:
 * - List of workspaces with active breakouts
 * - Join/leave breakout actions
 * - Shows user count per breakout
 * - Only visible when breakouts exist
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import './BreakoutManager.scss';

/**
 * BreakoutManager - Manage workspace voice breakouts
 */
const BreakoutManager = memo(function BreakoutManager({
    workspaces = [],
    currentBreakoutId,
    onJoinBreakout,
    onLeaveBreakout,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter to only open workspaces with breakouts
    const breakouts = workspaces.filter(w => w.isOpen && w.hasBreakout);

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

    // Don't render if no breakouts
    if (breakouts.length === 0) return null;

    const inBreakout = !!currentBreakoutId;
    const currentBreakout = workspaces.find(w => w.id === currentBreakoutId);

    const handleJoin = (workspaceId) => {
        onJoinBreakout?.(workspaceId);
        setIsOpen(false);
    };

    const handleLeave = () => {
        onLeaveBreakout?.();
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="breakout-manager">
            {/* Trigger button */}
            <button
                className={`breakout-manager__trigger ${inBreakout ? 'breakout-manager__trigger--active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Icon name="mic" size={14} />
                <span>{inBreakout ? currentBreakout?.name : breakouts.length}</span>
                <Icon
                    name="chevronDown"
                    size={12}
                    className={`breakout-manager__chevron ${isOpen ? 'breakout-manager__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="breakout-manager__dropdown">
                    <div className="breakout-manager__header">
                        Workspace Breakouts ({breakouts.length})
                    </div>

                    <div className="breakout-manager__list">
                        {breakouts.map((workspace) => {
                            const isInThis = currentBreakoutId === workspace.id;

                            return (
                                <div
                                    key={workspace.id}
                                    className={`breakout-manager__item ${isInThis ? 'breakout-manager__item--active' : ''}`}
                                >
                                    <Icon
                                        name="mic"
                                        size={12}
                                        className="breakout-manager__item-icon"
                                    />
                                    <span className="breakout-manager__item-name">
                                        {workspace.name}
                                    </span>
                                    <span className="breakout-manager__item-count">
                                        {workspace.breakoutUsers}
                                    </span>

                                    {isInThis ? (
                                        <button
                                            className="breakout-manager__item-btn breakout-manager__item-btn--leave"
                                            onClick={handleLeave}
                                        >
                                            Leave
                                        </button>
                                    ) : (
                                        <button
                                            className="breakout-manager__item-btn breakout-manager__item-btn--join"
                                            onClick={() => handleJoin(workspace.id)}
                                        >
                                            Join
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

BreakoutManager.propTypes = {
    workspaces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        isOpen: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    })),
    currentBreakoutId: PropTypes.string,
    onJoinBreakout: PropTypes.func,
    onLeaveBreakout: PropTypes.func,
};

export { BreakoutManager };
export default BreakoutManager;
