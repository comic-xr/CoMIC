/**
 * @file StatusBar.stories.jsx
 * @description Storybook stories for the StatusBar component (28px).
 * System status bar with sync, users, recording, memory, and FPS indicators.
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// MOCK COMPONENTS
// Since StatusBar has external dependencies (presenceSystem, useAuth, etc.),
// we create isolated mock versions of the helper components for Storybook.
// =============================================================================

import { Icon } from '@UI/react/components/atoms/Icon';

import './StatusBar.scss';

/**
 * Mock StatusBar for Storybook - isolated from external dependencies
 */
function MockStatusBar({
    isConnected = true,
    isSyncing = false,
    onlineCount = 3,
    warningCount = 0,
    cursorsVisible = true,
    isDevMode = false,
    isAuthenticated = true,
    userName = 'Dr. Smith',
    isRecording = false,
    isPaused = false,
    recordingDuration = 0,
    recordingMode = 'Workspace',
    ramUsage = 45,
    fps = 60,
    transientMessage = null,
}) {
    // Local state for interactive elements
    const [localCursorsVisible, setLocalCursorsVisible] = useState(cursorsVisible);
    const [localTransient, setLocalTransient] = useState(transientMessage);

    // Auto-fade transient message
    useEffect(() => {
        if (localTransient) {
            const timer = setTimeout(() => setLocalTransient(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [localTransient]);

    // Format recording duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get FPS color class
    const getFpsClass = () => {
        if (fps >= 55) return 'status-bar__item--success';
        if (fps >= 30) return 'status-bar__item--warning';
        return 'status-bar__item--error';
    };

    // Get memory usage class
    const getMemoryClass = () => {
        if (ramUsage >= 90) return 'status-bar__item--error';
        if (ramUsage >= 70) return 'status-bar__item--warning';
        return '';
    };

    return (
        <div className="status-bar">
            {/* Left Zone */}
            <div className="status-bar__left">
                {/* Auth Mode */}
                {isDevMode ? (
                    <div className="status-bar__item status-bar__item--dev-mode" title="Development mode">
                        <Icon name="shieldAlert" size={10} />
                        <span>Dev Mode</span>
                    </div>
                ) : isAuthenticated ? (
                    <div className="status-bar__item status-bar__item--auth" title={`Signed in as ${userName}`}>
                        <Icon name="shield" size={10} />
                        <span>Secure</span>
                    </div>
                ) : null}

                <div className="status-bar__divider" />

                {/* Sync Status */}
                {!isConnected ? (
                    <div className="status-bar__item status-bar__item--error">
                        <Icon name="wifiOff" size={10} />
                        <span>Offline</span>
                    </div>
                ) : isSyncing ? (
                    <div className="status-bar__item status-bar__item--warning">
                        <Icon name="wifi" size={10} />
                        <span>Syncing...</span>
                    </div>
                ) : (
                    <div className="status-bar__item status-bar__item--success">
                        <Icon name="wifi" size={10} />
                        <span>Synced</span>
                    </div>
                )}

                <div className="status-bar__divider" />

                {/* Online Users */}
                <div className="status-bar__item status-bar__item--interactive">
                    <Icon name="users" size={10} />
                    <span>{onlineCount} online</span>
                </div>

                {/* Warnings */}
                {warningCount > 0 && (
                    <button className="status-bar__item status-bar__item--warnings" title="Click to view logs">
                        <Icon name="alertTriangle" size={12} />
                        <span>{warningCount}</span>
                    </button>
                )}

                <div className="status-bar__divider" />

                {/* Cursors Toggle */}
                <button
                    className={`status-bar__toggle ${localCursorsVisible ? 'status-bar__toggle--active' : ''}`}
                    onClick={() => setLocalCursorsVisible(!localCursorsVisible)}
                    title={localCursorsVisible ? 'Hide cursors' : 'Show cursors'}
                >
                    {localCursorsVisible ? <Icon name="eye" size={10} /> : <Icon name="eyeOff" size={10} />}
                    <span>Cursors</span>
                </button>

                <div className="status-bar__divider" />
            </div>

            {/* Center Zone - Transient Messages */}
            <div className="status-bar__center">
                {localTransient && (
                    <div className="status-bar__transient">
                        <span>{localTransient}</span>
                    </div>
                )}
            </div>

            {/* Right Zone */}
            <div className="status-bar__right">
                {/* Recording Controls */}
                {isRecording && (
                    <div className="status-bar__recording-controls">
                        <button className="status-bar__recording-indicator" title="Open Recording panel">
                            <Icon name="circle" size={8} className={`status-bar__recording-dot ${isPaused ? 'paused' : ''}`} />
                            <span>{formatDuration(recordingDuration)}</span>
                            {recordingMode && <span className="status-bar__recording-mode">{recordingMode}</span>}
                        </button>
                        <button className="status-bar__recording-btn" title={isPaused ? 'Resume' : 'Pause'}>
                            <Icon name="pause" size={10} />
                        </button>
                        <button className="status-bar__recording-btn status-bar__recording-btn--stop" title="Stop recording">
                            <Icon name="square" size={10} />
                        </button>
                    </div>
                )}

                {/* Memory Usage */}
                <button className={`status-bar__item status-bar__memory ${getMemoryClass()}`} title="Click for memory breakdown">
                    <Icon name="cpu" size={10} />
                    <span>{ramUsage}%</span>
                </button>

                <div className="status-bar__divider" />

                {/* FPS Counter */}
                <div className={`status-bar__item ${getFpsClass()}`}>
                    <Icon name="zap" size={10} />
                    <span>{fps} FPS</span>
                </div>

                <div className="status-bar__divider" />

                {/* Panel Toggle */}
                <button className="status-bar__item status-bar__item--toggle" title="Toggle output panel">
                    <Icon name="chevronUp" size={14} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// STORYBOOK CONFIG
// =============================================================================

export default {
    title: 'Layout/StatusBar',
    component: MockStatusBar,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#0a0a0a' },
            ],
        },
    },
    argTypes: {
        isConnected: { control: 'boolean' },
        isSyncing: { control: 'boolean' },
        onlineCount: { control: { type: 'number', min: 0, max: 99 } },
        warningCount: { control: { type: 'number', min: 0, max: 99 } },
        cursorsVisible: { control: 'boolean' },
        isDevMode: { control: 'boolean' },
        isAuthenticated: { control: 'boolean' },
        isRecording: { control: 'boolean' },
        isPaused: { control: 'boolean' },
        recordingDuration: { control: { type: 'number', min: 0, max: 3600 } },
        recordingMode: {
            control: 'select',
            options: ['Workspace', 'Selection', 'Audio Only'],
        },
        ramUsage: { control: { type: 'range', min: 0, max: 100 } },
        fps: { control: { type: 'range', min: 0, max: 144 } },
        transientMessage: { control: 'text' },
    },
};

// =============================================================================
// DECORATOR
// =============================================================================

const StatusBarDecorator = (Story) => (
    <div style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
    }}>
        {/* Main content placeholder */}
        <div style={{ flex: 1 }} />
        <Story />
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    decorators: [StatusBarDecorator],
    args: {
        isConnected: true,
        isSyncing: false,
        onlineCount: 3,
        warningCount: 0,
        cursorsVisible: true,
        isDevMode: false,
        isAuthenticated: true,
        userName: 'Dr. Smith',
        isRecording: false,
        isPaused: false,
        recordingDuration: 0,
        recordingMode: 'Workspace',
        ramUsage: 45,
        fps: 60,
        transientMessage: null,
    },
};

export const Syncing = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        isSyncing: true,
    },
};

export const Offline = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        isConnected: false,
    },
};

export const DevMode = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        isDevMode: true,
    },
};

export const ManyUsersOnline = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        onlineCount: 12,
    },
};

export const WithWarnings = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        warningCount: 3,
    },
};

export const CursorsHidden = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        cursorsVisible: false,
    },
};

export const Recording = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        isRecording: true,
        recordingDuration: 125,
        recordingMode: 'Workspace',
    },
};

export const RecordingPaused = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        isRecording: true,
        isPaused: true,
        recordingDuration: 67,
        recordingMode: 'Selection',
    },
};

export const HighMemoryUsage = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        ramUsage: 85,
    },
};

export const CriticalMemoryUsage = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        ramUsage: 95,
    },
};

export const LowFPS = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        fps: 24,
    },
};

export const CriticallyLowFPS = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        fps: 12,
    },
};

export const HighFPS = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        fps: 120,
    },
};

export const WithTransientMessage = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        transientMessage: 'Changes saved successfully',
    },
};

export const FullActivity = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        onlineCount: 8,
        warningCount: 2,
        isRecording: true,
        recordingDuration: 342,
        ramUsage: 72,
        fps: 58,
        transientMessage: 'Auto-saved',
    },
};

export const ProblemState = {
    decorators: [StatusBarDecorator],
    args: {
        ...Default.args,
        isConnected: false,
        warningCount: 5,
        ramUsage: 92,
        fps: 18,
    },
};

export const InteractiveDemo = {
    decorators: [StatusBarDecorator],
    args: Default.args,
    render: (args) => {
        const [state, setState] = useState({
            isConnected: args.isConnected,
            isSyncing: args.isSyncing,
            isRecording: args.isRecording,
            isPaused: args.isPaused,
            recordingDuration: args.recordingDuration,
            ramUsage: args.ramUsage,
            fps: args.fps,
        });

        // Simulate FPS fluctuation
        useEffect(() => {
            const interval = setInterval(() => {
                setState(prev => ({
                    ...prev,
                    fps: Math.max(15, Math.min(75, prev.fps + (Math.random() - 0.5) * 10)),
                }));
            }, 1000);
            return () => clearInterval(interval);
        }, []);

        // Simulate recording timer
        useEffect(() => {
            if (state.isRecording && !state.isPaused) {
                const interval = setInterval(() => {
                    setState(prev => ({
                        ...prev,
                        recordingDuration: prev.recordingDuration + 1,
                    }));
                }, 1000);
                return () => clearInterval(interval);
            }
        }, [state.isRecording, state.isPaused]);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Controls */}
                <div style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    fontSize: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <button
                        onClick={() => setState(prev => ({ ...prev, isConnected: !prev.isConnected }))}
                        style={{ padding: '4px 8px', background: state.isConnected ? '#34d399' : '#fb7185', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {state.isConnected ? 'Connected' : 'Disconnected'}
                    </button>
                    <button
                        onClick={() => setState(prev => ({ ...prev, isSyncing: !prev.isSyncing }))}
                        style={{ padding: '4px 8px', background: state.isSyncing ? '#fbbf24' : '#666', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {state.isSyncing ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                        onClick={() => setState(prev => ({
                            ...prev,
                            isRecording: !prev.isRecording,
                            recordingDuration: prev.isRecording ? 0 : prev.recordingDuration,
                        }))}
                        style={{ padding: '4px 8px', background: state.isRecording ? '#fb7185' : '#666', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {state.isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    {state.isRecording && (
                        <button
                            onClick={() => setState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
                            style={{ padding: '4px 8px', background: state.isPaused ? '#fbbf24' : '#666', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            {state.isPaused ? 'Resume' : 'Pause'}
                        </button>
                    )}
                    <span style={{ color: '#888', alignSelf: 'center' }}>
                        RAM: {Math.round(state.ramUsage)}% | FPS: {Math.round(state.fps)}
                    </span>
                </div>

                <div style={{ flex: 1 }} />

                <MockStatusBar
                    {...args}
                    isConnected={state.isConnected}
                    isSyncing={state.isSyncing}
                    isRecording={state.isRecording}
                    isPaused={state.isPaused}
                    recordingDuration={state.recordingDuration}
                    ramUsage={Math.round(state.ramUsage)}
                    fps={Math.round(state.fps)}
                />
            </div>
        );
    },
};