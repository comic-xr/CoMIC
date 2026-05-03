/**
 * VR Wrist Menu Stories
 *
 * 8-segment radial menu for VR interaction.
 * Use `showInDesktop={true}` to preview in Storybook.
 */

import React, { useState } from 'react';
import { VRWristMenu } from './VRWristMenu';
import { VRWristMenuProvider, useVRWristMenu } from './VRWristMenuContext';
import { RadialSegment } from './components/RadialSegment';
import { RadialCenter } from './components/RadialCenter';
import { GazeIndicator } from './components/GazeIndicator';
import { ToolsSegment } from './segments/ToolsSegment';

export default {
    title: 'Organisms/VRWristMenu',
    component: VRWristMenu,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <VRWristMenuProvider>
                <Story />
            </VRWristMenuProvider>
        ),
    ],
};

// =============================================================================
// FULL MENU STORIES
// =============================================================================

/**
 * Default wrist menu shown in desktop mode for preview.
 * In actual VR, this appears above the left wrist.
 */
export const Default = {
    render: () => <VRWristMenu showInDesktop={true} />,
};

/**
 * Interactive demo with menu controls.
 */
export const Interactive = {
    render: () => {
        const MenuDemo = () => {
            const { isOpen, openMenu, closeMenu, activeSegment } = useVRWristMenu();

            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={openMenu}
                            style={{
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                            }}
                        >
                            Open Menu
                        </button>
                        <button
                            onClick={closeMenu}
                            style={{
                                padding: '8px 16px',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                            }}
                        >
                            Close Menu
                        </button>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>
                        Status: {isOpen ? 'Open' : 'Closed'}
                        {activeSegment && ` | Active: ${activeSegment}`}
                    </div>
                    <VRWristMenu showInDesktop={true} />
                </div>
            );
        };

        return <MenuDemo />;
    },
};

// =============================================================================
// COMPONENT STORIES
// =============================================================================

/**
 * Individual radial segment.
 */
export const RadialSegmentStory = {
    name: 'Radial Segment',
    render: () => {
        const [hovered, setHovered] = useState(null);
        const [active, setActive] = useState(null);

        const segments = [
            { id: 'tools', label: 'Tools', icon: 'wrench', color: 'amber' },
            { id: 'voice', label: 'Voice', icon: 'mic', color: 'green' },
            { id: 'people', label: 'People', icon: 'users', color: 'blue' },
            { id: 'panels', label: 'Panels', icon: 'layout', color: 'purple' },
        ];

        return (
            <svg width={200} height={200} viewBox="0 0 200 200">
                <circle cx={100} cy={100} r={95} fill="rgba(30, 30, 40, 0.95)" />
                {segments.map((segment, index) => (
                    <RadialSegment
                        key={segment.id}
                        segment={segment}
                        index={index}
                        totalSegments={segments.length}
                        isActive={active === segment.id}
                        isHovered={hovered === segment.id}
                        onSelect={setActive}
                        onHover={setHovered}
                        centerX={100}
                        centerY={100}
                        outerRadius={90}
                        innerRadius={35}
                        showLabels={true}
                    />
                ))}
            </svg>
        );
    },
};

/**
 * Center button states.
 */
export const RadialCenterStory = {
    name: 'Radial Center',
    render: () => {
        const [hovered, setHovered] = useState(false);

        return (
            <div style={{ display: 'flex', gap: 32 }}>
                <div style={{ textAlign: 'center' }}>
                    <svg width={100} height={100} viewBox="0 0 100 100">
                        <circle cx={50} cy={50} r={45} fill="rgba(30, 30, 40, 0.95)" />
                        <RadialCenter
                            icon="x"
                            label="Close"
                            onClick={() => alert('Close clicked')}
                            isHovered={false}
                            onHover={() => {}}
                            centerX={50}
                            centerY={50}
                            radius={30}
                        />
                    </svg>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Close</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <svg width={100} height={100} viewBox="0 0 100 100">
                        <circle cx={50} cy={50} r={45} fill="rgba(30, 30, 40, 0.95)" />
                        <RadialCenter
                            icon="arrowLeft"
                            label="Back"
                            onClick={() => alert('Back clicked')}
                            isHovered={hovered}
                            onHover={setHovered}
                            centerX={50}
                            centerY={50}
                            radius={30}
                        />
                    </svg>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Back (hover me)</div>
                </div>
            </div>
        );
    },
};

/**
 * Gaze indicator progress states.
 */
export const GazeIndicatorStory = {
    name: 'Gaze Indicator',
    render: () => (
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((progress) => (
                <div key={progress} style={{ textAlign: 'center' }}>
                    <GazeIndicator
                        progress={progress}
                        size={60}
                        color="var(--color-accent-teal)"
                    />
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
                        {Math.round(progress * 100)}%
                    </div>
                </div>
            ))}
        </div>
    ),
};

/**
 * Animated gaze indicator.
 */
export const GazeIndicatorAnimated = {
    name: 'Gaze Indicator (Animated)',
    render: () => {
        const [progress, setProgress] = useState(0);

        React.useEffect(() => {
            const interval = setInterval(() => {
                setProgress((p) => (p >= 1 ? 0 : p + 0.02));
            }, 50);
            return () => clearInterval(interval);
        }, []);

        return (
            <div style={{ textAlign: 'center' }}>
                <GazeIndicator
                    progress={progress}
                    size={80}
                    color="var(--color-accent-teal)"
                />
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 12 }}>
                    Simulating gaze dwell activation
                </div>
            </div>
        );
    },
};

// =============================================================================
// SEGMENT STORIES
// =============================================================================

/**
 * Tools segment sub-menu.
 */
export const ToolsSegmentStory = {
    name: 'Tools Segment',
    render: () => {
        const [activeTool, setActiveTool] = useState('select');

        return (
            <div style={{
                background: 'rgba(30, 30, 40, 0.95)',
                padding: 16,
                borderRadius: 8,
                minWidth: 280,
            }}>
                <ToolsSegment
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                />
            </div>
        );
    },
};

// =============================================================================
// DOCUMENTATION
// =============================================================================

/**
 * All 8 segments displayed.
 */
export const AllSegments = {
    render: () => {
        const segments = [
            { id: 'tools', label: 'Tools', icon: 'wrench', color: 'amber' },
            { id: 'voice', label: 'Voice', icon: 'mic', color: 'green' },
            { id: 'people', label: 'People', icon: 'users', color: 'blue' },
            { id: 'panels', label: 'Panels', icon: 'layout', color: 'purple' },
            { id: 'exit', label: 'Exit', icon: 'doorOpen', color: 'red' },
            { id: 'space', label: 'Space', icon: 'move', color: 'teal' },
            { id: 'views', label: 'Views', icon: 'grid', color: 'indigo' },
            { id: 'record', label: 'Record', icon: 'video', color: 'pink' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                <svg width={300} height={300} viewBox="0 0 300 300">
                    <defs>
                        <radialGradient id="menu-bg" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(30, 30, 40, 0.95)" />
                            <stop offset="100%" stopColor="rgba(20, 20, 30, 0.9)" />
                        </radialGradient>
                    </defs>
                    <circle cx={150} cy={150} r={140} fill="url(#menu-bg)" stroke="rgba(255,255,255,0.1)" />
                    {segments.map((segment, index) => (
                        <RadialSegment
                            key={segment.id}
                            segment={segment}
                            index={index}
                            totalSegments={8}
                            isActive={false}
                            isHovered={false}
                            onSelect={() => {}}
                            onHover={() => {}}
                            centerX={150}
                            centerY={150}
                            outerRadius={135}
                            innerRadius={50}
                            showLabels={true}
                        />
                    ))}
                    <RadialCenter
                        icon="x"
                        label="Close"
                        onClick={() => {}}
                        isHovered={false}
                        onHover={() => {}}
                        centerX={150}
                        centerY={150}
                        radius={45}
                    />
                </svg>
                <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', maxWidth: 400 }}>
                    8-segment radial menu: Tools, Voice, People, Panels, Exit, Space, Views, Record.
                    <br />
                    In VR, appears above left wrist. Activated by gazing at wrist for 0.5s.
                </div>
            </div>
        );
    },
};
