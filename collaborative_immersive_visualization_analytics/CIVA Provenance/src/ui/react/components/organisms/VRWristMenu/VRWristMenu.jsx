/**
 * @file VRWristMenu.jsx
 * @description VR Wrist Menu - 8-segment radial menu attached to left wrist.
 *
 * Features:
 * - Gaze activation (look at wrist for 0.5s)
 * - Double-tap X button activation
 * - 8 segments: Tools, Voice, People, Panels, Exit, Space, Views, Record
 * - Sub-menu navigation
 * - Auto-dismiss when looking away
 */

import React, { memo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useVRWristMenu, WRIST_MENU_SEGMENTS } from './VRWristMenuContext';
import { useWristPosition, useIsLookingAtWrist } from './hooks/useWristPosition';
import { useGazeActivation, useDismissDetection } from './hooks/useGazeActivation';
import { RadialSegment } from './components/RadialSegment';
import { RadialCenter } from './components/RadialCenter';
import { GazeIndicator } from './components/GazeIndicator';
import './VRWristMenu.scss';

/**
 * VRWristMenu - Main wrist menu component
 */
const VRWristMenu = memo(function VRWristMenu({
    showInDesktop = false,  // For testing in desktop mode
}) {
    const { isVR } = useAdaptive();
    const {
        isOpen,
        activeSegment,
        hoveredSegment,
        segments,
        openMenu,
        closeMenu,
        selectSegment,
        hoverSegment,
        currentSubMenu,
        closeSubMenu,
    } = useVRWristMenu();

    // Wrist tracking
    const wristPosition = useWristPosition('left', 0.05);
    const isLookingAtWrist = useIsLookingAtWrist(wristPosition, 30);

    // Center button hover state
    const [isCenterHovered, setIsCenterHovered] = useState(false);

    // Gaze activation (when menu is closed)
    const { progress: gazeProgress, isActivating } = useGazeActivation({
        isGazing: isLookingAtWrist && !isOpen,
        dwellTime: 500,
        onActivate: openMenu,
        enabled: isVR || showInDesktop,
    });

    // Auto-dismiss when looking away (when menu is open)
    useDismissDetection({
        isGazing: isLookingAtWrist,
        dismissTime: 1000,
        onDismiss: closeMenu,
        enabled: (isVR || showInDesktop) && isOpen,
    });

    // Handle segment selection
    const handleSegmentSelect = useCallback((segmentId) => {
        selectSegment(segmentId);

        // Emit segment action event
        window.dispatchEvent(new CustomEvent('cia:wrist-menu-segment-action', {
            detail: { segmentId }
        }));
    }, [selectSegment]);

    // Handle center button click
    const handleCenterClick = useCallback(() => {
        if (currentSubMenu) {
            closeSubMenu();
        } else {
            closeMenu();
        }
    }, [currentSubMenu, closeSubMenu, closeMenu]);

    // Only render in VR mode (or desktop for testing)
    if (!isVR && !showInDesktop) {
        return null;
    }

    // Menu dimensions
    const menuSize = 200;
    const centerX = menuSize / 2;
    const centerY = menuSize / 2;

    // Render gaze indicator when not open but looking at wrist
    if (!isOpen && isActivating) {
        return (
            <div
                className="vr-wrist-menu vr-wrist-menu--activating"
                style={{
                    '--wrist-x': `${wristPosition.x}px`,
                    '--wrist-y': `${wristPosition.y}px`,
                    '--wrist-z': `${wristPosition.z}px`,
                }}
            >
                <GazeIndicator
                    progress={gazeProgress}
                    size={60}
                    color="var(--color-accent-teal)"
                />
            </div>
        );
    }

    // Don't render if closed
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="vr-wrist-menu vr-wrist-menu--open"
            style={{
                '--wrist-x': `${wristPosition.x}px`,
                '--wrist-y': `${wristPosition.y}px`,
                '--wrist-z': `${wristPosition.z}px`,
            }}
        >
            <svg
                className="vr-wrist-menu__radial"
                width={menuSize}
                height={menuSize}
                viewBox={`0 0 ${menuSize} ${menuSize}`}
            >
                {/* Background blur/glow effect */}
                <defs>
                    <filter id="menu-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                    </filter>
                    <radialGradient id="menu-bg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(30, 30, 40, 0.95)" />
                        <stop offset="100%" stopColor="rgba(20, 20, 30, 0.9)" />
                    </radialGradient>
                </defs>

                {/* Menu background */}
                <circle
                    cx={centerX}
                    cy={centerY}
                    r={95}
                    fill="url(#menu-bg)"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                />

                {/* Radial segments */}
                {segments.map((segment, index) => (
                    <RadialSegment
                        key={segment.id}
                        segment={segment}
                        index={index}
                        totalSegments={segments.length}
                        isActive={activeSegment === segment.id}
                        isHovered={hoveredSegment === segment.id}
                        onSelect={handleSegmentSelect}
                        onHover={hoverSegment}
                        centerX={centerX}
                        centerY={centerY}
                        outerRadius={90}
                        innerRadius={35}
                        showLabels={true}
                    />
                ))}

                {/* Center button */}
                <RadialCenter
                    icon={currentSubMenu ? 'arrowLeft' : 'x'}
                    label={currentSubMenu ? 'Back' : 'Close'}
                    onClick={handleCenterClick}
                    isHovered={isCenterHovered}
                    onHover={setIsCenterHovered}
                    centerX={centerX}
                    centerY={centerY}
                    radius={30}
                />
            </svg>

            {/* Active segment label */}
            {(activeSegment || hoveredSegment) && (
                <div className="vr-wrist-menu__label">
                    {segments.find(s => s.id === (hoveredSegment || activeSegment))?.label}
                </div>
            )}
        </div>
    );
});

VRWristMenu.propTypes = {
    /** Show menu in desktop mode for testing */
    showInDesktop: PropTypes.bool,
};

export { VRWristMenu };
export default VRWristMenu;
