// src/ui/react/components/organisms/RoomPresenceIndicator/RoomPresenceIndicator.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock members data
const mockMembers = [
    { id: '1', name: 'Alice Chen', color: '#2dd4bf' },
    { id: '2', name: 'Bob Smith', color: '#f472b6' },
    { id: '3', name: 'Carol Davis', color: '#60a5fa' },
    { id: '4', name: 'David Lee', color: '#a78bfa' },
    { id: '5', name: 'Emma Wilson', color: '#fb923c' },
];

const mockRooms = [
    { id: 'main', name: 'Analytics Hub', type: 'main', memberCount: 5 },
    { id: 'breakout-1', name: 'Data Review', type: 'breakout', memberCount: 3 },
    { id: 'breakout-2', name: 'Model Testing', type: 'breakout', memberCount: 2, isLocked: true },
    { id: 'personal-1', name: 'My Workspace', type: 'personal' },
];

// Simplified mock for Storybook
const MockRoomPresenceIndicator = ({
    room = { id: 'main', name: 'Main Room', type: 'main' },
    members = [],
    onRoomChange,
    onClick,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const ROOM_TYPES = {
        main: { icon: 'globe', color: '#60a5fa' },
        breakout: { icon: 'gitBranch', color: '#a78bfa' },
        personal: { icon: 'user', color: '#34d399' },
    };

    const typeConfig = ROOM_TYPES[room?.type] || ROOM_TYPES.main;
    const visibleMembers = members.slice(0, 4);
    const overflowCount = members.length - 4;

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                }}
            >
                {/* Room Info */}
                <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>
                        Currently In
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name={typeConfig.icon} size={12} style={{ color: typeConfig.color }} />
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
                            {room?.name}
                        </span>
                        {room?.isLocked && (
                            <Icon name="lock" size={10} style={{ color: '#6b7280' }} />
                        )}
                    </div>
                </div>

                {/* Member Avatars */}
                {members.length > 0 && (
                    <div style={{ display: 'flex', marginLeft: '8px' }}>
                        {visibleMembers.map((member, i) => (
                            <div
                                key={member.id}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: member.color,
                                    border: '2px solid #1a1a2e',
                                    marginLeft: i > 0 ? '-8px' : 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    zIndex: 4 - i,
                                }}
                            >
                                {member.name.charAt(0)}
                            </div>
                        ))}
                        {overflowCount > 0 && (
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#374151',
                                border: '2px solid #1a1a2e',
                                marginLeft: '-8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9ca3af',
                                fontSize: '9px',
                                fontWeight: 500,
                            }}>
                                +{overflowCount}
                            </div>
                        )}
                    </div>
                )}

                <Icon
                    name="chevronDown"
                    size={12}
                    style={{
                        color: '#6b7280',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                    }}
                />
            </button>

            {/* Dropdown preview (simplified) */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    width: '220px',
                    background: '#1a1a2e',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    zIndex: 1000,
                }}>
                    <div style={{ padding: '8px' }}>
                        {mockRooms.map(r => (
                            <button
                                key={r.id}
                                onClick={() => { onRoomChange?.(r.id, r.name); setIsOpen(false); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: r.id === room?.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <Icon name={ROOM_TYPES[r.type]?.icon || 'globe'} size={12} style={{ color: ROOM_TYPES[r.type]?.color }} />
                                <span style={{ flex: 1 }}>{r.name}</span>
                                {r.isLocked && <Icon name="lock" size={10} style={{ color: '#6b7280' }} />}
                                {r.memberCount && (
                                    <span style={{ color: '#6b7280', fontSize: '11px' }}>{r.memberCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Organisms/RoomPresenceIndicator',
    component: MockRoomPresenceIndicator,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onRoomChange: { action: 'room changed' },
        onClick: { action: 'clicked' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '120px 40px 40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const MainRoom = {
    args: {
        room: { id: 'main', name: 'Analytics Hub', type: 'main' },
        members: mockMembers.slice(0, 3),
    },
};

export const BreakoutRoom = {
    args: {
        room: { id: 'breakout-1', name: 'Data Review', type: 'breakout' },
        members: mockMembers.slice(0, 2),
    },
};

export const LockedRoom = {
    args: {
        room: { id: 'breakout-2', name: 'Private Session', type: 'breakout', isLocked: true },
        members: mockMembers.slice(0, 1),
    },
};

export const PersonalSpace = {
    args: {
        room: { id: 'personal', name: 'My Workspace', type: 'personal' },
        members: [],
    },
};

export const ManyMembers = {
    args: {
        room: { id: 'main', name: 'Team Session', type: 'main' },
        members: mockMembers,
    },
};

export const NoMembers = {
    args: {
        room: { id: 'main', name: 'Empty Room', type: 'main' },
        members: [],
    },
};
