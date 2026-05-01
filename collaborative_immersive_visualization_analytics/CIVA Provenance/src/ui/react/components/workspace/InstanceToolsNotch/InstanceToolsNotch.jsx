// src/ui/react/components/workspace/InstanceToolsNotch/InstanceToolsNotch.jsx
// Full-width toolbar bar for instance-specific tools
//
// Sits above the canvas toolbar, displays tools for the active instance.
// Layout: [View Name] | [Tools...] | [More]
// Color-coded left accent matches the active view's accent color.

import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms';
import { ViewHubFlyout, VIEW_TYPE_ICONS } from '@UI/react/components/organisms/ViewContextBlock';
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic.js';
import { hexToRgbString } from '@UI/react/utils/canvasColors.js';

import './InstanceToolsNotch.scss';

// =============================================================================
// TOOL MENU DROPDOWN
// =============================================================================

function ToolMenu({ isOpen, onClose, options, onSelect, triggerRef, accentColor }) {
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

    const handleSelect = (option) => {
        // Call onClick directly if the option has it
        if (option.onClick) {
            option.onClick();
        }
        onSelect?.(option);
        onClose();
    };

    // Handle camera-grid view selection
    const handleCameraViewSelect = (gridOption, viewId) => {
        if (gridOption.onViewSelect) {
            gridOption.onViewSelect(viewId);
        }
        onClose();
    };

    return createPortal(
        <div
            className="instance-tools-notch__menu"
            ref={menuRef}
            style={{
                '--notch-color': accentColor,
                '--notch-color-rgb': hexToRgbString(accentColor),
                bottom: position.bottom,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            {options.map((option, index) => {
                // Handle separator
                if (option.type === 'separator') {
                    return <div key={`sep-${index}`} className="instance-tools-notch__menu-divider" />;
                }

                // Handle camera-grid (compact view buttons)
                if (option.type === 'camera-grid' && option.views) {
                    return (
                        <div key={option.id || index} className="instance-tools-notch__camera-grid">
                            {option.views.map((view) => (
                                <button
                                    key={view.id}
                                    className={`instance-tools-notch__camera-btn ${view.special ? 'special' : ''}`}
                                    onClick={() => handleCameraViewSelect(option, view.id)}
                                    disabled={option.disabled}
                                    title={view.label}
                                >
                                    {view.label}
                                </button>
                            ))}
                        </div>
                    );
                }

                // Regular menu item
                return (
                    <button
                        key={option.id || index}
                        className={`instance-tools-notch__menu-item ${option.active ? 'active' : ''}`}
                        onClick={() => handleSelect(option)}
                        disabled={option.disabled}
                    >
                        {option.icon && <Icon name={option.icon} size={14} />}
                        <span>{option.label}</span>
                        {option.shortcut && (
                            <span className="instance-tools-notch__menu-shortcut">{option.shortcut}</span>
                        )}
                    </button>
                );
            })}
        </div>,
        document.body
    );
}

// =============================================================================
// TOOL POPOVER - Slider panel that appears when a tool is active
// =============================================================================

function ToolPopover({ isOpen, onClose, popover, triggerRef, accentColor }) {
    const popoverRef = useRef(null);
    const [position, setPosition] = useState({ bottom: 0, left: 0 });
    const [values, setValues] = useState({});

    // Position the popover above the trigger button
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

    // Read current values when opened
    useEffect(() => {
        if (!isOpen || !popover?.getValue) return;

        const current = popover.getValue();
        if (current) setValues(current);
    }, [isOpen, popover]);

    // Close on outside click / escape
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
        // Re-read values after reset
        if (popover.getValue) {
            const current = popover.getValue();
            if (current) setValues(current);
        }
    };

    return createPortal(
        <div
            className="instance-tools-notch__popover"
            ref={popoverRef}
            style={{
                '--notch-color': accentColor,
                '--notch-color-rgb': hexToRgbString(accentColor),
                bottom: position.bottom,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            {/* Header */}
            <div className="instance-tools-notch__popover-header">
                <span className="instance-tools-notch__popover-title">{popover.title}</span>
                {popover.onReset && (
                    <button
                        className="instance-tools-notch__popover-reset"
                        onClick={handleReset}
                        title="Reset to default"
                    >
                        <Icon name="rotateCcw" size={12} />
                    </button>
                )}
            </div>

            {/* Slider groups */}
            {(popover.groups || [{ sliders: popover.sliders }]).map((group, gi) => (
                <div key={gi} className="instance-tools-notch__popover-group">
                    {group.label && (
                        <div className="instance-tools-notch__popover-group-label">{group.label}</div>
                    )}
                    {group.sliders?.map((slider) => (
                        <div key={slider.id} className="instance-tools-notch__popover-slider">
                            <label className="instance-tools-notch__popover-slider-label">
                                {slider.label}
                            </label>
                            <input
                                type="range"
                                className="instance-tools-notch__popover-slider-input"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step || 1}
                                value={values[slider.id] ?? slider.defaultValue ?? 0}
                                onChange={(e) => handleSliderChange(slider.id, e.target.value)}
                            />
                            <span className="instance-tools-notch__popover-slider-value">
                                {(values[slider.id] ?? slider.defaultValue ?? 0).toFixed(slider.precision ?? 0)}
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

function ToolButton({ tool, accentColor, onSelect }) {
    const [showMenu, setShowMenu] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const buttonRef = useRef(null);

    const hasMenu = tool.type === 'menu' && tool.options?.length > 0;
    const hasPopover = !!tool.popover;

    const handleClick = () => {
        if (hasMenu) {
            setShowMenu(!showMenu);
        } else if (hasPopover) {
            // Toggle popover, also fire the tool action
            setShowPopover(!showPopover);
            onSelect?.(tool);
        } else {
            onSelect?.(tool);
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                className={`instance-tools-notch__tool ${tool.active ? 'active' : ''} ${(hasMenu && showMenu) || (hasPopover && showPopover) ? 'menu-open' : ''}`}
                onClick={handleClick}
                disabled={tool.disabled}
                title={tool.description || tool.label}
            >
                <Icon name={tool.icon || 'box'} size={16} />
                {(hasMenu || hasPopover) && (
                    <Icon name="chevronUp" size={10} className="instance-tools-notch__tool-chevron" />
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
                />
            )}
            {hasPopover && (
                <ToolPopover
                    isOpen={showPopover}
                    onClose={() => setShowPopover(false)}
                    popover={tool.popover}
                    triggerRef={buttonRef}
                    accentColor={accentColor}
                />
            )}
        </>
    );
}

// =============================================================================
// TOOL GROUP
// =============================================================================

function ToolGroup({ tools, accentColor, onSelectTool }) {
    return (
        <div className="instance-tools-notch__group">
            {tools.map((tool, index) => {
                if (tool.type === 'separator') {
                    return <div key={`sep-${index}`} className="instance-tools-notch__separator" />;
                }
                return (
                    <ToolButton
                        key={tool.id || index}
                        tool={tool}
                        accentColor={accentColor}
                        onSelect={onSelectTool}
                    />
                );
            })}
        </div>
    );
}

// =============================================================================
// NOTCH ZONE - Two-row section matching Footer2 pattern
// =============================================================================

function NotchZone({ label, labelColor, children, className = '' }) {
    const labelColorClass = labelColor ? `notch-zone__label--${labelColor}` : '';
    return (
        <div className={`notch-zone ${className}`}>
            <div className={`notch-zone__label ${labelColorClass}`}>
                {label}
            </div>
            <div className="notch-zone__content">
                {children}
            </div>
        </div>
    );
}

// =============================================================================
// NOTCH DIVIDER - Two-row vertical divider
// =============================================================================

function NotchDivider() {
    return (
        <div className="notch-divider">
            <div className="notch-divider__label" />
            <div className="notch-divider__content" />
        </div>
    );
}

// =============================================================================
// NOTCH SPACER - Flexible spacer
// =============================================================================

function NotchSpacer() {
    return (
        <div className="notch-spacer">
            <div className="notch-spacer__label" />
            <div className="notch-spacer__content" />
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * InstanceToolsNotch - Full-width toolbar for active instance tools
 *
 * Layout: [View Selector ▼ (ViewHubFlyout)] | [Nav Controls] | [Tools...] | [More Button]
 *
 * Uses two-row zone layout matching Footer2:
 * Row 1: Section labels (14px)
 * Row 2: Tool content (28px)
 *
 * Data comes from useViewContextLogic hook for full integration
 * with the view management system.
 */
export const InstanceToolsNotch = memo(function InstanceToolsNotch({
    activeView,
    tools = [],
    toolSections = [],
    onSelectTool,
    onOpenFullTools,
    zoomLevel = 100,
    onZoomIn,
    onZoomOut,
    onFit,
    onResetCamera,
    accentPosition = 'top',
    className = '',
}) {
    const accentColor = activeView?.color || '#60a5fa';
    const colorRgb = hexToRgbString(accentColor);
    const hasTools = tools.length > 0;
    const isActive = !!activeView;
    const [showViewHub, setShowViewHub] = useState(false);
    const viewHubRef = useRef(null);

    // Get full view context data from the centralized hook
    const {
        onCanvasViews,
        availableViews: contextAvailableViews,
        onSelectView: contextSelectView,
        onViewAction,
        subsetIds,
    } = useViewContextLogic();

    // Determine if in subset mode (subset has selected views)
    const isSubset = subsetIds?.length > 0;

    // Group tools by section for sectioned rendering
    const toolsBySection = useMemo(() => {
        if (!toolSections.length || !tools.length) {
            return [{ section: null, tools }];
        }
        const groups = [];
        for (const section of toolSections) {
            const sectionTools = tools.filter(t => t.section === section.id);
            if (sectionTools.length > 0) {
                groups.push({ section, tools: sectionTools });
            }
        }
        // Catch any tools without a matching section
        const ungrouped = tools.filter(t => !toolSections.some(s => s.id === t.section));
        if (ungrouped.length > 0) {
            groups.push({ section: null, tools: ungrouped });
        }
        return groups;
    }, [tools, toolSections]);

    const handleToggleViewHub = useCallback(() => {
        setShowViewHub(prev => !prev);
    }, []);

    const handleCloseViewHub = useCallback(() => {
        setShowViewHub(false);
    }, []);

    // Close ViewHubFlyout on outside click
    useEffect(() => {
        if (!showViewHub) return;

        const handleClickOutside = (e) => {
            if (viewHubRef.current && !viewHubRef.current.contains(e.target)) {
                setShowViewHub(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') setShowViewHub(false);
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
    }, [showViewHub]);

    // Get the type icon for the active view
    const activeTypeIcon = activeView?.type
        ? (VIEW_TYPE_ICONS[activeView.type] || VIEW_TYPE_ICONS.default)
        : null;

    return (
        <div
            className={`instance-tools-notch ${isActive ? 'instance-tools-notch--active' : 'instance-tools-notch--inactive'} instance-tools-notch--accent-${accentPosition} ${className}`}
            style={{
                '--notch-color': accentColor,
                '--notch-color-rgb': colorRgb,
            }}
        >
            <div className="instance-tools-notch__container">
                {/* Active View Selector */}
                <NotchZone label="Active View" labelColor="cyan">
                    <div ref={viewHubRef} className="instance-tools-notch__view-indicator">
                        <button
                            className={`instance-tools-notch__view-selector ${showViewHub ? 'open' : ''}`}
                            onClick={handleToggleViewHub}
                            title={isActive ? `Active: ${activeView.name}` : 'Select a view'}
                        >
                            <span
                                className="instance-tools-notch__view-dot"
                                style={{ background: isActive ? accentColor : undefined }}
                            />
                            <span className="instance-tools-notch__view-name">
                                {isActive ? activeView.name : 'No view selected'}
                            </span>
                            {activeTypeIcon && (
                                <Icon
                                    name={activeTypeIcon}
                                    size={12}
                                    className="instance-tools-notch__view-type-icon"
                                />
                            )}
                            <Icon
                                name="chevronDown"
                                size={12}
                                className={`instance-tools-notch__view-chevron ${showViewHub ? 'instance-tools-notch__view-chevron--open' : ''}`}
                            />
                        </button>

                        {/* ViewHubFlyout */}
                        {showViewHub && (
                            <div className="instance-tools-notch__view-hub">
                                <ViewHubFlyout
                                    views={onCanvasViews || []}
                                    available={isSubset ? [] : (contextAvailableViews || [])}
                                    activeView={activeView}
                                    isSubset={isSubset}
                                    onSelect={contextSelectView}
                                    onAction={onViewAction}
                                    onClose={handleCloseViewHub}
                                />
                            </div>
                        )}
                    </div>
                </NotchZone>

                {/* Navigation controls */}
                {isActive && (
                    <>
                        <NotchDivider />
                        <NotchZone label="Navigation" labelColor="blue">
                            <div className="instance-tools-notch__nav-controls">
                                <button
                                    className="instance-tools-notch__tool"
                                    onClick={onZoomOut}
                                    title="Zoom out"
                                >
                                    <Icon name="zoomOut" size={16} />
                                </button>
                                <span className="instance-tools-notch__zoom-display">
                                    {Math.round(zoomLevel)}%
                                </span>
                                <button
                                    className="instance-tools-notch__tool"
                                    onClick={onZoomIn}
                                    title="Zoom in"
                                >
                                    <Icon name="zoomIn" size={16} />
                                </button>
                                <button
                                    className="instance-tools-notch__tool"
                                    onClick={onFit}
                                    title="Fit to view"
                                >
                                    <Icon name="scan" size={16} />
                                </button>
                                <button
                                    className="instance-tools-notch__tool"
                                    onClick={onResetCamera}
                                    title="Reset camera"
                                >
                                    <Icon name="rotateCcw" size={16} />
                                </button>
                            </div>
                        </NotchZone>
                    </>
                )}

                {/* Instance-specific tools grouped by section */}
                {isActive && hasTools && toolsBySection.map((group) => (
                    <React.Fragment key={group.section?.id || 'ungrouped'}>
                        <NotchDivider />
                        <NotchZone
                            label={group.section?.label || 'Tools'}
                            labelColor={group.section?.color || 'green'}
                        >
                            <ToolGroup
                                tools={group.tools}
                                accentColor={accentColor}
                                onSelectTool={onSelectTool}
                            />
                        </NotchZone>
                    </React.Fragment>
                ))}

                {/* Spacer - always present to extend label row across full width */}
                <NotchSpacer />

                {/* More button (only when active) */}
                {isActive && onOpenFullTools && (
                    <NotchZone label="" labelColor="">
                        <button
                            className="instance-tools-notch__more-btn"
                            onClick={onOpenFullTools}
                            title="Open full Instance Tools panel"
                        >
                            <Icon name="moreHorizontal" size={16} />
                        </button>
                    </NotchZone>
                )}
            </div>
        </div>
    );
});

export default InstanceToolsNotch;
