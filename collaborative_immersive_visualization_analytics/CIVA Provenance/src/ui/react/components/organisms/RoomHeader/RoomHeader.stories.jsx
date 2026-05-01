/**
 * @file RoomHeader.stories.jsx
 * @description Storybook stories for the section-based RoomHeader component
 */

import React, { useState } from 'react';
import { RoomHeader } from './RoomHeader';
import { WorkspaceBar } from '../WorkspaceBar';

export default {
    title: 'Organisms/RoomHeader',
    component: RoomHeader,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_ROOMS = [
    { id: 'r1', name: 'Lab Meeting', color: '#a855f7', type: 'main', usersOnline: 5, usersInVoice: 3 },
    { id: 'r2', name: 'Analysis Session', color: '#3b82f6', type: 'main', usersOnline: 2, usersInVoice: 2 },
    { id: 'r3', name: 'Personal', color: '#22c55e', type: 'personal', usersOnline: 1, usersInVoice: 0 },
    { id: 'r4', name: 'Tumor Review', color: '#f59e0b', type: 'main', usersOnline: 3, usersInVoice: 1 },
];

const MOCK_BREAKOUTS = [
    { id: 'b1', name: 'Main Analysis', workspaceId: 'ws1', usersInVoice: 2 },
];

const MOCK_WORKSPACES = [
    { id: 'ws1', name: 'Main Analysis', usersViewing: 3, hasChanges: false, hasBreakout: true, breakoutUsers: 2 },
    { id: 'ws2', name: 'Tumor Regions', usersViewing: 1, hasChanges: true, hasBreakout: false, breakoutUsers: 0 },
    { id: 'ws3', name: 'Comparison', usersViewing: 0, hasChanges: false, hasBreakout: false, breakoutUsers: 0 },
];

const MOCK_POPOUTS = [
    { id: 'p1', name: 'Axial View', color: '#22d3ee' },
    { id: 'p2', name: '3D Volume', color: '#22c55e' },
];

// =============================================================================
// STORIES
// =============================================================================

/**
 * Default state - viewing room, not in voice, no pinned rooms
 */
export const Default = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [pinnedRoomIds, setPinnedRoomIds] = useState([]);

        const handleTogglePin = (roomId) => {
            setPinnedRoomIds(prev =>
                prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
            );
        };

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    pinnedRoomIds={pinnedRoomIds}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => console.log('Join voice:', roomId)}
                    onLeaveVoice={() => console.log('Leave voice')}
                    onTogglePin={handleTogglePin}
                    onOpenChat={() => console.log('Open chat')}
                    onCreateRoom={() => console.log('Create room')}
                />
            </div>
        );
    },
};

/**
 * In voice - with pinned rooms and breakouts
 */
export const InVoiceWithPins = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState('r1');
        const [pinnedRoomIds, setPinnedRoomIds] = useState(['r2', 'r4']);
        const [isMuted, setIsMuted] = useState(false);

        const handleTogglePin = (roomId) => {
            setPinnedRoomIds(prev =>
                prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
            );
        };

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    breakouts={MOCK_BREAKOUTS}
                    pinnedRoomIds={pinnedRoomIds}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onTogglePin={handleTogglePin}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={3}
                    onOpenChat={() => console.log('Open chat')}
                />
            </div>
        );
    },
};

/**
 * In breakout voice (purple theme)
 */
export const InBreakout = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [activeBreakoutId, setActiveBreakoutId] = useState('b1');
        const [pinnedRoomIds, setPinnedRoomIds] = useState(['r2']);
        const [isMuted, setIsMuted] = useState(false);

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    activeBreakoutId={activeBreakoutId}
                    breakouts={MOCK_BREAKOUTS}
                    pinnedRoomIds={pinnedRoomIds}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => { setActiveBreakoutId(null); }}
                    onJoinBreakout={setActiveBreakoutId}
                    onLeaveVoice={() => setActiveBreakoutId(null)}
                    onTogglePin={(roomId) => {
                        setPinnedRoomIds(prev =>
                            prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
                        );
                    }}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={0}
                    onOpenChat={() => console.log('Open chat')}
                />
            </div>
        );
    },
};

/**
 * Full interactive demo with both RoomHeader and WorkspaceBar
 */
export const FullDemo = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState('r1');
        const [activeBreakoutId, setActiveBreakoutId] = useState(null);
        const [breakouts, setBreakouts] = useState(MOCK_BREAKOUTS);
        const [pinnedRoomIds, setPinnedRoomIds] = useState(['r2', 'r4']);
        const [isMuted, setIsMuted] = useState(false);
        const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws1');
        const [canvasMode, setCanvasMode] = useState('tile');
        const [popouts, setPopouts] = useState(MOCK_POPOUTS);

        const handleTogglePin = (roomId) => {
            setPinnedRoomIds(prev =>
                prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
            );
        };

        const handleJoinVoice = (roomId) => {
            setVoiceRoomId(roomId);
            setActiveBreakoutId(null);
        };

        const handleJoinBreakout = (breakoutId) => {
            setActiveBreakoutId(breakoutId);
            setVoiceRoomId(null);
        };

        const handleLeaveVoice = () => {
            setVoiceRoomId(null);
            setActiveBreakoutId(null);
        };

        return (
            <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    activeBreakoutId={activeBreakoutId}
                    breakouts={breakouts}
                    pinnedRoomIds={pinnedRoomIds}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={handleJoinVoice}
                    onJoinBreakout={handleJoinBreakout}
                    onLeaveVoice={handleLeaveVoice}
                    onTogglePin={handleTogglePin}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={5}
                    onOpenChat={() => console.log('Open chat')}
                    onCreateRoom={() => console.log('Create room')}
                />

                <WorkspaceBar
                    workspaces={MOCK_WORKSPACES}
                    activeWorkspaceId={activeWorkspaceId}
                    onSelectWorkspace={setActiveWorkspaceId}
                    onCreateWorkspace={() => console.log('Create workspace')}
                    popouts={popouts}
                    breakouts={breakouts}
                    canvasMode={canvasMode}
                    onModeChange={setCanvasMode}
                    onJoinBreakout={handleJoinBreakout}
                />

                {/* Canvas placeholder */}
                <div style={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 14,
                }}>
                    Canvas Area ({canvasMode} mode)
                </div>

                {/* State display */}
                <div style={{ padding: 24, color: '#888', fontSize: 12 }}>
                    <h3 style={{ color: '#fff', marginBottom: 12 }}>Current State:</h3>
                    <p>Viewing: <strong style={{ color: '#22d3ee' }}>{viewingRoomId}</strong></p>
                    <p>Voice: <strong style={{ color: '#22c55e' }}>{voiceRoomId || 'None'}</strong></p>
                    <p>Breakout: <strong style={{ color: '#a855f7' }}>{activeBreakoutId || 'None'}</strong></p>
                    <p>Pinned: <strong>{pinnedRoomIds.join(', ') || 'None'}</strong></p>
                    <p>Workspace: <strong>{activeWorkspaceId}</strong></p>
                    <p>Mode: <strong>{canvasMode}</strong></p>

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={popouts.length > 0}
                                onChange={() => setPopouts(popouts.length > 0 ? [] : MOCK_POPOUTS)}
                            />
                            Show Popouts
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={breakouts.length > 0}
                                onChange={() => setBreakouts(breakouts.length > 0 ? [] : MOCK_BREAKOUTS)}
                            />
                            Show Breakouts
                        </label>
                    </div>
                </div>
            </div>
        );
    },
};
