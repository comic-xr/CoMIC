/**
 * @file BreakoutManager.stories.jsx
 * @description Storybook stories for BreakoutManager component
 */

import React, { useState } from 'react';
import { BreakoutManager } from './BreakoutManager';

export default {
    title: 'Molecules/BreakoutManager',
    component: BreakoutManager,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
        },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockWorkspaces = [
    { id: 'ws-1', name: 'Main Analysis', type: 'workspace', isOpen: true, hasBreakout: true, breakoutUsers: 3 },
    { id: 'ws-2', name: 'Team Review', type: 'workspace', isOpen: true, hasBreakout: true, breakoutUsers: 1 },
    { id: 'ws-3', name: 'Subset View', type: 'subset', isOpen: true, hasBreakout: false, breakoutUsers: 0 },
    { id: 'ws-4', name: 'Quick Notes', type: 'scratch', isOpen: false, hasBreakout: true, breakoutUsers: 2 },
];

// =============================================================================
// STORIES
// =============================================================================

/**
 * Default state - not in any breakout
 */
export const Default = {
    args: {
        workspaces: mockWorkspaces,
        currentBreakoutId: null,
    },
};

/**
 * Currently in a breakout
 */
export const InBreakout = {
    args: {
        workspaces: mockWorkspaces,
        currentBreakoutId: 'ws-1',
    },
};

/**
 * No breakouts available (no render)
 */
export const NoBreakouts = {
    args: {
        workspaces: [
            { id: 'ws-1', name: 'Main Analysis', type: 'workspace', isOpen: true, hasBreakout: false, breakoutUsers: 0 },
        ],
        currentBreakoutId: null,
    },
};

/**
 * Interactive with state management
 */
export const Interactive = {
    render: function InteractiveStory() {
        const [currentBreakoutId, setCurrentBreakoutId] = useState(null);

        const handleJoin = (id) => {
            setCurrentBreakoutId(id);
        };

        const handleLeave = () => {
            setCurrentBreakoutId(null);
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <BreakoutManager
                    workspaces={mockWorkspaces}
                    currentBreakoutId={currentBreakoutId}
                    onJoinBreakout={handleJoin}
                    onLeaveBreakout={handleLeave}
                />
                <div style={{ fontSize: '12px', color: '#888' }}>
                    Current Breakout: {currentBreakoutId || 'None'}
                </div>
            </div>
        );
    },
};
