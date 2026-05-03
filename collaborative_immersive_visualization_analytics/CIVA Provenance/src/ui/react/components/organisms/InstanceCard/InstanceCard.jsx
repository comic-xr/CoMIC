/**
 * InstanceCard Component
 * Location: src/ui/react/components/common/InstanceCard/InstanceCard.jsx
 *
 * Reusable component for displaying view/instance information.
 * Used in: InstanceToolsTab, floating panels, canvas cell headers.
 *
 * Features:
 * - Multiple variants: header, compact, inline, minimal
 * - Color bar with optional gradient (left or right position)
 * - Double-click to rename
 * - Settings button that opens ViewSettingsModal
 * - Consistent styling across the app
 *
 * @module InstanceCard
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ViewSettingsModal } from '@UI/react/components/modals/ViewSettingsModal';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import {
    getViewConfigurationManager,
    getDatasetManager,
} from '@Init/appInitializer.js';
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
// Import link badges from atoms for link system integration
import {
    LinkBadge,
    ViewerBadge,
    HubBadge,
    ModeBadge,
    SyncStatusIndicator,
} from '@UI/react/components/atoms/LinkBadges';
import './InstanceCard.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VARIANTS = {
    HEADER: 'header',       // Full header with icon, name, dataset, type badge
    COMPACT: 'compact',     // Smaller, name + dataset only
    INLINE: 'inline',       // Single line, name only with color dot
    MINIMAL: 'minimal',     // Just color bar and name
};

const COLOR_POSITIONS = {
    LEFT: 'left',
    RIGHT: 'right',
};

// =============================================================================
// HELPER: Get view display info
// =============================================================================

function getViewDisplayInfo(viewId) {
    const vcm = getViewConfigurationManager?.();
    const dm = getDatasetManager?.();

    if (!vcm || !viewId) {
        return {
            name: 'No View Selected',
            dataset: null,
            type: 'vtk',
            color: '#60a5fa',
            position: null,
        };
    }

    const viewConfig = vcm.getView?.(viewId);
    if (!viewConfig) {
        return {
            name: 'Unknown View',
            dataset: null,
            type: 'vtk',
            color: '#60a5fa',
            position: null,
        };
    }

    // Get dataset info
    const dataset = viewConfig.datasetId
        ? dm?.getDataset?.(viewConfig.datasetId)
        : null;

    // Determine display name - prefer view name, fallback to dataset filename
    const isDefaultName =
        !viewConfig.name ||
        viewConfig.name === 'Untitled View' ||
        viewConfig.name === 'Default View';

    const displayName = isDefaultName
        ? dataset?.filename || viewConfig.name || 'View'
        : viewConfig.name;

    // Try to get position from active canvas to use position-based color
    let colorHex = '#60a5fa';
    let position = null;

    try {
        const activeCanvasId = canvasManager?.getActiveCanvasId?.();
        if (activeCanvasId) {
            const canvas = canvasManager?.getCanvas?.(activeCanvasId);
            if (canvas?.placements) {
                const placement = canvas.placements.find(
                    p => p.content?.viewConfigurationId === viewId
                );
                if (placement) {
                    position = { row: placement.row, col: placement.col };
                    colorHex = getCellColorHex(placement.row, placement.col);
                }
            }
        }
    } catch (e) {
        // Fall back to default color
    }

    // If no position found, fall back to workspaceManager color
    if (!position) {
        const colorObj = viewConfig.color || workspaceManager?.getViewColor?.(viewId);
        colorHex = colorObj?.hex || colorObj || '#60a5fa';
    }

    return {
        name: displayName,
        dataset: dataset?.filename || dataset?.name || null,
        type: viewConfig.handlerType || viewConfig.instanceType || 'vtk',
        color: colorHex,
        datasetId: viewConfig.datasetId,
        position,
    };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const InstanceCard = memo(function InstanceCard({
    // Core props
    viewId,
    view = null,              // Optional pre-fetched view object
    dataset = null,           // Optional pre-fetched dataset object
    color = null,             // Optional color override (uses position-based if not provided)
    position = null,          // Optional grid position { row, col } for position-based coloring

    // Display options
    variant = VARIANTS.HEADER,
    colorPosition = COLOR_POSITIONS.LEFT,
    showGradient = true,
    showIcon = true,
    showDataset = true,
    showType = true,
    showSettings = true,

    // Link system props
    linkCount = 0,            // Number of linked properties
    viewerCount = 0,          // Number of viewers
    isHub = false,            // Whether this view is the hub (source of truth)
    linkMode = null,          // Link mode: 'follow' | 'sync' | 'broadcast'
    syncStatus = null,        // Sync status: 'synced' | 'syncing' | 'error' | 'paused'
    showBadges = false,       // Whether to show link badges
    onLinkClick,              // Callback when link badge is clicked
    onLinkDragStart,          // Callback when link badge drag starts

    // Interaction callbacks
    onRename,
    onSettings,
    onClick,

    // Styling
    className = '',
}) {
    // =========================================================================
    // STATE
    // =========================================================================

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const inputRef = useRef(null);

    // =========================================================================
    // DERIVED DATA
    // =========================================================================

    const viewInfo = useMemo(() => {
        let info;

        if (view) {
            // Use provided view object
            info = {
                name: view.name || 'Untitled View',
                dataset: dataset?.filename || dataset?.name || view.datasetName || null,
                type: view.handlerType || view.instanceType || 'vtk',
                color: view.color || '#60a5fa', // Use view.color if provided
                datasetId: view.datasetId,
                position: view.position || position,
            };
        } else {
            info = getViewDisplayInfo(viewId);
        }

        // Priority for color override:
        // 1. Explicit color prop (highest priority)
        // 2. Position-based color (from position prop or info.position)
        // 3. Keep existing info.color (from view.color or getViewDisplayInfo)
        if (color) {
            info.color = color;
        } else if (position || info.position) {
            const pos = position || info.position;
            info.color = getCellColorHex(pos.row, pos.col);
        }
        // else: keep info.color as-is (from view.color or getViewDisplayInfo)

        return info;
    }, [viewId, view, dataset, refreshKey, color, position]);

    // =========================================================================
    // EVENT LISTENERS - Update on view changes
    // =========================================================================

    useEffect(() => {
        const handleViewUpdate = (e) => {
            const updatedViewId = e.detail?.viewId || e.detail?.view?.id;
            if (updatedViewId === viewId || updatedViewId === view?.id) {
                setRefreshKey(k => k + 1);
            }
        };

        window.addEventListener('cia:view-updated', handleViewUpdate);
        window.addEventListener('cia:view-renamed', handleViewUpdate);

        return () => {
            window.removeEventListener('cia:view-updated', handleViewUpdate);
            window.removeEventListener('cia:view-renamed', handleViewUpdate);
        };
    }, [viewId, view?.id]);

    // =========================================================================
    // RENAME HANDLERS
    // =========================================================================

    const handleStartEditing = useCallback(() => {
        if (!onRename) return; // Only allow editing if onRename is provided
        setEditedName(viewInfo.name);
        setIsEditing(true);
    }, [viewInfo.name, onRename]);

    const handleFinishEditing = useCallback(() => {
        const trimmedName = editedName.trim();
        if (trimmedName && trimmedName !== viewInfo.name) {
            onRename?.(viewId || view?.id, trimmedName);
        }
        setIsEditing(false);
    }, [editedName, viewInfo.name, viewId, view?.id, onRename]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleFinishEditing();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    }, [handleFinishEditing]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // =========================================================================
    // SETTINGS HANDLERS
    // =========================================================================

    const handleSettingsClick = useCallback((e) => {
        e.stopPropagation();
        if (onSettings) {
            onSettings(viewId || view?.id);
        } else {
            setShowSettingsModal(true);
        }
    }, [viewId, view?.id, onSettings]);

    const handleCloseSettings = useCallback(() => {
        setShowSettingsModal(false);
    }, []);

    // =========================================================================
    // CLICK HANDLER
    // =========================================================================

    const handleClick = useCallback((e) => {
        if (!isEditing) {
            onClick?.(viewId || view?.id);
        }
    }, [isEditing, onClick, viewId, view?.id]);

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    const renderName = () => {
        if (isEditing) {
            return (
                <input
                    ref={inputRef}
                    type="text"
                    className="instance-card__name-input"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleFinishEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }

        return (
            <span
                className={`instance-card__name ${onRename ? 'instance-card__name--editable' : ''}`}
                onDoubleClick={handleStartEditing}
                title={onRename ? 'Double-click to rename' : viewInfo.name}
            >
                {viewInfo.name}
            </span>
        );
    };

    const renderIcon = () => {
        if (!showIcon || variant === VARIANTS.MINIMAL || variant === VARIANTS.INLINE) {
            return null;
        }

        const iconName = viewInfo.type === 'image' ? 'image' : 'monitor';
        return <Icon name={iconName} size={variant === VARIANTS.COMPACT ? 12 : 14} />;
    };

    const renderDataset = () => {
        if (!showDataset || !viewInfo.dataset || variant === VARIANTS.MINIMAL || variant === VARIANTS.INLINE) {
            return null;
        }

        return (
            <span className="instance-card__dataset">
                {viewInfo.dataset}
            </span>
        );
    };

    const renderTypeBadge = () => {
        if (!showType || variant === VARIANTS.MINIMAL || variant === VARIANTS.INLINE) {
            return null;
        }

        return (
            <span className="instance-card__type">
                {(viewInfo.type || 'vtk').toUpperCase()}
            </span>
        );
    };

    const renderSettingsButton = () => {
        if (!showSettings || variant === VARIANTS.MINIMAL) {
            return null;
        }

        return (
            <button
                className="instance-card__settings-btn"
                onClick={handleSettingsClick}
                title="View settings"
            >
                <Icon name="settings" size={variant === VARIANTS.COMPACT ? 12 : 14} />
            </button>
        );
    };

    const renderColorDot = () => {
        if (variant !== VARIANTS.INLINE) {
            return null;
        }

        return (
            <span
                className="instance-card__color-dot"
                style={{ background: viewInfo.color }}
            />
        );
    };

    const renderLinkBadges = () => {
        if (!showBadges) return null;

        const hasBadges = isHub || linkMode || linkCount > 0 || viewerCount > 0 || syncStatus;
        if (!hasBadges) return null;

        return (
            <div className="instance-card__badges">
                {isHub && <HubBadge size="small" />}
                {linkMode && <ModeBadge mode={linkMode} size="small" />}
                <LinkBadge
                    count={linkCount}
                    size="small"
                    onClick={onLinkClick}
                    draggable={!!onLinkDragStart}
                    onDragStart={onLinkDragStart}
                />
                <ViewerBadge count={viewerCount} size="small" />
                {syncStatus && (
                    <SyncStatusIndicator
                        status={syncStatus}
                        size="small"
                        showLabel={false}
                    />
                )}
            </div>
        );
    };

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

    const cardClasses = [
        'instance-card',
        `instance-card--${variant}`,
        `instance-card--color-${colorPosition}`,
        showGradient && 'instance-card--gradient',
        onClick && 'instance-card--clickable',
        isHub && 'instance-card--hub',
        className,
    ].filter(Boolean).join(' ');

    return (
        <>
            <div
                className={cardClasses}
                style={{ '--instance-color': viewInfo.color }}
                onClick={handleClick}
            >
                {/* Color dot for inline variant */}
                {renderColorDot()}

                {/* Icon */}
                {renderIcon()}

                {/* Info section */}
                <div className="instance-card__info">
                    {renderName()}
                    {renderDataset()}
                </div>

                {/* Type badge */}
                {renderTypeBadge()}

                {/* Link badges */}
                {renderLinkBadges()}

                {/* Settings button */}
                {renderSettingsButton()}
            </div>

            {/* Settings Modal */}
            <ViewSettingsModal
                isOpen={showSettingsModal}
                view={view || { id: viewId, ...viewInfo }}
                dataset={dataset || { name: viewInfo.dataset, id: viewInfo.datasetId }}
                onClose={handleCloseSettings}
                onRename={(newName) => onRename?.(viewId || view?.id, newName)}
            />
        </>
    );
});

// =============================================================================
// EXPORTS
// =============================================================================

export const INSTANCE_CARD_VARIANTS = VARIANTS;
export const INSTANCE_CARD_COLOR_POSITIONS = COLOR_POSITIONS;

export default InstanceCard;
