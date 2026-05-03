/**
 * Footer2 Stories
 *
 * Shared canvas toolbar footer with ViewGroup selector and responsive links.
 */

import React, { useState } from 'react';
import { Footer2 } from './Footer2';
import { ViewGroupSelector } from './components/ViewGroupSelector/ViewGroupSelector';
import {
    LinksSection,
    ExpandedLinks,
    CollapsedLinksIndicator,
} from './components/LinksSection/LinksSection';
import { DuplicationDialog } from '@UI/react/components/modals/DuplicationDialog';
import { LINK_PROPERTIES } from './Footer2.logic';

export default {
    title: 'Organisms/Footer2',
    component: Footer2,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_VIEWGROUPS = [
    { id: 'vg-1', name: 'MRI Slices', color: '#a855f7', views: ['v1', 'v2', 'v3', 'v4'], linkedTo: null },
    { id: 'vg-2', name: 'Analysis', color: '#3b82f6', views: ['v5', 'v6', 'v7'], linkedTo: 'vg-1' },
    { id: 'vg-3', name: 'Tumor Comparison', color: '#22c55e', views: ['v8', 'v9', 'v10', 'v11'], linkedTo: null },
    { id: 'vg-4', name: 'CT Overview', color: '#f59e0b', views: ['v12', 'v13'], linkedTo: null },
];

const MOCK_LINK_STATS = {
    camera: { count: 2, mode: 'sync', linkedViews: ['v5', 'v6'] },
    filters: { count: 1, mode: 'follow', linkedViews: ['v5'] },
    colorMaps: { count: 0, mode: null, linkedViews: [] },
    widgets: { count: 0, mode: null, linkedViews: [] },
    cursors: { count: 3, mode: 'sync', linkedViews: ['v5', 'v6', 'v7'] },
    annotations: { count: 0, mode: null, linkedViews: [] },
};

const MOCK_LINK_STATS_ALL_LINKED = {
    camera: { count: 2, mode: 'sync', linkedViews: ['v5', 'v6'] },
    filters: { count: 1, mode: 'follow', linkedViews: ['v5'] },
    colorMaps: { count: 2, mode: 'broadcast', linkedViews: ['v5', 'v6'] },
    widgets: { count: 1, mode: 'sync', linkedViews: ['v5'] },
    cursors: { count: 3, mode: 'sync', linkedViews: ['v5', 'v6', 'v7'] },
    annotations: { count: 1, mode: 'follow', linkedViews: ['v5'] },
};

const MOCK_LINK_STATS_NONE = {
    camera: { count: 0, mode: null, linkedViews: [] },
    filters: { count: 0, mode: null, linkedViews: [] },
    colorMaps: { count: 0, mode: null, linkedViews: [] },
    widgets: { count: 0, mode: null, linkedViews: [] },
    cursors: { count: 0, mode: null, linkedViews: [] },
    annotations: { count: 0, mode: null, linkedViews: [] },
};

// =============================================================================
// FULL FOOTER STORIES
// =============================================================================

/**
 * Default Footer2 in full mode (≥900px)
 */
export const Default = {
    render: () => {
        const [activeViewGroupId, setActiveViewGroupId] = useState('vg-1');

        return (
            <div style={{ background: '#0a0a0f', padding: 24 }}>
                <div style={{
                    background: '#12121a',
                    borderRadius: 8,
                    overflow: 'hidden',
                    width: 950,
                }}>
                    <div style={{ height: 300, background: '#1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        Canvas Content
                    </div>
                    <Footer2
                        viewGroups={MOCK_VIEWGROUPS}
                        activeViewGroupId={activeViewGroupId}
                        onSelectViewGroup={setActiveViewGroupId}
                        onCreateViewGroup={(layout) => console.log('Create:', layout)}
                        onUpdateViewGroup={(id, data) => console.log('Update:', id, data)}
                        onDeleteViewGroup={(id) => console.log('Delete:', id)}
                        onDuplicateViewGroup={(vg) => console.log('Duplicate:', vg)}
                        onGoToViewGroup={(id) => console.log('GoTo:', id)}
                        linkingService={null}
                        containerWidth={950}
                    />
                </div>
            </div>
        );
    },
};

/**
 * Interactive with width control
 */
export const Responsive = {
    render: () => {
        const [width, setWidth] = useState(900);
        const [activeViewGroupId, setActiveViewGroupId] = useState('vg-1');

        const getMode = (w) => {
            if (w >= 900) return 'Full';
            if (w >= 600) return 'Compact';
            return 'Minimal';
        };

        return (
            <div style={{ background: '#0a0a0f', padding: 24 }}>
                {/* Width Control */}
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Width:</span>
                    <input
                        type="range"
                        min={450}
                        max={1200}
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        style={{ width: 200 }}
                    />
                    <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: width >= 900 ? '#22c55e' : width >= 600 ? '#f59e0b' : '#ef4444',
                    }}>
                        {width}px ({getMode(width)})
                    </span>
                </div>

                {/* Breakpoint markers */}
                <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                    {[450, 600, 900].map(bp => (
                        <span
                            key={bp}
                            style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                background: width >= bp ? '#22c55e20' : '#333',
                                color: width >= bp ? '#22c55e' : '#666',
                                border: `1px solid ${width >= bp ? '#22c55e40' : '#444'}`,
                            }}
                        >
                            {bp}px
                        </span>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    background: '#12121a',
                    borderRadius: 8,
                    overflow: 'hidden',
                    width: width,
                    transition: 'width 0.3s ease',
                }}>
                    <div style={{ height: 200, background: '#1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        Canvas Content
                    </div>
                    <Footer2
                        viewGroups={MOCK_VIEWGROUPS}
                        activeViewGroupId={activeViewGroupId}
                        onSelectViewGroup={setActiveViewGroupId}
                        onCreateViewGroup={(layout) => console.log('Create:', layout)}
                        onUpdateViewGroup={(id, data) => console.log('Update:', id, data)}
                        onDeleteViewGroup={(id) => console.log('Delete:', id)}
                        onDuplicateViewGroup={(vg) => console.log('Duplicate:', vg)}
                        onGoToViewGroup={(id) => console.log('GoTo:', id)}
                        linkingService={null}
                        containerWidth={width}
                    />
                </div>
            </div>
        );
    },
};

// =============================================================================
// VIEWGROUP SELECTOR STORIES
// =============================================================================

/**
 * ViewGroup Selector in different modes
 */
export const ViewGroupSelectorModes = {
    name: 'ViewGroup Selector',
    render: () => {
        const [activeVG, setActiveVG] = useState(MOCK_VIEWGROUPS[0]);

        return (
            <div style={{ background: '#0a0a0f', padding: 24 }}>
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Full Mode (160px max)</h3>
                    <div style={{ background: '#12121a', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                        <ViewGroupSelector
                            viewGroups={MOCK_VIEWGROUPS}
                            activeViewGroup={activeVG}
                            mode="full"
                            onSelectViewGroup={(id) => setActiveVG(MOCK_VIEWGROUPS.find(vg => vg.id === id))}
                            onCreateViewGroup={(layout) => console.log('Create:', layout)}
                            onGoToViewGroup={(id) => console.log('GoTo:', id)}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Compact Mode (120px max)</h3>
                    <div style={{ background: '#12121a', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                        <ViewGroupSelector
                            viewGroups={MOCK_VIEWGROUPS}
                            activeViewGroup={activeVG}
                            mode="compact"
                            onSelectViewGroup={(id) => setActiveVG(MOCK_VIEWGROUPS.find(vg => vg.id === id))}
                            onCreateViewGroup={(layout) => console.log('Create:', layout)}
                            onGoToViewGroup={(id) => console.log('GoTo:', id)}
                        />
                    </div>
                </div>

                <div>
                    <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Minimal Mode (dot only)</h3>
                    <div style={{ background: '#12121a', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                        <ViewGroupSelector
                            viewGroups={MOCK_VIEWGROUPS}
                            activeViewGroup={activeVG}
                            mode="minimal"
                            onSelectViewGroup={(id) => setActiveVG(MOCK_VIEWGROUPS.find(vg => vg.id === id))}
                            onCreateViewGroup={(layout) => console.log('Create:', layout)}
                            onGoToViewGroup={(id) => console.log('GoTo:', id)}
                        />
                    </div>
                </div>
            </div>
        );
    },
};

// =============================================================================
// LINKS SECTION STORIES
// =============================================================================

/**
 * Links Section in different modes
 */
export const LinksSectionModes = {
    name: 'Links Section',
    render: () => (
        <div style={{ background: '#0a0a0f', padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Full Mode (Expanded)</h3>
                <div style={{ background: '#12121a', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                    <LinksSection
                        mode="full"
                        linkStats={MOCK_LINK_STATS}
                        totalActiveLinks={3}
                        activeViewType="vtk-volume"
                        onOpenLinkManager={() => console.log('Open Link Manager')}
                    />
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Compact Mode (Dots)</h3>
                <div style={{ background: '#12121a', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                    <LinksSection
                        mode="compact"
                        linkStats={MOCK_LINK_STATS}
                        totalActiveLinks={3}
                        activeViewType="vtk-volume"
                        onOpenLinkManager={() => console.log('Open Link Manager')}
                    />
                </div>
            </div>

            <div>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Minimal Mode (Count only)</h3>
                <div style={{ background: '#12121a', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                    <LinksSection
                        mode="minimal"
                        linkStats={MOCK_LINK_STATS}
                        totalActiveLinks={3}
                        activeViewType="vtk-volume"
                        onOpenLinkManager={() => console.log('Open Link Manager')}
                    />
                </div>
            </div>
        </div>
    ),
};

/**
 * Links states comparison
 */
export const LinksStates = {
    name: 'Links States',
    render: () => (
        <div style={{ background: '#0a0a0f', padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Some Links Active</h3>
                <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                    <ExpandedLinks
                        linkStats={MOCK_LINK_STATS}
                        activeViewType="vtk-volume"
                        onPropertyClick={(prop) => console.log('Click:', prop.label)}
                    />
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>All Links Active</h3>
                <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                    <ExpandedLinks
                        linkStats={MOCK_LINK_STATS_ALL_LINKED}
                        activeViewType="vtk-volume"
                        onPropertyClick={(prop) => console.log('Click:', prop.label)}
                    />
                </div>
            </div>

            <div>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>No Links Active</h3>
                <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                    <ExpandedLinks
                        linkStats={MOCK_LINK_STATS_NONE}
                        activeViewType="vtk-volume"
                        onPropertyClick={(prop) => console.log('Click:', prop.label)}
                    />
                </div>
            </div>
        </div>
    ),
};

/**
 * Collapsed Links Dots
 */
export const CollapsedLinksDots = {
    name: 'Collapsed Links Dots',
    render: () => (
        <div style={{ background: '#0a0a0f', padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Compact (with dots)</h3>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>Some linked</div>
                        <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                            <CollapsedLinksIndicator
                                linkStats={MOCK_LINK_STATS}
                                mode="compact"
                                totalActiveLinks={3}
                                onClick={() => {}}
                            />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>All linked</div>
                        <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                            <CollapsedLinksIndicator
                                linkStats={MOCK_LINK_STATS_ALL_LINKED}
                                mode="compact"
                                totalActiveLinks={6}
                                onClick={() => {}}
                            />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>None linked</div>
                        <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                            <CollapsedLinksIndicator
                                linkStats={MOCK_LINK_STATS_NONE}
                                mode="compact"
                                totalActiveLinks={0}
                                onClick={() => {}}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>Minimal (count only)</h3>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>3 linked</div>
                        <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                            <CollapsedLinksIndicator
                                linkStats={MOCK_LINK_STATS}
                                mode="minimal"
                                totalActiveLinks={3}
                                onClick={() => {}}
                            />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>6 linked</div>
                        <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                            <CollapsedLinksIndicator
                                linkStats={MOCK_LINK_STATS_ALL_LINKED}
                                mode="minimal"
                                totalActiveLinks={6}
                                onClick={() => {}}
                            />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>0 linked</div>
                        <div style={{ background: '#12121a', padding: 12, borderRadius: 8 }}>
                            <CollapsedLinksIndicator
                                linkStats={MOCK_LINK_STATS_NONE}
                                mode="minimal"
                                totalActiveLinks={0}
                                onClick={() => {}}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ),
};

// =============================================================================
// DOCUMENTATION
// =============================================================================

/**
 * All breakpoints documentation
 */
export const Documentation = {
    render: () => (
        <div style={{ background: '#0a0a0f', padding: 24, fontFamily: 'system-ui' }}>
            <h1 style={{ color: '#fff', fontSize: 20, marginBottom: 24 }}>Footer2 Component</h1>

            <div style={{ marginBottom: 24, padding: 16, background: '#12121a', borderRadius: 8, maxWidth: 600 }}>
                <h2 style={{ color: '#22d3ee', fontSize: 14, marginBottom: 12 }}>Responsive Breakpoints</h2>
                <table style={{ width: '100%', fontSize: 11, color: '#888', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Mode</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Width</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>ViewGroup</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Links</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '8px', color: '#22c55e' }}>Full</td>
                            <td style={{ padding: '8px' }}>≥900px</td>
                            <td style={{ padding: '8px' }}>Full name (160px)</td>
                            <td style={{ padding: '8px' }}>All expanded</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', color: '#f59e0b' }}>Compact</td>
                            <td style={{ padding: '8px' }}>600-899px</td>
                            <td style={{ padding: '8px' }}>Truncated (120px)</td>
                            <td style={{ padding: '8px' }}>Collapsed + dots</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', color: '#ef4444' }}>Minimal</td>
                            <td style={{ padding: '8px' }}>450-599px</td>
                            <td style={{ padding: '8px' }}>Color dot only</td>
                            <td style={{ padding: '8px' }}>Icon + count</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ marginBottom: 24, padding: 16, background: '#12121a', borderRadius: 8, maxWidth: 600 }}>
                <h2 style={{ color: '#a855f7', fontSize: 14, marginBottom: 12 }}>Link Properties</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {LINK_PROPERTIES.map(prop => (
                        <div
                            key={prop.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: prop.color + '20',
                                border: `1px solid ${prop.color}40`,
                                borderRadius: 6,
                            }}
                        >
                            <span style={{ color: prop.color, fontSize: 12 }}>{prop.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ padding: 16, background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 8, maxWidth: 600 }}>
                <h2 style={{ color: '#3b82f6', fontSize: 14, marginBottom: 8 }}>Usage</h2>
                <pre style={{ fontSize: 11, color: '#888', margin: 0, overflow: 'auto' }}>
{`<Footer2
  viewGroups={viewGroups}
  activeViewGroupId={activeId}
  onSelectViewGroup={handleSelect}
  onCreateViewGroup={handleCreate}
  linkingService={linkingService}
  containerWidth={containerWidth}
/>`}
                </pre>
            </div>
        </div>
    ),
};

// =============================================================================
// DUPLICATION DIALOG STORIES
// =============================================================================

/**
 * Duplication Dialog integrated with Footer2
 */
export const DuplicationDialogIntegration = {
    name: 'Duplication Dialog',
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [lastOption, setLastOption] = useState(null);

        const handleConfirm = (option) => {
            setLastOption(option);
            setIsOpen(false);
            console.log('Duplicate with option:', option);
        };

        return (
            <div style={{ background: '#0a0a0f', padding: 24 }}>
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>
                        Duplication Dialog
                    </h3>
                    <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
                        Opens when duplicating a ViewGroup that has active links.
                        User can choose how to handle the links in the copy.
                    </p>
                    <button
                        onClick={() => setIsOpen(true)}
                        style={{
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        Open Duplication Dialog
                    </button>

                    {lastOption && (
                        <p style={{ color: '#22c55e', fontSize: 12, marginTop: 12 }}>
                            Last selected option: <strong>{lastOption}</strong>
                        </p>
                    )}
                </div>

                <DuplicationDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    viewGroup={MOCK_VIEWGROUPS[0]}
                    linkStats={MOCK_LINK_STATS}
                    onConfirm={handleConfirm}
                />
            </div>
        );
    },
};
