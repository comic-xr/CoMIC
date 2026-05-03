/**
 * @file TooltipProvider.jsx
 * @description Context provider for global tooltip settings.
 * Manages default delay, skip delay behavior, and interactive settings.
 *
 * Features:
 * - Global default settings for all tooltips
 * - Skip delay tracking for rapid tooltip viewing
 * - Configurable delay duration
 * - Support for disabling all interactive tooltips
 *
 * @example
 * // Wrap your app with the provider
 * import { TooltipProvider } from '@UI/react/components/atoms/Tooltip';
 *
 * function App() {
 *   return (
 *     <TooltipProvider delayDuration={300}>
 *       <YourApp />
 *     </TooltipProvider>
 *   );
 * }
 *
 * @example
 * // Disable interactive tooltips globally
 * <TooltipProvider disableHoverableContent>
 *   <YourApp />
 * </TooltipProvider>
 */

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

/**
 * @typedef {Object} TooltipContextValue
 * @property {number} delayDuration - Default delay before showing tooltips
 * @property {number} skipDelayDuration - Time window to skip delay after recent tooltip
 * @property {boolean} disableHoverableContent - Whether interactive tooltips are disabled
 * @property {boolean} isAnyTooltipOpen - Whether any tooltip is currently open
 * @property {() => void} onTooltipOpen - Called when a tooltip opens
 * @property {() => void} onTooltipClose - Called when a tooltip closes
 * @property {boolean} shouldSkipDelay - Whether to skip delay for next tooltip
 */

/**
 * @typedef {Object} TooltipProviderProps
 * @property {number} [delayDuration=400] - Global delay default (ms)
 * @property {number} [skipDelayDuration=300] - Time to skip delay after recent tooltip (ms)
 * @property {boolean} [disableHoverableContent=false] - Disable interactive tooltips globally
 * @property {React.ReactNode} children - Child components
 */

// Create context with default values
const TooltipContext = createContext({
    delayDuration: 400,
    skipDelayDuration: 300,
    disableHoverableContent: false,
    isAnyTooltipOpen: false,
    onTooltipOpen: () => { },
    onTooltipClose: () => { },
    shouldSkipDelay: false
});

/**
 * Hook to access tooltip context
 * @returns {TooltipContextValue} Tooltip context value
 */
export function useTooltipContext() {
    const context = useContext(TooltipContext);
    return context;
}

/**
 * Provider component for global tooltip settings.
 * Wrap your application or a section of your app to configure tooltip behavior.
 *
 * @param {TooltipProviderProps} props - Provider props
 * @returns {React.ReactElement} The provider component
 */
export function TooltipProvider({
    delayDuration = 400,
    skipDelayDuration = 300,
    disableHoverableContent = false,
    children
}) {
    // Track if any tooltip is currently open
    const [isAnyTooltipOpen, setIsAnyTooltipOpen] = useState(false);

    // Track last close time for skip delay
    const lastCloseTimeRef = useRef(0);

    // Track number of open tooltips (for nested cases)
    const openCountRef = useRef(0);

    /**
     * Called when a tooltip opens
     */
    const onTooltipOpen = useCallback(() => {
        openCountRef.current += 1;
        setIsAnyTooltipOpen(true);
    }, []);

    /**
     * Called when a tooltip closes
     */
    const onTooltipClose = useCallback(() => {
        openCountRef.current = Math.max(0, openCountRef.current - 1);

        if (openCountRef.current === 0) {
            setIsAnyTooltipOpen(false);
            lastCloseTimeRef.current = Date.now();
        }
    }, []);

    /**
     * Check if delay should be skipped
     * Returns true if a tooltip was recently closed
     */
    const shouldSkipDelay = useMemo(() => {
        if (isAnyTooltipOpen) return true;

        const timeSinceLastClose = Date.now() - lastCloseTimeRef.current;
        return timeSinceLastClose < skipDelayDuration;
    }, [isAnyTooltipOpen, skipDelayDuration]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        delayDuration,
        skipDelayDuration,
        disableHoverableContent,
        isAnyTooltipOpen,
        onTooltipOpen,
        onTooltipClose,
        shouldSkipDelay
    }), [
        delayDuration,
        skipDelayDuration,
        disableHoverableContent,
        isAnyTooltipOpen,
        onTooltipOpen,
        onTooltipClose,
        shouldSkipDelay
    ]);

    return (
        <TooltipContext.Provider value={contextValue}>
            {children}
        </TooltipContext.Provider>
    );
}

export { TooltipContext };
export default TooltipProvider;