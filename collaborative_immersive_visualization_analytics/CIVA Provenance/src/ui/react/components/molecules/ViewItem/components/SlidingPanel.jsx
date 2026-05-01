/**
 * SlidingPanel Component
 * Location: src/ui/react/components/common/ViewItem/components/SlidingPanel.jsx
 *
 * Slides down from beneath the ViewItem row on hover.
 * Contains quick toggles and a size picker button.
 *
 * Features:
 * - Tooltip area showing action descriptions
 * - Grouped action buttons (Stars, State, Share, Duplicate/Link)
 * - Size picker button that opens a popover
 * - Lock toggle
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import './SlidingPanel.scss';

// =============================================================================
// PANEL BUTTON COMPONENT
// =============================================================================

function PanelButton({ icon, active, color, badge, onClick, onHover, onLeave }) {
    const activeClass = active ? `sliding-panel__btn--active sliding-panel__btn--${color}` : '';

    return (
        <button
            className={`sliding-panel__btn ${activeClass}`}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <Icon name={icon} size={12} />
            {badge && <span className="sliding-panel__btn-badge">{badge}</span>}
        </button>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SlidingPanel({
    view,
    isOpen,
    availableViews = [],
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onShare,
    onDuplicate,
    onLock,
    onSizeChange,
    onLinkPropertyChange,
}) {
    const [tooltipText, setTooltipText] = useState(null);
    const [showSizeMenu, setShowSizeMenu] = useState(false);
    const [sizeMenuPos, setSizeMenuPos] = useState({ x: 0, y: 0 });
    const sizeButtonRef = useRef(null);

    // Handle size button click
    const handleSizeClick = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // Position menu below button, constrain to viewport
        const x = Math.min(rect.left, window.innerWidth - 160);
        const y = rect.bottom + 4;
        setSizeMenuPos({ x, y });
        setShowSizeMenu(true);
    };

    // Handle size selection
    const handleSizeSelect = (rows, cols) => {
        onSizeChange?.({ rows, cols });
        setShowSizeMenu(false);
    };

    // Close size menu when panel closes
    useEffect(() => {
        if (!isOpen) {
            setShowSizeMenu(false);
            setTooltipText(null);
        }
    }, [isOpen]);

    // Close size menu on outside click
    useEffect(() => {
        if (!showSizeMenu) return;

        const handleClick = () => setShowSizeMenu(false);
        const handleEscape = (e) => {
            if (e.key === 'Escape') setShowSizeMenu(false);
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showSizeMenu]);

    return (
        <div className={`sliding-panel ${isOpen ? 'sliding-panel--open' : ''}`}>
            {/* Tooltip Area */}
            <div className={`sliding-panel__tooltip ${tooltipText ? 'sliding-panel__tooltip--active' : ''}`}>
                {tooltipText || 'Hover actions for details'}
            </div>

            {/* Action Groups */}
            <div className="sliding-panel__actions">
                {/* Stars + State Group */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon="folder"
                        active={view?.starredWorkspace}
                        color="purple"
                        onClick={onStarWorkspace}
                        onHover={() => setTooltipText('Save to Workspace')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon="globe"
                        active={view?.starredPersonal}
                        color="amber"
                        onClick={onStarPersonal}
                        onHover={() => setTooltipText('Save to Personal')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon="save"
                        active={view?.hasSavedState}
                        color="amber"
                        onClick={onSaveState}
                        onHover={() => setTooltipText('Save State')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* Share + Link Group */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon="users"
                        active={view?.isShared}
                        color="pink"
                        onClick={onShare}
                        onHover={() => setTooltipText('Share')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon="link"
                        active={view?.linkedCount > 0}
                        color="teal"
                        badge={view?.linkedCount > 0 ? view.linkedCount : null}
                        onHover={() => setTooltipText('Links')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon="unlock"
                        active={view?.isLocked}
                        color="amber"
                        onClick={onLock}
                        onHover={() => setTooltipText(view?.isLocked ? 'Unlock' : 'Lock')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* Spacer */}
                <div className="sliding-panel__spacer" />

                {/* Size Button */}
                <button
                    ref={sizeButtonRef}
                    className="sliding-panel__size-btn"
                    onClick={handleSizeClick}
                    onMouseEnter={() => setTooltipText('Canvas Size')}
                    onMouseLeave={() => setTooltipText(null)}
                >
                    <Icon name="maximize" size={10} />
                    <span>{view?.rowSpan || 1}×{view?.colSpan || 1}</span>
                    <Icon name="chevronDown" size={8} />
                </button>
            </div>

            {/* Size Menu Popover */}
            {showSizeMenu && createPortal(
                <>
                    <div
                        className="sliding-panel__size-backdrop"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSizeMenu(false);
                        }}
                    />
                    <div
                        className="sliding-panel__size-menu"
                        style={{
                            left: sizeMenuPos.x,
                            top: sizeMenuPos.y,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sliding-panel__size-menu-title">Canvas Size</div>
                        <div className="sliding-panel__size-grid">
                            {[1, 2, 3].map(row =>
                                [1, 2, 3].map(col => (
                                    <button
                                        key={`${row}x${col}`}
                                        className={`sliding-panel__size-option ${row === (view?.rowSpan || 1) && col === (view?.colSpan || 1)
                                                ? 'sliding-panel__size-option--active'
                                                : ''
                                            }`}
                                        onClick={() => handleSizeSelect(row, col)}
                                    >
                                        {row}×{col}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

export default SlidingPanel;