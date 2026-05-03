// src/ui/react/components/workspace/Canvas/ConnectionOverlay/ConnectionOverlay.jsx
// Overlay shown when canvas is disconnected from server
//
// Features:
// - Semi-transparent overlay
// - Connection status message
// - Reconnecting animation
// - VR-compatible design

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './ConnectionOverlay.scss';

/**
 * ConnectionOverlay - Shows when canvas is disconnected from server
 */
export function ConnectionOverlay({
    connectionState,
    error,
    onRetry,
}) {
    if (connectionState === 'connected') return null;

    const isReconnecting = connectionState === 'reconnecting';

    return (
        <div className="connection-overlay">
            <div className="connection-overlay__content">
                <div className={`connection-overlay__icon ${isReconnecting ? 'connection-overlay__icon--reconnecting' : ''}`}>
                    {isReconnecting ? (
                        <Icon name="refresh" size={32} />
                    ) : (
                        <Icon name="wifiOff" size={32} />
                    )}
                </div>

                <h3 className="connection-overlay__title">
                    {isReconnecting ? 'Reconnecting...' : 'Connection Lost'}
                </h3>

                <p className="connection-overlay__message">
                    {isReconnecting
                        ? 'Attempting to reconnect to the server'
                        : 'Waiting for connection to be restored'}
                </p>

                {error && (
                    <div className="connection-overlay__error">
                        <Icon name="alertCircle" size={14} />
                        <span>{error.message || 'Network error'}</span>
                    </div>
                )}

                {!isReconnecting && onRetry && (
                    <button
                        className="connection-overlay__retry-btn"
                        onClick={onRetry}
                    >
                        <Icon name="refresh" size={14} />
                        Try Again
                    </button>
                )}

                <div className="connection-overlay__hint">
                    Canvas is read-only while disconnected
                </div>
            </div>
        </div>
    );
}

export default ConnectionOverlay;