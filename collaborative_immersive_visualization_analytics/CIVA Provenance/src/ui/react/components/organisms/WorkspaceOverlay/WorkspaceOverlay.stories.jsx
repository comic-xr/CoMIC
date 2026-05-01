import { useState } from 'react';
import { WorkspaceOverlay } from './index';
import { Icon } from '@UI/react/components/atoms/Icon';

export default {
    title: 'Organisms/WorkspaceOverlay',
    component: WorkspaceOverlay,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
};

// Basic usage with toggle button
export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ padding: '24px' }}>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '8px 16px',
                    background: 'rgba(96, 165, 250, 0.2)',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    borderRadius: '6px',
                    color: '#60a5fa',
                    cursor: 'pointer'
                }}
            >
                Open Overlay
            </button>

            <WorkspaceOverlay
                isOpen={isOpen}
                title="Grid Preview"
                onClose={() => setIsOpen(false)}
            >
                <div style={{ padding: '24px', color: 'rgba(255,255,255,0.7)' }}>
                    <p>This is the overlay content.</p>
                    <p style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        Press ESC or ⌘E to close
                    </p>
                </div>
            </WorkspaceOverlay>
        </div>
    );
};

// With header actions
export const WithHeaderActions = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <WorkspaceOverlay
            isOpen={isOpen}
            title="Layout Editor"
            onClose={() => setIsOpen(false)}
            headerActions={
                <>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        borderRadius: '6px',
                        color: '#34d399',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}>
                        Apply
                    </button>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer'
                    }}>
                        <Icon name="settings" size={16} />
                    </button>
                </>
            }
        >
            <div style={{ padding: '24px', color: 'rgba(255,255,255,0.7)' }}>
                <p>Layout editor with header actions</p>
            </div>
        </WorkspaceOverlay>
    );
};

// Expanded Grid Preview example
export const ExpandedGridPreview = () => {
    const [isOpen, setIsOpen] = useState(true);

    const gridItems = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        color: ['#60a5fa', '#34d399', '#fb7185', '#fbbf24', '#7dd3fc', '#c084fc'][i % 6],
        span: i === 0 ? 2 : 1,
    }));

    return (
        <WorkspaceOverlay
            isOpen={isOpen}
            title="Expanded Grid Preview"
            onClose={() => setIsOpen(false)}
            headerActions={
                <>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}>
                        <Icon name="layers" size={14} />
                        Edit Mode
                    </button>
                </>
            }
        >
            <div style={{ padding: '24px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                }}>
                    {gridItems.map(item => (
                        <div
                            key={item.id}
                            style={{
                                aspectRatio: '1.5',
                                gridColumn: item.span > 1 ? `span ${item.span}` : undefined,
                                background: `${item.color}20`,
                                border: `1px solid ${item.color}60`,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: item.color,
                                fontSize: '14px',
                                fontWeight: 500,
                            }}
                        >
                            View {item.id}
                        </div>
                    ))}
                </div>
            </div>
        </WorkspaceOverlay>
    );
};

// Isolation Mode example
export const IsolationMode = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <WorkspaceOverlay
            isOpen={isOpen}
            title="Isolation Mode - Sales Data 2024"
            onClose={() => setIsOpen(false)}
            className="isolation-mode"
            headerActions={
                <>
                    <span style={{
                        padding: '4px 10px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '4px',
                        color: '#fbbf24',
                        fontSize: '12px',
                    }}>
                        Isolated View
                    </span>
                </>
            }
        >
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)',
            }}>
                [Isolated View Content]
            </div>
        </WorkspaceOverlay>
    );
};

// Presence/Collaboration example
export const PresenceOverlay = () => {
    const [isOpen, setIsOpen] = useState(true);

    const collaborators = [
        { id: 1, name: 'Alice', color: '#60a5fa', position: { row: 1, col: 2 } },
        { id: 2, name: 'Bob', color: '#34d399', position: { row: 2, col: 1 } },
        { id: 3, name: 'Carol', color: '#fb7185', position: { row: 1, col: 3 } },
    ];

    return (
        <WorkspaceOverlay
            isOpen={isOpen}
            title="Team Presence"
            onClose={() => setIsOpen(false)}
            headerActions={
                <>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 10px',
                        background: 'rgba(251, 113, 133, 0.1)',
                        borderRadius: '4px',
                    }}>
                        <Icon name="users" size={14} style={{ color: '#fb7185' }} />
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                            3 online
                        </span>
                    </div>
                </>
            }
        >
            <div style={{ padding: '24px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gridTemplateRows: 'repeat(3, 1fr)',
                    gap: '12px',
                    aspectRatio: '16/9',
                }}>
                    {Array.from({ length: 12 }, (_, i) => {
                        const row = Math.floor(i / 4) + 1;
                        const col = (i % 4) + 1;
                        const collaborator = collaborators.find(
                            c => c.position.row === row && c.position.col === col
                        );

                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'relative',
                                    background: collaborator
                                        ? `${collaborator.color}15`
                                        : 'rgba(255,255,255,0.02)',
                                    border: collaborator
                                        ? `2px solid ${collaborator.color}50`
                                        : '1px dashed rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {collaborator && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: collaborator.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        }}>
                                            {collaborator.name[0]}
                                        </div>
                                        <span style={{
                                            fontSize: '11px',
                                            color: collaborator.color,
                                        }}>
                                            {collaborator.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </WorkspaceOverlay>
    );
};