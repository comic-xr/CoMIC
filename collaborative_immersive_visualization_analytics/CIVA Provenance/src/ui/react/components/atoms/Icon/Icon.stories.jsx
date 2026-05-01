/**
 * @file Icon.stories.jsx
 * @description Storybook stories for the Icon component system
 */

import { useState } from 'react';
import Icon, {
    hasIcon,
    getAvailableIcons,
    getIconComponent,
    ICON_SIZES,
    // Named exports
    IconClose,
    IconSettings,
    IconCheck,
    IconEdit,
    IconDelete,
    IconSearch,
    IconLoader,
} from './index';

export default {
    title: 'Atoms/Icon',
    component: Icon,
    parameters: {
        docs: {
            description: {
                component: `
A lightweight icon system using Material Symbols SVG paths.

## Features
- 217+ icons included
- Semantic naming (use \`eye\` instead of \`visibility\`)
- Zero dependencies - pure inline SVG
- Supports both \`<Icon name="..." />\` and legacy \`<IconClose />\` patterns
        `,
            },
        },
    },
    argTypes: {
        name: {
            control: 'text',
            description: 'Icon name (semantic or Material Symbol)',
        },
        size: {
            control: { type: 'number', min: 8, max: 64, step: 4 },
            description: 'Icon size in pixels',
        },
        color: {
            control: 'color',
            description: 'Icon color',
        },
        className: {
            control: 'text',
            description: 'Additional CSS classes',
        },
    },
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        name: 'settings',
        size: 24,
    },
};

export const WithColor = {
    args: {
        name: 'favorite',
        size: 32,
        color: '#ef4444',
    },
};

export const WithTitle = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#ccc' }}>
            Hover over the icon to see the title tooltip:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon
                name="warning"
                size={32}
                color="#f59e0b"
                title="Warning: This action cannot be undone"
                aria-label="Warning icon"
            />
            <span style={{ color: '#888' }}>← Hover me to see title</span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
            The title prop adds an SVG &lt;title&gt; element for accessibility and browser tooltips.
        </p>
    </div>
);

WithTitle.parameters = {
    docs: {
        description: {
            story: 'Icons with a `title` prop show a tooltip on hover and are accessible to screen readers.',
        },
    },
};

// =============================================================================
// SIZE VARIATIONS
// =============================================================================

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
        {[12, 16, 20, 24, 32, 48].map(size => (
            <div key={size} style={{ textAlign: 'center' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: size + 16,
                    height: size + 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    marginBottom: '8px',
                }}>
                    <Icon name="settings" size={size} />
                </div>
                <p style={{ fontSize: '10px', margin: 0, color: '#888' }}>{size}px</p>
            </div>
        ))}
    </div>
);

Sizes.parameters = {
    docs: {
        description: {
            story: 'Icons can be any size. Common sizes are 16px (compact), 20px (default), 24px (standard), and 32px (large).',
        },
    },
};

// =============================================================================
// COLOR VARIATIONS
// =============================================================================

export const Colors = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Icon name="circle" size={24} color="#ef4444" title="Red" />
        <Icon name="circle" size={24} color="#f97316" title="Orange" />
        <Icon name="circle" size={24} color="#eab308" title="Yellow" />
        <Icon name="circle" size={24} color="#22c55e" title="Green" />
        <Icon name="circle" size={24} color="#3b82f6" title="Blue" />
        <Icon name="circle" size={24} color="#8b5cf6" title="Purple" />
        <Icon name="circle" size={24} color="#ec4899" title="Pink" />
    </div>
);

export const InheritedColor = () => (
    <div style={{ display: 'flex', gap: '24px' }}>
        <span style={{ color: '#ef4444' }}>
            <Icon name="error" size={24} /> Error state
        </span>
        <span style={{ color: '#22c55e' }}>
            <Icon name="check" size={24} /> Success state
        </span>
        <span style={{ color: '#3b82f6' }}>
            <Icon name="info" size={24} /> Info state
        </span>
    </div>
);

InheritedColor.parameters = {
    docs: {
        description: {
            story: 'Icons inherit color from their parent element via `currentColor`.',
        },
    },
};

// =============================================================================
// ANIMATIONS
// =============================================================================

export const Animations = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
        }}>
            <Icon name="loader" size={32} className="cia-icon--spin" />
            <p style={{ fontSize: '12px', margin: '8px 0 0', color: '#888' }}>Spin</p>
        </div>
        <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
        }}>
            <Icon name="dot" size={32} color="#22c55e" className="cia-icon--pulse" />
            <p style={{ fontSize: '12px', margin: '8px 0 0', color: '#888' }}>Pulse</p>
        </div>
        <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
        }}>
            <Icon name="bell" size={32} color="#f59e0b" className="cia-icon--bounce" />
            <p style={{ fontSize: '12px', margin: '8px 0 0', color: '#888' }}>Bounce</p>
        </div>
    </div>
);

Animations.parameters = {
    docs: {
        description: {
            story: 'Add animation classes: `cia-icon--spin`, `cia-icon--pulse`, `cia-icon--bounce`',
        },
    },
};

// =============================================================================
// CLICKABLE ICONS
// =============================================================================

export const Clickable = () => {
    const [count, setCount] = useState(0);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
                style={{
                    padding: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                }}
                onClick={() => setCount(c => c + 1)}
            >
                <Icon
                    name="add"
                    size={32}
                    color="#3b82f6"
                    title="Click to increment"
                />
            </div>
            <span style={{ color: '#e0e0e0', fontSize: '18px', minWidth: '80px' }}>Count: {count}</span>
            <div
                style={{
                    padding: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                }}
                onClick={() => setCount(0)}
            >
                <Icon
                    name="refresh"
                    size={32}
                    color="#ef4444"
                    title="Reset"
                />
            </div>
        </div>
    );
};

// =============================================================================
// STATUS ICONS
// =============================================================================

export const StatusIcons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="success" size={20} color="#22c55e" />
            <span style={{ color: '#e0e0e0' }}>Operation completed successfully</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="warning" size={20} color="#f59e0b" />
            <span style={{ color: '#e0e0e0' }}>Please review before continuing</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="error" size={20} color="#ef4444" />
            <span style={{ color: '#e0e0e0' }}>An error occurred</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="info" size={20} color="#3b82f6" />
            <span style={{ color: '#e0e0e0' }}>Here's some helpful information</span>
        </div>
    </div>
);

// =============================================================================
// NAMED EXPORTS (Legacy Pattern)
// =============================================================================

export const NamedExports = () => {
    const icons = [
        { Component: IconClose, name: 'IconClose' },
        { Component: IconSettings, name: 'IconSettings' },
        { Component: IconCheck, name: 'IconCheck' },
        { Component: IconEdit, name: 'IconEdit' },
        { Component: IconDelete, name: 'IconDelete' },
        { Component: IconSearch, name: 'IconSearch' },
        { Component: IconLoader, name: 'IconLoader', className: 'cia-icon--spin' },
    ];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {icons.map(({ Component, name, className }) => (
                <div
                    key={name}
                    style={{
                        textAlign: 'center',
                        padding: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                    }}
                >
                    <Component size="md" className={className} />
                    <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>{name}</p>
                </div>
            ))}
        </div>
    );
};

NamedExports.parameters = {
    docs: {
        description: {
            story: 'Named exports like `IconClose`, `IconSettings` are available for backwards compatibility with existing code.',
        },
    },
};

// =============================================================================
// SIZE PRESETS (Named Exports)
// =============================================================================

export const SizePresets = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
        {Object.entries(ICON_SIZES).map(([preset, pixels]) => (
            <div key={preset} style={{ textAlign: 'center' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: pixels + 16,
                    height: pixels + 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    marginBottom: '8px',
                }}>
                    <IconSettings size={preset} />
                </div>
                <p style={{ fontSize: '11px', margin: '0', fontWeight: 600, color: '#fff' }}>{preset}</p>
                <p style={{ fontSize: '10px', margin: '2px 0 0', color: '#888' }}>{pixels}px</p>
            </div>
        ))}
    </div>
);

SizePresets.parameters = {
    docs: {
        description: {
            story: 'Named exports accept string size presets: `xs` (12px), `sm` (16px), `md` (20px), `lg` (24px), `xl` (32px). Notice the progressive sizing difference.',
        },
    },
};

// =============================================================================
// getIconComponent
// =============================================================================

export const DynamicIconLookup = () => {
    const [iconName, setIconName] = useState('settings');
    const DynamicIcon = getIconComponent(iconName);

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <label>
                    Icon name:{' '}
                    <input
                        type="text"
                        value={iconName}
                        onChange={(e) => setIconName(e.target.value)}
                        style={{ padding: '4px 8px', marginLeft: '8px' }}
                    />
                </label>
                <span style={{ marginLeft: '8px', color: '#888' }}>
                    {hasIcon(iconName) ? '✓ Valid' : '✗ Not found'}
                </span>
            </div>
            <DynamicIcon size="xl" />
        </div>
    );
};

DynamicIconLookup.parameters = {
    docs: {
        description: {
            story: 'Use `getIconComponent(name)` to dynamically get an icon component by name at runtime.',
        },
    },
};

// =============================================================================
// VR & 3D ICONS
// =============================================================================

export const VRAndSpatialIcons = () => {
    const vrIcons = ['vr', 'vrHeadset', 'spatialAudio', 'gesture', 'controller', 'box', 'cube', 'layers', 'rotate3d', 'move', 'pan', 'hand'];

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {vrIcons.map(iconName => (
                <div
                    key={iconName}
                    style={{
                        textAlign: 'center',
                        padding: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        minWidth: '80px',
                    }}
                >
                    <Icon name={iconName} size={32} />
                    <p style={{ fontSize: '10px', margin: '8px 0 0', color: '#888' }}>{iconName}</p>
                </div>
            ))}
        </div>
    );
};

VRAndSpatialIcons.parameters = {
    docs: {
        description: {
            story: 'Icons for VR, AR, and 3D spatial interfaces.',
        },
    },
};

// =============================================================================
// ICON GALLERY
// =============================================================================

const ICON_CATEGORIES = {
    'Navigation': ['chevronDown', 'chevronUp', 'chevronLeft', 'chevronRight', 'arrowUp', 'arrowDown', 'arrowLeft', 'arrowRight', 'expand', 'collapse', 'home', 'navigation'],
    'Actions': ['add', 'remove', 'close', 'check', 'edit', 'delete', 'save', 'copy', 'paste', 'cut', 'undo', 'redo', 'refresh', 'search', 'filter', 'sort', 'cancel'],
    'View': ['eye', 'eyeOff', 'zoomIn', 'zoomOut', 'fullscreen', 'fullscreenExit', 'maximize', 'minimize', 'focus', 'fitView'],
    '3D & VR': ['box', 'cube', 'layers', 'rotate3d', 'move', 'pan', 'hand', 'vr', 'vrHeadset', 'spatialAudio', 'gesture', 'controller'],
    'Tools': ['pen', 'brush', 'eraser', 'scissors', 'ruler', 'palette', 'sliders', 'settings', 'tools', 'wand', 'target', 'crosshair', 'measure'],
    'Files': ['file', 'folder', 'folderOpen', 'folderPlus', 'database', 'dataset', 'upload', 'download', 'archive', 'paperclip'],
    'Media': ['mic', 'micOff', 'video', 'videoOff', 'camera', 'volume', 'volumeOff', 'play', 'pause', 'stop', 'record', 'image'],
    'Users': ['user', 'users', 'userPlus', 'userCircle', 'share', 'chat', 'comment', 'send', 'bell'],
    'Status': ['info', 'warning', 'error', 'success', 'help', 'loader', 'dot', 'alertTriangle', 'checkCircle'],
    'UI': ['menu', 'moreHorizontal', 'moreVertical', 'grid', 'list', 'layout', 'dashboard', 'panelLeftClose', 'panelRightClose'],
    'Science': ['biotech', 'science', 'atom', 'brain', 'dna', 'heart', 'chart', 'graph', 'scatterChart', 'analytics'],
    'Security': ['lock', 'unlock', 'shield', 'key', 'verified'],
    'Time': ['clock', 'calendar', 'event'],
};

export const IconGallery = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = Object.entries(ICON_CATEGORIES).reduce((acc, [category, icons]) => {
        const filtered = icons.filter(icon =>
            icon.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {});

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <input
                    type="text"
                    placeholder="Search icons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        fontSize: '14px',
                        width: '300px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        background: '#2a2a2a',
                        color: '#fff',
                    }}
                />
            </div>

            {Object.entries(filteredCategories).map(([category, icons]) => (
                <div key={category} style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>{category}</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                        gap: '8px',
                    }}>
                        {icons.map(iconName => (
                            <div
                                key={iconName}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '12px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: '#e0e0e0',
                                }}
                                title={iconName}
                            >
                                <Icon name={iconName} size={24} />
                                <span style={{
                                    fontSize: '10px',
                                    marginTop: '4px',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                    color: '#999',
                                }}>
                                    {iconName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

IconGallery.parameters = {
    docs: {
        description: {
            story: 'Browse all available icons organized by category. Use the search box to filter.',
        },
    },
};

// =============================================================================
// ALL ICONS (Complete List)
// =============================================================================

export const AllIcons = () => {
    const allIcons = getAvailableIcons();
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedIcon, setCopiedIcon] = useState(null);

    const filteredIcons = allIcons.filter(icon =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCopy = (iconName) => {
        navigator.clipboard.writeText(`<Icon name="${iconName}" />`);
        setCopiedIcon(iconName);
        setTimeout(() => setCopiedIcon(null), 1500);
    };

    return (
        <div>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                    type="text"
                    placeholder="Search icons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        fontSize: '14px',
                        width: '300px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        background: '#2a2a2a',
                        color: '#fff',
                    }}
                />
                <span style={{ color: '#888' }}>
                    {filteredIcons.length} of {allIcons.length} icons
                </span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '4px',
            }}>
                {filteredIcons.map(iconName => (
                    <div
                        key={iconName}
                        onClick={() => handleCopy(iconName)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '12px 4px',
                            borderRadius: '4px',
                            backgroundColor: copiedIcon === iconName ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                            color: '#e0e0e0',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                        }}
                        title={`Click to copy: <Icon name="${iconName}" />`}
                    >
                        <Icon name={iconName} size={20} />
                        <span style={{
                            fontSize: '9px',
                            marginTop: '4px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            color: copiedIcon === iconName ? '#22c55e' : '#888',
                        }}>
                            {copiedIcon === iconName ? 'Copied!' : iconName}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

AllIcons.parameters = {
    docs: {
        description: {
            story: 'Complete list of all available semantic icon names. Click an icon to copy its usage code.',
        },
    },
};