/**
 * ViewCard Component Stories
 * Storybook documentation for all ViewCard variants
 */

import React, { useState } from 'react';
import ViewCard, {
    ViewCardDot,
    ViewCardChip,
    ViewCardMini,
    ViewCardCompact,
    ViewCardFull,
    LinkBadge,
    ViewerBadge,
    HubBadge,
    ModeBadge,
    LINK_MODES,
} from './ViewCard';
// Import atoms directly for showcase
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import { StatusDot } from '@UI/react/components/atoms/StatusDot';
import { Badge } from '@UI/react/components/atoms/Badge';

export default {
    title: 'Organisms/ViewCard',
    component: ViewCard,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Unified component for displaying view references throughout CIA Web.
Supports multiple variants for different contexts while maintaining
consistent visual language and interaction patterns.

## Variants
- **dot**: Minimal colored indicator with tooltip
- **chip**: Inline references in flowing text
- **mini**: Topology diagrams in link panels
- **compact**: Left panel list item with expandable details
- **full**: Canvas viewport with 3D content area
                `,
            },
        },
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['dot', 'chip', 'mini', 'compact', 'full'],
            description: 'The visual variant of the ViewCard',
        },
    },
};

// Sample view data
const sampleViews = [
    {
        id: 'v1',
        name: 'View of Skull.vtp',
        datasetName: 'Skull.vtp',
        color: '#2dd4bf', // teal
        ownerName: 'You',
    },
    {
        id: 'v2',
        name: 'View of Bones.vtp',
        datasetName: 'Bones.vtp',
        color: '#4ade80', // green
        ownerName: 'Dr. Smith',
    },
    {
        id: 'v3',
        name: 'Vessels Analysis',
        datasetName: 'dsa_vessels_extracted_perf.vtp',
        color: '#a78bfa', // purple
        ownerName: 'Dr. Jones',
    },
    {
        id: 'v4',
        name: 'Heart Model',
        datasetName: 'Heart.vtp',
        color: '#f472b6', // pink
        ownerName: 'Dr. Martinez',
    },
];

// =============================================================================
// DOT VARIANT STORIES
// =============================================================================

export const DotVariant = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
            {sampleViews.map((view, i) => (
                <React.Fragment key={view.id}>
                    {i > 0 && <span style={{ color: 'var(--color-text-muted)' }}>─</span>}
                    <ViewCard variant="dot" view={view} isHub={i === 0} />
                </React.Fragment>
            ))}
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Minimal indicator for connection diagrams. Hover for tooltip. Hub views show an amber ring.',
            },
        },
    },
};

export const DotSizes = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
            <div style={{ textAlign: 'center' }}>
                <ViewCardDot view={sampleViews[0]} size={6} />
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>6px</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <ViewCardDot view={sampleViews[0]} size={8} />
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>8px</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <ViewCardDot view={sampleViews[0]} size={10} />
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>10px</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <ViewCardDot view={sampleViews[0]} size={12} isHub />
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>12px Hub</div>
            </div>
        </div>
    ),
};

// =============================================================================
// CHIP VARIANT STORIES
// =============================================================================

export const ChipVariant = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
            <ViewCard variant="chip" view={sampleViews[0]} isHub />
            <ViewCard variant="chip" view={sampleViews[1]} mode="sync" />
            <ViewCard variant="chip" view={sampleViews[2]} mode="follow" onRemove={() => alert('Remove clicked')} />
            <ViewCard variant="chip" view={sampleViews[3]} mode="broadcast" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Inline references for flowing text or tight spaces. Shows hub star, mode badge, and optional remove button on hover.',
            },
        },
    },
};

export const ChipWithRemove = {
    render: () => {
        const [views, setViews] = useState(sampleViews.slice(0, 3));
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
                {views.map((view) => (
                    <ViewCardChip
                        key={view.id}
                        view={view}
                        mode="sync"
                        onRemove={() => setViews(views.filter(v => v.id !== view.id))}
                    />
                ))}
                {views.length === 0 && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>All views removed</span>
                )}
            </div>
        );
    },
};

// =============================================================================
// MINI VARIANT STORIES
// =============================================================================

export const MiniVariant = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8, maxWidth: 280 }}>
            <ViewCard variant="mini" view={sampleViews[0]} isHub isCurrentUser ownerName="You" mode="sync" />
            <ViewCard variant="mini" view={sampleViews[1]} ownerName="Dr. Smith" mode="sync" onRemove={() => {}} />
            <ViewCard variant="mini" view={sampleViews[2]} ownerName="Dr. Jones" mode="follow" onRemove={() => {}} />
            <ViewCard variant="mini" view={sampleViews[3]} ownerName="Dr. Martinez" mode="broadcast" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'For topology diagrams in link panels. Shows name, owner, mode. Hub views have an amber border.',
            },
        },
    },
};

export const MiniStates = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8, maxWidth: 280 }}>
            <ViewCardMini view={sampleViews[0]} ownerName="You" />
            <ViewCardMini view={sampleViews[0]} ownerName="You" isCurrentUser />
            <ViewCardMini view={sampleViews[0]} ownerName="You" isHub />
            <ViewCardMini view={sampleViews[0]} ownerName="You" isHub isCurrentUser />
        </div>
    ),
};

// =============================================================================
// COMPACT VARIANT STORIES
// =============================================================================

export const CompactVariant = () => {
    const [activeViewId, setActiveViewId] = useState('v1');
    const [expandedViewId, setExpandedViewId] = useState(null);
    const [starredViews, setStarredViews] = useState(['v1']);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 20, background: 'var(--color-bg-secondary)', borderRadius: 8, maxWidth: 340 }}>
            {sampleViews.map((view) => (
                <ViewCard
                    key={view.id}
                    variant="compact"
                    view={view}
                    isActive={activeViewId === view.id}
                    isExpanded={expandedViewId === view.id}
                    isStarred={starredViews.includes(view.id)}
                    linkCount={view.id === 'v1' ? 3 : view.id === 'v2' ? 2 : 0}
                    viewerCount={view.id === 'v1' ? 2 : 0}
                    isHub={view.id === 'v1'}
                    isOnCanvas={view.id === 'v1' || view.id === 'v2'}
                    onClick={() => setActiveViewId(view.id)}
                    onToggleExpand={() => setExpandedViewId(expandedViewId === view.id ? null : view.id)}
                    onStar={() => {
                        setStarredViews(prev =>
                            prev.includes(view.id)
                                ? prev.filter(id => id !== view.id)
                                : [...prev, view.id]
                        );
                    }}
                    onLinkClick={() => console.log('Link clicked:', view.id)}
                    onDuplicate={() => console.log('Duplicate:', view.id)}
                    onSettings={() => console.log('Settings:', view.id)}
                    onTrash={() => console.log('Trash:', view.id)}
                />
            ))}
        </div>
    );
};

CompactVariant.parameters = {
    docs: {
        description: {
            story: 'Left panel list item with badges, quick actions, and expandable details. Click to select, hover to show actions.',
        },
    },
};

// =============================================================================
// FULL VARIANT STORIES
// =============================================================================

export const FullVariant = () => {
    const [activeViewId, setActiveViewId] = useState('v1');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 20, background: 'var(--color-bg-canvas)', borderRadius: 8 }}>
            {sampleViews.slice(0, 4).map((view, i) => (
                <div key={view.id} style={{ height: 200 }}>
                    <ViewCard
                        variant="full"
                        view={view}
                        isActive={activeViewId === view.id}
                        isCompact={false}
                        linkCount={i === 0 ? 3 : i === 1 ? 2 : 0}
                        viewerCount={i === 0 ? 2 : 0}
                        isHub={i === 0}
                        syncStatus={i === 0 ? 'synced' : i === 1 ? 'syncing' : null}
                        onClick={() => setActiveViewId(view.id)}
                        onClose={() => console.log('Close:', view.id)}
                        onFocus={() => console.log('Focus:', view.id)}
                        onMore={() => console.log('More:', view.id)}
                        onLinkClick={() => console.log('Link clicked:', view.id)}
                    />
                </div>
            ))}
        </div>
    );
};

FullVariant.parameters = {
    docs: {
        description: {
            story: 'Complete viewport with header, badges, sync status, and content area. Used in the canvas grid.',
        },
    },
};

export const FullCompactMode = () => {
    const [activeViewId, setActiveViewId] = useState('v1');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 20, background: 'var(--color-bg-canvas)', borderRadius: 8 }}>
            {sampleViews.map((view) => (
                <div key={view.id} style={{ height: 120 }}>
                    <ViewCard
                        variant="full"
                        view={view}
                        isActive={activeViewId === view.id}
                        isCompact={true}
                        onClick={() => setActiveViewId(view.id)}
                        onClose={() => console.log('Close:', view.id)}
                        onFocus={() => console.log('Focus:', view.id)}
                    />
                </div>
            ))}
        </div>
    );
};

FullCompactMode.parameters = {
    docs: {
        description: {
            story: 'Compact mode for small viewport cells with reduced header and hidden elements until hover.',
        },
    },
};

// =============================================================================
// BADGE STORIES
// =============================================================================

export const Badges = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <LinkBadge count={3} />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Link Badge</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <ViewerBadge count={5} />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Viewer Badge</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <HubBadge />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Hub Badge</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <ModeBadge mode="follow" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Follow</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <ModeBadge mode="sync" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Sync</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <ModeBadge mode="broadcast" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Broadcast</span>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Individual badge components used across all variants.',
            },
        },
    },
};

export const StatusDots = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <StatusDot status="active" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Active</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <StatusDot status="idle" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Idle</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <StatusDot status="away" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Away</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <StatusDot status="syncing" />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Syncing</span>
            </div>
        </div>
    ),
};

export const ColorDots = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, padding: 20, background: 'var(--color-bg-tertiary)', borderRadius: 8, alignItems: 'center' }}>
            <ColorDot color="#2dd4bf" size={8} />
            <ColorDot color="#4ade80" size={10} />
            <ColorDot color="#a78bfa" size={12} glow />
            <ColorDot color="#f472b6" size={12} ring />
            <ColorDot color="#fbbf24" size={14} ring glow />
        </div>
    ),
};

// =============================================================================
// INTERACTIVE DEMO
// =============================================================================

export const InteractiveDemo = () => {
    const [activeViewId, setActiveViewId] = useState('v1');
    const [views, setViews] = useState(sampleViews);
    const [starredViews, setStarredViews] = useState(['v1']);

    const toggleStar = (viewId) => {
        setStarredViews(prev =>
            prev.includes(viewId)
                ? prev.filter(id => id !== viewId)
                : [...prev, viewId]
        );
    };

    return (
        <div style={{ padding: 20 }}>
            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 16 }}>All Variants</h3>

            <div style={{ display: 'flex', gap: 40 }}>
                {/* Left: Compact list */}
                <div style={{ width: 300 }}>
                    <h4 style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 8 }}>COMPACT LIST</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {views.map((view) => (
                            <ViewCardCompact
                                key={view.id}
                                view={view}
                                isActive={activeViewId === view.id}
                                isStarred={starredViews.includes(view.id)}
                                linkCount={view.id === 'v1' ? 3 : 0}
                                isHub={view.id === 'v1'}
                                onClick={() => setActiveViewId(view.id)}
                                onStar={() => toggleStar(view.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: Canvas preview */}
                <div style={{ flex: 1 }}>
                    <h4 style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 8 }}>CANVAS VIEWPORT</h4>
                    <div style={{ height: 300, background: 'var(--color-bg-canvas)', borderRadius: 8, padding: 12 }}>
                        <ViewCardFull
                            view={views.find(v => v.id === activeViewId) || views[0]}
                            isActive
                            linkCount={3}
                            isHub={activeViewId === 'v1'}
                            syncStatus="synced"
                        />
                    </div>

                    <h4 style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 16, marginBottom: 8 }}>LINKED VIEWS (Mini)</h4>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {views.filter(v => v.id !== activeViewId).map((view) => (
                            <ViewCardMini
                                key={view.id}
                                view={view}
                                mode="sync"
                                ownerName={view.ownerName}
                            />
                        ))}
                    </div>

                    <h4 style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 16, marginBottom: 8 }}>INLINE CHIPS</h4>
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                        Currently viewing <ViewCardChip view={views.find(v => v.id === activeViewId) || views[0]} isHub={activeViewId === 'v1'} />
                        {' '}which is synced with{' '}
                        {views.filter(v => v.id !== activeViewId).slice(0, 2).map((view, i) => (
                            <React.Fragment key={view.id}>
                                {i > 0 && ' and '}
                                <ViewCardChip view={view} mode="sync" />
                            </React.Fragment>
                        ))}
                    </p>
                </div>
            </div>
        </div>
    );
};

InteractiveDemo.parameters = {
    docs: {
        description: {
            story: 'Interactive demo showing all variants working together in a realistic layout.',
        },
    },
};
