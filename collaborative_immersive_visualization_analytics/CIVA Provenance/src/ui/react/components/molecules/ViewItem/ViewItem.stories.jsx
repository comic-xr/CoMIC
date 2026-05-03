import { useState } from 'react';
import { ViewItem } from './index';

export default {
    title: 'Panels/LeftPanel/ViewItem',
    component: ViewItem,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '280px',
                background: '#1a1a1a',
                borderRadius: '8px',
                padding: '8px'
            }}>
                <Story />
            </div>
        ),
    ],
};

// Sample view data (v3 design)
const sampleView = {
    id: '1',
    name: 'Sales Data 2024',
    color: '#60a5fa',
    starredWorkspace: false,
    starredPersonal: false,
    hasSavedState: false,
    isShared: false,
    isLocked: false,
    position: { row: 0, col: 1 },
    size: { rows: 1, cols: 1 },
};

// Sample link properties with status format
const sampleLinkProperties = {
    camera: { status: 'active' },
    filters: { status: 'active' },
    widgets: { status: null },
    cursors: { status: 'active' },
    colorMaps: { status: 'active' },
    annotationDisplay: { status: null },
};

// Basic view
export const Default = {
    args: {
        view: sampleView,
        isActive: false,
    },
};

// Active view
export const Active = {
    args: {
        view: {
            ...sampleView,
            color: '#34d399',
        },
        isActive: true,
    },
};

// Saved to Workspace (purple folder icon)
export const StarredWorkspace = {
    args: {
        view: {
            ...sampleView,
            name: 'Project Dashboard',
            starredWorkspace: true,
            color: '#c084fc',
        },
        isActive: true,
    },
};

// Saved to Personal (gold globe icon)
export const StarredPersonal = {
    args: {
        view: {
            ...sampleView,
            name: 'My Global View',
            starredPersonal: true,
            color: '#fbbf24',
        },
    },
};

// Has Saved State (amber save icon)
export const HasSavedState = {
    args: {
        view: {
            ...sampleView,
            name: 'View with Preset',
            hasSavedState: true,
            color: '#fbbf24',
        },
    },
};

// Shared with collaborators (pink users icon)
export const SharedView = {
    args: {
        view: {
            ...sampleView,
            name: 'Team Dashboard',
            isShared: true,
            color: '#fb7185',
        },
    },
};

// With linked views (teal link icon)
export const WithLinkedViews = {
    args: {
        view: {
            ...sampleView,
            name: 'Revenue Analysis',
        },
        linkedCount: 3,
        isActive: true,
        linkProperties: sampleLinkProperties,
        linkTarget: { id: '2', name: 'Parent View' },
    },
};

// With linked parent
export const WithLinkedParent = {
    args: {
        view: {
            ...sampleView,
            name: 'Spawned View',
            color: '#7dd3fc',
        },
        linkedParent: { id: '0', name: 'Master View' },
        linkTarget: { id: '0', name: 'Master View' },
        linkProperties: sampleLinkProperties,
        linkedCount: 4,
        isActive: true,
    },
};

// With filters (purple filter icon)
export const WithFilters = {
    args: {
        view: {
            ...sampleView,
            name: 'Filtered View',
            color: '#a78bfa',
        },
        filterCount: 5,
    },
};

// Multiple status badges (v3 design)
export const WithAllBadges = {
    args: {
        view: {
            ...sampleView,
            name: 'Complex View',
            starredWorkspace: true,
            hasSavedState: true,
            isShared: true,
            isLocked: true,
            color: '#fb7185',
        },
        linkedCount: 2,
        filterCount: 3,
        isActive: true,
        linkProperties: sampleLinkProperties,
        linkTarget: { id: '2', name: 'Other View' },
    },
};

// Locked view
export const LockedView = {
    args: {
        view: {
            ...sampleView,
            name: 'Protected Data',
            isLocked: true,
            color: '#fbbf24',
        },
    },
};

// Large spanning view
export const LargeView = {
    args: {
        view: {
            ...sampleView,
            name: 'Overview Dashboard',
            size: { rows: 2, cols: 2 },
        },
        isActive: true,
    },
};

// Link properties disabled (no link target)
export const LinkPropertiesDisabled = {
    args: {
        view: {
            ...sampleView,
            name: 'Unlinked View',
            color: '#7dd3fc',
        },
        linkTarget: null, // No link target = disabled link row
        linkProperties: {},
        isActive: true,
    },
};

// With broken link
export const WithBrokenLink = {
    args: {
        view: {
            ...sampleView,
            name: 'View with Issues',
            color: '#fbbf24',
        },
        linkTarget: { id: '2', name: 'Deleted View' },
        linkProperties: {
            camera: { status: 'active' },
            filters: { status: 'broken' },
            widgets: { status: 'active' },
            cursors: { status: null },
            colorMaps: { status: 'broken' },
            annotationDisplay: { status: null },
        },
        linkedCount: 2,
        isActive: true,
    },
};

// Interactive with hover
export const Interactive = () => {
    const [views, setViews] = useState([
        { ...sampleView, id: '1', name: 'Sales 2024', color: '#60a5fa', starredWorkspace: true },
        { ...sampleView, id: '2', name: 'Revenue', color: '#34d399', hasSavedState: true, position: { row: 0, col: 2 } },
        { ...sampleView, id: '3', name: 'Customers', color: '#fb7185', isShared: true, position: { row: 1, col: 0 } },
    ]);
    const [activeId, setActiveId] = useState('1');

    const linkTarget = { id: '0', name: 'Master' };
    const linkProps = {
        camera: { status: 'active' },
        filters: { status: 'active' },
        widgets: { status: null },
        cursors: { status: 'active' },
        colorMaps: { status: 'active' },
        annotationDisplay: { status: null },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {views.map((view) => (
                <ViewItem
                    key={view.id}
                    view={view}
                    isActive={view.id === activeId}
                    linkedCount={4}
                    linkTarget={linkTarget}
                    linkProperties={linkProps}
                    onSelect={setActiveId}
                    onClose={(id) => setViews(views.filter(v => v.id !== id))}
                    onRename={(id, name) => {
                        setViews(views.map(v => v.id === id ? { ...v, name } : v));
                    }}
                    onNavigate={(pos) => console.log('Navigate to:', pos)}
                    onStarWorkspace={(id) => {
                        console.log('Star workspace:', id);
                        setViews(views.map(v => v.id === id ? { ...v, starredWorkspace: !v.starredWorkspace } : v));
                    }}
                    onStarPersonal={(id) => {
                        console.log('Star personal:', id);
                        setViews(views.map(v => v.id === id ? { ...v, starredPersonal: !v.starredPersonal } : v));
                    }}
                    onSaveState={(id) => {
                        console.log('Save state:', id);
                        setViews(views.map(v => v.id === id ? { ...v, hasSavedState: true } : v));
                    }}
                    onLoadState={(id) => console.log('Load state:', id)}
                    onShareView={(id) => {
                        console.log('Share view:', id);
                        setViews(views.map(v => v.id === id ? { ...v, isShared: !v.isShared } : v));
                    }}
                    onSpawn={(id) => console.log('Spawn:', id)}
                    onConfigureLinks={(id) => console.log('Configure links:', id)}
                    onToggleAllLinks={(id, linked) => console.log('Toggle all links:', id, linked)}
                    onSizeChange={(id, size) => console.log('Size change:', id, size)}
                    onLinkPropertyChange={(id, prop, value) => console.log('Link property:', id, prop, value)}
                />
            ))}
            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#0f0f0f',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
            }}>
                <p><strong>v3 Design Features:</strong></p>
                <p>• Hover to see glassmorphism sliding panel</p>
                <p>• Tooltip area shows action descriptions on hover</p>
                <p>• Button groups: Workspace/Personal, Save/Load, Share, Spawn/Link</p>
                <p>• Link properties with Toggle All button</p>
                <p>• Double-click name to edit</p>
                <p>• Actions are logged to console</p>
            </div>
        </div>
    );
};

Interactive.decorators = [
    (Story) => (
        <div style={{
            width: '300px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// Hovering state demo - shows glassmorphism panel
export const HoverStateDemo = () => {
    const linkProps = {
        camera: { status: 'active' },
        filters: { status: 'active' },
        widgets: { status: null },
        cursors: { status: 'active' },
        colorMaps: { status: null },
        annotationDisplay: { status: null },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    Normal state (no link target - link row disabled)
                </p>
                <ViewItem
                    view={sampleView}
                    isActive={false}
                    linkTarget={null}
                />
            </div>
            <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    Hover to see the glassmorphism sliding panel with enabled links
                </p>
                <ViewItem
                    view={{
                        ...sampleView,
                        name: 'Hoverable View',
                        color: '#34d399',
                        starredWorkspace: true,
                        hasSavedState: true,
                    }}
                    isActive={true}
                    linkedCount={4}
                    linkTarget={{ id: '2', name: 'Parent View' }}
                    linkProperties={linkProps}
                    onStarWorkspace={() => console.log('Star workspace')}
                    onStarPersonal={() => console.log('Star personal')}
                    onSaveState={() => console.log('Save state')}
                    onLoadState={() => console.log('Load state')}
                    onShareView={() => console.log('Share')}
                    onSpawn={() => console.log('Spawn')}
                    onConfigureLinks={() => console.log('Configure links')}
                    onToggleAllLinks={(linked) => console.log('Toggle all:', linked)}
                />
            </div>
            <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    With linked parent row visible
                </p>
                <ViewItem
                    view={{
                        ...sampleView,
                        name: 'Child View',
                        color: '#7dd3fc',
                    }}
                    isActive={true}
                    linkedParent={{ id: '0', name: 'Master Dashboard' }}
                    linkTarget={{ id: '0', name: 'Master Dashboard' }}
                    linkProperties={linkProps}
                    linkedCount={4}
                />
            </div>
        </div>
    );
};

HoverStateDemo.decorators = [
    (Story) => (
        <div style={{
            width: '320px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <Story />
        </div>
    ),
];

// Status icons showcase
export const StatusIconsShowcase = () => {
    const views = [
        { ...sampleView, id: '1', name: 'Workspace View', starredWorkspace: true, color: '#c084fc' },
        { ...sampleView, id: '2', name: 'Personal View', starredPersonal: true, color: '#fbbf24' },
        { ...sampleView, id: '3', name: 'Has Preset', hasSavedState: true, color: '#fbbf24' },
        { ...sampleView, id: '4', name: 'Shared View', isShared: true, color: '#fb7185' },
        { ...sampleView, id: '5', name: 'Locked View', isLocked: true, color: '#fbbf24' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                v3 Status Icons with updated colors
            </p>
            {views.map((view) => (
                <ViewItem
                    key={view.id}
                    view={view}
                    isActive={view.id === '1'}
                />
            ))}
            <ViewItem
                view={{ ...sampleView, id: '6', name: 'Linked View', color: '#7dd3fc' }}
                linkedCount={3}
            />
            <ViewItem
                view={{ ...sampleView, id: '7', name: 'Filtered View', color: '#c084fc' }}
                filterCount={5}
            />
        </div>
    );
};

StatusIconsShowcase.decorators = [
    (Story) => (
        <div style={{
            width: '300px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// Link Properties Demo
export const LinkPropertiesDemo = () => {
    const [linkProps, setLinkProps] = useState({
        camera: { status: 'active' },
        filters: { status: 'active' },
        widgets: { status: null },
        cursors: { status: 'active' },
        colorMaps: { status: null },
        annotationDisplay: { status: null },
    });

    const handleLinkChange = (id, prop, value) => {
        setLinkProps(prev => ({
            ...prev,
            [prop]: { status: value ? 'active' : null }
        }));
    };

    const handleToggleAll = (id, linked) => {
        const newStatus = linked ? 'active' : null;
        setLinkProps({
            camera: { status: newStatus },
            filters: { status: newStatus },
            widgets: { status: newStatus },
            cursors: { status: newStatus },
            colorMaps: { status: newStatus },
            annotationDisplay: { status: newStatus },
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Hover over view and interact with link toggles. Try the Toggle All button!
            </p>
            <ViewItem
                view={{
                    ...sampleView,
                    name: 'Interactive Links',
                    color: '#7dd3fc',
                }}
                isActive={true}
                linkedCount={Object.values(linkProps).filter(l => l?.status === 'active').length}
                linkTarget={{ id: '0', name: 'Master View' }}
                linkProperties={linkProps}
                onLinkPropertyChange={handleLinkChange}
                onToggleAllLinks={handleToggleAll}
            />
            <div style={{
                padding: '12px',
                background: '#0f0f0f',
                borderRadius: '6px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
            }}>
                <p>Current link states:</p>
                {Object.entries(linkProps).map(([key, value]) => (
                    <p key={key}>• {key}: {value?.status || 'unlinked'}</p>
                ))}
            </div>
        </div>
    );
};

LinkPropertiesDemo.decorators = [
    (Story) => (
        <div style={{
            width: '320px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <Story />
        </div>
    ),
];

// Expanded Panel Demo - Shows new ViewExpandedPanel with all spec features
export const ExpandedPanelDemo = () => {
    const [linkMode, setLinkMode] = useState('follow');
    const [linkConfig, setLinkConfig] = useState({
        camera: { enabled: true, targetViewId: null },
        filters: { enabled: true, targetViewId: null },
        widgets: { enabled: false, targetViewId: null },
        cursors: { enabled: true, targetViewId: null },
    });

    const viewWithFilters = {
        ...sampleView,
        name: 'Expanded View Demo',
        color: '#60a5fa',
        datasetName: 'Patient MRI Scans',
        instanceType: 'vtk',
        rowSpan: 2,
        colSpan: 1,
        annotationCount: 5,
        updatedAt: Date.now() - 3600000, // 1 hour ago
        linkMode,
        links: linkConfig,
        filters: {
            'threshold': { active: true, name: 'Threshold > 100', color: '#3b82f6' },
            'slice': { active: true, name: 'Slice Z=50', color: '#22c55e' },
            'opacity': { active: true, name: 'Opacity 0.8', color: '#f59e0b' },
        },
        originBookmark: { name: 'Analysis Checkpoint 1' },
    };

    const availableViews = [
        { id: 'v1', name: 'Master View' },
        { id: 'v2', name: 'Reference View' },
        { id: 'v3', name: 'Comparison View' },
    ];

    const handleLinkPropertyChange = (propertyId, config) => {
        setLinkConfig(prev => ({
            ...prev,
            [propertyId]: config,
        }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Click to expand and see the new ViewExpandedPanel with all spec features:
            </p>
            <ul style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', paddingLeft: '16px', margin: 0 }}>
                <li>Thumbnail + metadata section</li>
                <li>Origin tracking (spawned from bookmark)</li>
                <li>Applied filters as removable chips</li>
                <li>Size picker</li>
                <li>View linking with modes (Follow/Bidirectional/Broadcast)</li>
                <li>Link properties (Camera, Filters, Widgets, Cursors)</li>
                <li>Action buttons</li>
            </ul>
            <ViewItem
                view={viewWithFilters}
                mode="desktop"
                availableViews={availableViews}
                onNavigate={(id) => console.log('Navigate to:', id)}
                onOpenTools={(id) => console.log('Open tools:', id)}
                onDuplicate={(id) => console.log('Duplicate:', id)}
                onBookmark={(id) => console.log('Bookmark:', id)}
                onShare={(id) => console.log('Share:', id)}
                onClose={(id) => console.log('Close:', id)}
                onTrash={(id) => console.log('Delete:', id)}
                onSizeChange={(size) => console.log('Size changed:', size)}
                onFilterRemove={(filterId) => console.log('Remove filter:', filterId)}
                onLinkPropertyChange={handleLinkPropertyChange}
                onLinkModeChange={(mode) => {
                    console.log('Link mode:', mode);
                    setLinkMode(mode);
                }}
            />
            <div style={{
                marginTop: '8px',
                padding: '12px',
                background: '#0f0f0f',
                borderRadius: '6px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
            }}>
                <p>Current link mode: <strong>{linkMode}</strong></p>
                <p>Link config:</p>
                {Object.entries(linkConfig).map(([key, config]) => (
                    <p key={key}>• {key}: {config.enabled ? 'enabled' : 'disabled'}</p>
                ))}
            </div>
        </div>
    );
};

ExpandedPanelDemo.decorators = [
    (Story) => (
        <div style={{
            width: '340px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <Story />
        </div>
    ),
];

// VR Mode Expanded Panel
export const VRModeExpandedPanel = {
    args: {
        view: {
            ...sampleView,
            name: 'VR Expanded View',
            color: '#60a5fa',
            datasetName: 'Brain Scan Dataset',
            instanceType: 'vtk',
            rowSpan: 1,
            colSpan: 2,
            annotationCount: 3,
            updatedAt: Date.now() - 7200000,
            filters: {
                'threshold': { active: true, name: 'Threshold', color: '#3b82f6' },
            },
        },
        mode: 'vr',
        availableViews: [
            { id: 'v1', name: 'Master View' },
        ],
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '400px',
                background: '#1a1a1a',
                borderRadius: '8px',
                padding: '16px'
            }}>
                <Story />
            </div>
        ),
    ],
};