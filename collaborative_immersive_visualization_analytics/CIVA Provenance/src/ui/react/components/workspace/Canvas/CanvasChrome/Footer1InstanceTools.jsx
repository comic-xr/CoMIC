// src/ui/react/components/workspace/Canvas/CanvasChrome/Footer1InstanceTools.jsx
// Footer1InstanceTools - instance-specific tool strip with persistent Undo/Redo.

import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ActiveViewSelector } from '@UI/react/components/organisms/ActiveViewSelector';
import { ToolOptionItem } from '@UI/react/components/molecules/InstanceToolOptions/InstanceToolOptions';
import { getViewColor, VIEW_COLORS, hexToRgbString } from '@UI/react/utils/canvasColors.js';
import './Footer1InstanceTools.scss';

// =============================================================================
// TOOL MENU (portaled)
// =============================================================================

function ToolMenu({ isOpen, onClose, options, onSelect, triggerRef, accentColor, accentRgb }) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ bottom: 0, left: 0 });

    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, triggerRef]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
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
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen || !options?.length) return null;

    return createPortal(
        <div
            className="footer1-instance-tools__menu"
            ref={menuRef}
            style={{
                '--instance-color': accentColor,
                '--instance-color-rgb': accentRgb,
                bottom: position.bottom,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            {options.map((option, index) => (
                <ToolOptionItem
                    key={option.id || index}
                    option={option}
                    onClose={onClose}
                    onSelectOption={onSelect}
                />
            ))}
        </div>,
        document.body
    );
}

// =============================================================================
// TOOL POPOVER (portaled)
// =============================================================================

function ToolPopover({ isOpen, onClose, popover, triggerRef, accentColor, accentRgb }) {
    const popoverRef = useRef(null);
    const [position, setPosition] = useState({ bottom: 0, left: 0 });
    const [values, setValues] = useState({});

    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, triggerRef]);

    useEffect(() => {
        if (!isOpen || !popover?.getValue) return;
        const current = popover.getValue();
        if (current) setValues(current);
    }, [isOpen, popover]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
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
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen || !popover) return null;

    const handleSliderChange = (sliderId, value) => {
        const numValue = parseFloat(value);
        setValues(prev => ({ ...prev, [sliderId]: numValue }));
        popover.onChange?.(sliderId, numValue);
    };

    const handleReset = () => {
        popover.onReset?.();
        if (popover.getValue) {
            const current = popover.getValue();
            if (current) setValues(current);
        }
    };

    const groups = popover.groups || (popover.sliders ? [{ label: popover.title, sliders: popover.sliders }] : []);

    return createPortal(
        <div
            className="footer1-instance-tools__popover"
            ref={popoverRef}
            style={{
                '--instance-color': accentColor,
                '--instance-color-rgb': accentRgb,
                bottom: position.bottom,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            <div className="footer1-instance-tools__popover-header">
                <span className="footer1-instance-tools__popover-title">{popover.title || 'Adjust'}</span>
                {popover.onReset && (
                    <button
                        type="button"
                        className="footer1-instance-tools__popover-reset"
                        onClick={handleReset}
                        title="Reset"
                    >
                        <Icon name="refresh" size={12} />
                    </button>
                )}
            </div>

            {groups.map((group, groupIndex) => (
                <div key={group.label || groupIndex} className="footer1-instance-tools__popover-group">
                    {group.label && (
                        <div className="footer1-instance-tools__popover-group-label">{group.label}</div>
                    )}
                    {(group.sliders || []).map((slider) => (
                        <div key={slider.id} className="footer1-instance-tools__popover-slider">
                            <span className="footer1-instance-tools__popover-slider-label">{slider.label}</span>
                            <input
                                className="footer1-instance-tools__popover-slider-input"
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step || 1}
                                value={values?.[slider.id] ?? slider.defaultValue ?? 0}
                                onChange={(e) => handleSliderChange(slider.id, e.target.value)}
                            />
                            <span className="footer1-instance-tools__popover-slider-value">
                                {values?.[slider.id]?.toFixed?.(slider.precision ?? 0) ?? slider.defaultValue ?? 0}
                                {slider.unit || ''}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>,
        document.body
    );
}

// =============================================================================
// TOOL BUTTON
// =============================================================================

function ToolButton({ tool, accentColor, accentRgb, onSelect }) {
    const [showMenu, setShowMenu] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const buttonRef = useRef(null);

    const hasMenu = tool.type === 'menu' && tool.options?.length > 0;
    const hasPopover = !!tool.popover;

    const handleClick = () => {
        if (hasMenu) {
            setShowMenu(prev => !prev);
        } else if (hasPopover) {
            setShowPopover(prev => !prev);
            onSelect?.(tool);
        } else {
            onSelect?.(tool);
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`footer1-instance-tools__icon-btn footer1-instance-tools__tool ${tool.active ? 'is-active' : ''} ${(hasMenu && showMenu) || (hasPopover && showPopover) ? 'is-open' : ''}`}
                onClick={handleClick}
                disabled={tool.disabled}
                title={tool.label || tool.description}
                aria-label={tool.label || tool.description || 'Tool'}
            >
                <Icon name={tool.icon} size={14} />
                {(hasMenu || hasPopover) && (
                    <Icon name="chevronUp" size={10} className="footer1-instance-tools__tool-chevron" />
                )}
            </button>
            {hasMenu && (
                <ToolMenu
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                    options={tool.options}
                    onSelect={(option) => onSelect?.({ ...tool, selectedOption: option })}
                    triggerRef={buttonRef}
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                />
            )}
            {hasPopover && (
                <ToolPopover
                    isOpen={showPopover}
                    onClose={() => setShowPopover(false)}
                    popover={tool.popover}
                    triggerRef={buttonRef}
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                />
            )}
        </>
    );
}

// =============================================================================
// OVERFLOW MENU (portaled)
// =============================================================================

function OverflowMenu({
    isOpen,
    onClose,
    categories,
    onSelectTool,
    accentColor,
    accentRgb,
    triggerRef,
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ bottom: 0, left: 0 });

    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, triggerRef]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target)
            ) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
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
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen || !categories?.length) return null;

    return createPortal(
        <div
            className="footer1-instance-tools__overflow-menu"
            ref={menuRef}
            style={{
                '--instance-color': accentColor,
                '--instance-color-rgb': accentRgb,
                bottom: position.bottom,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            {categories.map((category) => (
                <div key={category.id} className="footer1-instance-tools__overflow-section">
                    <div className="footer1-instance-tools__overflow-label">
                        {category.label}
                    </div>
                    <div className="footer1-instance-tools__overflow-tools">
                        {(category.tools || []).map((tool) => (
                            <ToolButton
                                key={tool.id}
                                tool={tool}
                                accentColor={accentColor}
                                accentRgb={accentRgb}
                                onSelect={(selectedTool) => onSelectTool?.(selectedTool, category)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>,
        document.body
    );
}

export const Footer1InstanceTools = memo(function Footer1InstanceTools({
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    activeView,
    onCanvasViews = [],
    availableViews = [],
    onSelectView,
    onPlaceView,
    onViewAction,
    toolCategories,
    tools = [],
    toolSections = [],
    toolPlacement = 'notch',
    onSelectTool,
    onOpenMoreTools,
}) {
    const accentColor = useMemo(() => {
        if (activeView?.color) {
            return activeView.color;
        }
        if (activeView?.id) {
            return getViewColor(activeView.id);
        }
        return VIEW_COLORS[0];
    }, [activeView?.color, activeView?.id]);

    const accentRgb = useMemo(() => {
        if (accentColor?.startsWith?.('#')) {
            return hexToRgbString(accentColor);
        }
        if (activeView?.id) {
            return hexToRgbString(getViewColor(activeView.id));
        }
        return hexToRgbString(VIEW_COLORS[0]);
    }, [accentColor, activeView?.id]);

    const containerStyle = useMemo(() => ({
        '--instance-color': accentColor,
        '--instance-color-rgb': accentRgb,
    }), [accentColor, accentRgb]);

    const derivedCategories = useMemo(() => {
        if (toolCategories && toolCategories.length) return toolCategories;
        if (!tools?.length) return [];

        const sectionsById = new Map((toolSections || []).map((section) => [section.id, section]));
        const grouped = new Map();

        tools
            .filter((tool) => !toolPlacement || tool.placement === toolPlacement)
            .forEach((tool) => {
                const sectionId = tool.section || 'other';
                const section = sectionsById.get(sectionId);
                if (!grouped.has(sectionId)) {
                    grouped.set(sectionId, {
                        id: sectionId,
                        label: section?.label || 'Other',
                        tools: [],
                    });
                }
                grouped.get(sectionId).tools.push(tool);
            });

        return Array.from(grouped.values());
    }, [toolCategories, tools, toolSections, toolPlacement]);

    const toolsRowRef = useRef(null);
    const categoriesRef = useRef(null);
    const moreButtonRef = useRef(null);
    const moreMeasureRef = useRef(null);
    const measureRef = useRef(null);
    const categoryWidthsRef = useRef(new Map());
    const updateOverflowRef = useRef(null); // Ref to avoid ResizeObserver recreation
    const [overflowCategoryIds, setOverflowCategoryIds] = useState([]);
    const [showOverflowMenu, setShowOverflowMenu] = useState(false);

    const updateOverflow = useCallback(() => {
        if (!toolsRowRef.current || !categoriesRef.current) return;

        const rowEl = toolsRowRef.current;
        const rowWidth = rowEl.clientWidth || 0;
        if (rowWidth <= 0) return;

        const rowStyles = window.getComputedStyle(rowEl);
        const rowGap = parseFloat(rowStyles.columnGap || rowStyles.gap) || 0;

        const measureCategories = measureRef.current?.querySelector('.footer1-instance-tools__categories');
        const categoryGap = measureCategories
            ? parseFloat(window.getComputedStyle(measureCategories).columnGap || window.getComputedStyle(measureCategories).gap) || 0
            : 0;

        if (measureCategories) {
            const items = measureCategories.querySelectorAll('[data-category-id]');
            items.forEach((item) => {
                const id = item.getAttribute('data-category-id');
                if (!id) return;
                const width = item.getBoundingClientRect().width;
                if (width > 0) {
                    categoryWidthsRef.current.set(id, width);
                }
            });
        }

        const computeOverflow = (availableWidth) => {
            let used = 0;
            const overflow = [];
            let hasVisible = false;

            derivedCategories.forEach((category) => {
                const width = categoryWidthsRef.current.get(category.id) || 0;
                const next = hasVisible ? used + categoryGap + width : width;
                if (next <= availableWidth) {
                    used = next;
                    hasVisible = true;
                } else {
                    overflow.push(category.id);
                }
            });

            return overflow;
        };

        let overflow = computeOverflow(rowWidth);

        if (overflow.length > 0) {
            const moreWidth = moreMeasureRef.current?.getBoundingClientRect().width
                || moreButtonRef.current?.getBoundingClientRect().width
                || 0;
            const available = Math.max(0, rowWidth - moreWidth - rowGap);
            overflow = computeOverflow(available);
        }

        // Only update if overflow actually changed to prevent ResizeObserver loops
        setOverflowCategoryIds((prev) => {
            if (prev.length !== overflow.length) return overflow;
            if (prev.every((id, i) => id === overflow[i])) return prev;
            return overflow;
        });
    }, [derivedCategories]);

    // Keep ref updated so ResizeObserver can use latest function without recreation
    updateOverflowRef.current = updateOverflow;

    useEffect(() => {
        updateOverflow();
    }, [updateOverflow]);

    useEffect(() => {
        const rowEl = toolsRowRef.current;
        const measureEl = measureRef.current;
        if (!rowEl) return undefined;

        let rafId = null;
        const observer = new ResizeObserver(() => {
            // Debounce with requestAnimationFrame to prevent rapid-fire updates
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                updateOverflowRef.current?.();
            });
        });
        observer.observe(rowEl);
        if (measureEl) observer.observe(measureEl);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, []); // Empty deps - observer uses ref, doesn't need recreation

    useEffect(() => {
        if (overflowCategoryIds.length === 0 && showOverflowMenu) {
            setShowOverflowMenu(false);
        }
    }, [overflowCategoryIds.length, showOverflowMenu]);

    const visibleCategories = useMemo(() => {
        if (overflowCategoryIds.length === 0) return derivedCategories;
        const overflowSet = new Set(overflowCategoryIds);
        return derivedCategories.filter((category) => !overflowSet.has(category.id));
    }, [derivedCategories, overflowCategoryIds]);

    const overflowCategories = useMemo(() => {
        if (overflowCategoryIds.length === 0) return [];
        const overflowSet = new Set(overflowCategoryIds);
        return derivedCategories.filter((category) => overflowSet.has(category.id));
    }, [derivedCategories, overflowCategoryIds]);

    const overflowToolCount = useMemo(() => {
        if (overflowCategories.length === 0) return 0;
        return overflowCategories.reduce((total, category) => {
            return total + (category.tools?.length || 0);
        }, 0);
    }, [overflowCategories]);

    return (
        <div className="footer1-instance-tools" style={containerStyle}>
            <div className="footer1-instance-tools__undo-redo">
                <button
                    type="button"
                    className="footer1-instance-tools__icon-btn"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Undo"
                    aria-label="Undo"
                >
                    <Icon name="undo" size={14} />
                </button>
                <button
                    type="button"
                    className="footer1-instance-tools__icon-btn"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Redo"
                    aria-label="Redo"
                >
                    <Icon name="redo" size={14} />
                </button>
            </div>

            <div className="footer1-instance-tools__divider" />

            <ActiveViewSelector
                activeView={activeView}
                onCanvasViews={onCanvasViews}
                availableViews={availableViews}
                onSelect={onSelectView}
                onPlace={onPlaceView}
                onAction={onViewAction}
                className="footer1-instance-tools__active-view"
            />

            <div className="footer1-instance-tools__divider" />

            <div className="footer1-instance-tools__tools-row" ref={toolsRowRef}>
                <div className="footer1-instance-tools__categories" ref={categoriesRef}>
                    {derivedCategories.length === 0 && (
                        <span className="footer1-instance-tools__empty">No tools available</span>
                    )}
                    {visibleCategories.map((category) => (
                        <div
                            key={category.id}
                            className="footer1-instance-tools__category"
                            data-category-id={category.id}
                        >
                            <span className="footer1-instance-tools__category-label">{category.label}</span>
                            <div className="footer1-instance-tools__category-tools">
                                {(category.tools || []).map((tool) => (
                                    <ToolButton
                                        key={tool.id}
                                        tool={tool}
                                        accentColor={accentColor}
                                        accentRgb={accentRgb}
                                        onSelect={(selectedTool) => onSelectTool?.(selectedTool, category)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    ref={moreButtonRef}
                    type="button"
                    className={`footer1-instance-tools__icon-btn footer1-instance-tools__icon-btn--more ${overflowCategoryIds.length > 0 ? 'is-visible' : ''}`}
                    onClick={() => {
                        if (overflowCategoryIds.length === 0) return;
                        setShowOverflowMenu((prev) => !prev);
                        onOpenMoreTools?.();
                    }}
                    title="More tools"
                    aria-label={overflowToolCount > 0 ? `More tools (+${overflowToolCount})` : 'More tools'}
                    aria-expanded={showOverflowMenu}
                >
                    <Icon name="moreVertical" size={14} />
                    {overflowToolCount > 0 && (
                        <span className="footer1-instance-tools__more-count">+{overflowToolCount}</span>
                    )}
                </button>
            </div>

            <div className="footer1-instance-tools__measure" ref={measureRef} aria-hidden="true">
                <div className="footer1-instance-tools__categories footer1-instance-tools__categories--measure">
                    {derivedCategories.length === 0 && (
                        <span className="footer1-instance-tools__empty">No tools available</span>
                    )}
                    {derivedCategories.map((category) => (
                        <div
                            key={category.id}
                            className="footer1-instance-tools__category"
                            data-category-id={category.id}
                        >
                            <span className="footer1-instance-tools__category-label">{category.label}</span>
                            <div className="footer1-instance-tools__category-tools">
                                {(category.tools || []).map((tool) => (
                                    <ToolButton
                                        key={tool.id}
                                        tool={tool}
                                        accentColor={accentColor}
                                        accentRgb={accentRgb}
                                        onSelect={(selectedTool) => onSelectTool?.(selectedTool, category)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    ref={moreMeasureRef}
                    type="button"
                    className="footer1-instance-tools__icon-btn footer1-instance-tools__icon-btn--more is-visible"
                    aria-hidden="true"
                    tabIndex={-1}
                >
                    <Icon name="moreVertical" size={14} />
                    {overflowToolCount > 0 && (
                        <span className="footer1-instance-tools__more-count">+{overflowToolCount}</span>
                    )}
                </button>
            </div>

            <OverflowMenu
                isOpen={showOverflowMenu}
                onClose={() => setShowOverflowMenu(false)}
                categories={overflowCategories}
                onSelectTool={onSelectTool}
                accentColor={accentColor}
                accentRgb={accentRgb}
                triggerRef={moreButtonRef}
            />
        </div>
    );
});

export default Footer1InstanceTools;
