/**
 * ViewCard Component System
 *
 * Unified component for displaying view references throughout CIA Web.
 * Supports multiple variants for different contexts while maintaining
 * consistent visual language and interaction patterns.
 *
 * Uses existing atoms: ColorDot, StatusDot, Badge from atoms folder.
 *
 * Variants:
 * - full: Canvas viewport with 3D content area
 * - compact: Left panel list item with expandable details
 * - mini: Topology diagrams in link panels
 * - chip: Inline references in flowing text
 * - dot: Minimal colored indicator with tooltip
 *
 * @module ViewCard
 */

import React, { useState, forwardRef, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import { StatusDot } from '@UI/react/components/atoms/StatusDot';
import { Badge } from '@UI/react/components/atoms/Badge';
// Import link badges from atoms
import {
    LinkBadge,
    ViewerBadge,
    HubBadge,
    ModeBadge,
    SyncStatusIndicator,
} from '@UI/react/components/atoms/LinkBadges';
import './ViewCard.scss';

// Re-export link badges for convenience
export { LinkBadge, ViewerBadge, HubBadge, ModeBadge, SyncStatusIndicator };

// =============================================================================
// LINK MODE CONFIGURATION
// =============================================================================

export const LINK_MODES = {
    follow: { icon: '←', label: 'Following', color: 'var(--color-accent-cyan)' },
    sync: { icon: '↔', label: 'Synced', color: 'var(--color-accent-teal)' },
    bidirectional: { icon: '↔', label: 'Synced', color: 'var(--color-accent-teal)' },
    broadcast: { icon: '→', label: 'Broadcasting', color: 'var(--color-accent-purple)' },
};

// =============================================================================
// VIEW CARD - DOT VARIANT
// =============================================================================

export const ViewCardDot = memo(forwardRef(function ViewCardDot({
    view,
    isHub = false,
    onClick,
    size = 8,
}, ref) {
    return (
        <button
            ref={ref}
            className="view-card view-card--dot"
            onClick={onClick}
            title={view.name}
        >
            <ColorDot
                color={view.color}
                size={size}
                ring={isHub}
                ringColor="var(--color-accent-amber)"
            />
        </button>
    );
}));

// =============================================================================
// VIEW CARD - CHIP VARIANT
// =============================================================================

export const ViewCardChip = memo(forwardRef(function ViewCardChip({
    view,
    isHub = false,
    mode,
    onClick,
    onRemove,
    interactive = true,
}, ref) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <span
            ref={ref}
            className={`view-card view-card--chip ${interactive ? 'view-card--interactive' : ''} ${isHovered ? 'view-card--hovered' : ''}`}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHub && <Icon name="star" size={10} className="view-card__hub-star" />}
            <ColorDot color={view.color} size={6} />
            <span className="view-card__chip-name">{view.name}</span>
            {mode && <ModeBadge mode={mode} />}
            {onRemove && isHovered && (
                <button
                    className="view-card__chip-remove"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                    <Icon name="close" size={10} />
                </button>
            )}
        </span>
    );
}));

// =============================================================================
// VIEW CARD - MINI VARIANT
// =============================================================================

export const ViewCardMini = memo(forwardRef(function ViewCardMini({
    view,
    isHub = false,
    isCurrentUser = false,
    mode,
    ownerName,
    onClick,
    onRemove,
    showMode = true,
    showOwner = true,
}, ref) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            ref={ref}
            className={`view-card view-card--mini ${isHub ? 'view-card--hub' : ''} ${isCurrentUser ? 'view-card--current-user' : ''} ${isHovered ? 'view-card--hovered' : ''}`}
            style={{ '--view-color': view.color }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHub && <Icon name="star" size={10} className="view-card__hub-star" />}
            <ColorDot color={view.color} size={8} />

            <div className="view-card__mini-info">
                <div className="view-card__mini-name">
                    {view.name}
                    {isCurrentUser && <span className="view-card__you-label">(you)</span>}
                </div>
                {showOwner && ownerName && (
                    <div className="view-card__mini-owner">{ownerName}</div>
                )}
            </div>

            {showMode && mode && <ModeBadge mode={mode} />}

            {onRemove && isHovered && (
                <button
                    className="view-card__mini-remove"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                    <Icon name="close" size={12} />
                </button>
            )}
        </div>
    );
}));

// =============================================================================
// VIEW CARD - COMPACT VARIANT
// =============================================================================

export const ViewCardCompact = memo(forwardRef(function ViewCardCompact({
    view,
    isActive = false,
    isExpanded = false,
    isStarred = false,
    isOnCanvas = false,
    linkCount = 0,
    viewerCount = 0,
    isHub = false,
    onClick,
    onDoubleClick,
    onToggleExpand,
    onStar,
    onDuplicate,
    onSettings,
    onTrash,
    onLinkClick,
    onSpawnToCanvas,
    draggable = true,
    onDragStart,
    onDragEnd,
    children,
}, ref) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            ref={ref}
            className={`view-card view-card--compact ${isActive ? 'view-card--active' : ''} ${isExpanded ? 'view-card--expanded' : ''} ${isHovered ? 'view-card--hovered' : ''}`}
            style={{ '--view-color': view.color }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {/* Main Row */}
            <div className="view-card__compact-main">
                {/* Drag Handle */}
                {draggable && (
                    <div className={`view-card__drag-handle ${isHovered ? 'view-card__drag-handle--visible' : ''}`}>
                        <Icon name="gripVertical" size={12} />
                    </div>
                )}

                {/* Color Dot */}
                <ColorDot color={view.color} size={10} glow={isActive} />

                {/* Name & Dataset */}
                <div className="view-card__compact-info">
                    <div className="view-card__compact-name-row">
                        <span className="view-card__compact-name">{view.name}</span>
                        {isHub && <HubBadge />}
                    </div>
                    <div className="view-card__compact-meta">
                        {view.datasetName}
                        {view.ownerName && view.ownerName !== 'You' && (
                            <>
                                <span className="view-card__meta-sep">•</span>
                                <span>{view.ownerName}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Badges */}
                <div className="view-card__compact-badges">
                    <LinkBadge
                        count={linkCount}
                        onClick={(e) => { e.stopPropagation(); onLinkClick?.(); }}
                        draggable
                        onDragStart={onDragStart}
                    />
                    <ViewerBadge count={viewerCount} />
                </div>

                {/* Quick Actions */}
                <div className={`view-card__compact-actions ${isHovered ? 'view-card__compact-actions--visible' : ''}`}>
                    <button
                        className={`view-card__action-btn ${isStarred ? 'view-card__action-btn--active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onStar?.(); }}
                        title={isStarred ? 'Unstar' : 'Star'}
                    >
                        <Icon name={isStarred ? 'star' : 'starOutline'} size={14} />
                    </button>
                    {!isOnCanvas && (
                        <button
                            className="view-card__action-btn"
                            onClick={(e) => { e.stopPropagation(); onSpawnToCanvas?.(); }}
                            title="Spawn to Canvas"
                        >
                            <Icon name="externalLink" size={14} />
                        </button>
                    )}
                    <button
                        className="view-card__action-btn"
                        onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                        title="More"
                    >
                        <Icon name="moreVertical" size={14} />
                    </button>
                </div>

                {/* Expand Chevron */}
                {onToggleExpand && (
                    <button
                        className={`view-card__expand-btn ${isExpanded ? 'view-card__expand-btn--expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                    >
                        <Icon name="chevronDown" size={14} />
                    </button>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="view-card__compact-expanded">
                    {children || (
                        <div className="view-card__expanded-actions">
                            <button className="view-card__expanded-btn" onClick={onDuplicate}>
                                <Icon name="copy" size={14} /> Duplicate
                            </button>
                            <button className="view-card__expanded-btn" onClick={onSettings}>
                                <Icon name="settings" size={14} /> Settings
                            </button>
                            <div style={{ flex: 1 }} />
                            <button className="view-card__expanded-btn view-card__expanded-btn--danger" onClick={onTrash}>
                                <Icon name="delete" size={14} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}));

// =============================================================================
// VIEW CARD - FULL VARIANT (Canvas Viewport)
// =============================================================================

export const ViewCardFull = memo(forwardRef(function ViewCardFull({
    view,
    isActive = false,
    isCompact = false,
    linkCount = 0,
    viewerCount = 0,
    isHub = false,
    syncStatus,
    onClick,
    onDoubleClick,
    onClose,
    onFocus,
    onMore,
    onLinkClick,
    onLinkDragStart,
    children,
}, ref) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            ref={ref}
            className={`view-card view-card--full ${isActive ? 'view-card--active' : ''} ${isCompact ? 'view-card--compact-mode' : ''} ${isHovered ? 'view-card--hovered' : ''}`}
            style={{ '--view-color': view.color }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="view-card__full-header">
                <ColorDot color={view.color} size={isCompact ? 6 : 8} />
                <span className="view-card__full-name">{view.name}</span>

                {/* Badges */}
                {!isCompact && (
                    <div className="view-card__full-badges">
                        <LinkBadge
                            count={linkCount}
                            onClick={(e) => { e.stopPropagation(); onLinkClick?.(); }}
                            draggable
                            onDragStart={onLinkDragStart}
                        />
                        <ViewerBadge count={viewerCount} />
                    </div>
                )}

                {/* Actions */}
                <div className={`view-card__full-actions ${isCompact && !isHovered ? 'view-card__full-actions--hidden' : ''}`}>
                    {!isCompact && (
                        <button className="view-card__action-btn" onClick={(e) => { e.stopPropagation(); onMore?.(); }} title="More">
                            <Icon name="moreHorizontal" size={14} />
                        </button>
                    )}
                    <button className="view-card__action-btn" onClick={(e) => { e.stopPropagation(); onFocus?.(); }} title="Focus">
                        <Icon name="focus" size={14} />
                    </button>
                    <button className="view-card__action-btn" onClick={(e) => { e.stopPropagation(); onClose?.(); }} title="Close">
                        <Icon name="close" size={14} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="view-card__full-content">
                {children || (
                    <Icon name="grid" size={48} className="view-card__placeholder-icon" />
                )}

                {/* Hub indicator */}
                {isHub && (
                    <div className="view-card__full-hub-indicator">
                        <HubBadge />
                    </div>
                )}

                {/* Sync status indicator */}
                {syncStatus && (
                    <div className={`view-card__sync-status view-card__sync-status--${syncStatus}`}>
                        <StatusDot status={syncStatus === 'synced' ? 'active' : 'syncing'} />
                        {syncStatus === 'synced' ? 'Synced' : 'Syncing...'}
                    </div>
                )}
            </div>
        </div>
    );
}));

// =============================================================================
// UNIFIED VIEW CARD COMPONENT
// =============================================================================

const ViewCard = memo(forwardRef(function ViewCard({ variant = 'compact', ...props }, ref) {
    switch (variant) {
        case 'dot':
            return <ViewCardDot ref={ref} {...props} />;
        case 'chip':
            return <ViewCardChip ref={ref} {...props} />;
        case 'mini':
            return <ViewCardMini ref={ref} {...props} />;
        case 'compact':
            return <ViewCardCompact ref={ref} {...props} />;
        case 'full':
            return <ViewCardFull ref={ref} {...props} />;
        default:
            return <ViewCardCompact ref={ref} {...props} />;
    }
}));

export default ViewCard;
