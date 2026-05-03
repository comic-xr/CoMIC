/**
 * @file LinksSection.jsx
 * @description Responsive links section for Footer2.
 *
 * Modes:
 * - Full (≥900px): All link property indicators expanded
 * - Compact (600-899px): Collapsed with colored dots
 * - Minimal (overflow): Single link icon + count → opens LinksDropdown (sync panel)
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, Tooltip, LinkBadge } from '@UI/react/components/atoms';
import { LinksDropdown } from '@UI/react/components/organisms/ViewContextBlock';
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic.js';
import { LINK_PROPERTIES, TYPE_SPECIFIC_LINK_PROPERTIES } from '../../Footer2.logic';

/**
 * Single Link Property Indicator (for full mode)
 */
const LinkPropertyIndicator = memo(function LinkPropertyIndicator({
    property,
    stats,
    onClick,
}) {
    const isLinked = stats?.count > 0;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Tooltip content={`${property.label}: ${isLinked ? `${stats.count} linked` : 'Not linked'}`}>
            <button
                className={`link-property-indicator ${isLinked ? 'link-property-indicator--active' : ''}`}
                style={{ '--link-color': property.color }}
                onClick={() => onClick(property)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Icon name={property.icon} size={14} />
                {isLinked && (
                    <span className="link-property-indicator__count">{stats.count}</span>
                )}
            </button>
        </Tooltip>
    );
});

LinkPropertyIndicator.propTypes = {
    property: PropTypes.object.isRequired,
    stats: PropTypes.object,
    onClick: PropTypes.func.isRequired,
};

/**
 * Expanded Links (Full mode)
 */
const ExpandedLinks = memo(function ExpandedLinks({
    linkStats,
    activeViewType,
    onPropertyClick,
}) {
    // Get applicable properties for this view type
    const applicableTypeSpecific = TYPE_SPECIFIC_LINK_PROPERTIES.filter(
        p => p.applicableTypes.includes(activeViewType)
    );
    const allProperties = [...LINK_PROPERTIES, ...applicableTypeSpecific]
        .sort((a, b) => a.order - b.order);

    return (
        <div className="expanded-links">
            {allProperties.map(property => (
                <LinkPropertyIndicator
                    key={property.id}
                    property={property}
                    stats={linkStats[property.id]}
                    onClick={onPropertyClick}
                />
            ))}
        </div>
    );
});

ExpandedLinks.propTypes = {
    linkStats: PropTypes.object.isRequired,
    activeViewType: PropTypes.string,
    onPropertyClick: PropTypes.func.isRequired,
};

/**
 * Collapsed Links Indicator (Compact mode - dots)
 */
const CollapsedLinksIndicator = memo(function CollapsedLinksIndicator({
    linkStats,
    mode,
    totalActiveLinks,
    onClick,
}) {
    // For compact mode: show colored dots
    // For minimal mode: just show count

    if (mode === 'minimal') {
        return (
            <button className="collapsed-links collapsed-links--minimal" onClick={onClick}>
                <Icon name="link" size={16} />
                {totalActiveLinks > 0 && (
                    <span className="collapsed-links__count">{totalActiveLinks}</span>
                )}
            </button>
        );
    }

    // Compact mode - colored dots
    const sortedProperties = [...LINK_PROPERTIES].sort((a, b) => a.order - b.order);

    return (
        <button className="collapsed-links collapsed-links--compact" onClick={onClick}>
            <Icon name="link" size={14} />
            <div className="collapsed-links__dots">
                {sortedProperties.map(property => {
                    const isLinked = linkStats[property.id]?.count > 0;
                    return (
                        <span
                            key={property.id}
                            className={`collapsed-links__dot ${isLinked ? 'collapsed-links__dot--active' : ''}`}
                            style={{ '--dot-color': property.color }}
                        />
                    );
                })}
            </div>
        </button>
    );
});

CollapsedLinksIndicator.propTypes = {
    linkStats: PropTypes.object.isRequired,
    mode: PropTypes.oneOf(['compact', 'minimal']).isRequired,
    totalActiveLinks: PropTypes.number.isRequired,
    onClick: PropTypes.func.isRequired,
};

/**
 * LinksPopover
 */
const LinksPopover = memo(function LinksPopover({
    isOpen,
    onClose,
    linkStats,
    activeViewType,
    onPropertyClick,
    onOpenLinkManager,
}) {
    if (!isOpen) return null;

    const applicableTypeSpecific = TYPE_SPECIFIC_LINK_PROPERTIES.filter(
        p => p.applicableTypes.includes(activeViewType)
    );
    const allProperties = [...LINK_PROPERTIES, ...applicableTypeSpecific]
        .sort((a, b) => a.order - b.order);

    const totalActive = Object.values(linkStats).filter(s => s?.count > 0).length;

    return (
        <>
            <div className="popover-backdrop" onClick={onClose} />
            <div className="links-popover">
                <div className="links-popover__header">
                    <Icon name="link" size={16} />
                    <span>Active Links</span>
                    <span className="links-popover__total">[{totalActive}]</span>
                </div>

                <div className="links-popover__list">
                    {allProperties.map(property => {
                        const stats = linkStats[property.id] || { count: 0 };
                        const isLinked = stats.count > 0;

                        return (
                            <button
                                key={property.id}
                                className={`links-popover__row ${isLinked ? 'links-popover__row--active' : ''}`}
                                style={{ '--link-color': property.color }}
                                onClick={() => { onPropertyClick(property); onClose(); }}
                            >
                                <span className="links-popover__row-icon">
                                    <Icon name={property.icon} size={14} />
                                    <span className="links-popover__row-count">
                                        {isLinked ? stats.count : '—'}
                                    </span>
                                </span>
                                <span className="links-popover__row-label">{property.label}</span>
                                <span className="links-popover__row-status">
                                    {isLinked ? (
                                        <>
                                            {stats.mode === 'sync' && '↔ '}
                                            {stats.mode === 'follow' && '← '}
                                            {stats.mode === 'broadcast' && '→ '}
                                            {stats.count === 1
                                                ? `${stats.mode || 'Linked'}`
                                                : `${stats.count} views`}
                                        </>
                                    ) : (
                                        'Not linked'
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="links-popover__footer">
                    <button onClick={onOpenLinkManager}>
                        <span>Open Link Manager</span>
                        <Icon name="arrowRight" size={14} />
                    </button>
                </div>
            </div>
        </>
    );
});

LinksPopover.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    linkStats: PropTypes.object.isRequired,
    activeViewType: PropTypes.string,
    onPropertyClick: PropTypes.func.isRequired,
    onOpenLinkManager: PropTypes.func.isRequired,
};

/**
 * Link Property Popover (detail view for single property)
 */
const LinkPropertyPopover = memo(function LinkPropertyPopover({
    isOpen,
    property,
    stats,
    onClose,
    onUnlinkAll,
    onAddLink,
    onOpenLinkManager,
}) {
    if (!isOpen || !property) return null;

    const isLinked = stats?.count > 0;

    return (
        <>
            <div className="popover-backdrop" onClick={onClose} />
            <div className="link-property-popover" style={{ '--link-color': property.color }}>
                <div className="link-property-popover__header">
                    <Icon name={property.icon} size={16} />
                    <span>{property.label} Link</span>
                    <button onClick={onClose}>
                        <Icon name="x" size={14} />
                    </button>
                </div>
                <div className="link-property-popover__description">
                    {property.description}
                </div>

                {isLinked ? (
                    <div className="link-property-popover__content">
                        <div className="link-property-popover__mode">
                            <Icon name={stats.mode === 'sync' ? 'sync' : stats.mode === 'follow' ? 'arrowLeft' : 'arrowRight'} size={14} />
                            <span>
                                {stats.mode === 'sync' && 'Two-way sync'}
                                {stats.mode === 'follow' && 'Following'}
                                {stats.mode === 'broadcast' && 'Broadcasting'}
                            </span>
                        </div>

                        <div className="link-property-popover__linked">
                            <div className="link-property-popover__linked-label">
                                LINKED TO ({stats.count})
                            </div>
                            <div className="link-property-popover__linked-list">
                                {stats.linkedViews?.map((viewId, i) => (
                                    <div key={viewId} className="link-property-popover__linked-item">
                                        View {i + 1}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            className="link-property-popover__unlink"
                            onClick={() => { onUnlinkAll(property.id); onClose(); }}
                        >
                            Unlink All
                        </button>
                    </div>
                ) : (
                    <div className="link-property-popover__empty">
                        <div className="link-property-popover__empty-icon">
                            <Icon name="linkOff" size={32} />
                        </div>
                        <div className="link-property-popover__empty-text">
                            No {property.label.toLowerCase()} links
                        </div>
                        <div className="link-property-popover__empty-hint">
                            Link to sync with other views
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            icon="plus"
                            onClick={() => { onAddLink(property.id); onClose(); }}
                        >
                            Add Link
                        </Button>
                    </div>
                )}

                <div className="link-property-popover__footer">
                    <button onClick={onOpenLinkManager}>
                        <Icon name="settings" size={14} />
                        <span>Advanced: Open Link Manager</span>
                        <Icon name="arrowRight" size={14} />
                    </button>
                </div>
            </div>
        </>
    );
});

LinkPropertyPopover.propTypes = {
    isOpen: PropTypes.bool,
    property: PropTypes.object,
    stats: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onUnlinkAll: PropTypes.func,
    onAddLink: PropTypes.func,
    onOpenLinkManager: PropTypes.func.isRequired,
};

/**
 * LinksSection - Main component
 *
 * In 'full' mode: shows individual link property indicators
 * In 'compact' mode: shows colored dots
 * In 'minimal' mode: shows single link icon + count, opens LinksDropdown on click
 */
const LinksSection = memo(function LinksSection({
    mode,
    linkStats,
    totalActiveLinks,
    activeViewType,
    onOpenLinkManager,
    hideLabel = false,
}) {
    const [showPopover, setShowPopover] = useState(false);
    const [showSyncPanel, setShowSyncPanel] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);

    // Get view context data for LinksDropdown (sync panel)
    const {
        activeView: contextActiveView,
        onCanvasViews,
        availableViews: contextAvailableViews,
        onSelectView: contextSelectView,
        onUpdateLink,
    } = useViewContextLogic();

    // Combine on-canvas and available views for LinksDropdown
    const allViews = useMemo(() => {
        const views = [...(onCanvasViews || [])];
        // Add available views that aren't already on canvas
        const onCanvasIds = new Set(views.map(v => v.id));
        for (const v of (contextAvailableViews || [])) {
            if (!onCanvasIds.has(v.id)) {
                views.push(v);
            }
        }
        return views;
    }, [onCanvasViews, contextAvailableViews]);

    const handlePropertyClick = useCallback((property) => {
        setSelectedProperty(property);
    }, []);

    const handleClosePropertyPopover = useCallback(() => {
        setSelectedProperty(null);
    }, []);

    const handleUnlinkAll = useCallback((propertyId) => {
        window.dispatchEvent(new CustomEvent('cia:unlink-property', {
            detail: { propertyId }
        }));
    }, []);

    const handleAddLink = useCallback((propertyId) => {
        onOpenLinkManager?.(propertyId);
    }, [onOpenLinkManager]);

    const handleMinimalClick = useCallback(() => {
        setShowSyncPanel(true);
    }, []);

    const handleCloseSyncPanel = useCallback(() => {
        setShowSyncPanel(false);
    }, []);

    return (
        <div className="links-section">
            {/* Links Label - only show if not hidden by parent zone header */}
            {mode === 'full' && !hideLabel && (
                <span className="links-section__label">Links</span>
            )}

            {mode === 'full' ? (
                <ExpandedLinks
                    linkStats={linkStats}
                    activeViewType={activeViewType}
                    onPropertyClick={handlePropertyClick}
                />
            ) : mode === 'minimal' ? (
                <CollapsedLinksIndicator
                    linkStats={linkStats}
                    mode="minimal"
                    totalActiveLinks={totalActiveLinks}
                    onClick={handleMinimalClick}
                />
            ) : (
                <CollapsedLinksIndicator
                    linkStats={linkStats}
                    mode={mode}
                    totalActiveLinks={totalActiveLinks}
                    onClick={() => setShowPopover(true)}
                />
            )}

            {/* Links Popover (for compact mode) */}
            <LinksPopover
                isOpen={showPopover}
                onClose={() => setShowPopover(false)}
                linkStats={linkStats}
                activeViewType={activeViewType}
                onPropertyClick={handlePropertyClick}
                onOpenLinkManager={onOpenLinkManager}
            />

            {/* LinksDropdown / Sync Panel (for minimal/condensed mode) */}
            {showSyncPanel && contextActiveView && (
                <LinksDropdown
                    activeView={contextActiveView}
                    allViews={allViews}
                    onUpdateLink={onUpdateLink}
                    onClose={handleCloseSyncPanel}
                    onSelectView={contextSelectView}
                />
            )}

            {/* Property Detail Popover */}
            <LinkPropertyPopover
                isOpen={!!selectedProperty}
                property={selectedProperty}
                stats={selectedProperty ? linkStats[selectedProperty.id] : null}
                onClose={handleClosePropertyPopover}
                onUnlinkAll={handleUnlinkAll}
                onAddLink={handleAddLink}
                onOpenLinkManager={onOpenLinkManager}
            />
        </div>
    );
});

LinksSection.propTypes = {
    mode: PropTypes.oneOf(['minimal', 'compact', 'full']).isRequired,
    linkStats: PropTypes.object.isRequired,
    totalActiveLinks: PropTypes.number.isRequired,
    activeViewType: PropTypes.string,
    onOpenLinkManager: PropTypes.func,
    hideLabel: PropTypes.bool,
};

export {
    LinksSection,
    ExpandedLinks,
    CollapsedLinksIndicator,
    LinksPopover,
    LinkPropertyPopover,
    LinkPropertyIndicator,
};
export default LinksSection;
