/**
 * @file VRFloatingPanel.jsx
 * @description VR-optimized floating panel with 3D positioning.
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
    useVRPanels,
    VR_PANEL_MODES,
    VR_PANEL_SIZES,
} from './VRPanelContext';
import { VRPanelModeMenu } from './VRPanelModeMenu';
import { VRPanelSnapMenu } from './VRPanelSnapMenu';
import './VRFloatingPanel.scss';

/**
 * VRFloatingPanel - Panel component for VR environments
 *
 * @param {Object} props
 * @param {string} props.panelId - Unique panel identifier
 * @param {string} props.title - Panel title
 * @param {string} [props.icon] - Icon name
 * @param {string} [props.initialMode] - Initial positioning mode
 * @param {string} [props.initialSize] - Initial size preset
 * @param {Function} [props.onClose] - Close handler
 * @param {Function} [props.onMinimize] - Minimize handler
 * @param {React.ReactNode} props.children - Panel content
 */
export const VRFloatingPanel = memo(function VRFloatingPanel({
    panelId,
    title,
    icon,
    initialMode = VR_PANEL_MODES.HUD,
    initialSize = 'MEDIUM',
    onClose,
    onMinimize,
    children,
}) {
    const {
        isVR,
        getVRPanelState,
        setVRPanelState,
        initializeVRPanel,
        grabbedPanel,
        startGrab,
        endGrab,
        snapPanelTo,
    } = useVRPanels();

    const [isHovered, setIsHovered] = useState(false);
    const [showModeMenu, setShowModeMenu] = useState(false);
    const [showSnapMenu, setShowSnapMenu] = useState(false);

    const panelState = getVRPanelState(panelId);
    const isGrabbed = grabbedPanel?.panelId === panelId;

    // Initialize panel on mount
    useEffect(() => {
        if (!panelState.initialized) {
            const size = VR_PANEL_SIZES[initialSize] || VR_PANEL_SIZES.MEDIUM;
            initializeVRPanel(panelId, {
                mode: initialMode,
                ...size,
            });
        }
    }, [panelId, panelState.initialized, initialMode, initialSize, initializeVRPanel]);

    const handleGrabStart = useCallback(
        (e) => {
            e.preventDefault();
            startGrab(panelId, 'right', { x: 0, y: 0, z: 0 });
        },
        [panelId, startGrab]
    );

    const handleGrabEnd = useCallback(() => {
        endGrab(true);
    }, [endGrab]);

    const handleModeSwitch = useCallback(
        (mode) => {
            setVRPanelState(panelId, { mode });
            setShowModeMenu(false);
        },
        [panelId, setVRPanelState]
    );

    const handleSnapSelect = useCallback(
        (snap) => {
            snapPanelTo(panelId, snap);
            setShowSnapMenu(false);
        },
        [panelId, snapPanelTo]
    );

    const handleMinimize = useCallback(() => {
        setVRPanelState(panelId, { minimized: !panelState.minimized });
        onMinimize?.();
    }, [panelId, panelState.minimized, setVRPanelState, onMinimize]);

    const classNames = [
        'vr-floating-panel',
        isGrabbed && 'vr-floating-panel--grabbed',
        isHovered && 'vr-floating-panel--hovered',
        panelState.minimized && 'vr-floating-panel--minimized',
        `vr-floating-panel--mode-${panelState.mode}`,
    ]
        .filter(Boolean)
        .join(' ');

    // Convert meters to pixels for preview (1m = 1000px)
    const widthPx = panelState.width * 1000;
    const heightPx = panelState.height * 1000;

    return (
        <div
            className={classNames}
            data-panel-id={panelId}
            data-mode={panelState.mode}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            style={{
                width: `${widthPx}px`,
                maxWidth: '95vw',
            }}
        >
            {/* Header */}
            <div
                className={`vr-floating-panel__header ${
                    isGrabbed ? 'vr-floating-panel__header--grabbed' : ''
                }`}
                onPointerDown={handleGrabStart}
                onPointerUp={handleGrabEnd}
            >
                {/* Grab handle */}
                <div className="vr-floating-panel__grab-handle">
                    <div className="vr-floating-panel__grab-dots">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                </div>

                {/* Icon */}
                {icon && (
                    <Icon
                        name={icon}
                        size={16}
                        className="vr-floating-panel__icon"
                    />
                )}

                {/* Title */}
                <span className="vr-floating-panel__title">{title}</span>

                {/* Controls */}
                <div className="vr-floating-panel__controls">
                    {/* Mode button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowModeMenu(!showModeMenu);
                            setShowSnapMenu(false);
                        }}
                        className="vr-floating-panel__control-btn"
                        title={`Mode: ${panelState.mode}`}
                    >
                        <Icon name={getModeIcon(panelState.mode)} size={14} />
                    </button>

                    {/* Snap button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSnapMenu(!showSnapMenu);
                            setShowModeMenu(false);
                        }}
                        className="vr-floating-panel__control-btn"
                        title="Snap to position"
                    >
                        <Icon name="target" size={14} />
                    </button>

                    {/* Minimize button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMinimize();
                        }}
                        className="vr-floating-panel__control-btn"
                        title="Minimize"
                    >
                        <Icon name="minus" size={14} />
                    </button>

                    {/* Close button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose?.();
                        }}
                        className="vr-floating-panel__control-btn vr-floating-panel__control-btn--close"
                        title="Close"
                    >
                        <Icon name="close" size={14} />
                    </button>
                </div>
            </div>

            {/* Mode menu */}
            {showModeMenu && (
                <VRPanelModeMenu
                    currentMode={panelState.mode}
                    onSelect={handleModeSwitch}
                    onClose={() => setShowModeMenu(false)}
                />
            )}

            {/* Snap menu */}
            {showSnapMenu && (
                <VRPanelSnapMenu
                    currentSnap={panelState.snappedTo}
                    onSelect={handleSnapSelect}
                    onClose={() => setShowSnapMenu(false)}
                />
            )}

            {/* Content */}
            {!panelState.minimized && (
                <div
                    className="vr-floating-panel__content"
                    style={{ maxHeight: `${heightPx - 60}px` }}
                >
                    {children}
                </div>
            )}

            {/* Grab hint */}
            {isHovered && !isGrabbed && (
                <div className="vr-floating-panel__grab-hint">
                    Grip to move &bull; Thumbstick to resize
                </div>
            )}
        </div>
    );
});

/**
 * Get icon name for a panel mode
 */
function getModeIcon(mode) {
    switch (mode) {
        case VR_PANEL_MODES.HUD:
            return 'eye';
        case VR_PANEL_MODES.WORLD:
            return 'globe';
        case VR_PANEL_MODES.HAND:
            return 'pan';
        case VR_PANEL_MODES.DASHBOARD:
            return 'dashboard';
        default:
            return 'target';
    }
}

export default VRFloatingPanel;
