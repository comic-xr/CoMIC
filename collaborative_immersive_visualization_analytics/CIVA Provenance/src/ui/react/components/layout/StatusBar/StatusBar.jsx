// src/ui/react/components/layout/StatusBar/StatusBar.jsx
// App-level status bar with sync status, online users, cursors, recording, and FPS
// Matches artifact design with left/center/right zones

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

import { presenceSystem } from '@Collaboration/presence/presenceSystem.js';
import { getBottomPanelControls } from '@UI/react/components/panels/BottomPanel';
import { useAuth } from '@UI/react/hooks/useAuth.js';
import { VoiceCommandToggle } from '@UI/react/components/molecules/VoiceCommandToggle';
import { getStatusColorHex } from '@UI/react/utils/statusConfig';
import './StatusBar.scss';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * SyncStatus - Shows connection/sync status
 */
function SyncStatus({ isConnected, isSyncing }) {
    if (!isConnected) {
        return (
            <div className="status-bar__item status-bar__item--error">
                <Icon name="wifiOff" size={10} />
                <span>Offline</span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="status-bar__item status-bar__item--warning">
                <Icon name="wifi" size={10} />
                <span>Syncing...</span>
            </div>
        );
    }

    return (
        <div className="status-bar__item status-bar__item--success">
            <Icon name="wifi" size={10} />
            <span>Synced</span>
        </div>
    );
}

/**
 * OnlineUsersIndicator - Shows count of online users with hover popover
 */
function OnlineUsersIndicator({ count }) {
    const [showPopover, setShowPopover] = useState(false);
    const [users, setUsers] = useState([]);

    const handleMouseEnter = () => {
        // Get current online users from presence system
        const onlineUsers = presenceSystem.getOnlineUsers?.() || [];
        setUsers(onlineUsers);
        setShowPopover(true);
    };

    return (
        <div
            className="status-bar__item status-bar__item--interactive"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowPopover(false)}
        >
            <Icon name="users" size={10} />
            <span>{count} online</span>

            {showPopover && users.length > 0 && (
                <div className="online-popover">
                    <div className="online-popover__header">Currently Online</div>
                    <div className="online-popover__list">
                        {users.map(user => {
                            const statusColor = getStatusColorHex(user.status);
                            return (
                                <div key={user.userId} className="online-popover__user">
                                    <Icon
                                        name="circle"
                                        size={8}
                                        fill={statusColor}
                                        stroke={statusColor}
                                        className="online-popover__status"
                                    />
                                    <span
                                        className="online-popover__name"
                                        style={{ color: user.userColor }}
                                    >
                                        {user.userName}
                                        {user.isYou && ' (you)'}
                                    </span>
                                    {user.status === 'idle' && (
                                        <span className="online-popover__idle">(idle)</span>
                                    )}
                                    {user.status === 'away' && (
                                        <span className="online-popover__idle">(away)</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * WarningsIndicator - Shows warning count if any
 */
function WarningsIndicator({ count }) {
    if (count === 0) return null;

    return (
        <div className="status-bar__item status-bar__item--warning">
            <Icon name="alertTriangle" size={10} />
            <span>{count} {count === 1 ? 'warning' : 'warnings'}</span>
        </div>
    );
}

/**
 * CursorsToggle - Toggle visibility of other users' cursors
 */
function CursorsToggle({ visible, onToggle }) {
    return (
        <button
            className={`status-bar__toggle ${visible ? 'status-bar__toggle--active' : ''}`}
            onClick={onToggle}
            title={visible ? 'Hide cursors' : 'Show cursors'}
        >
            {visible ? <Icon name="eye" size={10} /> : <Icon name="eyeOff" size={10} />}
            <span>Cursors</span>
        </button>
    );
}

/**
 * TransientMessage - Shows temporary status messages that auto-fade
 */
function TransientMessage({ message, onFade }) {
    useEffect(() => {
        if (!message) return;
        const timeout = setTimeout(() => {
            onFade?.();
        }, 2000);
        return () => clearTimeout(timeout);
    }, [message, onFade]);

    if (!message) return null;

    return (
        <div className="status-bar__transient">
            <span>{message}</span>
        </div>
    );
}

/**
 * RecordingControls - Enhanced recording controls with pause/stop
 */
function RecordingControls({
    isRecording,
    isPaused,
    duration,
    mode,
    onPause,
    onStop,
    onClick,
}) {
    if (!isRecording) return null;

    // Format duration as mm:ss
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="status-bar__recording-controls">
            <button
                className="status-bar__recording-indicator"
                onClick={onClick}
                title="Open Recording panel"
            >
                <Icon
                    name="circle"
                    size={8}
                    className={`status-bar__recording-dot ${isPaused ? 'paused' : ''}`}
                />
                <span>{formatDuration(duration)}</span>
                {mode && <span className="status-bar__recording-mode">{mode}</span>}
            </button>
            <button
                className="status-bar__recording-btn"
                onClick={onPause}
                title={isPaused ? 'Resume' : 'Pause'}
            >
                <Icon name="pause" size={10} />
            </button>
            <button
                className="status-bar__recording-btn status-bar__recording-btn--stop"
                onClick={onStop}
                title="Stop recording"
            >
                <Icon name="square" size={10} />
            </button>
        </div>
    );
}

/**
 * MemoryUsage - Shows GPU/RAM usage with click for breakdown
 */
function MemoryUsage({ gpuUsage, ramUsage, onClick }) {
    const getUsageClass = (usage) => {
        if (usage >= 90) return 'status-bar__item--error';
        if (usage >= 70) return 'status-bar__item--warning';
        return '';
    };

    return (
        <button
            className={`status-bar__item status-bar__memory ${getUsageClass(Math.max(gpuUsage, ramUsage))}`}
            onClick={onClick}
            title="Click for memory breakdown"
        >
            <Icon name="cpu" size={10} />
            <span>{ramUsage}%</span>
        </button>
    );
}

/**
 * FPSCounter - Shows current frame rate
 */
function FPSCounter({ fps }) {
    const getFpsClass = () => {
        if (fps >= 55) return 'status-bar__item--success';
        if (fps >= 30) return 'status-bar__item--warning';
        return 'status-bar__item--error';
    };

    return (
        <div className={`status-bar__item ${getFpsClass()}`}>
            <Icon name="zap" size={10} />
            <span>{fps} FPS</span>
        </div>
    );
}

/**
 * AuthModeIndicator - Shows authentication mode (dev/prod)
 */
function AuthModeIndicator({ isDevMode, isAuthenticated, userName }) {
    if (isDevMode) {
        return (
            <div
                className="status-bar__item status-bar__item--dev-mode"
                title="Development mode - authentication bypassed"
            >
                <Icon name="shieldAlert" size={10} />
                <span>Dev Mode</span>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div
                className="status-bar__item status-bar__item--auth"
                title={userName ? `Signed in as ${userName}` : 'Authenticated'}
            >
                <Icon name="shield" size={10} />
                <span>Secure</span>
            </div>
        );
    }

    // Not authenticated and not in dev mode - shouldn't normally show
    return null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StatusBar() {
    // Auth state
    const { isDevMode, isAuthenticated, userName } = useAuth();

    // Connection state
    const [isConnected, setIsConnected] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Users state
    const [onlineCount, setOnlineCount] = useState(1);

    // Warnings state
    const [warningCount, setWarningCount] = useState(0);

    // Cursors state
    const [cursorsVisible, setCursorsVisible] = useState(true);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingMode, setRecordingMode] = useState('Workspace');

    // FPS state
    const [fps, setFps] = useState(60);

    // Memory state
    const [memoryUsage, setMemoryUsage] = useState({ gpu: 0, ram: 0 });

    // Transient message state
    const [transientMessage, setTransientMessage] = useState(null);

    // Subscribe to presence system for online user count
    useEffect(() => {
        const handlePresenceChange = (users) => {
            setOnlineCount(users.length);
        };

        const cleanup = presenceSystem.onPresenceChange(handlePresenceChange);
        return cleanup;
    }, []);

    // FPS monitoring
    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationId;

        const measureFps = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = currentTime;
            }

            animationId = requestAnimationFrame(measureFps);
        };

        animationId = requestAnimationFrame(measureFps);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, []);

    // Recording timer (pauses when isPaused)
    useEffect(() => {
        if (!isRecording || isPaused) return;

        const interval = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording, isPaused]);

    // Memory usage monitoring
    useEffect(() => {
        const updateMemory = () => {
            // Check for performance.memory (Chrome only)
            if (performance.memory) {
                const usedHeap = performance.memory.usedJSHeapSize;
                const totalHeap = performance.memory.jsHeapSizeLimit;
                const ramPercent = Math.round((usedHeap / totalHeap) * 100);
                setMemoryUsage(prev => ({ ...prev, ram: ramPercent }));
            }
        };

        updateMemory();
        const interval = setInterval(updateMemory, 5000);
        return () => clearInterval(interval);
    }, []);

    // Listen for transient status messages
    useEffect(() => {
        const handleTransient = (event) => {
            setTransientMessage(event.detail?.message || null);
        };

        window.addEventListener('status:message', handleTransient);
        return () => window.removeEventListener('status:message', handleTransient);
    }, []);

    // Listen for recording events from window (global state)
    useEffect(() => {
        const handleRecordingStart = (event) => {
            setIsRecording(true);
            setIsPaused(false);
            setRecordingDuration(0);
            setRecordingMode(event.detail?.mode || 'Workspace');
        };

        const handleRecordingStop = () => {
            setIsRecording(false);
            setIsPaused(false);
            setRecordingDuration(0);
        };

        const handleRecordingPause = () => {
            setIsPaused(true);
        };

        const handleRecordingResume = () => {
            setIsPaused(false);
        };

        window.addEventListener('recording:start', handleRecordingStart);
        window.addEventListener('recording:stop', handleRecordingStop);
        window.addEventListener('recording:pause', handleRecordingPause);
        window.addEventListener('recording:resume', handleRecordingResume);

        return () => {
            window.removeEventListener('recording:start', handleRecordingStart);
            window.removeEventListener('recording:stop', handleRecordingStop);
            window.removeEventListener('recording:pause', handleRecordingPause);
            window.removeEventListener('recording:resume', handleRecordingResume);
        };
    }, []);

    // Toggle cursors visibility
    const handleToggleCursors = useCallback(() => {
        setCursorsVisible(prev => {
            const newValue = !prev;
            // Emit event for cursor system to listen
            window.dispatchEvent(new CustomEvent('cursors:visibility', {
                detail: { visible: newValue }
            }));
            return newValue;
        });
    }, []);

    // Add handler for panel toggle
    const handleTogglePanel = () => {
        const controls = typeof getBottomPanelControls === 'function'
            ? getBottomPanelControls()
            : null;
        if (controls) {
            controls.toggle();
        }
    };

    // Add handler for clicking on warnings (opens logs filtered to warnings)
    const handleWarningsClick = () => {
        const controls = typeof getBottomPanelControls === 'function'
            ? getBottomPanelControls()
            : null;
        if (controls) {
            controls.showLogs();
        }
    };

    // Recording control handlers
    const handleRecordingPause = useCallback(() => {
        if (isPaused) {
            window.dispatchEvent(new CustomEvent('recording:resume'));
        } else {
            window.dispatchEvent(new CustomEvent('recording:pause'));
        }
    }, [isPaused]);

    const handleRecordingStop = useCallback(() => {
        // Dispatch stop with confirmation
        window.dispatchEvent(new CustomEvent('recording:stop', {
            detail: { requireConfirmation: true }
        }));
    }, []);

    const handleRecordingClick = () => {
        const controls = typeof getBottomPanelControls === 'function'
            ? getBottomPanelControls()
            : null;
        if (controls) {
            controls.showRecording?.();
        }
    };

    // Memory click handler
    const handleMemoryClick = () => {
        const controls = typeof getBottomPanelControls === 'function'
            ? getBottomPanelControls()
            : null;
        if (controls) {
            controls.showPerformance?.();
        }
    };

    // Clear transient message
    const handleTransientFade = useCallback(() => {
        setTransientMessage(null);
    }, []);

    return (
        <div className="status-bar">
            {/* Left Zone: Auth, Sync, Online, Warnings */}
            <div className="status-bar__left">
                <AuthModeIndicator
                    isDevMode={isDevMode}
                    isAuthenticated={isAuthenticated}
                    userName={userName}
                />

                <div className="status-bar__divider" />

                <SyncStatus
                    isConnected={isConnected}
                    isSyncing={isSyncing}
                />

                <div className="status-bar__divider" />

                <OnlineUsersIndicator count={onlineCount} />

                {/* Warnings indicator - clickable to open logs */}
                {warningCount > 0 && (
                    <button
                        className="status-bar__item status-bar__item--warnings"
                        onClick={handleWarningsClick}
                        title="Click to view logs"
                    >
                        <Icon name="alertTriangle" size={12} />
                        <span>{warningCount}</span>
                    </button>
                )}

                <div className="status-bar__divider" />

                <CursorsToggle
                    visible={cursorsVisible}
                    onToggle={handleToggleCursors}
                />

                <div className="status-bar__divider" />

            </div>

            {/* Center Zone: Transient messages */}
            <div className="status-bar__center">
                <TransientMessage
                    message={transientMessage}
                    onFade={handleTransientFade}
                />
            </div>

            {/* Right Zone: Recording, Memory, FPS */}
            <div className="status-bar__right">
                <RecordingControls
                    isRecording={isRecording}
                    isPaused={isPaused}
                    duration={recordingDuration}
                    mode={recordingMode}
                    onPause={handleRecordingPause}
                    onStop={handleRecordingStop}
                    onClick={handleRecordingClick}
                />

                <MemoryUsage
                    gpuUsage={memoryUsage.gpu}
                    ramUsage={memoryUsage.ram}
                    onClick={handleMemoryClick}
                />

                <div className="status-bar__divider" />

                <FPSCounter fps={fps} />

                <div className="status-bar__divider" />

                <VoiceCommandToggle size="sm" />

                {/* Panel toggle button - at the right end */}
                <button
                    className="status-bar__item status-bar__item--toggle"
                    onClick={handleTogglePanel}
                    title="Toggle output panel"
                    aria-label="Toggle output panel"
                >
                    <Icon name="chevronUp" size={14} />
                </button>
            </div>
        </div>
    );
}

export default StatusBar;