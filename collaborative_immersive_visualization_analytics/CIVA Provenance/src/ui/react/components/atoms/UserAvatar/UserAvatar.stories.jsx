// src/ui/react/components/atoms/UserAvatar/UserAvatar.stories.jsx
import React from 'react';

// Generate color from name
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#FF9800', '#FF5722'];
    return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
const getInitials = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

// Mock UserAvatar component
const MockUserAvatar = ({ userName, color, size = 'md', showBorder = false }) => {
    const sizes = {
        xs: { size: 20, fontSize: 8 },
        sm: { size: 28, fontSize: 10 },
        md: { size: 36, fontSize: 12 },
        lg: { size: 48, fontSize: 16 },
    };
    const s = sizes[size] || sizes.md;
    const bgColor = color || stringToColor(userName);

    return (
        <div style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: `${s.fontSize}px`,
            fontWeight: 600,
            border: showBorder ? '2px solid rgba(255, 255, 255, 0.2)' : 'none',
        }}>
            {getInitials(userName)}
        </div>
    );
};

// Mock UserAvatarGroup component
const MockUserAvatarGroup = ({ users, max = 3, size = 'sm' }) => {
    const visibleUsers = users.slice(0, max);
    const overflow = users.length - max;

    return (
        <div style={{ display: 'flex' }}>
            {visibleUsers.map((user, i) => (
                <div key={i} style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: visibleUsers.length - i }}>
                    <MockUserAvatar
                        userName={user.userName}
                        color={user.userColor}
                        size={size}
                        showBorder
                    />
                </div>
            ))}
            {overflow > 0 && (
                <div style={{
                    marginLeft: '-8px',
                    width: size === 'sm' ? '28px' : '36px',
                    height: size === 'sm' ? '28px' : '36px',
                    borderRadius: '50%',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: size === 'sm' ? '10px' : '12px',
                    fontWeight: 500,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                }}>
                    +{overflow}
                </div>
            )}
        </div>
    );
};

export default {
    title: 'Atoms/UserAvatar',
    component: MockUserAvatar,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        showBorder: {
            control: 'boolean',
        },
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
        userName: 'Beth Smith',
        size: 'md',
    },
};

export const SingleName = {
    args: {
        userName: 'Claude',
        size: 'md',
    },
};

export const WithCustomColor = {
    args: {
        userName: 'Alex Johnson',
        color: '#9C27B0',
        size: 'md',
    },
};

export const WithBorder = {
    args: {
        userName: 'Sam Wilson',
        showBorder: true,
        size: 'md',
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockUserAvatar userName="User" size="xs" />
            <MockUserAvatar userName="User" size="sm" />
            <MockUserAvatar userName="User" size="md" />
            <MockUserAvatar userName="User" size="lg" />
        </div>
    ),
};

export const Group = {
    render: () => (
        <MockUserAvatarGroup
            users={[
                { userName: 'Beth Smith', userColor: '#F44336' },
                { userName: 'Claude AI', userColor: '#2196F3' },
                { userName: 'Sam Wilson', userColor: '#4CAF50' },
            ]}
            max={3}
            size="sm"
        />
    ),
};

export const GroupWithOverflow = {
    render: () => (
        <MockUserAvatarGroup
            users={[
                { userName: 'Beth Smith', userColor: '#F44336' },
                { userName: 'Claude AI', userColor: '#2196F3' },
                { userName: 'Sam Wilson', userColor: '#4CAF50' },
                { userName: 'Alex Johnson', userColor: '#9C27B0' },
                { userName: 'Jordan Lee', userColor: '#FF9800' },
                { userName: 'Casey Brown', userColor: '#00BCD4' },
            ]}
            max={3}
            size="sm"
        />
    ),
};

export const ColorVariants = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'].map(name => (
                <MockUserAvatar key={name} userName={name} size="md" />
            ))}
        </div>
    ),
};
