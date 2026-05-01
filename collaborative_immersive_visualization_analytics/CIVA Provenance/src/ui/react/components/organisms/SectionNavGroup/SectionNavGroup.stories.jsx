// src/ui/react/components/organisms/SectionNavGroup/SectionNavGroup.stories.jsx
import React, { useState } from 'react';
import { SectionNavGroup } from './SectionNavGroup';

// Sample tool item component for demos
const ToolItem = ({ name, color }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                fontSize: '11px',
                color: hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)',
                borderRadius: '4px',
                cursor: 'pointer',
                background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'all 0.1s ease',
            }}
        >
            <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: color,
                opacity: hovered ? 1 : 0.5,
            }} />
            <span>{name}</span>
        </div>
    );
};

// Sample sections data
const createSections = () => [
    {
        id: 'transform',
        icon: 'move',
        label: 'Transform',
        color: '#60a5fa',
        itemCount: 6,
        content: (
            <div>
                {['Pan', 'Zoom', 'Rotate', 'Reset View', 'Snap to Grid', 'Center'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#60a5fa" />
                ))}
            </div>
        ),
    },
    {
        id: 'selection',
        icon: 'cursor',
        label: 'Selection',
        color: '#4ade80',
        itemCount: 5,
        content: (
            <div>
                {['Point Select', 'Box Select', 'Lasso Select', 'Clear Selection', 'Select All'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#4ade80" />
                ))}
            </div>
        ),
    },
    {
        id: 'measurement',
        icon: 'ruler',
        label: 'Measurement',
        color: '#fbbf24',
        itemCount: 4,
        content: (
            <div>
                {['Distance', 'Point Probe', 'Area', 'Volume'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#fbbf24" />
                ))}
            </div>
        ),
    },
    {
        id: 'annotation',
        icon: 'pen',
        label: 'Annotations',
        color: '#f472b6',
        itemCount: 6,
        content: (
            <div>
                {['Text Label', 'Point Marker', 'Region Box', 'Freehand Draw', 'Arrow', 'Dimension'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#f472b6" />
                ))}
            </div>
        ),
    },
    {
        id: 'clipping',
        icon: 'slice',
        label: 'Clipping',
        color: '#a78bfa',
        itemCount: 5,
        content: (
            <div>
                {['X Plane', 'Y Plane', 'Z Plane', 'Box Clip', 'Clear All'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#a78bfa" />
                ))}
            </div>
        ),
    },
    {
        id: 'widgets',
        icon: 'box',
        label: 'Widgets',
        color: '#2dd4bf',
        itemCount: 5,
        content: (
            <div>
                {['Bounding Box', 'Axes Helper', 'Grid Overlay', 'Orientation Cube', 'Scale Bar'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#2dd4bf" />
                ))}
            </div>
        ),
    },
    {
        id: 'filters',
        icon: 'filter',
        label: 'Filters',
        color: '#fb923c',
        itemCount: 4,
        content: (
            <div>
                {['Threshold', 'Iso Surface', 'Slice Extract', 'Resample'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#fb923c" />
                ))}
            </div>
        ),
    },
    {
        id: 'appearance',
        icon: 'palette',
        label: 'Appearance',
        color: '#818cf8',
        itemCount: 4,
        content: (
            <div>
                {['Color Map', 'Opacity', 'Render Mode', 'Lighting'].map((tool) => (
                    <ToolItem key={tool} name={tool} color="#818cf8" />
                ))}
            </div>
        ),
    },
];

export default {
    title: 'Organisms/SectionNavGroup',
    component: SectionNavGroup,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#12121a' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: () => (
        <div style={{
            width: '280px',
            height: '400px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
        }}>
            <SectionNavGroup sections={createSections()} />
        </div>
    ),
};

export const WithPanelTitle = {
    render: () => (
        <div style={{
            width: '280px',
            height: '400px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Panel title */}
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                flexShrink: 0,
            }}>
                Instance Tools
            </div>

            <SectionNavGroup sections={createSections()} />
        </div>
    ),
};

export const ShortPanel = {
    render: () => (
        <div style={{
            width: '280px',
            height: '250px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
        }}>
            <SectionNavGroup sections={createSections()} />
        </div>
    ),
};

export const TallPanel = {
    render: () => (
        <div style={{
            width: '280px',
            height: '600px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
        }}>
            <SectionNavGroup sections={createSections()} />
        </div>
    ),
};

export const FewSections = {
    render: () => (
        <div style={{
            width: '280px',
            height: '350px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
        }}>
            <SectionNavGroup sections={createSections().slice(0, 3)} />
        </div>
    ),
};

export const ResizableDemo = {
    render: () => {
        const [height, setHeight] = useState(350);

        return (
            <div>
                <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Height:</span>
                    <input
                        type="range"
                        min={200}
                        max={600}
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        style={{ width: '120px', accentColor: '#60a5fa' }}
                    />
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{height}px</span>
                </div>

                <div style={{
                    width: '280px',
                    height: `${height}px`,
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        flexShrink: 0,
                    }}>
                        Instance Tools
                    </div>

                    <SectionNavGroup sections={createSections()} />
                </div>
            </div>
        );
    },
};

export const CompareWithPrototype = {
    render: () => (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontSize: '12px', color: '#fff', marginBottom: '8px', fontWeight: 500 }}>
                    Component Implementation
                </div>
                <div style={{
                    width: '280px',
                    height: '400px',
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        flexShrink: 0,
                    }}>
                        Instance Tools
                    </div>

                    <SectionNavGroup sections={createSections()} />
                </div>
            </div>

            <div style={{
                width: '300px',
                background: '#1a1a2e',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    Component Structure
                </div>

                <div style={{
                    padding: '10px',
                    background: 'rgba(96,165,250,0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(96,165,250,0.2)',
                    marginBottom: '12px',
                }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontFamily: 'monospace' }}>
                        <div><strong style={{ color: '#60a5fa' }}>SectionNavGroup</strong> (organism)</div>
                        <div>├─ <strong style={{ color: '#4ade80' }}>SectionNavHeader</strong> (molecule)</div>
                        <div>│&nbsp;&nbsp;&nbsp;├─ Icon (atom)</div>
                        <div>│&nbsp;&nbsp;&nbsp;└─ <strong style={{ color: '#fbbf24' }}>NavDotBar</strong> (molecule)</div>
                        <div>│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ <strong style={{ color: '#f472b6' }}>NavDot[]</strong> (atom)</div>
                        <div>└─ SectionContent (scrollable)</div>
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;└─ Section[] (with headers)</div>
                    </div>
                </div>

                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                    <p><strong style={{ color: '#4ade80' }}>Features:</strong></p>
                    <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
                        <li>IntersectionObserver tracks scroll position</li>
                        <li>Dots highlight current section</li>
                        <li>Click dot to smooth-scroll to section</li>
                        <li>Hover dots to see icon + tooltip</li>
                        <li>VR-adaptive sizing</li>
                    </ul>
                </div>
            </div>
        </div>
    ),
};
