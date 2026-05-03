// src/ui/react/components/workspace/Canvas/EdgePanels/FloatingPanel.jsx
// Floating panel overlay component
//
// Slides in from canvas edges as an overlay (not part of grid layout)
// Reuses existing panel content components

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { IconButton } from '@UI/react/components/atoms';
import './EdgePanels.scss';

/**
 * FloatingPanel - Overlay panel that slides in from edge
 *
 * Props:
 * - side: 'left' | 'right'
 * - visible: Whether panel is shown
 * - onClose: Called when panel should close
 * - onDock: Called when panel should dock
 * - title: Panel header title
 * - children: Panel content
 * - width: Panel width (default 280px)
 */
export function FloatingPanel({
    side = 'left',
    visible = false,
    onClose,
    onDock,
    title = '',
    children,
    width = 280,
    className = '',
}) {
    const panelRef = useRef(null);
    const isLeft = side === 'left';

    // Handle click outside to close
    useEffect(() => {
        if (!visible) return;

        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                // Check if click was on the edge trigger (don't close in that case)
                const trigger = e.target.closest('.edge-trigger');
                if (!trigger) {
                    onClose?.();
                }
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        // Delay adding listener to prevent immediate close
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    return (
        <div
            ref={panelRef}
            className={`floating-panel floating-panel--${side} ${className}`}
            style={{ '--panel-width': `${width}px` }}
        >
            {/* Header */}
            <div className="floating-panel__header">
                {title && <span className="floating-panel__title">{title}</span>}
                <div className="floating-panel__header-actions">
                    {onDock && (
                        <IconButton
                            icon="pinOff"
                            label="Dock"
                            size="xs"
                            onClick={onDock}
                        />
                    )}
                    <IconButton
                        icon="x"
                        label="Close"
                        size="xs"
                        onClick={onClose}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="floating-panel__content">
                {children || (
                    <div className="floating-panel__placeholder">
                        Panel content...
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(FloatingPanel);
