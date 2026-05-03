// src/ui/react/components/atoms/LinkBadges/LinkBadges.stories.jsx
// Stories for link-related badge atoms

import React from 'react';
import { LinkBadge } from './LinkBadge';
import { ViewerBadge } from './ViewerBadge';
import { HubBadge } from './HubBadge';
import { ModeBadge } from './ModeBadge';
import { SyncStatusIndicator } from './SyncStatusIndicator';

export default {
    title: 'Atoms/LinkBadges',
    parameters: {
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#0c1220' },
            ],
        },
    },
};

// =============================================================================
// LinkBadge Stories
// =============================================================================

export const LinkBadgeDefault = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>LinkBadge - Sizes</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LinkBadge count={3} size="small" onClick={() => console.log('clicked')} />
            <LinkBadge count={3} size="default" onClick={() => console.log('clicked')} />
            <LinkBadge count={3} size="large" onClick={() => console.log('clicked')} />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>LinkBadge - Counts</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LinkBadge count={1} />
            <LinkBadge count={3} />
            <LinkBadge count={6} />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>LinkBadge - With Label</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LinkBadge count={3} showLabel size="default" />
            <LinkBadge count={6} showLabel size="large" />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>LinkBadge - Non-draggable</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LinkBadge count={2} draggable={false} onClick={() => console.log('clicked')} />
        </div>
    </div>
);
LinkBadgeDefault.storyName = 'LinkBadge';

// =============================================================================
// ViewerBadge Stories
// =============================================================================

export const ViewerBadgeDefault = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>ViewerBadge - Sizes</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ViewerBadge count={2} size="small" />
            <ViewerBadge count={2} size="default" />
            <ViewerBadge count={2} size="large" />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>ViewerBadge - Counts</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ViewerBadge count={1} />
            <ViewerBadge count={3} />
            <ViewerBadge count={12} />
        </div>
    </div>
);
ViewerBadgeDefault.storyName = 'ViewerBadge';

// =============================================================================
// HubBadge Stories
// =============================================================================

export const HubBadgeDefault = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>HubBadge - Sizes</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <HubBadge size="small" />
            <HubBadge size="default" />
            <HubBadge size="large" />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>HubBadge - Icon Only</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <HubBadge size="small" showLabel={false} />
            <HubBadge size="default" showLabel={false} />
            <HubBadge size="large" showLabel={false} />
        </div>
    </div>
);
HubBadgeDefault.storyName = 'HubBadge';

// =============================================================================
// ModeBadge Stories
// =============================================================================

export const ModeBadgeDefault = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>ModeBadge - Modes (Icon Only)</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ModeBadge mode="follow" />
            <ModeBadge mode="sync" />
            <ModeBadge mode="broadcast" />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>ModeBadge - With Labels</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ModeBadge mode="follow" showLabel />
            <ModeBadge mode="sync" showLabel />
            <ModeBadge mode="broadcast" showLabel />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>ModeBadge - Sizes</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ModeBadge mode="sync" size="small" showLabel />
            <ModeBadge mode="sync" size="default" showLabel />
            <ModeBadge mode="sync" size="large" showLabel />
        </div>
    </div>
);
ModeBadgeDefault.storyName = 'ModeBadge';

// =============================================================================
// SyncStatusIndicator Stories
// =============================================================================

export const SyncStatusDefault = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>SyncStatusIndicator - All Statuses</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <SyncStatusIndicator status="synced" />
            <SyncStatusIndicator status="syncing" />
            <SyncStatusIndicator status="error" />
            <SyncStatusIndicator status="paused" />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>SyncStatusIndicator - Dot Only</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <SyncStatusIndicator status="synced" showLabel={false} />
            <SyncStatusIndicator status="syncing" showLabel={false} />
            <SyncStatusIndicator status="error" showLabel={false} />
            <SyncStatusIndicator status="paused" showLabel={false} />
        </div>

        <h3 style={{ color: '#fff', margin: 0 }}>SyncStatusIndicator - Sizes</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <SyncStatusIndicator status="syncing" size="small" />
            <SyncStatusIndicator status="syncing" size="default" />
            <SyncStatusIndicator status="syncing" size="large" />
        </div>
    </div>
);
SyncStatusDefault.storyName = 'SyncStatusIndicator';

// =============================================================================
// Combined Usage Stories
// =============================================================================

export const BadgeCluster = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Badge Clusters - Common Combinations</h3>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(12, 18, 32, 0.85)',
            borderRadius: '6px',
            border: '1px solid rgba(96, 165, 250, 0.12)',
        }}>
            <span style={{ color: '#fff', fontSize: '13px', marginRight: 'auto' }}>Hub View (synced)</span>
            <HubBadge size="small" />
            <LinkBadge count={4} size="small" />
            <ViewerBadge count={2} size="small" />
            <SyncStatusIndicator status="synced" size="small" showLabel={false} />
        </div>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(12, 18, 32, 0.85)',
            borderRadius: '6px',
            border: '1px solid rgba(96, 165, 250, 0.12)',
        }}>
            <span style={{ color: '#fff', fontSize: '13px', marginRight: 'auto' }}>Following View</span>
            <ModeBadge mode="follow" size="small" />
            <LinkBadge count={2} size="small" />
            <SyncStatusIndicator status="syncing" size="small" showLabel={false} />
        </div>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(12, 18, 32, 0.85)',
            borderRadius: '6px',
            border: '1px solid rgba(96, 165, 250, 0.12)',
        }}>
            <span style={{ color: '#fff', fontSize: '13px', marginRight: 'auto' }}>Broadcasting View</span>
            <ModeBadge mode="broadcast" size="small" />
            <LinkBadge count={6} size="small" />
            <ViewerBadge count={5} size="small" />
        </div>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(12, 18, 32, 0.85)',
            borderRadius: '6px',
            border: '1px solid rgba(96, 165, 250, 0.12)',
        }}>
            <span style={{ color: '#fff', fontSize: '13px', marginRight: 'auto' }}>Sync Error</span>
            <ModeBadge mode="sync" size="small" />
            <LinkBadge count={3} size="small" />
            <SyncStatusIndicator status="error" size="small" showLabel={false} />
        </div>
    </div>
);
BadgeCluster.storyName = 'Badge Clusters';

export const AllBadges = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px' }}>
        <div>
            <h2 style={{ color: '#fff', marginBottom: '16px' }}>Link Badges Overview</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '24px' }}>
                Atomic badge components for the view linking system. Used to indicate link status,
                viewer count, hub designation, link mode, and sync status.
            </p>
        </div>

        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px'
        }}>
            <div style={{ padding: '16px', background: 'rgba(12, 18, 32, 0.6)', borderRadius: '8px' }}>
                <h4 style={{ color: '#7dd3fc', margin: '0 0 12px 0', fontSize: '12px' }}>LinkBadge</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 12px 0' }}>
                    Shows linked property count. Draggable for quick-link.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <LinkBadge count={1} />
                    <LinkBadge count={3} />
                    <LinkBadge count={6} showLabel />
                </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(12, 18, 32, 0.6)', borderRadius: '8px' }}>
                <h4 style={{ color: '#60a5fa', margin: '0 0 12px 0', fontSize: '12px' }}>ViewerBadge</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 12px 0' }}>
                    Shows current viewer count for a view.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <ViewerBadge count={1} />
                    <ViewerBadge count={3} />
                    <ViewerBadge count={12} />
                </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(12, 18, 32, 0.6)', borderRadius: '8px' }}>
                <h4 style={{ color: '#fbbf24', margin: '0 0 12px 0', fontSize: '12px' }}>HubBadge</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 12px 0' }}>
                    Indicates the view is a hub (source of truth).
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <HubBadge showLabel={false} />
                    <HubBadge />
                </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(12, 18, 32, 0.6)', borderRadius: '8px' }}>
                <h4 style={{ color: '#c084fc', margin: '0 0 12px 0', fontSize: '12px' }}>ModeBadge</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 12px 0' }}>
                    Shows link mode: Follow/Sync/Broadcast.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <ModeBadge mode="follow" showLabel />
                    <ModeBadge mode="sync" showLabel />
                    <ModeBadge mode="broadcast" showLabel />
                </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(12, 18, 32, 0.6)', borderRadius: '8px' }}>
                <h4 style={{ color: '#34d399', margin: '0 0 12px 0', fontSize: '12px' }}>SyncStatusIndicator</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 12px 0' }}>
                    Shows sync status with pulse animation.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <SyncStatusIndicator status="synced" />
                    <SyncStatusIndicator status="syncing" />
                    <SyncStatusIndicator status="error" />
                </div>
            </div>
        </div>
    </div>
);
AllBadges.storyName = 'All Link Badges';
