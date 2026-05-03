/**
 * @file VRFloatingPanel.stories.jsx
 * @description Stories for VR floating panel components.
 */

import React, { useState } from 'react';
import {
    VRPanelProvider,
    VR_PANEL_MODES,
} from './VRPanelContext';
import { VRFloatingPanel } from './VRFloatingPanel';
import { VRPanelArrangementControls } from './VRPanelArrangementControls';

export default {
    title: 'Molecules/VRFloatingPanel',
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <VRPanelProvider isVR={true}>
                <div
                    style={{
                        width: '100vw',
                        height: '100vh',
                        background: '#030303',
                        position: 'relative',
                    }}
                >
                    <Story />
                </div>
            </VRPanelProvider>
        ),
    ],
};

// =============================================================================
// SINGLE PANEL
// =============================================================================

export const SinglePanel = () => {
    return (
        <VRFloatingPanel
            panelId="demo-panel"
            title="View Links"
            icon="link"
            initialMode={VR_PANEL_MODES.HUD}
            initialSize="MEDIUM"
            onClose={() => console.log('Close')}
        >
            <div style={{ color: '#fff', fontSize: 12 }}>
                <p>Panel content goes here.</p>
                <p>
                    Use the header controls to change mode or snap to a
                    position.
                </p>
            </div>
        </VRFloatingPanel>
    );
};

// =============================================================================
// MULTIPLE PANELS
// =============================================================================

export const MultiplePanels = () => {
    const [panels, setPanels] = useState([
        { id: 'links', title: 'View Links', icon: 'link' },
        { id: 'users', title: 'Following', icon: 'users' },
        { id: 'settings', title: 'Settings', icon: 'settings' },
    ]);

    const handleClose = (panelId) => {
        setPanels((prev) => prev.filter((p) => p.id !== panelId));
    };

    return (
        <>
            {panels.map((panel, index) => (
                <VRFloatingPanel
                    key={panel.id}
                    panelId={panel.id}
                    title={panel.title}
                    icon={panel.icon}
                    initialMode={VR_PANEL_MODES.HUD}
                    initialSize="MEDIUM"
                    onClose={() => handleClose(panel.id)}
                >
                    <div style={{ color: '#fff', fontSize: 12 }}>
                        Content for {panel.title}
                    </div>
                </VRFloatingPanel>
            ))}

            <VRPanelArrangementControls />
        </>
    );
};

MultiplePanels.parameters = {
    docs: {
        description: {
            story:
                'Multiple panels with arrangement controls. Use Dashboard or Stack buttons to arrange.',
        },
    },
};

// =============================================================================
// PANEL WITH CONTENT
// =============================================================================

export const PanelWithContent = () => {
    return (
        <VRFloatingPanel
            panelId="content-panel"
            title="User Following"
            icon="users"
            initialMode={VR_PANEL_MODES.HUD}
            initialSize="LARGE"
            onClose={() => console.log('Close')}
        >
            <div style={{ color: '#fff' }}>
                <div
                    style={{
                        marginBottom: 16,
                        paddingBottom: 16,
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            color: '#888',
                            marginBottom: 8,
                        }}
                    >
                        ONLINE NOW
                    </div>
                    <UserItem name="Alice Chen" status="Viewing Skull" />
                    <UserItem name="Bob Smith" status="Editing Bones" />
                </div>

                <div>
                    <div
                        style={{
                            fontSize: 11,
                            color: '#888',
                            marginBottom: 8,
                        }}
                    >
                        OFFLINE
                    </div>
                    <UserItem name="Charlie Davis" status="Last seen 2h ago" offline />
                </div>
            </div>
        </VRFloatingPanel>
    );
};

function UserItem({ name, status, offline }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
            }}
        >
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: offline
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #2dd4bf, #60a5fa)',
                }}
            />
            <div>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 500,
                        opacity: offline ? 0.5 : 1,
                    }}
                >
                    {name}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>{status}</div>
            </div>
        </div>
    );
}

// =============================================================================
// PANEL MODES
// =============================================================================

export const PanelModes = () => {
    return (
        <div style={{ padding: 40 }}>
            <h3 style={{ color: '#fff', marginBottom: 20 }}>
                Click the mode button (eye icon) to see different panel modes
            </h3>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 20,
                    marginTop: 40,
                }}
            >
                <div>
                    <div style={{ color: '#888', marginBottom: 8, fontSize: 12 }}>
                        HUD Mode
                    </div>
                    <div
                        style={{
                            padding: 16,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 12,
                        }}
                    >
                        Follows your head rotation. Always visible in front of you.
                    </div>
                </div>
                <div>
                    <div style={{ color: '#888', marginBottom: 8, fontSize: 12 }}>
                        World Mode
                    </div>
                    <div
                        style={{
                            padding: 16,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 12,
                        }}
                    >
                        Fixed in 3D space. Stays where you place it.
                    </div>
                </div>
                <div>
                    <div style={{ color: '#888', marginBottom: 8, fontSize: 12 }}>
                        Hand Mode
                    </div>
                    <div
                        style={{
                            padding: 16,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 12,
                        }}
                    >
                        Attached near your controller. Quick access.
                    </div>
                </div>
                <div>
                    <div style={{ color: '#888', marginBottom: 8, fontSize: 12 }}>
                        Dashboard Mode
                    </div>
                    <div
                        style={{
                            padding: 16,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 12,
                        }}
                    >
                        Arranged in a curved arc around you.
                    </div>
                </div>
            </div>

            <VRFloatingPanel
                panelId="mode-demo"
                title="Try Different Modes"
                icon="settings"
                initialMode={VR_PANEL_MODES.HUD}
                initialSize="MEDIUM"
                onClose={() => {}}
            >
                <div style={{ color: '#fff', fontSize: 12 }}>
                    Click the mode icon in the header to switch between modes.
                </div>
            </VRFloatingPanel>
        </div>
    );
};
