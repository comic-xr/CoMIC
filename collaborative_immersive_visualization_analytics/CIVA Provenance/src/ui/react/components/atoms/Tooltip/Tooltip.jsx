/**
 * @file Tooltip.jsx
 * @description Tooltip component for displaying contextual information on hover.
 * Supports simple text, rich content with titles and shortcuts, and interactive content.
 *
 * Features:
 * - Multiple placement options (top, bottom, left, right)
 * - Configurable show/hide delays
 * - Arrow pointer
 * - Rich tooltip with title, description, and keyboard shortcuts
 * - Interactive tooltips that stay open when hovered
 * - Automatic positioning with viewport-aware flipping
 * - Portal rendering to avoid overflow clipping
 * - Keyboard shortcut formatting for Mac/Windows
 *
 * @example
 * // Simple tooltip
 * import { Tooltip } from '@UI/react/components/atoms/Tooltip';
 *
 * <Tooltip content="Save changes">
 *   <button>Save</button>
 * </Tooltip>
 *
 * @example
 * // Rich tooltip with shortcut
 * <Tooltip
 *   content={
 *     <Tooltip.Rich
 *       title="Global Search"
 *       description="Search across all projects and views"
 *       shortcut="⌘K"
 *     />
 *   }
 * >
 *   <button>Search</button>
 * </Tooltip>
 *
 * @example
 * // Interactive tooltip
 * <Tooltip
 *   content={<UserCard user={user} />}
 *   interactive
 *   maxWidth={300}
 * >
 *   <Avatar user={user} />
 * </Tooltip>
 */

import React, {
    cloneElement,
    isValidElement,
    memo,
    useState,
    useEffect,
    useRef,
    useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTooltip } from './useTooltip';
import { useTooltipContext } from './TooltipProvider';
import { useAdaptive } from '@UI/react/context';
import './Tooltip.scss';

/**
 * @typedef {Object} TooltipProps
 * @property {React.ReactElement} children - Element to attach tooltip to (trigger)
 * @property {React.ReactNode} content - Tooltip content (text or element)
 * @property {'top'|'bottom'|'left'|'right'} [placement='top'] - Tooltip position
 * @property {number} [delay] - Delay before showing (ms), defaults to provider value
 * @property {number} [hideDelay=0] - Delay before hiding (ms)
 * @property {boolean} [disabled=false] - Disable tooltip
 * @property {boolean} [arrow=true] - Show arrow pointer
 * @property {number} [offset=8] - Distance from trigger
 * @property {'hover'|'click'|'focus'} [trigger='hover'] - How to trigger tooltip
 * @property {boolean} [interactive=false] - Allow hovering over tooltip content
 * @property {number} [maxWidth=250] - Max width before wrapping
 * @property {string} [mode] - Display mode: 'desktop' | 'vr' (default: from context)
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Detect if running on Mac
 * @returns {boolean}
 */
function isMac() {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Format keyboard shortcut for display
 * Converts symbols to platform-specific representations
 *
 * @param {string} shortcut - Shortcut string (e.g., "⌘K" or "Ctrl+K")
 * @returns {string[]} Array of key parts to display
 */
function formatShortcut(shortcut) {
    if (!shortcut) return [];

    // Split by + or space
    const parts = shortcut.split(/[+\s]+/).filter(Boolean);

    return parts.map(part => {
        // Normalize to symbols
        const normalized = part.toLowerCase();

        // Convert text to symbols based on platform
        if (normalized === 'cmd' || normalized === 'command' || part === '⌘') {
            return isMac() ? '⌘' : 'Ctrl';
        }
        if (normalized === 'ctrl' || normalized === 'control' || part === '⌃') {
            return isMac() ? '⌃' : 'Ctrl';
        }
        if (normalized === 'alt' || normalized === 'option' || part === '⌥') {
            return isMac() ? '⌥' : 'Alt';
        }
        if (normalized === 'shift' || part === '⇧') {
            return '⇧';
        }
        if (normalized === 'enter' || normalized === 'return') {
            return '↵';
        }
        if (normalized === 'escape' || normalized === 'esc') {
            return 'Esc';
        }
        if (normalized === 'backspace' || normalized === 'delete') {
            return '⌫';
        }
        if (normalized === 'tab') {
            return '⇥';
        }
        if (normalized === 'space') {
            return '␣';
        }

        // Return as uppercase single letter
        if (part.length === 1) {
            return part.toUpperCase();
        }

        return part;
    });
}

/**
 * @typedef {Object} RichTooltipProps
 * @property {string} title - Tooltip title (bold)
 * @property {string} [description] - Secondary description text
 * @property {string} [shortcut] - Keyboard shortcut to display
 * @property {React.ReactNode} [icon] - Icon to show
 */

/**
 * @typedef {Object} RichTooltipProps
 * @property {string} title - Tooltip title (bold)
 * @property {string} [description] - Secondary description text
 * @property {string} [shortcut] - Keyboard shortcut to display
 * @property {string|React.ReactNode} [icon] - Icon name string or pre-rendered element
 */

/**
 * Rich tooltip content with title, description, and shortcut.
 * 
 * FIXED: Now properly handles icon as either:
 * - A string icon name: "search", "save", "delete"
 * - A pre-rendered React element: <Icon name="search" size={14} />
 *
 * @param {RichTooltipProps} props - Component props
 * @returns {React.ReactElement} The rendered rich tooltip content
 */
function RichTooltip({ title, description, shortcut, icon }) {
    const shortcutParts = formatShortcut(shortcut);

    // Render icon - handle both string names and pre-rendered elements
    const renderIcon = () => {
        if (!icon) return null;

        // If it's already a React element, render it directly
        if (isValidElement(icon)) {
            return icon;
        }

        // If it's a string, use the Icon component
        if (typeof icon === 'string') {
            return <Icon name={icon} size={14} />;
        }

        return null;
    };

    return (
        <div className="tooltip__rich">
            <div className="tooltip__rich-header">
                {icon && (
                    <span className="tooltip__rich-icon">
                        {renderIcon()}
                    </span>
                )}
                <span className="tooltip__title">{title}</span>
            </div>

            {description && (
                <div className="tooltip__description">{description}</div>
            )}

            {shortcutParts.length > 0 && (
                <div className="tooltip__shortcut">
                    {shortcutParts.map((key, index) => (
                        <kbd key={index} className="kbd">{key}</kbd>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Adaptive tooltip component for displaying contextual information.
 *
 * @param {TooltipProps} props - Component props
 * @returns {React.ReactElement} The rendered tooltip
 */
function Tooltip({
    children,
    content,
    placement = 'top',
    delay: propDelay,
    hideDelay = 0,
    disabled = false,
    arrow = true,
    offset = 8,
    trigger = 'hover',
    interactive = false,
    maxWidth = 250,
    mode: modeProp,
    className = '',
    testId
}) {
    // Get global settings from provider
    const { delayDuration, disableHoverableContent, onTooltipOpen, onTooltipClose } = useTooltipContext();

    // Get adaptive context
    const adaptive = useAdaptive();
    const mode = modeProp || adaptive.mode || 'desktop';
    const isVR = mode === 'vr';

    // Use prop delay or fall back to provider default
    const delay = propDelay ?? delayDuration;

    // In VR mode, use larger max width and offset
    const effectiveMaxWidth = isVR ? Math.max(maxWidth, 320) : maxWidth;
    const effectiveOffset = isVR ? Math.max(offset, 12) : offset;

    // Animation state
    const [isExiting, setIsExiting] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const exitTimeoutRef = useRef(null);

    // Determine if interactive based on prop and global setting
    const isInteractive = interactive && !disableHoverableContent;

    // Use tooltip hook
    const {
        isVisible,
        show,
        hide,
        showImmediate,
        hideImmediate,
        position,
        arrowPosition,
        actualPlacement,
        triggerRef,
        tooltipRef,
        tooltipId,
        triggerProps,
        tooltipProps: hookTooltipProps
    } = useTooltip({
        placement,
        delay,
        hideDelay: isInteractive ? Math.max(hideDelay, 100) : hideDelay,
        offset: effectiveOffset,
        interactive: isInteractive,
        disabled
    });

    /**
     * Close with exit animation
     */
    const handleHide = useCallback(() => {
        setIsExiting(true);
        exitTimeoutRef.current = setTimeout(() => {
            setShouldRender(false);
            setIsExiting(false);
            hideImmediate();
            onTooltipClose();
        }, 75); // Match exit animation duration
    }, [hideImmediate, onTooltipClose]);

    /**
     * Show tooltip
     */
    const handleShow = useCallback(() => {
        if (disabled) return;

        // Clear any pending exit animation
        if (exitTimeoutRef.current) {
            clearTimeout(exitTimeoutRef.current);
            exitTimeoutRef.current = null;
            setIsExiting(false);
        }

        show();
    }, [disabled, show]);

    // Track when tooltip becomes visible
    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            setIsExiting(false);
            onTooltipOpen();
        }
    }, [isVisible, onTooltipOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
            }
        };
    }, []);

    // Don't render anything if disabled or no content
    if (disabled || !content) {
        return children;
    }

    // Build event handlers based on trigger type
    let eventHandlers = {};

    if (trigger === 'hover') {
        eventHandlers = {
            onMouseEnter: handleShow,
            onMouseLeave: () => {
                if (!isInteractive) {
                    handleHide();
                } else {
                    hide();
                }
            },
            onFocus: handleShow,
            onBlur: () => {
                if (!isInteractive) {
                    handleHide();
                } else {
                    hide();
                }
            }
        };
    } else if (trigger === 'click') {
        eventHandlers = {
            onClick: (e) => {
                if (isVisible) {
                    handleHide();
                } else {
                    handleShow();
                }
                // Call original onClick if exists
                if (isValidElement(children) && children.props.onClick) {
                    children.props.onClick(e);
                }
            }
        };
    } else if (trigger === 'focus') {
        eventHandlers = {
            onFocus: handleShow,
            onBlur: handleHide
        };
    }

    // Clone trigger element with props
    const triggerElement = isValidElement(children)
        ? cloneElement(children, {
            ref: triggerRef,
            'aria-describedby': isVisible ? tooltipId : undefined,
            ...eventHandlers
        })
        : children;

    // Build tooltip class names
    const tooltipClassNames = [
        'tooltip',
        `tooltip--${actualPlacement}`,
        isVR && 'tooltip--vr',
        isExiting && 'tooltip--exiting',
        isInteractive && 'tooltip--interactive',
        className
    ].filter(Boolean).join(' ');

    // Calculate arrow position style
    const getArrowStyle = () => {
        const style = {};

        if (actualPlacement === 'top' || actualPlacement === 'bottom') {
            style.left = `${arrowPosition.x}px`;
        } else {
            style.top = `${arrowPosition.y}px`;
        }

        return style;
    };

    return (
        <>
            {triggerElement}
            {shouldRender && createPortal(
                <div
                    {...hookTooltipProps}
                    className={tooltipClassNames}
                    style={{
                        ...hookTooltipProps.style,
                        maxWidth: `${effectiveMaxWidth}px`
                    }}
                    data-testid={testId}
                    data-placement={actualPlacement}
                    onMouseEnter={isInteractive ? hookTooltipProps.onMouseEnter : undefined}
                    onMouseLeave={isInteractive ? () => handleHide() : undefined}
                >
                    {/* Arrow */}
                    {arrow && (
                        <div
                            className="tooltip__arrow"
                            style={getArrowStyle()}
                        />
                    )}

                    {/* Content */}
                    <div className="tooltip__content">
                        {content}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

// Attach Rich component to Tooltip
Tooltip.Rich = RichTooltip;

// Memoize to prevent unnecessary re-renders
const MemoizedTooltip = memo(Tooltip);
MemoizedTooltip.Rich = RichTooltip;

export default MemoizedTooltip;
export { Tooltip, RichTooltip, formatShortcut };