/**
 * @file VRViewLinking.stories.jsx
 * @description Stories for VR view linking components.
 */

import React, { useState } from 'react';
import { VRLinkBadge } from './VRLinkBadge';
import { VRLinkTargetOverlay } from './VRLinkTargetOverlay';
import { VRQuickLinkPanel } from './VRQuickLinkPanel';
import { VRLinkingInstructions } from './VRLinkingInstructions';
import { useVRLinking } from './useVRLinking';

export default {
    title: 'Molecules/VRViewLinking',
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
};

// Sample views for demos
const sampleViews = [
    { id: 'v1', name: 'Skull View', color: '#2dd4bf', linkCount: 2, isHub: true },
    { id: 'v2', name: 'Bones View', color: '#4ade80', linkCount: 1, isHub: false },
    { id: 'v3', name: 'Vessels', color: '#a78bfa', linkCount: 0, isHub: false },
    { id: 'v4', name: 'Heart Model', color: '#f472b6', linkCount: 0, isHub: false },
];

// =============================================================================
// VR LINK BADGE STORIES
// =============================================================================

export const LinkBadges = () => {
    const [activeId, setActiveId] = useState(null);

    return (
        <div style={{ padding: 40, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                    Default Badge
                </div>
                <VRLinkBadge
                    viewId="v1"
                    viewName="Test View"
                    viewColor="#2dd4bf"
                    linkCount={0}
                    onActivate={(id) => setActiveId(id)}
                    onDeactivate={() => setActiveId(null)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                    With Link Count
                </div>
                <VRLinkBadge
                    viewId="v2"
                    viewName="Linked View"
                    viewColor="#4ade80"
                    linkCount={3}
                    onActivate={(id) => setActiveId(id)}
                    onDeactivate={() => setActiveId(null)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                    Hub Badge
                </div>
                <VRLinkBadge
                    viewId="v3"
                    viewName="Hub View"
                    viewColor="#f472b6"
                    linkCount={5}
                    isHub={true}
                    onActivate={(id) => setActiveId(id)}
                    onDeactivate={() => setActiveId(null)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                    Active Badge
                </div>
                <VRLinkBadge
                    viewId="v4"
                    viewName="Active View"
                    viewColor="#a78bfa"
                    linkCount={2}
                    isActive={true}
                    isLinkingMode={true}
                    onDeactivate={() => {}}
                />
            </div>

            <div
                style={{
                    width: '100%',
                    marginTop: 20,
                    padding: 10,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#666',
                }}
            >
                Active view ID: {activeId || 'none'}
            </div>
        </div>
    );
};

// =============================================================================
// VR LINK TARGET OVERLAY STORIES
// =============================================================================

export const TargetOverlays = () => {
    return (
        <div style={{ padding: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {/* Source */}
            <VRLinkTargetOverlay
                viewId="v1"
                viewName="Source View"
                viewColor="#2dd4bf"
                isLinkingMode={true}
                sourceViewId="v1"
                isValidTarget={false}
            >
                <ViewPlaceholder name="Source View" color="#2dd4bf" />
            </VRLinkTargetOverlay>

            {/* Valid Target */}
            <VRLinkTargetOverlay
                viewId="v2"
                viewName="Valid Target"
                viewColor="#4ade80"
                isLinkingMode={true}
                sourceViewId="v1"
                isValidTarget={true}
                isHovered={false}
            >
                <ViewPlaceholder name="Valid Target" color="#4ade80" />
            </VRLinkTargetOverlay>

            {/* Valid Target (Hovered) */}
            <VRLinkTargetOverlay
                viewId="v3"
                viewName="Hovered Target"
                viewColor="#a78bfa"
                isLinkingMode={true}
                sourceViewId="v1"
                isValidTarget={true}
                isHovered={true}
                onSelect={(id) => console.log('Selected:', id)}
            >
                <ViewPlaceholder name="Hovered Target" color="#a78bfa" />
            </VRLinkTargetOverlay>

            {/* Invalid Target */}
            <VRLinkTargetOverlay
                viewId="v4"
                viewName="Invalid Target"
                viewColor="#f87171"
                isLinkingMode={true}
                sourceViewId="v1"
                isValidTarget={false}
            >
                <ViewPlaceholder name="Invalid Target" color="#f87171" />
            </VRLinkTargetOverlay>
        </div>
    );
};

// =============================================================================
// VR QUICK LINK PANEL STORIES
// =============================================================================

export const QuickLinkPanel = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div style={{ padding: 40 }}>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '12px 24px',
                    background: '#2dd4bf',
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Open Quick Link Panel
            </button>

            <VRQuickLinkPanel
                isOpen={isOpen}
                sourceView={{ id: 'v1', name: 'Skull View', color: '#2dd4bf' }}
                targetView={{ id: 'v2', name: 'Bones View', color: '#4ade80' }}
                onConfirm={(property, mode) => {
                    console.log('Link created:', { property, mode });
                    setIsOpen(false);
                }}
                onCancel={() => setIsOpen(false)}
            />
        </div>
    );
};

// =============================================================================
// VR LINKING INSTRUCTIONS STORIES
// =============================================================================

export const LinkingInstructions = () => {
    return (
        <div style={{ padding: 40, paddingBottom: 200 }}>
            <div style={{ marginBottom: 40 }}>
                <h3 style={{ color: '#fff', marginBottom: 20 }}>Step 1: Select Target</h3>
                <div style={{ position: 'relative', height: 150 }}>
                    <VRLinkingInstructions
                        isActive={true}
                        step={1}
                        sourceViewName="Skull View"
                        onCancel={() => console.log('Cancelled')}
                    />
                </div>
            </div>

            <div>
                <h3 style={{ color: '#fff', marginBottom: 20 }}>Step 2: Confirm Options</h3>
                <div style={{ position: 'relative', height: 150 }}>
                    <VRLinkingInstructions
                        isActive={true}
                        step={2}
                        sourceViewName="Skull View"
                        targetViewName="Bones View"
                        onCancel={() => console.log('Cancelled')}
                    />
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// COMPLETE VR LINKING FLOW
// =============================================================================

export const CompleteLinkingFlow = () => {
    const handleCreateLink = (sourceId, targetId, property, mode) => {
        console.log('Link created:', { sourceId, targetId, property, mode });
    };

    const {
        isLinking,
        createBadgeProps,
        createTargetProps,
        instructionsProps,
        panelProps,
    } = useVRLinking({
        views: sampleViews,
        onCreateLink: handleCreateLink,
        canLink: (sourceId, targetId) => sourceId !== targetId,
    });

    const [hoveredView, setHoveredView] = useState(null);

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 20,
                padding: 40,
                background: '#030303',
                minHeight: '100vh',
            }}
        >
            {sampleViews.map((view) => (
                <VRLinkTargetOverlay
                    key={view.id}
                    {...createTargetProps(view.id, view)}
                    isHovered={hoveredView === view.id}
                >
                    <div
                        onPointerEnter={() => setHoveredView(view.id)}
                        onPointerLeave={() => setHoveredView(null)}
                        style={{
                            padding: 24,
                            background: 'rgba(12, 18, 32, 0.8)',
                            borderRadius: 8,
                            minHeight: 200,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 16,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: view.color,
                                        marginBottom: 4,
                                    }}
                                >
                                    {view.name}
                                </div>
                                <div style={{ fontSize: 12, color: '#666' }}>
                                    VTK Instance
                                </div>
                            </div>

                            <VRLinkBadge
                                {...createBadgeProps(view.id, view)}
                                linkCount={view.linkCount}
                                isHub={view.isHub}
                            />
                        </div>

                        {/* Placeholder viewport */}
                        <div
                            style={{
                                height: 120,
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666',
                                fontSize: 12,
                            }}
                        >
                            3D Viewport
                        </div>
                    </div>
                </VRLinkTargetOverlay>
            ))}

            {/* Instructions overlay */}
            <VRLinkingInstructions {...instructionsProps} />

            {/* Quick link panel */}
            <VRQuickLinkPanel {...panelProps} />
        </div>
    );
};

CompleteLinkingFlow.parameters = {
    docs: {
        description: {
            story:
                'Complete VR linking flow. Click a Link badge to start linking, then click a valid target to create a link.',
        },
    },
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ViewPlaceholder({ name, color }) {
    return (
        <div
            style={{
                padding: 24,
                background: 'rgba(12, 18, 32, 0.8)',
                borderRadius: 8,
                minHeight: 150,
            }}
        >
            <div
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: color,
                    marginBottom: 12,
                }}
            >
                {name}
            </div>
            <div
                style={{
                    height: 80,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 12,
                }}
            >
                3D Viewport
            </div>
        </div>
    );
}
