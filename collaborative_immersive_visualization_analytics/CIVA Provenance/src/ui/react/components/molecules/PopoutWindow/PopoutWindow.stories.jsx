/**
 * @file PopoutWindow.stories.jsx
 * @description Storybook stories for PopoutWindow component
 */

import React, { useState } from 'react';
import { PopoutWindow } from './PopoutWindow';

export default {
    title: 'Molecules/PopoutWindow',
    component: PopoutWindow,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
        },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockPopouts = {
    slice: {
        id: 'pop-1',
        viewName: 'Axial Slice',
        viewType: 'vtk-slice',
        color: '#a855f7',
    },
    volume: {
        id: 'pop-2',
        viewName: '3D Volume',
        viewType: 'vtk-volume',
        color: '#22c55e',
    },
    table: {
        id: 'pop-3',
        viewName: 'Data Table',
        viewType: 'table',
        color: '#3b82f6',
    },
};

// =============================================================================
// STORIES
// =============================================================================

/**
 * Default unfocused state
 */
export const Default = {
    args: {
        popout: mockPopouts.slice,
        position: { x: 50, y: 50 },
        size: { width: 320, height: 240 },
        isFocused: false,
        snapEnabled: true,
        gridSnapEnabled: false,
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', position: 'relative', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * Focused state with cyan glow
 */
export const Focused = {
    args: {
        popout: mockPopouts.volume,
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        isFocused: true,
        snapEnabled: true,
        gridSnapEnabled: false,
    },
    decorators: [
        (Story) => (
            <div style={{ height: '600px', position: 'relative', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

/**
 * Multiple popouts interactive
 */
export const Interactive = {
    render: function InteractiveStory() {
        const [positions, setPositions] = useState({
            'pop-1': { x: 50, y: 50 },
            'pop-2': { x: 400, y: 100 },
        });
        const [sizes, setSizes] = useState({
            'pop-1': { width: 320, height: 240 },
            'pop-2': { width: 280, height: 200 },
        });
        const [focusedId, setFocusedId] = useState('pop-1');
        const [snapEnabled, setSnapEnabled] = useState(true);
        const [gridSnapEnabled, setGridSnapEnabled] = useState(false);

        const containerBounds = { width: 800, height: 500 };

        return (
            <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '12px', color: '#888', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                            type="checkbox"
                            checked={snapEnabled}
                            onChange={(e) => setSnapEnabled(e.target.checked)}
                        />
                        Edge Snap
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                            type="checkbox"
                            checked={gridSnapEnabled}
                            onChange={(e) => setGridSnapEnabled(e.target.checked)}
                        />
                        Grid Snap
                    </label>
                    <span style={{ marginLeft: 'auto' }}>
                        <strong>Focused:</strong> {focusedId} | Hold <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>Shift</kbd> to disable snap
                    </span>
                </div>
                <div style={{ flex: 1, position: 'relative', background: '#0a0a0f', overflow: 'hidden' }}>
                    <PopoutWindow
                        popout={mockPopouts.slice}
                        position={positions['pop-1']}
                        size={sizes['pop-1']}
                        onPositionChange={(pos) => setPositions(p => ({ ...p, 'pop-1': pos }))}
                        onSizeChange={(size) => setSizes(s => ({ ...s, 'pop-1': size }))}
                        isFocused={focusedId === 'pop-1'}
                        onFocus={() => setFocusedId('pop-1')}
                        onClose={() => console.log('Close pop-1')}
                        snapEnabled={snapEnabled}
                        gridSnapEnabled={gridSnapEnabled}
                        containerBounds={containerBounds}
                    />
                    <PopoutWindow
                        popout={mockPopouts.volume}
                        position={positions['pop-2']}
                        size={sizes['pop-2']}
                        onPositionChange={(pos) => setPositions(p => ({ ...p, 'pop-2': pos }))}
                        onSizeChange={(size) => setSizes(s => ({ ...s, 'pop-2': size }))}
                        isFocused={focusedId === 'pop-2'}
                        onFocus={() => setFocusedId('pop-2')}
                        onClose={() => console.log('Close pop-2')}
                        snapEnabled={snapEnabled}
                        gridSnapEnabled={gridSnapEnabled}
                        containerBounds={containerBounds}
                    />
                </div>
            </div>
        );
    },
};

/**
 * Different view types
 */
export const ViewTypes = {
    render: function ViewTypesStory() {
        return (
            <div style={{ height: '400px', position: 'relative', background: '#0a0a0f', display: 'flex', gap: '20px', padding: '20px' }}>
                <PopoutWindow
                    popout={mockPopouts.slice}
                    position={{ x: 0, y: 0 }}
                    size={{ width: 220, height: 180 }}
                    isFocused={false}
                />
                <PopoutWindow
                    popout={mockPopouts.volume}
                    position={{ x: 0, y: 0 }}
                    size={{ width: 220, height: 180 }}
                    isFocused={false}
                />
                <PopoutWindow
                    popout={mockPopouts.table}
                    position={{ x: 0, y: 0 }}
                    size={{ width: 220, height: 180 }}
                    isFocused={false}
                />
            </div>
        );
    },
};
