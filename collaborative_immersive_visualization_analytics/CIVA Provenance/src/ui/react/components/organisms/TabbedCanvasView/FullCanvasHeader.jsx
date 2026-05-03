/**
 * @file FullCanvasHeader.jsx
 * @description Full header for single workspace view in tabs mode
 */

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon, Button } from '@UI/react/components/atoms';

/**
 * Workspace type configurations
 */
const WORKSPACE_TYPE_CONFIG = {
    workspace: { icon: null, prefix: null, color: 'blue' },
    subset: { icon: 'filter', prefix: 'Subset:', color: 'amber' },
    scratch: { icon: 'pencil', prefix: null, color: 'green' },
};

/**
 * FullCanvasHeader - Header for full-size single canvas view
 */
const FullCanvasHeader = memo(function FullCanvasHeader({
    workspace,
    onClose,
    currentBreakoutId,
    onJoinBreakout,
    onLeaveBreakout,
    onToggleGrid,
    onToggleViewGroups,
    onFullscreen,
}) {
    const config = WORKSPACE_TYPE_CONFIG[workspace.type] || WORKSPACE_TYPE_CONFIG.workspace;
    const isInBreakout = currentBreakoutId === workspace.id;

    const handleJoinBreakout = () => {
        onJoinBreakout?.(workspace.id);
    };

    return (
        <div className="full-canvas-header">
            {/* Left section: Type icon, name, breakout */}
            <div className="full-canvas-header__left">
                {/* Type icon */}
                {config.icon && (
                    <Icon
                        name={config.icon}
                        size={14}
                        className={`full-canvas-header__type-icon full-canvas-header__type-icon--${config.color}`}
                    />
                )}

                {/* Unsaved indicator */}
                {workspace.hasChanges && (
                    <span className="full-canvas-header__unsaved-dot" />
                )}

                {/* Name */}
                <span className="full-canvas-header__name">
                    {workspace.name}
                </span>

                {/* Breakout controls */}
                {workspace.hasBreakout && (
                    <div className={`full-canvas-header__breakout ${isInBreakout ? 'full-canvas-header__breakout--active' : ''}`}>
                        <Icon name="mic" size={14} className="full-canvas-header__breakout-icon" />
                        <span className="full-canvas-header__breakout-label">
                            Breakout ({workspace.breakoutUsers})
                        </span>
                        {isInBreakout ? (
                            <button
                                className="full-canvas-header__breakout-btn full-canvas-header__breakout-btn--leave"
                                onClick={onLeaveBreakout}
                            >
                                Leave
                            </button>
                        ) : (
                            <button
                                className="full-canvas-header__breakout-btn full-canvas-header__breakout-btn--join"
                                onClick={handleJoinBreakout}
                            >
                                Join
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Right section: View controls, close */}
            <div className="full-canvas-header__right">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="layoutGrid"
                    title="Grid: 2×2"
                    onClick={onToggleGrid}
                />
                <Button
                    variant="ghost"
                    size="sm"
                    icon="eye"
                    title="Show ViewGroups"
                    onClick={onToggleViewGroups}
                />
                <Button
                    variant="ghost"
                    size="sm"
                    icon="maximize"
                    title="Fullscreen"
                    onClick={onFullscreen}
                />

                <div className="full-canvas-header__separator" />

                <Button
                    variant="ghost"
                    size="sm"
                    icon="x"
                    title="Close workspace"
                    onClick={onClose}
                    className="full-canvas-header__close"
                />
            </div>
        </div>
    );
});

FullCanvasHeader.propTypes = {
    workspace: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    }).isRequired,
    onClose: PropTypes.func,
    currentBreakoutId: PropTypes.string,
    onJoinBreakout: PropTypes.func,
    onLeaveBreakout: PropTypes.func,
    onToggleGrid: PropTypes.func,
    onToggleViewGroups: PropTypes.func,
    onFullscreen: PropTypes.func,
};

export { FullCanvasHeader };
export default FullCanvasHeader;
