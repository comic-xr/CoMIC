// src/ui/react/components/workspace/ViewHeader/ViewHeader.jsx
// Unified header component for view cells - works in both active and cold states
//
// REPLACES:
// - InstanceViewport/InstanceHeader/InstanceHeader.jsx (active/hot views)
// - CanvasCell/CanvasCellHeader.jsx (cold/thumbnail views)
//
// ARCHITECTURE:
// - Single component with variant prop: 'active' | 'cold'
// - Both variants have same buttons: More menu, VR, Focus, Close
// - Cold variant just triggers activation on interaction
// - Consistent styling via single SCSS file

import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms';
import { MenuItem } from '@UI/react/components/molecules';
import { VRExploreButton } from '@UI/react/components/molecules/VRExploreButton';
import { hexToRgbString } from '@UI/react/utils/canvasColors.js';

import './ViewHeader.scss';

// Re-export for backwards compatibility (used by InstanceViewport)
export { hexToRgbString as hexToRgb };

// ============================================================================
// LIVE INDICATOR (for active views with collaborators)
// ============================================================================

function LiveIndicatorCompact({ count }) {
    if (!count) return null;
    return (
        <div className="view-header__live-indicator" title={`${count} collaborator${count > 1 ? 's' : ''} viewing`}>
            <div className="view-header__live-dot" />
            <span className="view-header__live-count">{count}</span>
        </div>
    );
}

// ============================================================================
// MORE MENU COMPONENT
// ============================================================================

/**
 * ViewHeaderMenu - Dropdown menu with view actions
 * Shows different options based on variant (active vs cold)
 */
function ViewHeaderMenu({
    isOpen,
    onCloseMenu,
    variant,
    // Active view actions
    onOpenInstanceTools,
    onFullscreen,
    onVRMode,
    onResetCamera,
    onFitView,
    // Shared actions
    onDuplicate,
    onAddToSubset,
    onShare,
    onCloseView,
    onRemove,
    onDelete,
    onOpenInIsolation,
    triggerRef,
    isFullscreen = false,
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, right: 0 });

    // Position menu relative to trigger button
    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, triggerRef]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                onCloseMenu();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onCloseMenu();
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onCloseMenu, triggerRef]);

    if (!isOpen) return null;

    const handleItemClick = (action) => {
        action?.();
        onCloseMenu();
    };

    const isActive = variant === 'active';

    const menuContent = (
        <div
            className={`view-header__menu ${isFullscreen ? 'view-header__menu--inline' : ''}`}
            ref={menuRef}
            style={isFullscreen ? {} : { top: position.top, right: position.right }}
        >
            {/* Tools section - active views only */}
            {isActive && (
                <>
                    <div className="view-header__menu-section">Tools</div>
                    <MenuItem
                        icon="wrench"
                        label="Instance Tools Panel"
                        shortcut="T"
                        onClick={() => handleItemClick(onOpenInstanceTools)}
                    />
                    <MenuItem
                        icon="maximize"
                        label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        onClick={() => handleItemClick(onFullscreen)}
                    />
                    <MenuItem
                        icon="vrHeadset"
                        label="Enter VR/AR Mode"
                        onClick={() => handleItemClick(onVRMode)}
                    />
                    <div className="view-header__menu-divider" />

                    <div className="view-header__menu-section">Navigation</div>
                    <MenuItem
                        icon="rotateCcw"
                        label="Reset Camera"
                        onClick={() => handleItemClick(onResetCamera)}
                    />
                    <MenuItem
                        icon="scan"
                        label="Fit to View"
                        onClick={() => handleItemClick(onFitView)}
                    />
                    <div className="view-header__menu-divider" />
                </>
            )}

            {/* View section - both variants */}
            <div className="view-header__menu-section">View</div>

            {onOpenInIsolation && (
                <MenuItem
                    icon="maximize"
                    label="Open in Focus"
                    onClick={() => handleItemClick(onOpenInIsolation)}
                />
            )}
            {onDuplicate && (
                <MenuItem
                    icon="copy"
                    label="Duplicate View"
                    onClick={() => handleItemClick(onDuplicate)}
                />
            )}
            {isActive && (
                <MenuItem
                    icon="layers"
                    label="Add to Subset"
                    onClick={() => {
                        if (onAddToSubset) {
                            handleItemClick(onAddToSubset);
                        } else {
                            // Dispatch global event for CanvasWorkspace to handle
                            window.dispatchEvent(new CustomEvent('cia:add-to-subset-request', {
                                detail: { viewId: displayName }
                            }));
                            handleItemClick(() => {});
                        }
                    }}
                />
            )}
            {isActive && onShare && (
                <MenuItem
                    icon="share2"
                    label="Share View"
                    onClick={() => handleItemClick(onShare)}
                />
            )}

            <div className="view-header__menu-divider" />

            {/* Close/Remove actions */}
            {onRemove && (
                <MenuItem
                    icon="close"
                    label="Remove from Canvas"
                    onClick={() => handleItemClick(onRemove)}
                />
            )}
            {onCloseView && (
                <MenuItem
                    icon="close"
                    label="Close View"
                    onClick={() => handleItemClick(onCloseView)}
                />
            )}
            {onDelete && (
                <MenuItem
                    icon="delete"
                    label="Delete View"
                    danger
                    onClick={() => handleItemClick(onDelete)}
                />
            )}
        </div>
    );

    if (isFullscreen) {
        return menuContent;
    }

    return createPortal(menuContent, document.body);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ViewHeader - Unified header for view cells
 *
 * @param {Object} props
 * @param {'active'|'cold'} props.variant - 'active' for mounted views, 'cold' for thumbnails
 * @param {'full'|'compact'|'thumbnail'|'snapshot'} props.renderMode - Size-based render mode
 * @param {string} props.displayName - View display name
 * @param {Object} props.color - Color object with { hex, name }
 * @param {Object} props.fileTypeInfo - File type display info with { icon }
 * @param {boolean} props.isActive - Whether this view is currently focused/selected
 * @param {boolean} props.isLoading - Whether the view is loading
 * @param {boolean} props.isInFocusMode - Whether in focus mode (hides focus button)
 * @param {Array} props.collaborators - Array of collaborators viewing this instance
 * @param {function} props.onActivate - Called when cold view should be activated
 * @param {function} props.onFocus - Called to enter focus mode
 * @param {function} props.onClose - Called to close the view
 * @param {function} props.onRemove - Called to remove from canvas (keeps view config)
 * @param {function} props.onDelete - Called to delete the view
 * ... other menu action callbacks
 */
export const ViewHeader = memo(function ViewHeader({
    // Core props
    variant = 'active',
    renderMode = 'full',
    displayName = 'Untitled View',
    color,
    fileTypeInfo,
    isActive = false,
    isLoading = false,
    isInFocusMode = false,
    isFullscreen = false,
    collaborators = [],

    // Activation (cold views)
    onActivate,

    // Focus mode
    onFocus,

    // Close/Remove/Delete
    onClose,
    onRemove,
    onDelete,

    // Menu actions (active views)
    onOpenInstanceTools,
    onFullscreen,
    onVRMode,
    onResetCamera,
    onFitView,
    onDuplicate,
    onAddToSubset,
    onShare,
    onOpenInIsolation,

    // VR Exploration props (optional - enables VRExploreButton)
    instanceId,
    dataset,
    viewConfig,
    projectId,
    selection,
    activeSessions = [],

    // Hover callbacks
    onShowToolbar,
    onHideToolbar,
}) {
    const [showMenu, setShowMenu] = useState(false);
    const menuButtonRef = useRef(null);

    // Color handling
    const colorHex = color?.hex || '#60a5fa';
    const colorRgb = hexToRgbString(colorHex);

    // Icon from file type
    const typeIconName = fileTypeInfo?.icon || 'box';

    // Render mode flags
    const isCompact = renderMode === 'compact' || renderMode === 'thumbnail';
    const isMinimal = renderMode === 'thumbnail';
    const isSnapshot = renderMode === 'snapshot';

    // Icon sizes based on render mode
    const iconSize = isMinimal ? 10 : (isCompact ? 11 : 12);
    const buttonSize = isMinimal ? 16 : (isCompact ? 18 : 20);

    const isCold = variant === 'cold';

    // Handle header click for cold views (to activate)
    const handleHeaderClick = useCallback((e) => {
        if (isCold && onActivate) {
            if (e.target.closest('button')) return;
            onActivate();
        }
    }, [isCold, onActivate]);

    // Don't render header in snapshot mode
    if (isSnapshot) return null;

    return (
        <div
            className={`view-header view-header--${variant} view-header--${renderMode} ${isActive ? 'view-header--active' : ''}`}
            style={{
                '--view-color': colorHex,
                '--view-color-rgb': colorRgb,
            }}
            onClick={handleHeaderClick}
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
            {/* Left section */}
            <div className="view-header__left">
                {/* Live indicator for collaborators */}
                {collaborators.length > 0 && !isMinimal && (
                    <LiveIndicatorCompact count={collaborators.length} />
                )}

                {/* Label */}
                <div className="view-header__label">
                    {/* Loading spinner - shows during loading instead of color dot */}
                    {isLoading ? (
                        <span className="view-header__loader" />
                    ) : (
                        <span className="view-header__label-dot" />
                    )}
                    <span className="view-header__label-text">
                        {isLoading ? 'Loading...' : displayName}
                    </span>
                    {!isMinimal && !isLoading && (
                        <span className="view-header__label-icon">
                            <Icon name={typeIconName} size={iconSize} />
                        </span>
                    )}
                </div>
            </div>

            {/* Right Controls - same for both active and cold variants */}
            <div className="view-header__controls">
                {/* More Menu Button */}
                {!isMinimal && (
                    <div className="view-header__menu-wrapper" ref={menuButtonRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isCold) onActivate?.();
                                setShowMenu(!showMenu);
                            }}
                            className={`view-header__button ${showMenu ? 'active' : ''}`}
                            title="More options"
                            style={{ width: buttonSize, height: buttonSize }}
                        >
                            <Icon name="moreHorizontal" size={iconSize} />
                        </button>
                        <ViewHeaderMenu
                            isOpen={showMenu}
                            onCloseMenu={() => setShowMenu(false)}
                            variant={variant}
                            onOpenInstanceTools={onOpenInstanceTools}
                            onFullscreen={onFullscreen}
                            onVRMode={onVRMode}
                            onResetCamera={onResetCamera}
                            onFitView={onFitView}
                            onDuplicate={onDuplicate}
                            onAddToSubset={onAddToSubset}
                            onShare={onShare}
                            onCloseView={onClose}
                            onRemove={onRemove}
                            onDelete={onDelete}
                            onOpenInIsolation={onOpenInIsolation}
                            triggerRef={menuButtonRef}
                            isFullscreen={isFullscreen}
                        />
                    </div>
                )}

                {/* VR Exploration button - use VRExploreButton when dataset available */}
                {!isMinimal && dataset && (
                    <VRExploreButton
                        instanceId={instanceId}
                        dataset={dataset}
                        viewConfig={viewConfig}
                        projectId={projectId}
                        selection={selection}
                        activeSessions={activeSessions}
                        size="sm"
                        variant="minimal"
                        className="view-header__vr-button"
                    />
                )}
                {/* Fallback VR/AR button when no dataset (legacy behavior) */}
                {!isMinimal && !dataset && onVRMode && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isCold) onActivate?.();
                            onVRMode();
                        }}
                        className="view-header__button"
                        title="Enter VR/AR Mode"
                        style={{ width: buttonSize, height: buttonSize }}
                    >
                        <Icon name="vrHeadset" size={iconSize} />
                    </button>
                )}

                {/* Focus button (not shown in focus mode) */}
                {!isInFocusMode && (onFocus || onOpenInIsolation) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isCold) onActivate?.();
                            (onFocus || onOpenInIsolation)?.();
                        }}
                        className="view-header__button"
                        title="Focus Mode (F)"
                        style={{ width: buttonSize, height: buttonSize }}
                    >
                        <Icon name="focus" size={iconSize} />
                    </button>
                )}

                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        (onClose || onRemove)?.();
                    }}
                    className="view-header__button view-header__button--danger"
                    title={isCold ? "Remove from canvas" : "Close"}
                    style={{ width: buttonSize, height: buttonSize }}
                >
                    <Icon name="close" size={iconSize} />
                </button>
            </div>
        </div>
    );
});

export default ViewHeader;
