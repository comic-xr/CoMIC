// src/ui/react/components/panels/BottomPanel/BottomPanel.stories.jsx
// Storybook stories for the BottomPanel and its tabs

import React, { useEffect } from 'react';
import { BottomPanel, useBottomPanel, BottomPanelTabs } from './index';
import { LogsTab } from './tabs/LogsTab';
import { ComputeTab } from './tabs/ComputeTab';
import {
    logInfo,
    logSuccess,
    logWarning,
    logError,
    logProgress
} from '@Utils/logger.js';

export default {
    title: 'Panels/BottomPanel',
    component: BottomPanel,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [{ name: 'dark', value: '#1e1e1e' }],
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: '#1e1e1e',
            }}>
                {/* Simulated workspace area */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '14px',
                }}>
                    Workspace Area
                </div>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// FULL PANEL STORIES
// =============================================================================

export const Default = {
    render: () => {
        // Force panel open for story
        const panel = useBottomPanel();

        useEffect(() => {
            panel.expand();
        }, []);

        return <BottomPanel />;
    },
};

export const WithLogs = {
    render: () => {
        const panel = useBottomPanel();

        useEffect(() => {
            panel.expand(BottomPanelTabs.LOGS);

            // Generate sample logs
            const timer = setTimeout(() => {
                logInfo('Application initialized');
                logProgress('Loading dataset: brain_scan.vtp');
                logSuccess('Dataset loaded successfully');
                logWarning('Large dataset detected - consider subsampling');
                logProgress('Running t-SNE: 25%');
                logProgress('Running t-SNE: 50%');
                logProgress('Running t-SNE: 75%');
                logSuccess('t-SNE completed in 2.3s');
                logError('Failed to connect to voice server');
            }, 100);

            return () => clearTimeout(timer);
        }, []);

        return <BottomPanel />;
    },
};

export const WithComputeJobs = {
    render: () => {
        const panel = useBottomPanel();

        useEffect(() => {
            panel.expand(BottomPanelTabs.COMPUTE);
        }, []);

        return <BottomPanel />;
    },
};

export const Collapsed = {
    render: () => {
        const panel = useBottomPanel();

        useEffect(() => {
            panel.collapse();
        }, []);

        return (
            <div>
                <BottomPanel />
                <div style={{
                    padding: '8px',
                    background: '#252526',
                    color: '#999',
                    fontSize: '12px',
                    textAlign: 'center',
                }}>
                    Panel is collapsed. In the real app, click the StatusBar toggle to expand.
                </div>
            </div>
        );
    },
};

// =============================================================================
// INDIVIDUAL TAB STORIES
// =============================================================================

const TabDecorator = (Story) => (
    <div style={{
        height: '300px',
        width: '100%',
        background: 'var(--color-bg-secondary, #1e1e1e)',
        display: 'flex',
        flexDirection: 'column',
    }}>
        <Story />
    </div>
);

export const LogsTabOnly = {
    render: () => <LogsTab />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Logs tab showing system logs with filtering and auto-scroll.',
            },
        },
    },
};

export const LogsTabWithActivity = {
    render: () => {
        useEffect(() => {
            // Simulate ongoing activity
            const logs = [
                () => logInfo('User connected: Dr. Smith'),
                () => logProgress('Processing annotation batch'),
                () => logSuccess('Annotation saved'),
                () => logWarning('Camera sync disabled'),
                () => logProgress('Exporting to VTK format'),
                () => logSuccess('Export completed'),
                () => logError('Network timeout'),
                () => logInfo('Reconnecting...'),
                () => logSuccess('Connection restored'),
            ];

            let index = 0;
            const interval = setInterval(() => {
                if (index < logs.length) {
                    logs[index]();
                    index++;
                } else {
                    clearInterval(interval);
                }
            }, 800);

            return () => clearInterval(interval);
        }, []);

        return <LogsTab />;
    },
    decorators: [TabDecorator],
};

export const ComputeTabOnly = {
    render: () => <ComputeTab />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Compute jobs tab showing background processing status.',
            },
        },
    },
};

// =============================================================================
// INTERACTION STORIES
// =============================================================================

export const Interactive = {
    render: () => {
        const panel = useBottomPanel();

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Controls */}
                <div style={{
                    padding: '12px',
                    background: '#2d2d2d',
                    borderBottom: '1px solid #444',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={panel.toggle}
                        style={buttonStyle}
                    >
                        Toggle Panel
                    </button>
                    <button
                        onClick={panel.showLogs}
                        style={buttonStyle}
                    >
                        Show Logs
                    </button>
                    <button
                        onClick={panel.showCompute}
                        style={buttonStyle}
                    >
                        Show Compute
                    </button>
                    <button
                        onClick={() => logInfo('Test info message')}
                        style={{ ...buttonStyle, background: '#2196F3' }}
                    >
                        Log Info
                    </button>
                    <button
                        onClick={() => logSuccess('Test success message')}
                        style={{ ...buttonStyle, background: '#4CAF50' }}
                    >
                        Log Success
                    </button>
                    <button
                        onClick={() => logWarning('Test warning message')}
                        style={{ ...buttonStyle, background: '#FFA726' }}
                    >
                        Log Warning
                    </button>
                    <button
                        onClick={() => logError('Test error message')}
                        style={{ ...buttonStyle, background: '#f44336' }}
                    >
                        Log Error
                    </button>
                </div>

                {/* Info */}
                <div style={{
                    padding: '8px 12px',
                    background: '#252526',
                    fontSize: '11px',
                    color: '#888',
                }}>
                    State: {panel.isExpanded ? 'Expanded' : 'Collapsed'} |
                    Tab: {panel.activeTab} |
                    Height: {panel.height}px
                </div>

                {/* Workspace placeholder */}
                <div style={{ flex: 1, background: '#1a1a1a' }} />

                {/* Panel */}
                <BottomPanel />
            </div>
        );
    },
};

const buttonStyle = {
    padding: '6px 12px',
    background: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
};