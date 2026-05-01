/**
 * @file DropdownPortal.jsx
 * @description Portal wrapper for dropdown menus that need to escape overflow containers.
 * 
 * WHY PORTALS?
 * Secondary bars have overflow handling for responsive behavior. Dropdowns need to
 * render outside these containers to display fully. This component:
 * 1. Renders children to document.body via React Portal
 * 2. Positions dropdown relative to trigger element
 * 3. Handles click-outside dismissal
 * 4. Manages z-index stacking
 * 
 * @example
 * const [open, setOpen] = useState(false);
 * const triggerRef = useRef(null);
 * 
 * <button ref={triggerRef} onClick={() => setOpen(!open)}>
 *   Open Menu
 * </button>
 * 
 * <DropdownPortal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   triggerRef={triggerRef}
 *   align="start"
 *   position="bottom"
 * >
 *   <DropdownMenu>...</DropdownMenu>
 * </DropdownPortal>
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

import './DropdownPortal.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const PORTAL_Z_INDEX = 10000;
const VIEWPORT_PADDING = 8; // Min distance from viewport edge

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Portal wrapper for dropdown menus.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether dropdown is visible
 * @param {Function} props.onClose - Callback when dropdown should close
 * @param {React.RefObject} props.triggerRef - Ref to the trigger element for positioning
 * @param {'start' | 'center' | 'end'} [props.align='start'] - Horizontal alignment
 * @param {'top' | 'bottom'} [props.position='bottom'] - Vertical position
 * @param {number} [props.offset=4] - Gap between trigger and dropdown
 * @param {React.ReactNode} props.children - Dropdown content
 * @param {string} [props.className] - Additional CSS class
 */
export function DropdownPortal({
    open,
    onClose,
    triggerRef,
    align = 'start',
    position = 'bottom',
    offset = 4,
    children,
    className = '',
}) {
    const dropdownRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [hasPosition, setHasPosition] = useState(false);
    const [mounted, setMounted] = useState(false);

    // ==========================================================================
    // Position Calculation
    // ==========================================================================

    const updatePosition = useCallback(() => {
        if (!triggerRef?.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const dropdownRect = dropdownRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        let top, left;

        // Vertical position
        if (position === 'bottom') {
            top = triggerRect.bottom + offset;
            // Flip to top if not enough space below
            if (top + dropdownRect.height > viewport.height - VIEWPORT_PADDING) {
                top = triggerRect.top - dropdownRect.height - offset;
            }
        } else {
            top = triggerRect.top - dropdownRect.height - offset;
            // Flip to bottom if not enough space above
            if (top < VIEWPORT_PADDING) {
                top = triggerRect.bottom + offset;
            }
        }

        // Horizontal alignment
        switch (align) {
            case 'start':
                left = triggerRect.left;
                break;
            case 'center':
                left = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
                break;
            case 'end':
                left = triggerRect.right - dropdownRect.width;
                break;
            default:
                left = triggerRect.left;
        }

        // Clamp to viewport
        left = Math.max(
            VIEWPORT_PADDING,
            Math.min(left, viewport.width - dropdownRect.width - VIEWPORT_PADDING)
        );
        top = Math.max(
            VIEWPORT_PADDING,
            Math.min(top, viewport.height - dropdownRect.height - VIEWPORT_PADDING)
        );

        setCoords({ top, left });
        setHasPosition(true);
    }, [triggerRef, align, position, offset]);

    // ==========================================================================
    // Effects
    // ==========================================================================

    // Mount portal container
    useEffect(() => {
        setMounted(true);
    }, []);

    // Update position when open
    useEffect(() => {
        if (open) {
            setHasPosition(false);
            // Initial position after render
            requestAnimationFrame(() => requestAnimationFrame(updatePosition));

            // Update on scroll/resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [open, updatePosition]);

    // Click outside to close
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                triggerRef?.current &&
                !triggerRef.current.contains(event.target)
            ) {
                onClose?.();
            }
        };

        // Escape key to close
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose, triggerRef]);

    // ==========================================================================
    // Render
    // ==========================================================================

    if (!mounted || !open) return null;

    const portalContent = (
        <div
            ref={dropdownRef}
            className={`dropdown-portal ${className}`}
            style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: PORTAL_Z_INDEX,
                visibility: hasPosition ? 'visible' : 'hidden',
                pointerEvents: hasPosition ? 'auto' : 'none',
            }}
            role="menu"
        >
            {children}
        </div>
    );

    return createPortal(portalContent, document.body);
}

// =============================================================================
// Hook for dropdown state management
// =============================================================================

/**
 * Hook for managing dropdown state with trigger ref.
 * 
 * @example
 * const { open, setOpen, triggerRef, triggerProps, portalProps } = useDropdown();
 * 
 * <button ref={triggerRef} {...triggerProps}>Menu</button>
 * <DropdownPortal {...portalProps}>
 *   <Menu />
 * </DropdownPortal>
 */
export function useDropdown() {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);

    const toggle = useCallback(() => setOpen(prev => !prev), []);
    const close = useCallback(() => setOpen(false), []);

    return {
        open,
        setOpen,
        toggle,
        close,
        triggerRef,
        triggerProps: {
            ref: triggerRef,
            onClick: toggle,
            'aria-expanded': open,
            'aria-haspopup': true,
        },
        portalProps: {
            open,
            onClose: close,
            triggerRef,
        },
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DropdownPortal;
