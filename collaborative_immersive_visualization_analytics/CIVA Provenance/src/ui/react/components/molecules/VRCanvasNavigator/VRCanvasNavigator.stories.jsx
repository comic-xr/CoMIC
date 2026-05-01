/**
 * @file VRCanvasNavigator.stories.jsx
 * @description Stories for VR canvas navigator components.
 */

import React, { useState } from 'react';
import { VRCanvasNavigator } from './VRCanvasNavigator';
import {
    VRNavigatorProvider,
    VRMinimapGrid,
    VRMinimapCell,
    VRCellContextMenu,
    VRNavigationControls,
    VRMultiSelectToolbar,
} from './index';

export default {
    title: 'Molecules/VRCanvasNavigator',
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    width: '100vw',
                    height: '100vh',
                    background: '#030303',
                    padding: 40,
                }}
            >
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleCells = [
    { id: '1', row: 0, col: 0, name: 'Brain Scan', color: '#60a5fa' },
    { id: '2', row: 0, col: 1, name: 'Heart Model', color: '#f472b6' },
    { id: '3', row: 1, col: 0, name: 'Lung CT', color: '#4ade80' },
    { id: '4', row: 1, col: 2, name: 'Spine MRI', color: '#fbbf24', colSpan: 1, rowSpan: 2 },
    { id: '5', row: 2, col: 0, name: 'Overview', color: '#a78bfa', colSpan: 2 },
];

const sampleCollaborators = [
    { id: 'a', name: 'Alice', color: '#2dd4bf', position: { row: 0, col: 0 } },
    { id: 'b', name: 'Bob', color: '#f472b6', position: { row: 1, col: 0 } },
];

// =============================================================================
// COMPLETE NAVIGATOR
// =============================================================================

export const CompleteNavigator = () => {
    const [cells, setCells] = useState(sampleCells);
    const [viewport, setViewport] = useState({ row: 0, col: 0, rows: 2, cols: 2 });
    const [homepoint, setHomepoint] = useState({ row: 0, col: 0 });

    const handleMovePlacement = (id, row, col) => {
        console.log('Move placement:', id, 'to', row, col);
        setCells((prev) =>
            prev.map((c) => (c.id === id ? { ...c, row, col } : c))
        );
    };

    const handleSwapPlacements = (id1, id2) => {
        console.log('Swap placements:', id1, id2);
        setCells((prev) => {
            const cell1 = prev.find((c) => c.id === id1);
            const cell2 = prev.find((c) => c.id === id2);
            if (!cell1 || !cell2) return prev;

            return prev.map((c) => {
                if (c.id === id1) {
                    return { ...c, row: cell2.row, col: cell2.col };
                }
                if (c.id === id2) {
                    return { ...c, row: cell1.row, col: cell1.col };
                }
                return c;
            });
        });
    };

    const handleDeletePlacement = (id) => {
        console.log('Delete placement:', id);
        setCells((prev) => prev.filter((c) => c.id !== id));
    };

    const handleSetHomepoint = (row, col) => {
        console.log('Set homepoint:', row, col);
        setHomepoint({ row, col });
    };

    const handleNavigateToCell = (row, col) => {
        console.log('Navigate to cell:', row, col);
        setViewport((v) => ({ ...v, row, col }));
    };

    const handleNavigate = (dx, dy) => {
        console.log('Navigate:', dx, dy);
        setViewport((v) => ({
            ...v,
            row: Math.max(0, v.row + dy),
            col: Math.max(0, v.col + dx),
        }));
    };

    const handleZoom = (direction) => {
        console.log('Zoom:', direction > 0 ? 'in' : 'out');
    };

    return (
        <div style={{ maxWidth: 400 }}>
            <VRCanvasNavigator
                cells={cells}
                canvasSize={{ rows: 4, cols: 4 }}
                viewport={viewport}
                homepoint={homepoint}
                collaborators={sampleCollaborators}
                displayMode="names"
                onMovePlacement={handleMovePlacement}
                onSwapPlacements={handleSwapPlacements}
                onDeletePlacement={handleDeletePlacement}
                onSetHomepoint={handleSetHomepoint}
                onNavigateToCell={handleNavigateToCell}
                onNavigate={handleNavigate}
                onZoom={handleZoom}
            />
        </div>
    );
};

CompleteNavigator.parameters = {
    docs: {
        description: {
            story: 'Complete VR canvas navigator with minimap, context menus, and controls.',
        },
    },
};

// =============================================================================
// MINIMAP ONLY
// =============================================================================

export const MinimapOnly = () => {
    return (
        <VRNavigatorProvider
            cells={sampleCells}
            canvasSize={{ rows: 4, cols: 4 }}
            onMovePlacement={() => {}}
            onSwapPlacements={() => {}}
        >
            <VRMinimapGrid
                viewport={{ row: 0, col: 0, rows: 2, cols: 2 }}
                homepoint={{ row: 0, col: 0 }}
                collaborators={sampleCollaborators}
                displayMode="names"
            />
        </VRNavigatorProvider>
    );
};

MinimapOnly.parameters = {
    docs: {
        description: {
            story: 'Just the minimap grid component.',
        },
    },
};

// =============================================================================
// CONTEXT MENU
// =============================================================================

export const ContextMenu = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <VRNavigatorProvider
            cells={sampleCells}
            canvasSize={{ rows: 4, cols: 4 }}
            onMovePlacement={() => setIsOpen(false)}
            onSwapPlacements={() => {}}
            onDeletePlacement={() => setIsOpen(false)}
            onSetHomepoint={() => setIsOpen(false)}
            onNavigateToCell={() => setIsOpen(false)}
        >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 8,
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    Open Context Menu
                </button>
            </div>

            <VRCellContextMenu
                isOpen={isOpen}
                cell={{
                    id: '1',
                    row: 0,
                    col: 0,
                    name: 'Brain Scan',
                    color: '#60a5fa',
                }}
                position={{ x: '50%', y: '50%' }}
                onClose={() => setIsOpen(false)}
            />
        </VRNavigatorProvider>
    );
};

ContextMenu.parameters = {
    docs: {
        description: {
            story: 'Radial context menu for cell actions.',
        },
    },
};

// =============================================================================
// NAVIGATION CONTROLS
// =============================================================================

export const NavigationControls = () => {
    const [position, setPosition] = useState({ row: 1, col: 1 });

    return (
        <VRNavigatorProvider
            cells={[]}
            canvasSize={{ rows: 4, cols: 4 }}
            onMovePlacement={() => {}}
            onSwapPlacements={() => {}}
        >
            <div
                style={{
                    background: 'rgba(12, 18, 32, 0.95)',
                    padding: 24,
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'inline-block',
                }}
            >
                <VRNavigationControls
                    onNavigate={(dx, dy) => {
                        setPosition((p) => ({
                            row: Math.max(0, Math.min(3, p.row + dy)),
                            col: Math.max(0, Math.min(3, p.col + dx)),
                        }));
                    }}
                    onZoom={(dir) => console.log('Zoom:', dir)}
                    currentPosition={position}
                />
            </div>
        </VRNavigatorProvider>
    );
};

NavigationControls.parameters = {
    docs: {
        description: {
            story: 'D-pad and zoom controls.',
        },
    },
};

// =============================================================================
// MULTI-SELECT MODE
// =============================================================================

export const MultiSelectMode = () => {
    return (
        <div style={{ maxWidth: 400 }}>
            <div
                style={{
                    marginBottom: 20,
                    padding: 16,
                    background: 'rgba(45, 212, 191, 0.1)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#fff',
                }}
            >
                <strong>Multi-Select Mode:</strong>
                <br />
                Hold <kbd>Shift</kbd> (keyboard) or <kbd>Grip</kbd> (VR) and
                click cells to select multiple.
            </div>

            <VRCanvasNavigator
                cells={sampleCells}
                canvasSize={{ rows: 4, cols: 4 }}
                viewport={{ row: 0, col: 0, rows: 2, cols: 2 }}
                homepoint={{ row: 0, col: 0 }}
                onMovePlacement={() => {}}
                onSwapPlacements={() => {}}
                onMergeCells={(cells) =>
                    console.log('Merge cells:', cells)
                }
            />
        </div>
    );
};

MultiSelectMode.parameters = {
    docs: {
        description: {
            story: 'Multi-select mode for merging cells.',
        },
    },
};

// =============================================================================
// DISPLAY MODES
// =============================================================================

export const DisplayModes = () => {
    const [mode, setMode] = useState('names');

    return (
        <div style={{ maxWidth: 500 }}>
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 20,
                }}
            >
                {['names', 'numbers', 'colors'].map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        style={{
                            padding: '8px 16px',
                            background:
                                mode === m
                                    ? 'rgba(45, 212, 191, 0.3)'
                                    : 'rgba(255, 255, 255, 0.1)',
                            border:
                                mode === m
                                    ? '1px solid #2dd4bf'
                                    : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 8,
                            color: mode === m ? '#2dd4bf' : '#fff',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                        }}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <VRCanvasNavigator
                cells={sampleCells}
                canvasSize={{ rows: 4, cols: 4 }}
                viewport={{ row: 0, col: 0, rows: 2, cols: 2 }}
                homepoint={{ row: 0, col: 0 }}
                collaborators={sampleCollaborators}
                displayMode={mode}
                onMovePlacement={() => {}}
                onSwapPlacements={() => {}}
            />
        </div>
    );
};

DisplayModes.parameters = {
    docs: {
        description: {
            story: 'Different display modes: names, numbers, or colors only.',
        },
    },
};
