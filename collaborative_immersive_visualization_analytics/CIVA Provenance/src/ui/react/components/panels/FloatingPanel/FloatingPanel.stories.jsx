// src/ui/react/components/panels/FloatingPanel/FloatingPanel.stories.jsx
// Stories for FloatingPanel organism

import React, { useState } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { FloatingPanelProvider, useFloatingPanels } from './FloatingPanelContext';
import { Icon } from '@UI/react/components/atoms/Icon';

// =============================================================================
// STORY WRAPPER - Provides context and popout simulation
// =============================================================================

function StoryWrapper({ children, panelId = 'demo-panel', initialState = null }) {
    return (
        <FloatingPanelProvider>
            <PanelActivator panelId={panelId} initialState={initialState}>
                {children}
            </PanelActivator>
        </FloatingPanelProvider>
    );
}

function PanelActivator({ children, panelId, initialState }) {
    const { popOutPanel, getPanelState } = useFloatingPanels();
    const [initialized, setInitialized] = React.useState(false);

    React.useEffect(() => {
        if (!initialized && !getPanelState(panelId)) {
            popOutPanel(panelId, initialState || {
                x: 100,
                y: 100,
                width: 400,
                height: 300,
            });
            setInitialized(true);
        }
    }, [initialized, panelId, popOutPanel, getPanelState, initialState]);

    return <>{children}</>;
}

// =============================================================================
// META
// =============================================================================

export default {
    title: 'Organisms/FloatingPanel',
    component: FloatingPanel,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
A draggable, resizable floating panel that can be popped out from the dock.

## Features
- Drag to move (via header)
- Resize via corner handle
- Minimize/expand toggle
- Dock button to return to sidebar
- Snap-to-corner when dragging near viewport edges
- z-index management for multiple panels
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '100vw',
                height: '100vh',
                background: '#0a0a0f',
                position: 'relative',
            }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    render: () => (
        <StoryWrapper>
            <FloatingPanel
                panelId="demo-panel"
                title="Floating Panel"
                icon="box"
                color="blue"
            >
                <div style={{ padding: '16px', color: 'white' }}>
                    <p>This is the panel content. Drag the header to move.</p>
                    <p>Use the corner handle to resize.</p>
                </div>
            </FloatingPanel>
        </StoryWrapper>
    ),
};

export const WithContent = {
    render: () => (
        <StoryWrapper>
            <FloatingPanel
                panelId="demo-panel"
                title="Views Panel"
                icon="eye"
                color="blue"
            >
                <div style={{ padding: '16px', color: 'white' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>Active Views</h4>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: '#888' }}>
                        <li>View 1 - Scatter Plot</li>
                        <li>View 2 - Histogram</li>
                        <li>View 3 - 3D Volume</li>
                    </ul>
                </div>
            </FloatingPanel>
        </StoryWrapper>
    ),
};

export const DifferentColors = {
    render: () => (
        <FloatingPanelProvider>
            <MultiPanelActivator>
                <FloatingPanel panelId="blue-panel" title="Blue Panel" icon="box" color="blue">
                    <div style={{ padding: '16px', color: 'white', fontSize: '12px' }}>
                        Blue themed panel
                    </div>
                </FloatingPanel>
                <FloatingPanel panelId="purple-panel" title="Purple Panel" icon="layers" color="purple">
                    <div style={{ padding: '16px', color: 'white', fontSize: '12px' }}>
                        Purple themed panel
                    </div>
                </FloatingPanel>
                <FloatingPanel panelId="teal-panel" title="Teal Panel" icon="database" color="teal">
                    <div style={{ padding: '16px', color: 'white', fontSize: '12px' }}>
                        Teal themed panel
                    </div>
                </FloatingPanel>
            </MultiPanelActivator>
        </FloatingPanelProvider>
    ),
};

function MultiPanelActivator({ children }) {
    const { popOutPanel, getPanelState } = useFloatingPanels();
    const [initialized, setInitialized] = React.useState(false);

    React.useEffect(() => {
        if (!initialized) {
            if (!getPanelState('blue-panel')) {
                popOutPanel('blue-panel', { x: 50, y: 50, width: 300, height: 200 });
            }
            if (!getPanelState('purple-panel')) {
                popOutPanel('purple-panel', { x: 200, y: 150, width: 300, height: 200 });
            }
            if (!getPanelState('teal-panel')) {
                popOutPanel('teal-panel', { x: 350, y: 250, width: 300, height: 200 });
            }
            setInitialized(true);
        }
    }, [initialized, popOutPanel, getPanelState]);

    return <>{children}</>;
}

// =============================================================================
// INTERACTIVE DEMO
// =============================================================================

export const InteractiveDemo = {
    render: () => {
        const [logs, setLogs] = useState([]);

        const addLog = (msg) => {
            setLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
        };

        return (
            <FloatingPanelProvider>
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.8)',
                    borderRadius: '8px',
                    color: '#888',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    maxWidth: '400px',
                    zIndex: 1000,
                }}>
                    <div style={{ marginBottom: '8px', color: '#4ade80', fontWeight: 600 }}>
                        Event Log
                    </div>
                    {logs.length === 0 ? (
                        <div>Interact with the panel to see events...</div>
                    ) : (
                        logs.map((log, i) => <div key={i}>{log}</div>)
                    )}
                </div>

                <DemoActivator>
                    <FloatingPanel
                        panelId="demo-panel"
                        title="Interactive Demo"
                        icon="settings"
                        color="blue"
                        onDock={() => addLog('Dock button clicked')}
                    >
                        <div style={{ padding: '16px', color: 'white', fontSize: '12px' }}>
                            <p style={{ margin: '0 0 12px' }}>Try these interactions:</p>
                            <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#888' }}>
                                <li>Drag the header to move</li>
                                <li>Drag near edges to snap</li>
                                <li>Resize from corner handle</li>
                                <li>Click minimize button</li>
                                <li>Click dock to return to sidebar</li>
                            </ul>
                        </div>
                    </FloatingPanel>
                </DemoActivator>
            </FloatingPanelProvider>
        );
    },
};

function DemoActivator({ children }) {
    const { popOutPanel, getPanelState } = useFloatingPanels();
    const [initialized, setInitialized] = React.useState(false);

    React.useEffect(() => {
        if (!initialized && !getPanelState('demo-panel')) {
            popOutPanel('demo-panel', {
                x: 200,
                y: 100,
                width: 350,
                height: 250,
            });
            setInitialized(true);
        }
    }, [initialized, popOutPanel, getPanelState]);

    return <>{children}</>;
}
