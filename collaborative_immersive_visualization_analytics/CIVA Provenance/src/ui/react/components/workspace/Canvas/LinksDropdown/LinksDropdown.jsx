// src/ui/react/components/workspace/Canvas/LinksDropdown/LinksDropdown.jsx
// Links dropdown for managing view-to-view links
//
// Based on canvas-chrome-v12.jsx LinksDropdown spec
// Manages: Camera, Filters, Selection, Annotations, Transforms, Parameters links

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import './LinksDropdown.scss';

// =============================================================================
// LINK TYPES
// =============================================================================

export const LINK_TYPES = [
    { id: 'camera', icon: 'video', label: 'Camera', color: 'teal' },
    { id: 'filters', icon: 'filter', label: 'Filters', color: 'amber' },
    { id: 'selection', icon: 'crosshair', label: 'Selection', color: 'purple' },
    { id: 'annotations', icon: 'edit', label: 'Annotations', color: 'pink' },
    { id: 'transforms', icon: 'move', label: 'Transforms', color: 'cyan' },
    { id: 'params', icon: 'sliders', label: 'Parameters', color: 'orange' },
];

export const LINK_DIRECTIONS = [
    { id: 'bidirectional', label: '↔', title: 'Bidirectional' },
    { id: 'push', label: '→', title: 'Push (parent)' },
    { id: 'receive', label: '←', title: 'Receive (child)' },
];

// =============================================================================
// LINK TYPE ROW
// =============================================================================

const LinkTypeRow = memo(function LinkTypeRow({
    linkType,
    link,
    targetView,
    isExpanded,
    onToggleExpand,
    otherViews,
    onUpdateLink,
}) {
    const hasLink = !!targetView;

    return (
        <div className="links-dropdown__link-type">
            <button
                type="button"
                className={`links-dropdown__link-header ${isExpanded ? 'links-dropdown__link-header--expanded' : ''}`}
                onClick={onToggleExpand}
            >
                <Icon
                    name={linkType.icon}
                    size={14}
                    className={`links-dropdown__link-icon links-dropdown__link-icon--${linkType.color} ${hasLink ? 'links-dropdown__link-icon--active' : ''}`}
                />
                <span className="links-dropdown__link-label">{linkType.label}</span>

                {hasLink ? (
                    <div className="links-dropdown__link-target">
                        <span className="links-dropdown__direction">
                            {link?.direction === 'push' ? '→' : link?.direction === 'receive' ? '←' : '↔'}
                        </span>
                        <span
                            className="links-dropdown__target-dot"
                            style={{ background: targetView.color }}
                        />
                        <span className="links-dropdown__target-name">{targetView.name}</span>
                        <button
                            type="button"
                            className="links-dropdown__unlink-btn"
                            onClick={(e) => { e.stopPropagation(); onUpdateLink(linkType.id, null, null); }}
                            title="Unlink"
                        >
                            <Icon name="x" size={12} />
                        </button>
                    </div>
                ) : (
                    <span className="links-dropdown__not-linked">Not linked</span>
                )}

                <Icon
                    name={isExpanded ? 'chevronUp' : 'chevronRight'}
                    size={12}
                    className="links-dropdown__expand-icon"
                />
            </button>

            {isExpanded && (
                <div className="links-dropdown__link-body">
                    <div className="links-dropdown__section-label">Link to</div>
                    <div className="links-dropdown__view-list">
                        {otherViews.map(v => (
                            <button
                                key={v.id}
                                type="button"
                                className={`links-dropdown__view-option ${link?.targetId === v.id ? 'links-dropdown__view-option--selected' : ''}`}
                                onClick={() => onUpdateLink(linkType.id, v.id, link?.direction || 'bidirectional')}
                                style={{ '--link-color': `var(--color-accent-${linkType.color})` }}
                            >
                                <span className={`links-dropdown__radio ${link?.targetId === v.id ? 'links-dropdown__radio--checked' : ''}`}>
                                    {link?.targetId === v.id && <span className="links-dropdown__radio-dot" />}
                                </span>
                                <span
                                    className="links-dropdown__view-dot"
                                    style={{ background: v.color }}
                                />
                                <span className="links-dropdown__view-name">{v.name}</span>
                            </button>
                        ))}
                    </div>

                    {link?.targetId && (
                        <div className="links-dropdown__direction-section">
                            <div className="links-dropdown__section-label">Direction</div>
                            <div className="links-dropdown__direction-buttons">
                                {LINK_DIRECTIONS.map(dir => (
                                    <button
                                        key={dir.id}
                                        type="button"
                                        className={`links-dropdown__direction-btn ${link.direction === dir.id ? 'links-dropdown__direction-btn--active' : ''}`}
                                        onClick={() => onUpdateLink(linkType.id, link.targetId, dir.id)}
                                        title={dir.title}
                                        style={{ '--link-color': `var(--color-accent-${linkType.color})` }}
                                    >
                                        {dir.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// =============================================================================
// RECENT UNLINKS
// =============================================================================

const RecentUnlinks = memo(function RecentUnlinks({
    recentUnlinks,
    allViews,
    onRestoreLink,
}) {
    if (!recentUnlinks || recentUnlinks.length === 0) return null;

    return (
        <div className="links-dropdown__recent">
            <div className="links-dropdown__recent-label">
                Recent (double-click to re-link)
            </div>
            <div className="links-dropdown__recent-list">
                {recentUnlinks.map((unlink, i) => {
                    const linkType = LINK_TYPES.find(t => t.id === unlink.typeId);
                    const targetView = allViews.find(v => v.id === unlink.targetId);
                    if (!linkType || !targetView) return null;

                    return (
                        <button
                            key={i}
                            type="button"
                            className="links-dropdown__recent-item"
                            onDoubleClick={() => onRestoreLink(unlink.typeId, unlink.targetId, unlink.direction)}
                            title={`${linkType.label} → ${targetView.name}`}
                        >
                            <Icon name={linkType.icon} size={10} className={`links-dropdown__link-icon--${linkType.color}`} />
                            <span
                                className="links-dropdown__recent-dot"
                                style={{ background: targetView.color }}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LinksDropdown - Dropdown for managing view-to-view links
 *
 * Based on canvas-chrome-v12.jsx LinksDropdown spec
 *
 * Link types:
 * - Camera: Sync camera position/rotation
 * - Filters: Sync data filters
 * - Selection: Sync selected items
 * - Annotations: Sync annotations/labels
 * - Transforms: Sync data transforms
 * - Parameters: Sync visualization parameters
 *
 * Directions:
 * - Bidirectional: Two-way sync
 * - Push: Send changes to target
 * - Receive: Receive changes from target
 */
export function LinksDropdown({
    activeView,
    allViews = [],
    links = {},
    recentUnlinks = [],
    onUpdateLink,
    onRestoreLink,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedType, setExpandedType] = useState(null);

    const handleToggleExpand = useCallback((typeId) => {
        setExpandedType(prev => prev === typeId ? null : typeId);
    }, []);

    if (!activeView) return null;

    const otherViews = allViews.filter(v => v.id !== activeView.id && v.onCanvas !== false);
    const activeLinksCount = Object.values(links).filter(l => l?.targetId).length;

    return (
        <div className={`links-dropdown ${className}`}>
            <button
                type="button"
                className={`links-dropdown__trigger ${isOpen ? 'links-dropdown__trigger--open' : ''} ${activeLinksCount > 0 ? 'links-dropdown__trigger--has-links' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Icon name="link" size={14} />
                <span className="links-dropdown__trigger-label">Links</span>
                {activeLinksCount > 0 && (
                    <span className="links-dropdown__badge">{activeLinksCount}</span>
                )}
                <Icon name="chevronDown" size={10} />
            </button>

            {isOpen && (
                <div className="links-dropdown__panel">
                    {/* Header */}
                    <div className="links-dropdown__header">
                        <div className="links-dropdown__header-label">Links for</div>
                        <div className="links-dropdown__header-view">
                            <span
                                className="links-dropdown__header-dot"
                                style={{ background: activeView.color }}
                            />
                            <span className="links-dropdown__header-name">{activeView.name}</span>
                        </div>
                    </div>

                    {/* Link types */}
                    <div className="links-dropdown__content">
                        {LINK_TYPES.map(linkType => {
                            const link = links[linkType.id] || {};
                            const targetView = link.targetId ? allViews.find(v => v.id === link.targetId) : null;

                            return (
                                <LinkTypeRow
                                    key={linkType.id}
                                    linkType={linkType}
                                    link={link}
                                    targetView={targetView}
                                    isExpanded={expandedType === linkType.id}
                                    onToggleExpand={() => handleToggleExpand(linkType.id)}
                                    otherViews={otherViews}
                                    onUpdateLink={onUpdateLink}
                                />
                            );
                        })}
                    </div>

                    {/* Recent unlinks */}
                    <RecentUnlinks
                        recentUnlinks={recentUnlinks}
                        allViews={allViews}
                        onRestoreLink={onRestoreLink}
                    />

                    {/* Footer with link to full manager */}
                    <div className="links-dropdown__footer">
                        <button
                            type="button"
                            className="links-dropdown__open-manager"
                            onClick={() => {
                                setIsOpen(false);
                                window.dispatchEvent(new CustomEvent('cia:open-view-link-manager'));
                            }}
                        >
                            <Icon name="settings" size={12} />
                            <span>Open Link Manager</span>
                            <Icon name="arrowUpRight" size={10} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(LinksDropdown);
