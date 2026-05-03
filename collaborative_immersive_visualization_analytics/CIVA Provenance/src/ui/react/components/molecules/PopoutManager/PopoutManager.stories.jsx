/**
 * @file PopoutManager.stories.jsx
 * @description Storybook stories for PopoutManager component
 */

import React, { useState } from 'react';
import { PopoutManager } from './PopoutManager';

export default {
    title: 'Molecules/PopoutManager',
    component: PopoutManager,
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

const mockPopouts = [
    { id: 'pop-1', viewName: 'Axial Slice', viewType: 'vtk-slice', color: '#a855f7' },
    { id: 'pop-2', viewName: '3D Volume', viewType: 'vtk-volume', color: '#22c55e' },
];

const manyPopouts = [
    ...mockPopouts,
    { id: 'pop-3', viewName: 'Sagittal View', viewType: 'vtk-slice', color: '#3b82f6' },
    { id: 'pop-4', viewName: 'Data Table', viewType: 'table', color: '#f59e0b' },
];

// =============================================================================
// STORIES
// =============================================================================

/**
 * Default state with two popouts
 */
export const Default = {
    args: {
        popouts: mockPopouts,
        snapEnabled: true,
        gridSnapEnabled: false,
    },
};

/**
 * With grid snap enabled
 */
export const GridSnapEnabled = {
    args: {
        popouts: mockPopouts,
        snapEnabled: true,
        gridSnapEnabled: true,
    },
};

/**
 * Many popouts
 */
export const ManyPopouts = {
    args: {
        popouts: manyPopouts,
        snapEnabled: true,
        gridSnapEnabled: false,
    },
};

/**
 * Empty state (no render)
 */
export const NoPopouts = {
    args: {
        popouts: [],
    },
};

/**
 * Interactive with state management
 */
export const Interactive = {
    render: function InteractiveStory() {
        const [popouts, setPopouts] = useState(manyPopouts);
        const [snapEnabled, setSnapEnabled] = useState(true);
        const [gridSnapEnabled, setGridSnapEnabled] = useState(false);

        const handleClose = (id) => {
            setPopouts(popouts.filter(p => p.id !== id));
        };

        const handleCloseAll = () => {
            setPopouts([]);
        };

        const handleBringToFront = (id) => {
            console.log('Bring to front:', id);
        };

        const handleTileAll = () => {
            console.log('Tile all popouts');
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <PopoutManager
                    popouts={popouts}
                    onBringToFront={handleBringToFront}
                    onClose={handleClose}
                    onTileAll={handleTileAll}
                    onCloseAll={handleCloseAll}
                    snapEnabled={snapEnabled}
                    onToggleSnap={() => setSnapEnabled(!snapEnabled)}
                    gridSnapEnabled={gridSnapEnabled}
                    onToggleGridSnap={() => setGridSnapEnabled(!gridSnapEnabled)}
                />
                <div style={{ fontSize: '12px', color: '#888' }}>
                    Popouts: {popouts.length} | Snap: {snapEnabled ? 'On' : 'Off'} | Grid: {gridSnapEnabled ? 'On' : 'Off'}
                </div>
                <button
                    onClick={() => setPopouts(manyPopouts)}
                    style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                >
                    Reset Popouts
                </button>
            </div>
        );
    },
};
