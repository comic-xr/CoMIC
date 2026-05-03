// src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.stories.jsx
import React from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { ThreeEdgeLayout, useLayoutContext } from "./ThreeEdgeLayout";
import "./ThreeEdgeLayout.scss";

export default {
    title: "Layout/ThreeEdgeLayout",
    component: ThreeEdgeLayout,
    parameters: {
        layout: "fullscreen",
    },
};

// =============================================================================
// MOCK COMPONENTS
// =============================================================================

const MockLeftPanel = ({ isCollapsed, onToggle, side }) => (
    <div
        style={{
            height: "100%",
            background: "#1a1a1f",
            display: "flex",
            flexDirection: "column",
        }}
    >
        {isCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "16px" }}>
                <button
                    onClick={onToggle}
                    style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}
                    title="Expand panel"
                >
                    <Icon name="files" size={20} />
                </button>
                <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}>
                    <Icon name="folder" size={20} />
                </button>
                <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}>
                    <Icon name="settings" size={20} />
                </button>
            </div>
        ) : (
            <>
                <div style={{ padding: "16px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>Files</h3>
                    <button onClick={onToggle} style={{ background: "none", border: "none", color: "#808080", cursor: "pointer" }}>←</button>
                </div>
                <div style={{ padding: "16px", color: "#808080", fontSize: "13px" }}>
                    <p>Sample files panel content</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
                        <li style={{ padding: "8px", background: "#2a2a2f", borderRadius: "4px", marginBottom: "4px" }}>dataset_1.vtp</li>
                        <li style={{ padding: "8px", background: "#2a2a2f", borderRadius: "4px", marginBottom: "4px" }}>dataset_2.vtp</li>
                        <li style={{ padding: "8px", background: "#2a2a2f", borderRadius: "4px" }}>sample_data.csv</li>
                    </ul>
                </div>
            </>
        )}
    </div>
);

const MockRightPanel = ({ isCollapsed, onToggle }) => (
    <div style={{ height: "100%", background: "#1a1a1f", display: "flex", flexDirection: "column" }}>
        {isCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "16px" }}>
                <button onClick={onToggle} style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }} title="Expand panel">
                    <Icon name="users" size={20} />
                </button>
                <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}>
                    <Icon name="messageSquare" size={20} />
                </button>
            </div>
        ) : (
            <>
                <div style={{ padding: "16px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>Collaboration</h3>
                    <button onClick={onToggle} style={{ background: "none", border: "none", color: "#808080", cursor: "pointer" }}>→</button>
                </div>
                <div style={{ padding: "16px", color: "#808080", fontSize: "13px" }}>
                    <p>Online Users (3)</p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#4CAF50" }} />
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2196F3" }} />
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FF9800" }} />
                    </div>
                </div>
            </>
        )}
    </div>
);

const MockCenterPanel = () => (
    <div style={{ height: "100%", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#404040" }}>
        <div style={{ textAlign: "center" }}>
            <Icon name="play" size={48} strokeWidth={1} />
            <p style={{ marginTop: "16px", fontSize: "14px" }}>Workspace Area</p>
            <p style={{ fontSize: "12px", color: "#333" }}>Visualization instances appear here</p>
        </div>
    </div>
);

const MockTopBar = () => (
    <div style={{ height: "48px", background: "#1a1a1f", borderBottom: "1px solid #333", display: "flex", alignItems: "center", padding: "0 16px", color: "#e0e0e0", fontSize: "14px" }}>
        <span style={{ fontWeight: "600" }}>CIA Web</span>
        <span style={{ marginLeft: "auto", color: "#808080", fontSize: "12px" }}>Room: default-room</span>
    </div>
);

const MockBottomBar = () => (
    <div style={{ height: "24px", background: "#1a1a1f", borderTop: "1px solid #333", display: "flex", alignItems: "center", padding: "0 16px", color: "#808080", fontSize: "11px" }}>
        <span>Connected</span>
        <span style={{ marginLeft: "auto" }}>v1.0.0</span>
    </div>
);

/**
 * MockSecondaryTopBar - Workspace selector in left zone
 * Receives layout dimensions from ThreeEdgeLayout
 */
const MockSecondaryTopBar = ({ leftPanelWidth, rightPanelWidth, leftPanelOpen, rightPanelOpen }) => {
    // Use panel width when open, minimum 180px when collapsed
    const leftZoneWidth = leftPanelOpen ? leftPanelWidth : 180;
    const rightZoneWidth = rightPanelOpen ? rightPanelWidth : 180;

    return (
        <div style={{
            height: "36px",
            background: "#222",
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
        }}>
            {/* Left Zone - Workspace Selector */}
            <div style={{
                width: leftZoneWidth,
                padding: "0 12px",
                borderRight: "1px solid #333",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "width 0.2s ease",
            }}>
                <Icon name="globe" size={14} style={{ color: "#60a5fa" }} />
                <span style={{ fontSize: "12px", color: "#e0e0e0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Team Analysis
                </span>
                <Icon name="chevronDown" size={12} style={{ color: "#808080" }} />
            </div>

            {/* Center Zone - Controls */}
            <div style={{ flex: 1, padding: "0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <button style={{ padding: "4px 8px", background: "#333", border: "1px solid #444", borderRadius: "4px", color: "#ccc", fontSize: "11px", cursor: "pointer" }}>
                    + Add Cell
                </button>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: "11px", color: "#666" }}>View Mode: Normal</span>
            </div>

            {/* Right Zone - Presence */}
            <div style={{
                width: rightZoneWidth,
                padding: "0 12px",
                borderLeft: "1px solid #333",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
                transition: "width 0.2s ease",
            }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#4CAF50", border: "2px solid #222" }} />
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2196F3", border: "2px solid #222", marginLeft: "-8px" }} />
                <span style={{ fontSize: "11px", color: "#808080", marginLeft: "4px" }}>+2</span>
            </div>
        </div>
    );
};

/**
 * MockSecondaryBottomBar - VR/Desktop toggle in left zone
 * Receives layout dimensions from ThreeEdgeLayout
 */
const MockSecondaryBottomBar = ({ leftPanelWidth, rightPanelWidth, leftPanelOpen, rightPanelOpen }) => {
    const [viewMode, setViewMode] = React.useState('desktop');

    // Left zone always shows the toggle, minimum 180px
    const leftZoneWidth = leftPanelOpen ? leftPanelWidth : 180;
    const rightZoneWidth = rightPanelOpen ? rightPanelWidth : 180;

    return (
        <div style={{
            height: "28px",
            background: "#222",
            borderTop: "1px solid #333",
            display: "flex",
            alignItems: "center",
        }}>
            {/* Left Zone - VR/Desktop Toggle */}
            <div style={{
                width: leftZoneWidth,
                padding: "0 12px",
                borderRight: "1px solid #333",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "width 0.2s ease",
            }}>
                <div style={{
                    display: "flex",
                    background: "#1a1a1a",
                    borderRadius: "4px",
                    padding: "2px",
                    border: "1px solid #333",
                }}>
                    <button
                        onClick={() => setViewMode('desktop')}
                        style={{
                            padding: "3px 8px",
                            background: viewMode === 'desktop' ? '#333' : 'transparent',
                            border: "none",
                            borderRadius: "3px",
                            color: viewMode === 'desktop' ? '#fff' : '#666',
                            fontSize: "10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                        }}
                    >
                        <Icon name="monitor" size={10} />
                        Desktop
                    </button>
                    <button
                        onClick={() => setViewMode('vr')}
                        style={{
                            padding: "3px 8px",
                            background: viewMode === 'vr' ? '#333' : 'transparent',
                            border: "none",
                            borderRadius: "3px",
                            color: viewMode === 'vr' ? '#fff' : '#666',
                            fontSize: "10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                        }}
                    >
                        <Icon name="vrPano" size={10} />
                        VR
                    </button>
                </div>
            </div>

            {/* Center Zone - Canvas Info */}
            <div style={{ flex: 1, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                <span style={{ fontSize: "10px", color: "#808080" }}>Canvas: (0,0) → (2,1)</span>
                <span style={{ fontSize: "10px", color: "#666" }}>|</span>
                <span style={{ fontSize: "10px", color: "#808080" }}>3 instances</span>
            </div>

            {/* Right Zone - Voice */}
            <div style={{
                width: rightZoneWidth,
                padding: "0 12px",
                borderLeft: "1px solid #333",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                transition: "width 0.2s ease",
            }}>
                <button style={{
                    padding: "3px 8px",
                    background: "#2d5a2d",
                    border: "1px solid #3d7a3d",
                    borderRadius: "4px",
                    color: "#8fdf8f",
                    fontSize: "10px",
                    cursor: "pointer",
                }}>
                    🎤 In Voice: Main Room
                </button>
            </div>
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                leftPanel={<MockLeftPanel />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<MockRightPanel />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

export const WithSecondaryBars = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                secondaryTopBar={<MockSecondaryTopBar />}
                leftPanel={<MockLeftPanel />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<MockRightPanel />}
                secondaryBottomBar={<MockSecondaryBottomBar />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

export const WithSecondaryBarsCollapsedPanels = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                secondaryTopBar={<MockSecondaryTopBar />}
                leftPanel={<MockLeftPanel />}
                centerPanel={
                    <div style={{ height: "100%", background: "#0a0a0f", padding: "24px", color: "#808080" }}>
                        <h2 style={{ color: "#e0e0e0", marginBottom: "16px" }}>Secondary Bars Demo</h2>
                        <p style={{ marginBottom: "16px" }}>Notice how the secondary bar zones respond when you collapse the panels:</p>
                        <ul style={{ lineHeight: "2", fontSize: "13px" }}>
                            <li><strong>Workspace dropdown</strong> stays in the top-left zone (minimum 180px wide)</li>
                            <li><strong>VR/Desktop toggle</strong> stays in the bottom-left zone</li>
                            <li>Zones smoothly animate with the panel widths</li>
                            <li>Try collapsing both panels to see the minimum widths maintained</li>
                        </ul>
                    </div>
                }
                rightPanel={<MockRightPanel />}
                secondaryBottomBar={<MockSecondaryBottomBar />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

export const CenterOnly = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                leftPanel={<div style={{ height: "100%", background: "#1a1a1f" }} />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<div style={{ height: "100%", background: "#1a1a1f" }} />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

export const InteractiveDemo = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                secondaryTopBar={<MockSecondaryTopBar />}
                leftPanel={<MockLeftPanel />}
                centerPanel={
                    <div style={{ height: "100%", background: "#0a0a0f", padding: "24px", color: "#808080" }}>
                        <h2 style={{ color: "#e0e0e0", marginBottom: "16px" }}>Interactive Demo</h2>
                        <p>Try the following:</p>
                        <ul style={{ lineHeight: "2" }}>
                            <li>Click the collapse buttons in panel headers</li>
                            <li>Drag the panel dividers to resize</li>
                            <li>Watch secondary bars respond to panel changes</li>
                            <li>Toggle VR/Desktop mode in the bottom bar</li>
                        </ul>
                        <p style={{ marginTop: "24px", fontSize: "12px", color: "#666" }}>
                            Panel state persists to localStorage automatically.
                        </p>
                    </div>
                }
                rightPanel={<MockRightPanel />}
                secondaryBottomBar={<MockSecondaryBottomBar />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};