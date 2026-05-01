/**
 * @file Dropdown.jsx
 * @description Base dropdown component that handles positioning, animations, and portal rendering.
 * Provides a flexible foundation for menus, selects, and popovers.
 *
 * Features:
 * - Controlled and uncontrolled modes
 * - Viewport-aware positioning with automatic flip
 * - Portal rendering to avoid overflow clipping
 * - Smooth enter/exit animations
 * - Click outside and Escape key handling
 * - Full keyboard navigation support
 * - ARIA accessibility attributes
 *
 * @example
 * // Basic dropdown with custom content
 * <Dropdown trigger={<Button>Open Menu</Button>}>
 *   <div style={{ padding: 16 }}>
 *     Custom dropdown content
 *   </div>
 * </Dropdown>
 *
 * @example
 * // Controlled mode
 * const [isOpen, setIsOpen] = useState(false);
 * <Dropdown
 *   trigger={<Button>Menu</Button>}
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 *   placement="bottom-end"
 * >
 *   <DropdownMenu items={menuItems} />
 * </Dropdown>
 *
 * @example
 * // Match trigger width (useful for selects)
 * <Dropdown
 *   trigger={<SelectTrigger />}
 *   matchTriggerWidth
 *   placement="bottom-start"
 * >
 *   <OptionsList />
 * </Dropdown>
 */

import React, {
    cloneElement,
    useCallback,
    useState,
    useEffect,
    useRef,
    memo,
    createContext,
    useContext
} from 'react';
import { createPortal } from 'react-dom';
import { useDropdown } from './useDropdown';
import './Dropdown.scss';

/**
 * Context for sharing dropdown state with children
 * @type {React.Context}
 */
const DropdownContext = createContext(null);

/**
 * Hook to access dropdown context
 * @returns {Object} Dropdown context value
 */
export function useDropdownContext() {
    const context = useContext(DropdownContext);
    if (!context) {
        throw new Error('useDropdownContext must be used within a Dropdown');
    }
    return context;
}

/**
 * @typedef {Object} DropdownProps
 * @property {React.ReactElement} trigger - Element that triggers dropdown (button, input, etc.)
 * @property {React.ReactNode} children - Dropdown content
 * @property {boolean} [isOpen] - Controlled open state
 * @property {(open: boolean) => void} [onOpenChange] - Callback when open state changes
 * @property {'bottom-start'|'bottom-end'|'bottom'|'top-start'|'top-end'|'top'|'left'|'right'} [placement='bottom-start'] - Dropdown position
 * @property {boolean} [closeOnSelect=true] - Close dropdown when item selected
 * @property {boolean} [closeOnClickOutside=true] - Close when clicking outside
 * @property {boolean} [closeOnEscape=true] - Close when Escape pressed
 * @property {number} [offset=4] - Distance from trigger in pixels
 * @property {boolean} [matchTriggerWidth=false] - Match dropdown width to trigger
 * @property {boolean} [portal=true] - Render in portal (document.body)
 * @property {string} [className] - Additional CSS class for dropdown content
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Base dropdown component that handles positioning and rendering.
 *
 * @param {DropdownProps} props - Component props
 * @returns {React.ReactElement} The rendered dropdown
 */
function Dropdown({
    trigger,
    children,
    isOpen: controlledIsOpen,
    onOpenChange,
    placement = 'bottom-start',
    closeOnSelect = true,
    closeOnClickOutside = true,
    closeOnEscape = true,
    offset = 4,
    matchTriggerWidth = false,
    portal = true,
    className = '',
    testId
}) {
    // Animation state for exit animation
    const [isExiting, setIsExiting] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Animation timing
    const exitTimeoutRef = useRef(null);

    // Use dropdown hook for state and positioning
    const {
        isOpen,
        isPositioned,
        open,
        close: hookClose,
        toggle,
        triggerRef,
        dropdownRef,
        triggerProps,
        dropdownProps,
        position,
        actualPlacement,
        triggerWidth,
        dropdownId
    } = useDropdown({
        isOpen: controlledIsOpen,
        onOpenChange,
        placement,
        offset,
        closeOnClickOutside,
        closeOnEscape,
        matchTriggerWidth
    });

    /**
     * Close with exit animation
     */
    const close = useCallback(() => {
        setIsExiting(true);
        exitTimeoutRef.current = setTimeout(() => {
            setIsExiting(false);
            hookClose();
        }, 75); // Match exit animation duration
    }, [hookClose]);

    /**
     * Close dropdown (used by menu items)
     */
    const closeDropdown = useCallback(() => {
        if (closeOnSelect) {
            close();
        }
    }, [closeOnSelect, close]);

    // Handle render state based on isOpen
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Clear any pending exit animation
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
                exitTimeoutRef.current = null;
            }
            setIsExiting(false);
        } else if (!isExiting) {
            setShouldRender(false);
        }
    }, [isOpen, isExiting]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
            }
        };
    }, []);

    // Clone trigger with props
    const triggerElement = cloneElement(trigger, {
        ...triggerProps,
        ref: triggerRef,
        onClick: (e) => {
            trigger.props.onClick?.(e);
            toggle();
        }
    });

    // Build dropdown panel class names
    const panelClassNames = [
        'dropdown-panel',
        isExiting && 'dropdown-panel--exiting',
        !isPositioned && 'dropdown-panel--positioning',
        `dropdown-panel--${actualPlacement}`,
        className
    ].filter(Boolean).join(' ');

    // Context value for children
    const contextValue = {
        isOpen,
        close: closeDropdown,
        placement: actualPlacement
    };

    // Dropdown panel content
    const dropdownContent = shouldRender && (
        <div
            {...dropdownProps}
            className={panelClassNames}
            data-testid={testId}
            data-placement={actualPlacement}
            style={{
                ...dropdownProps.style,
                ...(matchTriggerWidth && triggerWidth ? { minWidth: `${triggerWidth}px` } : {})
            }}
        >
            <DropdownContext.Provider value={contextValue}>
                {children}
            </DropdownContext.Provider>
        </div>
    );

    return (
        <div className="dropdown">
            {triggerElement}
            {portal && dropdownContent
                ? createPortal(dropdownContent, document.body)
                : dropdownContent
            }
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export default memo(Dropdown);
export { Dropdown, DropdownContext };