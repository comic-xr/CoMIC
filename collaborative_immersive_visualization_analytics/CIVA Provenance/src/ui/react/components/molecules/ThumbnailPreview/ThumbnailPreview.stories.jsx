// src/ui/react/components/molecules/ThumbnailPreview/ThumbnailPreview.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock ThumbnailPreview component
const MockThumbnailPreview = ({
    title = 'View',
    subtitle,
    selected = false,
    onClick,
    onHover,
}) => (
    <div
        onClick={onClick}
        onMouseEnter={onHover}
        style={{
            position: 'relative',
            width: '120px',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: onClick ? 'pointer' : 'default',
            border: selected ? '2px solid #3b82f6' : '2px solid transparent',
            background: '#1a1a2e',
        }}
    >
        <div style={{
            aspectRatio: '16/9',
            background: 'linear-gradient(135deg, #2d2d4a 0%, #1a1a2e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
        }}>
            <Icon name="image" size={24} />
        </div>
        <div style={{
            padding: '8px',
            background: selected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        }}>
            <div style={{
                color: '#e5e7eb',
                fontSize: '12px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {title}
            </div>
            {subtitle && (
                <div style={{
                    color: '#6b7280',
                    fontSize: '11px',
                    marginTop: '2px',
                }}>
                    {subtitle}
                </div>
            )}
        </div>
    </div>
);

export default {
    title: 'Molecules/ThumbnailPreview',
    component: MockThumbnailPreview,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onClick: { action: 'clicked' },
        onHover: { action: 'hovered' },
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
        title: 'Main View',
    },
};

export const WithSubtitle = {
    args: {
        title: 'Scatter Plot',
        subtitle: 'Dataset A',
    },
};

export const Selected = {
    args: {
        title: 'Selected View',
        selected: true,
    },
};

export const Clickable = {
    args: {
        title: 'Click Me',
        subtitle: 'Interactive',
        onClick: () => {},
    },
};

export const ThumbnailGrid = {
    render: () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
        }}>
            <MockThumbnailPreview title="View 1" selected onClick={() => {}} />
            <MockThumbnailPreview title="View 2" subtitle="Chart" onClick={() => {}} />
            <MockThumbnailPreview title="View 3" subtitle="3D Model" onClick={() => {}} />
            <MockThumbnailPreview title="View 4" onClick={() => {}} />
            <MockThumbnailPreview title="View 5" subtitle="Table" onClick={() => {}} />
            <MockThumbnailPreview title="View 6" onClick={() => {}} />
        </div>
    ),
};

export const LongTitle = {
    args: {
        title: 'Very Long View Title That Should Truncate',
        subtitle: 'Subtitle text',
    },
};

export const ViewSelector = {
    render: function ViewSelectorStory() {
        const [selected, setSelected] = React.useState(0);
        const views = [
            { title: 'Overview', subtitle: 'Main' },
            { title: 'Details', subtitle: 'Chart' },
            { title: 'Summary', subtitle: 'Table' },
        ];

        return (
            <div style={{ display: 'flex', gap: '12px' }}>
                {views.map((view, i) => (
                    <MockThumbnailPreview
                        key={i}
                        title={view.title}
                        subtitle={view.subtitle}
                        selected={selected === i}
                        onClick={() => setSelected(i)}
                    />
                ))}
            </div>
        );
    },
};
