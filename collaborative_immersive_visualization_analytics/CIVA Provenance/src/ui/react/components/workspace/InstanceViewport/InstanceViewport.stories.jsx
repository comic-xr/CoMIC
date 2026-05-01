// src/ui/react/components/workspace/InstanceViewport.stories.jsx
// Mock stories for InstanceViewport - demonstrates visual layout without core dependencies

import React from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import "./InstanceViewport.scss";

/**
 * MockInstanceViewport
 *
 * A mock version of InstanceViewport for Storybook that doesn't require
 * the workspace manager or other core dependencies.
 */
function MockInstanceViewport({
    title = "brain_scan_001.nii",
    hasData = true,
    loading = false,
    error = null,
    showToolbar = true,
    tools = [],
}) {
    const [openMenuId, setOpenMenuId] = React.useState(null);

    const defaultTools = [
        { id: "visibility", icon: 'eye', label: "Visibility", type: "button" },
        { id: "separator-1", type: "separator" },
        {
            id: "colormap",
            icon: 'palette',
            label: "Colormap",
            type: "menu",
            options: [
                { id: "viridis", label: "Viridis" },
                { id: "plasma", label: "Plasma" },
                { id: "rainbow", label: "Rainbow" },
            ],
        },
        {
            id: "sliders",
            icon: 'sliders',
            label: "Adjustments",
            type: "menu",
            options: [
                { id: "opacity", label: "Opacity", type: "slider" },
                { id: "threshold", label: "Threshold", type: "slider" },
            ],
        },
        { id: "separator-2", type: "separator" },
        {
            id: "camera",
            icon: 'camera',
            label: "Camera Views",
            type: "menu",
            options: [
                { id: "front", label: "Front" },
                { id: "back", label: "Back" },
                { id: "left", label: "Left" },
                { id: "right", label: "Right" },
                { id: "top", label: "Top" },
                { id: "isometric", label: "Isometric" },
            ],
        },
        { id: "reset", icon: 'rotateCcw', label: "Reset View", type: "button" },
    ];

    const toolsToRender = tools.length > 0 ? tools : defaultTools;

    const renderTool = (tool, index) => {
        if (tool.type === "separator") {
            return <div key={`sep-${index}`} className="instance-toolbar__separator" />;
        }

        const iconName = tool.icon;
        const isOpen = openMenuId === tool.id;

        if (tool.type === "menu") {
            return (
                <div
                    key={tool.id}
                    className="toolbar-menu"
                    onMouseEnter={() => setOpenMenuId(tool.id)}
                    onMouseLeave={() => setOpenMenuId(null)}
                >
                    <button
                        className={`instance-toolbar__tool-button ${tool.active ? "active" : ""}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                    >
                        {iconName && <Icon name={iconName} size={16} />}
                        <Icon name="chevronDown" size={8} className="instance-toolbar__menu-indicator" />
                        <div className="instance-toolbar__tooltip">
                            <div className="tooltip-title">{tool.label}</div>
                        </div>
                    </button>

                    {isOpen && tool.options && (
                        <div className="toolbar-menu-dropdown">
                            {tool.options.map((option) => (
                                <button
                                    key={option.id}
                                    className="menu-option"
                                    onClick={() => console.log("Selected:", option.id)}
                                >
                                    <span className="option-label">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <button
                key={tool.id}
                className={`instance-toolbar__tool-button ${tool.active ? "active" : ""}`}
                disabled={tool.disabled}
                aria-label={tool.label}
            >
                {iconName && <Icon name={iconName} size={16} />}
                <div className="instance-toolbar__tooltip">
                    <div className="tooltip-title">{tool.label}</div>
                </div>
            </button>
        );
    };

    return (
        <div className="instance-viewport" style={{ '--instance-color': '#60a5fa', '--instance-color-rgb': '96, 165, 250' }}>
            <div className="instance-viewport__header">
                <div className="instance-viewport__header-left">
                    <div className="instance-viewport__label">
                        <div className="instance-viewport__label-dot" />
                        <span className="instance-viewport__label-text">{title}</span>
                    </div>
                </div>
                <div className="instance-viewport__header-controls">
                    <button
                        className="instance-viewport__header-button"
                        title="Fullscreen"
                    >
                        <Icon name="maximize" size={14} />
                    </button>
                    <button
                        className="instance-viewport__header-button instance-viewport__header-button--danger"
                        title="Delete"
                    >
                        <Icon name="trash" size={14} />
                    </button>
                </div>
            </div>

            {showToolbar && (
                <div className="instance-viewport__toolbar-overlay instance-viewport__toolbar-overlay--visible">
                    <div className="instance-toolbar">
                        {toolsToRender.map((tool, index) => renderTool(tool, index))}
                    </div>
                </div>
            )}

            <div className="instance-viewport__content">
                {loading && (
                    <div className="instance-viewport__loading">Loading view...</div>
                )}
                {error && (
                    <div className="instance-viewport__error">
                        <div className="error-message">{error}</div>
                    </div>
                )}
                {hasData && !loading && !error && (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "linear-gradient(135deg, rgba(110,182,255,0.1) 0%, rgba(192,132,252,0.1) 100%)",
                        }}
                    >
                        <Icon name="box" size={64} style={{ color: "rgba(255,255,255,0.2)" }} />
                    </div>
                )}
                {!hasData && !loading && !error && (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,0.4)",
                            gap: "12px",
                        }}
                    >
                        <Icon name="layers" size={48} />
                        <span>No data loaded</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default {
    title: "Organisms/InstanceViewport",
    component: MockInstanceViewport,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    width: "600px",
                    height: "500px",
                    background: "#0a0a0f",
                    padding: "20px",
                }}
            >
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        title: "brain_scan_001.nii",
        hasData: true,
    },
};

export const Loading = {
    args: {
        title: "Loading dataset...",
        loading: true,
        hasData: false,
    },
};

export const Error = {
    args: {
        title: "brain_scan_001.nii",
        error: "Failed to load dataset. File format not supported.",
        hasData: false,
    },
};

export const Empty = {
    args: {
        title: "New Instance",
        hasData: false,
        showToolbar: false,
    },
};

export const WithActiveTools = {
    args: {
        title: "patient_ct_scan.dcm",
        hasData: true,
        tools: [
            { id: "visibility", icon: 'eye', label: "Visibility", type: "button", active: true },
            { id: "separator-1", type: "separator" },
            { id: "colormap", icon: 'palette', label: "Colormap", type: "button", active: true },
            { id: "sliders", icon: 'sliders', label: "Adjustments", type: "button" },
            { id: "separator-2", type: "separator" },
            { id: "camera", icon: 'camera', label: "Camera", type: "button" },
            { id: "reset", icon: 'rotateCcw', label: "Reset", type: "button" },
        ],
    },
};

// =============================================================================
// COLOR VARIANTS - Test different instance colors
// =============================================================================

const INSTANCE_COLORS = [
    { name: 'Blue', hex: '#60a5fa', rgb: '96, 165, 250' },
    { name: 'Green', hex: '#34d399', rgb: '52, 211, 153' },
    { name: 'Purple', hex: '#c084fc', rgb: '192, 132, 252' },
    { name: 'Pink', hex: '#fb7185', rgb: '251, 113, 133' },
    { name: 'Amber', hex: '#fbbf24', rgb: '251, 191, 36' },
    { name: 'Teal', hex: '#7dd3fc', rgb: '125, 211, 252' },
];

export const ColorVariants = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {INSTANCE_COLORS.map(color => (
                <div key={color.name} style={{ width: '280px', height: '200px' }}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {color.name}
                    </div>
                    <div
                        className="instance-viewport"
                        style={{
                            '--instance-color': color.hex,
                            '--instance-color-rgb': color.rgb,
                            height: '180px'
                        }}
                    >
                        <div className="instance-viewport__header">
                            <div className="instance-viewport__header-left">
                                <div className="instance-viewport__label">
                                    <div className="instance-viewport__label-dot" />
                                    <span className="instance-viewport__label-text">View {color.name}</span>
                                </div>
                            </div>
                            <div className="instance-viewport__header-controls">
                                <button className="instance-viewport__header-button" title="Close">
                                    <Icon name="close" size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="instance-viewport__content">
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.2)',
                            }}>
                                <Icon name="box" size={48} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    ),
    parameters: {
        layout: 'padded',
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#0a0a0f', padding: '24px' }}>
                <Story />
            </div>
        ),
    ],
};

export const ActiveState = {
    render: () => (
        <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ width: '300px', height: '220px' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Inactive
                </div>
                <div
                    className="instance-viewport"
                    style={{
                        '--instance-color': '#60a5fa',
                        '--instance-color-rgb': '96, 165, 250',
                        height: '200px'
                    }}
                >
                    <div className="instance-viewport__header">
                        <div className="instance-viewport__header-left">
                            <div className="instance-viewport__label">
                                <div className="instance-viewport__label-dot" />
                                <span className="instance-viewport__label-text">Inactive View</span>
                            </div>
                        </div>
                    </div>
                    <div className="instance-viewport__content" />
                </div>
            </div>
            <div style={{ width: '300px', height: '220px' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Active
                </div>
                <div
                    className="instance-viewport instance-viewport--active"
                    style={{
                        '--instance-color': '#60a5fa',
                        '--instance-color-rgb': '96, 165, 250',
                        height: '200px'
                    }}
                >
                    <div className="instance-viewport__header instance-viewport__header--active">
                        <div className="instance-viewport__header-left">
                            <div className="instance-viewport__label">
                                <div className="instance-viewport__label-dot" />
                                <span className="instance-viewport__label-text">Active View</span>
                            </div>
                        </div>
                    </div>
                    <div className="instance-viewport__content" />
                </div>
            </div>
        </div>
    ),
    parameters: {
        layout: 'padded',
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#0a0a0f', padding: '24px' }}>
                <Story />
            </div>
        ),
    ],
};