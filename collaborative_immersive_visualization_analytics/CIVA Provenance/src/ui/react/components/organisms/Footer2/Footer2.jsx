/**
 * @file Footer2.jsx
 * @description Shared canvas toolbar footer with ViewGroup selector and links.
 *
 * Features:
 * - Section headers (like ToolbarZone) for visual organization
 * - ViewGroup selector with dropdown, search, settings
 * - Responsive links section (expanded/collapsed/minimal)
 * - Focus/Subset controls
 * - Universal actions (snapshot, reset)
 * - VR mode button
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { Button, Icon, Tooltip } from '@UI/react/components/atoms';
import { DuplicationDialog } from '@UI/react/components/modals/DuplicationDialog';
import { ViewGroupSelector } from './components/ViewGroupSelector/ViewGroupSelector';
import { LinksSection } from './components/LinksSection/LinksSection';
import { hexToRgbString } from '@Utils/colorUtils.js';
import {
    useFooterLayout,
    useLinkStats,
    useLinkReminderToast,
    useDuplicationDialog,
    FOOTER_BREAKPOINTS,
} from './Footer2.logic';
import './Footer2.scss';

/**
 * FooterZone - Section with label header (like ToolbarZone but for footer)
 * Labels always visible - minimum width ensures everything fits
 */
const FooterZone = memo(function FooterZone({ label, labelColor, children, className = '' }) {
    const labelColorClass = labelColor ? `footer2-zone__label--${labelColor}` : '';
    return (
        <div className={`footer2-zone ${className}`}>
            <div className={`footer2-zone__label ${labelColorClass}`}>
                {label}
            </div>
            <div className="footer2-zone__content">
                {children}
            </div>
        </div>
    );
});

FooterZone.propTypes = {
    label: PropTypes.string.isRequired,
    labelColor: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
};

/**
 * FooterDivider - Vertical divider spanning both rows
 */
const FooterDivider = memo(function FooterDivider() {
    return (
        <div className="footer2-divider">
            <div className="footer2-divider__label" />
            <div className="footer2-divider__content" />
        </div>
    );
});

/**
 * FooterSpacer - Flexible spacer
 */
const FooterSpacer = memo(function FooterSpacer() {
    return (
        <div className="footer2-spacer">
            <div className="footer2-spacer__label" />
            <div className="footer2-spacer__content" />
        </div>
    );
});

/**
 * Focus/Subset Section Content (icons only)
 */
const FocusSubsetContent = memo(function FocusSubsetContent({
    isFocused,
    onToggleFocus,
    activeSubset,
    onOpenSubsetDropdown,
}) {
    return (
        <div className="footer2__button-group">
            <Tooltip content={isFocused ? 'Exit Focus Mode' : 'Focus View'} shortcut="F">
                <Button
                    variant={isFocused ? 'primary' : 'ghost'}
                    size="sm"
                    icon="maximize"
                    onClick={onToggleFocus}
                    aria-pressed={isFocused}
                />
            </Tooltip>
            <Tooltip content="Data Subset">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="database"
                    onClick={onOpenSubsetDropdown}
                />
            </Tooltip>
        </div>
    );
});

FocusSubsetContent.propTypes = {
    isFocused: PropTypes.bool,
    onToggleFocus: PropTypes.func,
    activeSubset: PropTypes.object,
    onOpenSubsetDropdown: PropTypes.func,
};

/**
 * Universal Actions Content (icons only)
 */
const UniversalActionsContent = memo(function UniversalActionsContent({
    onSnapshot,
    onResetView,
    onDuplicateView,
    onViewSettings,
}) {
    return (
        <div className="footer2__button-group">
            <Tooltip content="Take Snapshot" shortcut="Ctrl+S">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="camera"
                    onClick={onSnapshot}
                />
            </Tooltip>
            <Tooltip content="Reset View" shortcut="Home">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="rotateCcw"
                    onClick={onResetView}
                />
            </Tooltip>
            <Tooltip content="Duplicate View">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="copy"
                    onClick={onDuplicateView}
                />
            </Tooltip>
            <Tooltip content="View Settings">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="settings"
                    onClick={onViewSettings}
                />
            </Tooltip>
        </div>
    );
});

UniversalActionsContent.propTypes = {
    onSnapshot: PropTypes.func,
    onResetView: PropTypes.func,
    onDuplicateView: PropTypes.func,
    onViewSettings: PropTypes.func,
};

/**
 * FooterToolMenu - Portal-based dropdown for menu-type footer tools
 * Supports: regular items, separator, header, slider-with-presets, position-grid
 */
const FooterToolMenu = memo(function FooterToolMenu({ isOpen, onClose, options, triggerRef }) {
    const menuRef = useRef(null);
    const [style, setStyle] = useState({});

    // Position above the trigger button, clamped to viewport
    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const triggerEl = triggerRef.current;
            // Walk up to find the actual DOM node if ref is on a React component
            const triggerRect = triggerEl.getBoundingClientRect();
            const menuEl = menuRef.current;

            // Base position: centered above trigger
            let left = triggerRect.left + triggerRect.width / 2;
            let bottom = window.innerHeight - triggerRect.top + 6;

            if (menuEl) {
                const menuRect = menuEl.getBoundingClientRect();
                const menuWidth = menuRect.width;
                const menuHeight = menuRect.height;

                // Clamp horizontal: keep 8px margin from edges
                const halfWidth = menuWidth / 2;
                if (left - halfWidth < 8) {
                    left = halfWidth + 8;
                } else if (left + halfWidth > window.innerWidth - 8) {
                    left = window.innerWidth - halfWidth - 8;
                }

                // If menu would overflow top of viewport, flip to below trigger
                const topEdge = window.innerHeight - bottom - menuHeight;
                if (topEdge < 8) {
                    // Position below the trigger instead
                    bottom = window.innerHeight - triggerRect.bottom - 6;
                }
            }

            setStyle({
                position: 'fixed',
                bottom: `${bottom}px`,
                left: `${left}px`,
                transform: 'translateX(-50%)',
                zIndex: 10000,
            });
        };

        // Run positioning twice: once immediately for initial render,
        // then after a frame so menuRef dimensions are available
        updatePosition();
        const rafId = requestAnimationFrame(updatePosition);

        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('resize', updatePosition);
            cancelAnimationFrame(rafId);
        };
    }, [isOpen, triggerRef]);

    // Close on outside click / escape
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

    const handleOptionClick = (option) => {
        if (option.onClick) {
            option.onClick();
        }
    };

    return createPortal(
        <div
            className="footer2-tool-menu"
            ref={menuRef}
            style={style}
        >
            {options.map((option, index) => {
                // Separator
                if (option.type === 'separator') {
                    return <div key={`sep-${index}`} className="footer2-tool-menu__divider" />;
                }

                // Header
                if (option.type === 'header') {
                    return (
                        <div key={`hdr-${index}`} className="footer2-tool-menu__header">
                            {option.label}
                        </div>
                    );
                }

                // Slider with presets
                if (option.type === 'slider-with-presets') {
                    return (
                        <FooterToolSlider
                            key={option.id || index}
                            option={option}
                        />
                    );
                }

                // Position grid
                if (option.type === 'position-grid') {
                    return (
                        <FooterToolPositionGrid
                            key={option.id || index}
                            option={option}
                        />
                    );
                }

                // Regular clickable item
                return (
                    <button
                        key={option.id || index}
                        className={`footer2-tool-menu__item ${option.active ? 'active' : ''}`}
                        onClick={() => handleOptionClick(option)}
                        disabled={option.disabled}
                    >
                        {option.icon && <Icon name={option.icon} size={14} />}
                        <span className="footer2-tool-menu__item-label">{option.label}</span>
                        {option.active && <Icon name="check" size={12} className="footer2-tool-menu__item-check" />}
                    </button>
                );
            })}
        </div>,
        document.body
    );
});

/**
 * FooterToolSlider - Slider with optional presets inside footer tool menu
 */
const FooterToolSlider = memo(function FooterToolSlider({ option }) {
    const [value, setValue] = useState(option.value ?? 0);

    const handleChange = (e) => {
        const newValue = parseFloat(e.target.value);
        setValue(newValue);
        option.onChange?.(newValue);
    };

    const handlePresetClick = (preset) => {
        setValue(preset);
        option.onChange?.(preset);
    };

    const formatValue = option.formatValue || ((v) => v);

    return (
        <div className="footer2-tool-menu__slider">
            {option.label && (
                <div className="footer2-tool-menu__slider-header">
                    {option.icon && <Icon name={option.icon} size={12} />}
                    <span>{option.label}</span>
                    <span className="footer2-tool-menu__slider-value">{formatValue(value)}</span>
                </div>
            )}
            <input
                type="range"
                className="footer2-tool-menu__slider-input"
                min={option.min}
                max={option.max}
                step={option.step || 1}
                value={value}
                onChange={handleChange}
                disabled={option.disabled}
            />
            {option.presets && (
                <div className="footer2-tool-menu__slider-presets">
                    {option.presets.map((preset) => (
                        <button
                            key={preset}
                            className={`footer2-tool-menu__slider-preset ${value === preset ? 'active' : ''}`}
                            onClick={() => handlePresetClick(preset)}
                        >
                            {formatValue(preset)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

/**
 * FooterToolPositionGrid - 2x2 corner position picker inside footer tool menu
 */
const FooterToolPositionGrid = memo(function FooterToolPositionGrid({ option }) {
    const [current, setCurrent] = useState(option.currentPosition);

    const handlePositionClick = (positionId) => {
        setCurrent(positionId);
        option.onPositionChange?.(positionId);
    };

    return (
        <div className="footer2-tool-menu__position-grid">
            {option.positions.map((pos) => (
                <button
                    key={pos.id}
                    className={`footer2-tool-menu__position-btn ${current === pos.id ? 'active' : ''}`}
                    onClick={() => handlePositionClick(pos.id)}
                    title={pos.label}
                >
                    <Icon name={pos.icon} size={14} />
                </button>
            ))}
        </div>
    );
});

/**
 * FooterToolButton - Renders a single handler-provided tool as a footer button
 * Supports 'menu' type (opens dropdown with options) and simple action tools
 * Accepts a `disabled` prop to force-disable when no active instance
 */
const FooterToolButton = memo(function FooterToolButton({ tool, onSelectTool, disabled = false }) {
    const [showMenu, setShowMenu] = useState(false);
    const wrapperRef = useRef(null);

    const isDisabled = disabled || tool.disabled;
    const hasMenu = tool.type === 'menu' && tool.options?.length > 0;

    const handleClick = () => {
        if (isDisabled) return;
        if (hasMenu) {
            setShowMenu(!showMenu);
        } else {
            if (tool.onClick) {
                tool.onClick();
            }
            onSelectTool?.(tool);
        }
    };

    return (
        <span ref={wrapperRef} style={{ display: 'inline-flex' }}>
            <Tooltip content={tool.description || tool.label}>
                <Button
                    variant={tool.active && !isDisabled ? 'primary' : 'ghost'}
                    size="sm"
                    icon={tool.icon || 'box'}
                    onClick={handleClick}
                    disabled={isDisabled}
                    aria-pressed={tool.active || undefined}
                    aria-haspopup={hasMenu || undefined}
                    aria-expanded={hasMenu ? showMenu : undefined}
                />
            </Tooltip>
            {hasMenu && !isDisabled && (
                <FooterToolMenu
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                    options={tool.options}
                    triggerRef={wrapperRef}
                />
            )}
        </span>
    );
});

FooterToolButton.propTypes = {
    tool: PropTypes.object.isRequired,
    onSelectTool: PropTypes.func,
    disabled: PropTypes.bool,
};

/**
 * VR Button Content (icon only)
 */
const VRContent = memo(function VRContent({ isVRAvailable, isInVR, onToggleVR }) {
    if (!isVRAvailable) return null;

    return (
        <Tooltip content={isInVR ? 'Exit VR' : 'Enter VR'}>
            <Button
                variant={isInVR ? 'primary' : 'ghost'}
                size="sm"
                icon="vrHeadset"
                onClick={onToggleVR}
                className="footer2__vr-button"
                aria-label={isInVR ? 'Exit VR' : 'Enter VR'}
            />
        </Tooltip>
    );
});

VRContent.propTypes = {
    isVRAvailable: PropTypes.bool,
    isInVR: PropTypes.bool,
    onToggleVR: PropTypes.func,
};

/**
 * Link Reminder Toast
 */
const LinkReminderToast = memo(function LinkReminderToast({
    isVisible,
    linkCount,
    onDismiss,
    onDisableLinks,
}) {
    if (!isVisible) return null;

    return (
        <div className="footer2__link-reminder">
            <Icon name="link" size={16} />
            <div className="footer2__link-reminder-content">
                <div className="footer2__link-reminder-title">
                    This ViewGroup has active links
                </div>
                <div className="footer2__link-reminder-subtitle">
                    {linkCount} properties syncing with other views
                </div>
            </div>
            <div className="footer2__link-reminder-actions">
                <Button variant="ghost" size="sm" onClick={onDisableLinks}>
                    Disable Links
                </Button>
                <Button variant="primary" size="sm" onClick={onDismiss}>
                    Got it
                </Button>
            </div>
        </div>
    );
});

LinkReminderToast.propTypes = {
    isVisible: PropTypes.bool,
    linkCount: PropTypes.number,
    onDismiss: PropTypes.func,
    onDisableLinks: PropTypes.func,
};

/**
 * Footer2 - Main component with ToolbarZone-style sections
 */
const Footer2 = memo(function Footer2({
    // ViewGroup data
    viewGroups = [],
    activeViewGroupId,
    onSelectViewGroup,
    onCreateViewGroup,
    onUpdateViewGroup,
    onDeleteViewGroup,
    onDuplicateViewGroup,
    onGoToViewGroup,
    // View data
    activeViewType = 'vtk-volume',
    // Focus/Subset
    isFocused = false,
    onToggleFocus,
    activeSubset = null,
    onOpenSubsetDropdown,
    // Actions
    onSnapshot,
    onResetView,
    onDuplicateView,
    onViewSettings,
    onOpenLayoutTab,
    onOpenLinkManager,
    // Instance tools from handler (footer-placed)
    instanceTools = [],
    toolSections = [],
    onSelectTool,
    // VR
    isVRAvailable = false,
    isInVR = false,
    onToggleVR,
    // Linking
    linkingService,
    // Active view accent color (for gradient + accent line)
    activeViewColor = null,
    // Sizing
    containerWidth = 900,
}) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(containerWidth);
    const [isOverflowing, setIsOverflowing] = useState(false);

    // Compute CSS custom properties for accent color
    const accentStyle = useMemo(() => {
        if (!activeViewColor) return {};
        return {
            '--footer-color': activeViewColor,
            '--footer-color-rgb': hexToRgbString(activeViewColor),
        };
    }, [activeViewColor]);
    const isActive = !!activeViewColor;

    // Responsive layout
    const {
        mode,
        showLabels,
        showTypeSpecific,
        showUniversal,
        isMinimal,
        isCompact,
        isFull,
    } = useFooterLayout(width);

    // Determine links display mode: condense when footer is overflowing
    const linksMode = isOverflowing ? 'minimal' : mode;

    // Link stats
    const { linkStats, totalActiveLinks, hasActiveLinks } = useLinkStats(
        activeViewGroupId,
        linkingService
    );

    // Link reminder
    const {
        showReminder,
        checkAndShowReminder,
        dismissReminder,
        disableLinksAndDismiss,
    } = useLinkReminderToast();

    // Duplication dialog
    const {
        isOpen: isDuplicationOpen,
        viewGroupToDuplicate,
        openDialog: openDuplicationDialog,
        closeDialog: closeDuplicationDialog,
        confirmDuplication,
    } = useDuplicationDialog();

    // Handle duplicate action - opens dialog if ViewGroup has links
    const handleDuplicateViewGroup = useCallback((viewGroup) => {
        const viewGroupStats = {};
        // Compute link stats for this specific ViewGroup
        if (linkingService) {
            const props = ['camera', 'filters', 'colorMaps', 'widgets', 'cursors', 'annotations'];
            props.forEach(prop => {
                const links = linkingService?.getLinksForProperty?.(viewGroup.id, prop) || [];
                viewGroupStats[prop] = { count: links.length };
            });
        }

        const hasLinks = Object.values(viewGroupStats).some(s => s?.count > 0);

        if (hasLinks) {
            // Open dialog to choose link handling
            openDuplicationDialog(viewGroup);
        } else {
            // No links, duplicate directly
            onDuplicateViewGroup?.(viewGroup.id, 'noLinks');
        }
    }, [linkingService, openDuplicationDialog, onDuplicateViewGroup]);

    // Handle duplication confirmation from dialog
    const handleDuplicationConfirm = useCallback((linkOption) => {
        if (viewGroupToDuplicate) {
            onDuplicateViewGroup?.(viewGroupToDuplicate.id, linkOption);
        }
    }, [viewGroupToDuplicate, onDuplicateViewGroup]);

    // Track container width and detect overflow
    useEffect(() => {
        if (!containerRef.current) return;

        const checkOverflow = () => {
            const el = containerRef.current;
            if (el) {
                setIsOverflowing(el.scrollWidth > el.clientWidth + 2);
            }
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setWidth(entry.contentRect.width);
                checkOverflow();
            }
        });

        observer.observe(containerRef.current);
        // Initial check after mount
        requestAnimationFrame(checkOverflow);
        return () => observer.disconnect();
    }, []);

    // Check for link reminder when ViewGroup changes
    useEffect(() => {
        if (activeViewGroupId && hasActiveLinks) {
            checkAndShowReminder(activeViewGroupId, hasActiveLinks);
        }
    }, [activeViewGroupId, hasActiveLinks, checkAndShowReminder]);

    // Get active ViewGroup
    const activeViewGroup = viewGroups.find(vg => vg.id === activeViewGroupId) || null;

    // Group footer tools by section for zone rendering
    const footerToolGroups = useMemo(() => {
        if (!instanceTools.length) return [];
        if (!toolSections.length) {
            return [{ section: { id: 'tools', label: 'Tools', icon: 'box', color: 'green' }, tools: instanceTools }];
        }
        const groups = [];
        for (const section of toolSections) {
            const sectionTools = instanceTools.filter(t => t.section === section.id);
            if (sectionTools.length > 0) {
                groups.push({ section, tools: sectionTools });
            }
        }
        const ungrouped = instanceTools.filter(t => !toolSections.some(s => s.id === t.section));
        if (ungrouped.length > 0) {
            groups.push({ section: { id: 'other', label: 'Other', color: 'gray' }, tools: ungrouped });
        }
        return groups;
    }, [instanceTools, toolSections]);

    return (
        <div
            ref={containerRef}
            className={`footer2 footer2--${mode} ${isActive ? 'footer2--active' : 'footer2--inactive'}`}
            style={{ ...accentStyle, minWidth: FOOTER_BREAKPOINTS.MIN_WIDTH }}
        >
            {/* Focus Zone */}
            <FooterZone label="Focus" labelColor="blue">
                <FocusSubsetContent
                    isFocused={isFocused}
                    onToggleFocus={onToggleFocus}
                    activeSubset={activeSubset}
                    onOpenSubsetDropdown={onOpenSubsetDropdown}
                />
            </FooterZone>
            <FooterDivider />

            {/* Actions Zone */}
            <FooterZone label="Actions" labelColor="amber">
                <UniversalActionsContent
                    onSnapshot={onSnapshot}
                    onResetView={onResetView}
                    onDuplicateView={onDuplicateView}
                    onViewSettings={onViewSettings}
                />
            </FooterZone>
            <FooterDivider />

            {/* Instance Tools - grouped by handler sections */}
            {footerToolGroups.map((group, index) => (
                <React.Fragment key={group.section.id}>
                    <FooterZone label={group.section.label} labelColor={group.section.color || 'green'}>
                        <div className="footer2__button-group">
                            {group.tools.map(tool => (
                                <FooterToolButton
                                    key={tool.id}
                                    tool={tool}
                                    onSelectTool={onSelectTool}
                                    disabled={!isActive}
                                />
                            ))}
                        </div>
                    </FooterZone>
                    <FooterDivider />
                </React.Fragment>
            ))}
            {footerToolGroups.length === 0 && <FooterDivider />}

            {/* Spacer */}
            <FooterSpacer />

            {/* ViewGroup Zone (center) */}
            <FooterZone label="ViewGroup" labelColor="purple" className="footer2-zone--center">
                <ViewGroupSelector
                    viewGroups={viewGroups}
                    activeViewGroup={activeViewGroup}
                    mode={mode}
                    onSelectViewGroup={onSelectViewGroup}
                    onCreateViewGroup={onCreateViewGroup}
                    onUpdateViewGroup={onUpdateViewGroup}
                    onDeleteViewGroup={onDeleteViewGroup}
                    onDuplicateViewGroup={handleDuplicateViewGroup}
                    onGoToViewGroup={onGoToViewGroup}
                    onOpenLayoutTab={onOpenLayoutTab}
                />
            </FooterZone>

            {/* Spacer */}
            <FooterSpacer />

            <FooterDivider />

            {/* Links Zone */}
            <FooterZone label="Links" labelColor="teal">
                <LinksSection
                    mode={linksMode}
                    linkStats={linkStats}
                    totalActiveLinks={totalActiveLinks}
                    activeViewType={activeViewType}
                    onOpenLinkManager={onOpenLinkManager}
                    hideLabel={true}
                />
            </FooterZone>

            {/* VR Zone - only if VR available */}
            {isVRAvailable && (
                <>
                    <FooterDivider />
                    <FooterZone label="VR" labelColor="cyan">
                        <VRContent
                            isVRAvailable={isVRAvailable}
                            isInVR={isInVR}
                            onToggleVR={onToggleVR}
                        />
                    </FooterZone>
                </>
            )}

            {/* Link Reminder Toast */}
            <LinkReminderToast
                isVisible={showReminder}
                linkCount={totalActiveLinks}
                onDismiss={dismissReminder}
                onDisableLinks={disableLinksAndDismiss}
            />

            {/* Duplication Dialog */}
            <DuplicationDialog
                isOpen={isDuplicationOpen}
                onClose={closeDuplicationDialog}
                viewGroup={viewGroupToDuplicate}
                linkStats={linkStats}
                onConfirm={handleDuplicationConfirm}
            />
        </div>
    );
});

Footer2.propTypes = {
    // ViewGroup data
    viewGroups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
        layoutId: PropTypes.string,
        views: PropTypes.arrayOf(PropTypes.string),
        linkedTo: PropTypes.string,
    })),
    activeViewGroupId: PropTypes.string,
    onSelectViewGroup: PropTypes.func,
    onCreateViewGroup: PropTypes.func,
    onUpdateViewGroup: PropTypes.func,
    onDeleteViewGroup: PropTypes.func,
    onDuplicateViewGroup: PropTypes.func,
    onGoToViewGroup: PropTypes.func,
    // View data
    activeViewType: PropTypes.string,
    // Focus/Subset
    isFocused: PropTypes.bool,
    onToggleFocus: PropTypes.func,
    activeSubset: PropTypes.object,
    onOpenSubsetDropdown: PropTypes.func,
    // Actions
    onSnapshot: PropTypes.func,
    onResetView: PropTypes.func,
    onDuplicateView: PropTypes.func,
    onViewSettings: PropTypes.func,
    onOpenLayoutTab: PropTypes.func,
    onOpenLinkManager: PropTypes.func,
    // Instance tools from handler
    instanceTools: PropTypes.array,
    toolSections: PropTypes.array,
    onSelectTool: PropTypes.func,
    // VR
    isVRAvailable: PropTypes.bool,
    isInVR: PropTypes.bool,
    onToggleVR: PropTypes.func,
    // Linking
    linkingService: PropTypes.object,
    // Active view accent color (hex)
    activeViewColor: PropTypes.string,
    // Sizing
    containerWidth: PropTypes.number,
};

export { Footer2 };
export default Footer2;
