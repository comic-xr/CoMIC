/**
 * ViewExpandedPanel Component
 *
 * Expanded state panel for ViewItem showing full details per spec:
 * - Thumbnail and metadata
 * - Applied filters (as removable chips)
 * - Size picker (1×1, 2×1, 1×2, 2×2, Custom)
 * - Linking configuration (Camera, Filters, Widgets, Cursors)
 * - Action buttons (Go To, Tools, Duplicate, Bookmark, Share, Close, Delete)
 * - Origin tracking (if spawned from bookmark)
 *
 * @see Left_Panel_Design_Specification.md - Views Tab section
 */

import React, { memo, useState, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Chip } from '@UI/react/components/atoms/Chip';
import { Thumbnail } from '@UI/react/components/atoms/Thumbnail';
import { SizePicker } from './SizePicker';
import { LINK_PROPERTIES } from './LinkPropertyRow';
import './ViewExpandedPanel.scss';

// =============================================================================
// LINK MODE DEFINITIONS
// =============================================================================

export const LINK_MODES = {
    FOLLOW: 'follow',
    BIDIRECTIONAL: 'bidirectional',
    BROADCAST: 'broadcast',
};

const LINK_MODE_CONFIG = {
    [LINK_MODES.FOLLOW]: {
        icon: 'arrowRight',
        label: 'Follow',
        desc: 'One-way: This view follows the leader',
    },
    [LINK_MODES.BIDIRECTIONAL]: {
        icon: 'arrowLeftRight',
        label: 'Bidirectional',
        desc: 'Two-way: Changes sync both directions',
    },
    [LINK_MODES.BROADCAST]: {
        icon: 'radio',
        label: 'Broadcast',
        desc: 'One-to-many: Leader broadcasts to followers',
    },
};

// =============================================================================
// METADATA ROW COMPONENT
// =============================================================================

const MetadataRow = memo(function MetadataRow({ icon, label, value, mono = false }) {
    return (
        <div className="view-expanded__meta-row">
            <Icon name={icon} size={12} className="view-expanded__meta-icon" />
            <span className="view-expanded__meta-label">{label}</span>
            <span className={`view-expanded__meta-value ${mono ? 'view-expanded__meta-value--mono' : ''}`}>
                {value}
            </span>
        </div>
    );
});

// =============================================================================
// LINK PROPERTY TOGGLE COMPONENT
// =============================================================================

const LinkPropertyToggle = memo(function LinkPropertyToggle({
    property,
    enabled,
    targetView,
    availableViews,
    onToggle,
    onTargetChange,
}) {
    return (
        <div className={`view-expanded__link-property ${enabled ? 'view-expanded__link-property--enabled' : ''}`}>
            <button
                className={`view-expanded__link-toggle ${enabled ? 'view-expanded__link-toggle--active' : ''}`}
                onClick={onToggle}
                title={property.desc}
            >
                <Icon name={property.icon} size={12} />
            </button>
            <span className="view-expanded__link-label">{property.label}</span>
            {enabled && availableViews.length > 0 && (
                <select
                    className="view-expanded__link-target"
                    value={targetView || ''}
                    onChange={(e) => onTargetChange(e.target.value || null)}
                >
                    <option value="">Any linked view</option>
                    {availableViews.map(view => (
                        <option key={view.id} value={view.id}>{view.name}</option>
                    ))}
                </select>
            )}
        </div>
    );
});

// =============================================================================
// ACTION BUTTON COMPONENT
// =============================================================================

const ActionButton = memo(function ActionButton({ icon, label, color, variant, onClick, disabled }) {
    const colorClass = color ? `view-expanded__action--${color}` : '';
    const variantClass = variant ? `view-expanded__action--${variant}` : '';

    return (
        <button
            className={`view-expanded__action ${colorClass} ${variantClass}`}
            onClick={onClick}
            disabled={disabled}
            title={label}
        >
            <Icon name={icon} size={14} />
            <span>{label}</span>
        </button>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ViewExpandedPanel = memo(function ViewExpandedPanel({
    view,
    isVR = false,
    availableViews = [],

    // Callbacks
    onNavigate,
    onOpenTools,
    onDuplicate,
    onBookmark,
    onShare,
    onClose,
    onDelete,
    onSizeChange,
    onFilterRemove,
    onLinkPropertyChange,
    onLinkModeChange,
}) {
    const [showSizePicker, setShowSizePicker] = useState(false);

    // Get applied filters from view
    const appliedFilters = useMemo(() => {
        if (!view?.filters) return [];
        return Object.entries(view.filters)
            .filter(([_, filter]) => filter?.active)
            .map(([id, filter]) => ({
                id,
                label: filter.name || filter.type || id,
                color: filter.color,
            }));
    }, [view?.filters]);

    // Get link configuration
    const linkConfig = view?.links || {};
    const linkMode = view?.linkMode || LINK_MODES.FOLLOW;

    // Format modification time
    const modifiedTime = useMemo(() => {
        if (!view?.updatedAt) return 'Unknown';
        const date = new Date(view.updatedAt);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }, [view?.updatedAt]);

    // Format annotation count
    const annotationCount = view?.annotationCount || view?.annotations?.length || 0;

    // Check if spawned from bookmark
    const originBookmark = view?.originBookmark || view?.spawnedFromBookmark;

    const handleLinkPropertyToggle = (propertyId) => {
        const current = linkConfig[propertyId]?.enabled ?? false;
        onLinkPropertyChange?.(propertyId, {
            ...linkConfig[propertyId],
            enabled: !current
        });
    };

    const handleLinkTargetChange = (propertyId, targetId) => {
        onLinkPropertyChange?.(propertyId, {
            ...linkConfig[propertyId],
            targetViewId: targetId
        });
    };

    return (
        <div className={`view-expanded ${isVR ? 'view-expanded--vr' : ''}`}>
            {/* Top Section: Thumbnail + Metadata */}
            <div className="view-expanded__top">
                <div className="view-expanded__thumbnail">
                    <Thumbnail
                        viewId={view.id}
                        size={isVR ? 'md' : 'sm'}
                        instanceType={view.instanceType || 'vtk'}
                    />
                </div>

                <div className="view-expanded__metadata">
                    <MetadataRow
                        icon="database"
                        label="Dataset"
                        value={view.datasetName || 'Unknown'}
                    />
                    <MetadataRow
                        icon="box"
                        label="Type"
                        value={view.instanceType || view.handlerType || 'VTK'}
                    />
                    <MetadataRow
                        icon="messageCircle"
                        label="Annotations"
                        value={annotationCount}
                        mono
                    />
                    <MetadataRow
                        icon="clock"
                        label="Modified"
                        value={modifiedTime}
                    />
                </div>
            </div>

            {/* Origin Tracking (if spawned from bookmark) */}
            {originBookmark && (
                <div className="view-expanded__origin">
                    <Icon name="bookmark" size={12} />
                    <span>Spawned from:</span>
                    <span className="view-expanded__origin-name">{originBookmark.name || 'Bookmark'}</span>
                </div>
            )}

            {/* Applied Filters Section */}
            {appliedFilters.length > 0 && (
                <div className="view-expanded__section">
                    <div className="view-expanded__section-header">
                        <Icon name="filter" size={12} />
                        <span>Applied Filters</span>
                    </div>
                    <div className="view-expanded__filters">
                        {appliedFilters.map(filter => (
                            <Chip
                                key={filter.id}
                                label={filter.label}
                                color={filter.color}
                                removable
                                onRemove={() => onFilterRemove?.(filter.id)}
                                size="sm"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Size Picker Section */}
            <div className="view-expanded__section">
                <div className="view-expanded__section-header">
                    <Icon name="maximize" size={12} />
                    <span>Canvas Size</span>
                    <button
                        className="view-expanded__size-current"
                        onClick={() => setShowSizePicker(!showSizePicker)}
                    >
                        <span>{view.rowSpan || 1}×{view.colSpan || 1}</span>
                        <Icon name={showSizePicker ? 'chevronUp' : 'chevronDown'} size={10} />
                    </button>
                </div>
                {showSizePicker && (
                    <SizePicker
                        currentSize={{ rows: view.rowSpan || 1, cols: view.colSpan || 1 }}
                        onChange={(size) => {
                            onSizeChange?.(size);
                            setShowSizePicker(false);
                        }}
                        onClose={() => setShowSizePicker(false)}
                    />
                )}
            </div>

            {/* View Linking Section */}
            <div className="view-expanded__section">
                <div className="view-expanded__section-header">
                    <Icon name="link" size={12} />
                    <span>View Linking</span>
                </div>

                {/* Link Mode Selector */}
                <div className="view-expanded__link-mode">
                    {Object.entries(LINK_MODE_CONFIG).map(([mode, config]) => (
                        <button
                            key={mode}
                            className={`view-expanded__link-mode-btn ${linkMode === mode ? 'view-expanded__link-mode-btn--active' : ''}`}
                            onClick={() => onLinkModeChange?.(mode)}
                            title={config.desc}
                        >
                            <Icon name={config.icon} size={12} />
                            <span>{config.label}</span>
                        </button>
                    ))}
                </div>

                {/* Link Properties */}
                <div className="view-expanded__link-properties">
                    {LINK_PROPERTIES.slice(0, 4).map(property => (
                        <LinkPropertyToggle
                            key={property.id}
                            property={property}
                            enabled={linkConfig[property.id]?.enabled}
                            targetView={linkConfig[property.id]?.targetViewId}
                            availableViews={availableViews}
                            onToggle={() => handleLinkPropertyToggle(property.id)}
                            onTargetChange={(targetId) => handleLinkTargetChange(property.id, targetId)}
                        />
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="view-expanded__actions">
                <ActionButton icon="navigation" label="Go To" onClick={onNavigate} />
                <ActionButton icon="wrench" label="Tools" onClick={onOpenTools} />
                <ActionButton icon="copy" label="Duplicate" onClick={onDuplicate} />
                <ActionButton icon="bookmark" label="Bookmark" onClick={onBookmark} />
                <ActionButton icon="share" label="Share" color="blue" onClick={onShare} />
                <div className="view-expanded__actions-divider" />
                <ActionButton icon="x" label="Close" color="gray" onClick={onClose} />
                <ActionButton icon="trash" label="Delete" color="danger" variant="danger" onClick={onDelete} />
            </div>
        </div>
    );
});

export default ViewExpandedPanel;
