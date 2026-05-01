// src/ui/react/components/molecules/CanvasNavigation/CanvasNavigation.stories.jsx
import React, { useState } from 'react';
import { CanvasNavigation } from './CanvasNavigation';

export default {
    title: 'Molecules/CanvasNavigation',
    component: CanvasNavigation,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        position: {
            control: 'object',
        },
        isAtOrigin: {
            control: 'boolean',
        },
        onHome: { action: 'home' },
        onMove: { action: 'move' },
        onBookmark: { action: 'bookmark' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        position: { col: 0, row: 0 },
        isAtOrigin: true,
    },
};

export const AtOrigin = {
    args: {
        position: { col: 0, row: 0 },
        isAtOrigin: true,
    },
};

export const AwayFromOrigin = {
    args: {
        position: { col: 2, row: 3 },
        isAtOrigin: false,
    },
};

export const FarPosition = {
    args: {
        position: { col: 15, row: 8 },
        isAtOrigin: false,
    },
};

export const Interactive = {
    render: function InteractiveStory() {
        const [position, setPosition] = useState({ col: 0, row: 0 });

        const handleMove = (direction) => {
            setPosition((prev) => {
                switch (direction) {
                    case 'up':
                        return { ...prev, row: Math.max(0, prev.row - 1) };
                    case 'down':
                        return { ...prev, row: prev.row + 1 };
                    case 'left':
                        return { ...prev, col: Math.max(0, prev.col - 1) };
                    case 'right':
                        return { ...prev, col: prev.col + 1 };
                    default:
                        return prev;
                }
            });
        };

        const handleHome = () => {
            setPosition({ col: 0, row: 0 });
        };

        const isAtOrigin = position.col === 0 && position.row === 0;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <CanvasNavigation
                    position={position}
                    isAtOrigin={isAtOrigin}
                    onHome={handleHome}
                    onMove={handleMove}
                    onBookmark={() => console.log('Open bookmarks')}
                />
                <div style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0 }}>
                        Use the D-pad to navigate or click Home to return to origin
                    </p>
                </div>
            </div>
        );
    },
};

export const InFooterContext = {
    render: function InFooterContextStory() {
        const [position, setPosition] = useState({ col: 3, row: 2 });

        const handleMove = (direction) => {
            setPosition((prev) => {
                switch (direction) {
                    case 'up':
                        return { ...prev, row: Math.max(0, prev.row - 1) };
                    case 'down':
                        return { ...prev, row: prev.row + 1 };
                    case 'left':
                        return { ...prev, col: Math.max(0, prev.col - 1) };
                    case 'right':
                        return { ...prev, col: prev.col + 1 };
                    default:
                        return prev;
                }
            });
        };

        const isAtOrigin = position.col === 0 && position.row === 0;

        return (
            <div style={{
                width: '100%',
                maxWidth: '800px',
                background: '#1a1a2e',
                borderRadius: '8px',
                padding: '8px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>Canvas Footer</span>
                <CanvasNavigation
                    position={position}
                    isAtOrigin={isAtOrigin}
                    onHome={() => setPosition({ col: 0, row: 0 })}
                    onMove={handleMove}
                    onBookmark={() => console.log('Open bookmarks')}
                />
            </div>
        );
    },
};

export const WithBookmarkAction = {
    render: function WithBookmarkActionStory() {
        const [bookmarks, setBookmarks] = useState([
            { name: 'Data View', col: 2, row: 1 },
            { name: 'Chart Area', col: 5, row: 3 },
        ]);
        const [position, setPosition] = useState({ col: 0, row: 0 });
        const [showBookmarks, setShowBookmarks] = useState(false);

        const handleMove = (direction) => {
            setPosition((prev) => {
                switch (direction) {
                    case 'up':
                        return { ...prev, row: Math.max(0, prev.row - 1) };
                    case 'down':
                        return { ...prev, row: prev.row + 1 };
                    case 'left':
                        return { ...prev, col: Math.max(0, prev.col - 1) };
                    case 'right':
                        return { ...prev, col: prev.col + 1 };
                    default:
                        return prev;
                }
            });
            setShowBookmarks(false);
        };

        const isAtOrigin = position.col === 0 && position.row === 0;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <CanvasNavigation
                    position={position}
                    isAtOrigin={isAtOrigin}
                    onHome={() => { setPosition({ col: 0, row: 0 }); setShowBookmarks(false); }}
                    onMove={handleMove}
                    onBookmark={() => setShowBookmarks((v) => !v)}
                />
                {showBookmarks && (
                    <div style={{
                        background: '#1a1a2e',
                        borderRadius: '8px',
                        padding: '8px',
                        border: '1px solid #374151',
                    }}>
                        <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
                            Saved Positions
                        </div>
                        {bookmarks.map((bm, i) => (
                            <button
                                key={i}
                                onClick={() => { setPosition({ col: bm.col, row: bm.row }); setShowBookmarks(false); }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#e5e7eb',
                                    fontSize: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                }}
                                onMouseOver={(e) => e.target.style.background = '#374151'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                            >
                                {bm.name} ({String.fromCharCode(65 + bm.col)}{bm.row + 1})
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    },
};

export const PositionVariants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>At Origin:</span>
                <CanvasNavigation
                    position={{ col: 0, row: 0 }}
                    isAtOrigin={true}
                    onHome={() => {}}
                    onMove={() => {}}
                    onBookmark={() => {}}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>Near Origin:</span>
                <CanvasNavigation
                    position={{ col: 1, row: 1 }}
                    isAtOrigin={false}
                    onHome={() => {}}
                    onMove={() => {}}
                    onBookmark={() => {}}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>Far Position:</span>
                <CanvasNavigation
                    position={{ col: 12, row: 7 }}
                    isAtOrigin={false}
                    onHome={() => {}}
                    onMove={() => {}}
                    onBookmark={() => {}}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px', width: '100px' }}>Max Column:</span>
                <CanvasNavigation
                    position={{ col: 25, row: 0 }}
                    isAtOrigin={false}
                    onHome={() => {}}
                    onMove={() => {}}
                    onBookmark={() => {}}
                />
            </div>
        </div>
    ),
};

export const DPadOnly = {
    args: {
        position: { col: 5, row: 3 },
        isAtOrigin: false,
        onHome: undefined,
        onBookmark: undefined,
    },
};
