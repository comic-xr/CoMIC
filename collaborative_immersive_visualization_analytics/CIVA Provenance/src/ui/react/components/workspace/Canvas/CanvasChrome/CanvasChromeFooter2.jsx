// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeFooter2.jsx
// Footer 2 - Canvas controls bar per Canvas Chrome spec.

import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import './CanvasChromeFooter2.scss';

const BREAKPOINTS = {
    LINKS_COMPACT_WIDE: 1020,
};

const LINK_TYPES = [
    { id: 'camera', label: 'Camera', icon: 'eye', color: 'teal', linkKey: 'camera' },
    { id: 'filters', label: 'Filters', icon: 'filter', color: 'purple', linkKey: 'filters' },
    { id: 'widgets', label: 'Widgets', icon: 'layout', color: 'amber', linkKey: 'widgets' },
    { id: 'cursors', label: 'Cursors', icon: 'crosshair', color: 'cyan', linkKey: 'cursors' },
    { id: 'annotations', label: 'Annotations', icon: 'edit', color: 'pink', linkKey: 'annotationDisplay' },
];

const isLinkActive = (link) => {
    if (!link) return false;
    if (Array.isArray(link.targets)) return link.targets.length > 0;
    if (Array.isArray(link.targetIds)) return link.targetIds.length > 0;
    if (link.targetId) return true;
    if (link.target) return true;
    if (typeof link === 'boolean') return link;
    return true;
};

const FooterSection = memo(function FooterSection({ label, color, children }) {
    const colorClass = color ? `canvas-footer2__label--${color}` : '';
    return (
        <div className="canvas-footer2__section">
            <div className={`canvas-footer2__label ${colorClass}`}>{label}</div>
            <div className="canvas-footer2__content">
                {children}
            </div>
        </div>
    );
});

const IconButton = memo(function IconButton({ icon, title, active, color, onClick, disabled }) {
    const colorClass = color ? `canvas-footer2__icon-btn--${color}` : '';
    return (
        <button
            type="button"
            className={`canvas-footer2__icon-btn ${colorClass} ${active ? 'is-active' : ''}`}
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
        >
            <Icon name={icon} size={14} />
        </button>
    );
});

export const CanvasChromeFooter2 = memo(function CanvasChromeFooter2({
    containerWidth,
    hasActiveView = true,
    links,
    onUpdateLink,
    onOpenLinkManager,
    onToggleFocus,
    onOpenViewList,
    onSnapshot,
    onResetView,
    onCopyView,
    onOpenSettings,
    visibility = true,
    onToggleVisibility,
    orientation = true,
    onToggleOrientation,
    overlays = false,
    onToggleOverlays,
    isVRAvailable = false,
    isInVR = false,
    onToggleVR,
    className = '',
}) {
    const [linksOpen, setLinksOpen] = useState(false);
    const linksTriggerRef = useRef(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreTriggerRef = useRef(null);
    const measureRef = useRef(null);
    const moreMeasureRef = useRef(null);

    const [localVisibility, setLocalVisibility] = useState(visibility);
    const [localOrientation, setLocalOrientation] = useState(orientation);
    const [localOverlays, setLocalOverlays] = useState(overlays);

    useEffect(() => setLocalVisibility(visibility), [visibility]);
    useEffect(() => setLocalOrientation(orientation), [orientation]);
    useEffect(() => setLocalOverlays(overlays), [overlays]);

    const effectiveVisibility = onToggleVisibility ? visibility : localVisibility;
    const effectiveOrientation = onToggleOrientation ? orientation : localOrientation;
    const effectiveOverlays = onToggleOverlays ? overlays : localOverlays;

    const handleToggle = (current, externalSetter, localSetter) => {
        const next = !current;
        if (externalSetter) {
            externalSetter(next);
        } else {
            localSetter(next);
        }
    };

    const handleToggleLink = (linkType) => {
        const linkValue = links?.[linkType.linkKey];
        const active = isLinkActive(linkValue);

        if (active) {
            onUpdateLink?.(linkType.linkKey, null);
            return;
        }

        if (onOpenLinkManager) {
            onOpenLinkManager(linkType);
            return;
        }

        window.dispatchEvent(new CustomEvent('cia:open-view-link-manager'));
    };

    const computedWidth = Number.isFinite(containerWidth) ? containerWidth : 0;
    const linksCompact = computedWidth > 0 && computedWidth < BREAKPOINTS.LINKS_COMPACT_WIDE;

    const linkStates = useMemo(() => {
        return LINK_TYPES.map((type) => ({
            ...type,
            active: isLinkActive(links?.[type.linkKey]),
        }));
    }, [links]);

    const activeLinkCount = useMemo(() => (
        linkStates.filter((type) => type.active).length
    ), [linkStates]);

    const footerRef = useRef(null);
    const [visibleSectionIds, setVisibleSectionIds] = useState([]);
    const [overflowSectionIds, setOverflowSectionIds] = useState([]);

    const renderLinksGroup = useCallback((useTriggerRef) => (
        <div className="canvas-footer2__group">
            {linksCompact ? (
                <button
                    type="button"
                    ref={useTriggerRef ? linksTriggerRef : null}
                    className="canvas-footer2__links-compact"
                    onClick={() => setLinksOpen((prev) => !prev)}
                    aria-expanded={linksOpen}
                    disabled={!hasActiveView}
                >
                    <Icon name="link" size={14} />
                    <span className="canvas-footer2__links-count">{activeLinkCount}</span>
                </button>
            ) : (
                <div className="canvas-footer2__links">
                    {linkStates.map((link) => (
                        <button
                            key={link.id}
                            type="button"
                            className={`canvas-footer2__link-btn ${link.active ? 'is-active' : ''}`}
                            style={{ '--link-color': `var(--color-accent-${link.color})` }}
                            onClick={() => handleToggleLink(link)}
                            title={link.label}
                            disabled={!hasActiveView}
                        >
                            <Icon name={link.icon} size={14} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    ), [activeLinkCount, handleToggleLink, hasActiveView, linkStates, linksCompact, linksOpen]);

    const sections = useMemo(() => ([
        {
            id: 'focus',
            label: 'Focus',
            color: 'cyan',
            content: (
                <div className="canvas-footer2__group">
                    <IconButton
                        icon="maximize"
                        title="Focus View"
                        onClick={onToggleFocus}
                        disabled={!hasActiveView}
                    />
                    <IconButton
                        icon="list"
                        title={hasActiveView ? 'View List' : 'Select a view to enable tools'}
                        onClick={onOpenViewList}
                    />
                </div>
            ),
        },
        {
            id: 'actions',
            label: 'Actions',
            color: 'amber',
            content: (
                <div className="canvas-footer2__group">
                    <IconButton icon="camera" title="Snapshot" onClick={onSnapshot} disabled={!hasActiveView} />
                    <IconButton icon="rotateCcw" title="Reset View" onClick={onResetView} disabled={!hasActiveView} />
                    <IconButton icon="copy" title="Copy" onClick={onCopyView} disabled={!hasActiveView} />
                    <IconButton icon="settings" title="Settings" onClick={onOpenSettings} disabled={!hasActiveView} />
                </div>
            ),
        },
        {
            id: 'display',
            label: 'Display',
            color: 'blue',
            content: (
                <div className="canvas-footer2__group">
                    <IconButton
                        icon="eye"
                        title="Visibility"
                        active={effectiveVisibility}
                        onClick={() => handleToggle(effectiveVisibility, onToggleVisibility, setLocalVisibility)}
                        disabled={!hasActiveView}
                    />
                    <IconButton
                        icon="cube"
                        title="Orientation"
                        active={effectiveOrientation}
                        onClick={() => handleToggle(effectiveOrientation, onToggleOrientation, setLocalOrientation)}
                        disabled={!hasActiveView}
                    />
                    <IconButton
                        icon="layers"
                        title="Overlays"
                        active={effectiveOverlays}
                        onClick={() => handleToggle(effectiveOverlays, onToggleOverlays, setLocalOverlays)}
                        disabled={!hasActiveView}
                    />
                </div>
            ),
        },
        {
            id: 'links',
            label: 'Links',
            color: 'purple',
            content: renderLinksGroup(true),
        },
        ...(isVRAvailable ? [{
            id: 'vr',
            label: 'VR',
            color: 'purple',
            content: (
                <div className="canvas-footer2__group">
                    <IconButton
                        icon="vrHeadset"
                        title={isInVR ? 'Exit VR' : 'Send to VR'}
                        active={isInVR}
                        color="purple"
                        onClick={onToggleVR}
                        disabled={!hasActiveView}
                    />
                </div>
            ),
        }] : []),
    ]), [
        activeLinkCount,
        hasActiveView,
        effectiveOrientation,
        effectiveOverlays,
        effectiveVisibility,
        isInVR,
        isVRAvailable,
        onCopyView,
        onOpenSettings,
        onOpenViewList,
        onResetView,
        onSnapshot,
        onToggleFocus,
        onToggleOrientation,
        onToggleOverlays,
        onToggleVisibility,
        onToggleVR,
        renderLinksGroup,
    ]);

    const sectionOrder = useMemo(() => sections.map((section) => section.id), [sections]);

    useEffect(() => {
        if (visibleSectionIds.length === 0 && sectionOrder.length > 0) {
            setVisibleSectionIds(sectionOrder);
        }
    }, [sectionOrder, visibleSectionIds.length]);

    useEffect(() => {
        if (!footerRef.current || !measureRef.current) return undefined;

        let rafId = null;
        const measure = () => {
            if (!footerRef.current || !measureRef.current) return;
            const footerEl = footerRef.current;
            const measureEl = measureRef.current;
            const styles = window.getComputedStyle(footerEl);
            const paddingLeft = parseFloat(styles.paddingLeft) || 0;
            const paddingRight = parseFloat(styles.paddingRight) || 0;
            const availableWidth = Math.max(0, footerEl.clientWidth - paddingLeft - paddingRight);
            if (!availableWidth) return;

            const measureStyles = window.getComputedStyle(measureEl);
            const gap = parseFloat(measureStyles.columnGap || measureStyles.gap) || 0;
            const widths = sectionOrder.map((id) => {
                const el = measureEl.querySelector(`[data-section-id="${id}"]`);
                return el ? el.getBoundingClientRect().width : 0;
            });
            const moreWidth = moreMeasureRef.current?.getBoundingClientRect().width || 0;

            const nextVisible = [];
            let usedWidth = 0;

            sectionOrder.forEach((id, index) => {
                const nextWidth = widths[index] + (nextVisible.length > 0 ? gap : 0);
                if (usedWidth + nextWidth <= availableWidth) {
                    nextVisible.push(id);
                    usedWidth += nextWidth;
                }
            });

            let overflow = sectionOrder.filter((id) => !nextVisible.includes(id));
            if (overflow.length > 0) {
                let totalWidth = usedWidth + (nextVisible.length > 0 ? gap : 0) + moreWidth;
                while (nextVisible.length > 0 && totalWidth > availableWidth) {
                    const removed = nextVisible.pop();
                    const removedIndex = sectionOrder.indexOf(removed);
                    totalWidth -= widths[removedIndex] + (nextVisible.length > 0 ? gap : 0);
                }
                overflow = sectionOrder.filter((id) => !nextVisible.includes(id));
            }

            setVisibleSectionIds((prev) => (
                prev.join(',') === nextVisible.join(',') ? prev : nextVisible
            ));
            setOverflowSectionIds((prev) => (
                prev.join(',') === overflow.join(',') ? prev : overflow
            ));
        };

        const scheduleMeasure = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(measure);
        };

        const observer = new ResizeObserver(scheduleMeasure);
        observer.observe(footerRef.current);
        observer.observe(measureRef.current);
        scheduleMeasure();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [sectionOrder]);

    useEffect(() => {
        if (overflowSectionIds.length === 0 && moreOpen) {
            setMoreOpen(false);
        }
    }, [moreOpen, overflowSectionIds.length]);

    const visibleSections = useMemo(() => (
        sections.filter((section) => visibleSectionIds.includes(section.id))
    ), [sections, visibleSectionIds]);

    const overflowSections = useMemo(() => (
        sections.filter((section) => overflowSectionIds.includes(section.id))
    ), [sections, overflowSectionIds]);

    return (
        <div
            ref={footerRef}
            className={`canvas-footer2 ${className}`}
        >
            <div className="canvas-footer2__cluster">
                {visibleSections.map((section) => (
                    <div key={section.id} className="canvas-footer2__section-wrap" data-section-id={section.id}>
                        <FooterSection label={section.label} color={section.color}>
                            {section.content}
                        </FooterSection>
                    </div>
                ))}
                {overflowSections.length > 0 && (
                    <div className="canvas-footer2__section-wrap canvas-footer2__section-wrap--more">
                        <FooterSection label="More" color="teal">
                            <button
                                ref={moreTriggerRef}
                                type="button"
                                className="canvas-footer2__more-btn"
                                onClick={() => setMoreOpen((prev) => !prev)}
                                aria-expanded={moreOpen}
                            >
                                <Icon name="moreHorizontal" size={14} />
                                <span className="canvas-footer2__more-count">+{overflowSections.length}</span>
                            </button>
                        </FooterSection>
                    </div>
                )}
            </div>

            <div className="canvas-footer2__measure" ref={measureRef} aria-hidden="true">
                {sections.map((section) => (
                    <div key={section.id} className="canvas-footer2__section-wrap" data-section-id={section.id}>
                        <FooterSection label={section.label} color={section.color}>
                            {section.id === 'links' ? renderLinksGroup(false) : section.content}
                        </FooterSection>
                    </div>
                ))}
                <div className="canvas-footer2__section-wrap canvas-footer2__section-wrap--more">
                    <FooterSection label="More" color="teal">
                        <button
                            ref={moreMeasureRef}
                            type="button"
                            className="canvas-footer2__more-btn"
                            aria-hidden="true"
                            tabIndex={-1}
                        >
                            <Icon name="moreHorizontal" size={14} />
                            <span className="canvas-footer2__more-count">+{overflowSections.length}</span>
                        </button>
                    </FooterSection>
                </div>
            </div>

            <DropdownPortal
                open={linksCompact && linksOpen}
                onClose={() => setLinksOpen(false)}
                triggerRef={linksTriggerRef}
                align="center"
                position="top"
                offset={8}
                className="canvas-footer2__links-popover"
            >
                <div className="canvas-footer2__links-panel">
                    <div className="canvas-footer2__links-panel-header">
                        <Icon name="link" size={14} />
                        <span>Links</span>
                        <span className="canvas-footer2__links-panel-count">[{activeLinkCount}]</span>
                    </div>
                    <div className="canvas-footer2__links-panel-list">
                        {linkStates.map((link) => (
                            <button
                                key={link.id}
                                type="button"
                                className={`canvas-footer2__links-panel-item ${link.active ? 'is-active' : ''}`}
                                style={{ '--link-color': `var(--color-accent-${link.color})` }}
                                onClick={() => handleToggleLink(link)}
                                disabled={!hasActiveView}
                            >
                                <span className="canvas-footer2__links-panel-icon">
                                    <Icon name={link.icon} size={14} />
                                </span>
                                <span className="canvas-footer2__links-panel-label">{link.label}</span>
                                <span className="canvas-footer2__links-panel-state">
                                    {link.active ? 'Linked' : 'Not linked'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </DropdownPortal>

            <DropdownPortal
                open={overflowSections.length > 0 && moreOpen}
                onClose={() => setMoreOpen(false)}
                triggerRef={moreTriggerRef}
                align="center"
                position="top"
                offset={10}
                className="canvas-footer2__overflow-popover"
            >
                <div className="canvas-footer2__overflow-panel">
                    {overflowSections.map((section) => (
                        <div key={section.id} className="canvas-footer2__overflow-section">
                            <div className={`canvas-footer2__overflow-label canvas-footer2__label--${section.color}`}>
                                {section.label}
                            </div>
                            <div className="canvas-footer2__overflow-content">
                                {section.content}
                            </div>
                        </div>
                    ))}
                </div>
            </DropdownPortal>
        </div>
    );
});

export default CanvasChromeFooter2;
