/**
 * PanelShell.logic.js - Headless Logic Hook
 *
 * Provides all the logic for PanelShell without any rendering.
 * Useful for building custom panel implementations or testing.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { usePanelShell } from './PanelShellContext';
import { usePanelDrag } from './hooks/usePanelDrag';
import { usePanelResize } from './hooks/usePanelResize';
import { usePanelPosition } from './hooks/usePanelPosition';
import { CHROME_LEVELS, SIZE_MODES, DEFAULT_BREAKPOINTS, DEFAULT_DIMENSIONS } from './constants';

/**
 * @typedef {Object} UsePanelShellLogicOptions
 * @property {string} panelId - Unique panel identifier
 * @property {'full' | 'compact' | 'minimal'} [chrome='full'] - Chrome level
 * @property {number} [defaultWidth=320] - Default width
 * @property {number} [defaultHeight=400] - Default height
 * @property {number} [minWidth=200] - Minimum width
 * @property {number} [minHeight=150] - Minimum height
 * @property {number} [maxWidth=800] - Maximum width
 * @property {number} [maxHeight=900] - Maximum height
 * @property {Object} [breakpoints] - Size mode breakpoints
 * @property {boolean} [resizable] - Whether panel is resizable
 * @property {boolean} [minimizable] - Whether panel is minimizable
 * @property {() => void} [onClose] - Close callback
 * @property {() => void} [onMinimize] - Minimize callback
 * @property {(width: number, height: number) => void} [onResize] - Resize callback
 * @property {(x: number, y: number) => void} [onMove] - Move callback
 * @property {() => void} [onFocus] - Focus callback
 */

/**
 * Headless hook that provides all PanelShell logic
 * @param {UsePanelShellLogicOptions} options
 */
export function usePanelShellLogic({
  panelId,
  chrome = CHROME_LEVELS.FULL,
  defaultWidth = DEFAULT_DIMENSIONS.width,
  defaultHeight = DEFAULT_DIMENSIONS.height,
  minWidth = DEFAULT_DIMENSIONS.minWidth,
  minHeight = DEFAULT_DIMENSIONS.minHeight,
  maxWidth = DEFAULT_DIMENSIONS.maxWidth,
  maxHeight = DEFAULT_DIMENSIONS.maxHeight,
  breakpoints = DEFAULT_BREAKPOINTS,
  resizable,
  minimizable,
  onClose,
  onMinimize,
  onResize,
  onMove,
  onFocus,
}) {
  // Determine default behaviors based on chrome level
  const isResizable = resizable ?? (chrome === CHROME_LEVELS.FULL);
  const isMinimizable = minimizable ?? (chrome !== CHROME_LEVELS.MINIMAL);

  const {
    getPanelState,
    openPanel,
    closePanel,
    updatePosition,
    updateSize,
    bringToFront,
    toggleMinimize,
    isPanelOpen,
  } = usePanelShell();

  // Get panel state
  const panelState = getPanelState(panelId);

  // Initialize panel if not exists
  useEffect(() => {
    if (!panelState) {
      openPanel(panelId, {
        size: { width: defaultWidth, height: defaultHeight },
      });
    }
  }, [panelId, panelState, openPanel, defaultWidth, defaultHeight]);

  // Current dimensions
  const width = panelState?.size?.width || defaultWidth;
  const height = panelState?.size?.height || defaultHeight;
  const position = panelState?.position || { x: 100, y: 100 };
  const zIndex = panelState?.zIndex || 1000;
  const minimized = panelState?.minimized || false;
  const isOpen = panelState?.isOpen || false;

  // Calculate size mode based on breakpoints
  const sizeMode = useMemo(() => {
    if (width < breakpoints.compactWidth) return SIZE_MODES.COMPACT;
    if (width >= breakpoints.expandedWidth) return SIZE_MODES.EXPANDED;
    return SIZE_MODES.STANDARD;
  }, [width, breakpoints]);

  // Check if below minimum
  const isBelowMinimum = width < breakpoints.minWidth;

  // Drag handling
  const { isDragging, handleDragStart } = usePanelDrag({
    panelId,
    position,
    onMove: (newPos) => {
      updatePosition(panelId, newPos);
      onMove?.(newPos.x, newPos.y);
    },
    onDragStart: () => bringToFront(panelId),
  });

  // Resize handling
  const { isResizing, handleResizeStart } = usePanelResize({
    panelId,
    size: { width, height },
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    onResize: (newSize) => {
      updateSize(panelId, newSize);
      onResize?.(newSize.width, newSize.height);
    },
  });

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.();
    closePanel(panelId);
  }, [panelId, closePanel, onClose]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    onMinimize?.();
    toggleMinimize(panelId);
  }, [panelId, toggleMinimize, onMinimize]);

  // Handle panel focus
  const handleFocus = useCallback(() => {
    bringToFront(panelId);
    onFocus?.();
  }, [panelId, bringToFront, onFocus]);

  // Open panel programmatically
  const open = useCallback((config = {}) => {
    openPanel(panelId, {
      size: { width: defaultWidth, height: defaultHeight },
      ...config,
    });
  }, [panelId, openPanel, defaultWidth, defaultHeight]);

  // Close panel programmatically
  const close = useCallback(() => {
    closePanel(panelId);
  }, [panelId, closePanel]);

  // Toggle panel open/closed
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Build class names helper
  const getClassNames = useCallback((baseClass = 'panel-shell') => {
    return [
      baseClass,
      `${baseClass}--chrome-${chrome}`,
      `${baseClass}--size-${sizeMode}`,
      isDragging && `${baseClass}--dragging`,
      isResizing && `${baseClass}--resizing`,
      minimized && `${baseClass}--minimized`,
      isBelowMinimum && `${baseClass}--below-minimum`,
    ].filter(Boolean).join(' ');
  }, [chrome, sizeMode, isDragging, isResizing, minimized, isBelowMinimum]);

  // Build style object helper
  const getStyle = useCallback((color) => ({
    '--panel-color': color || '#3b82f6',
    left: position.x,
    top: position.y,
    width: minimized ? 'auto' : width,
    height: minimized ? 'auto' : height,
    zIndex,
  }), [position, width, height, zIndex, minimized]);

  return {
    // State
    isOpen,
    position,
    width,
    height,
    zIndex,
    minimized,
    sizeMode,
    isBelowMinimum,
    isDragging,
    isResizing,

    // Configuration
    chrome,
    isResizable,
    isMinimizable,
    breakpoints,

    // Handlers
    handleDragStart,
    handleResizeStart,
    handleClose,
    handleMinimize,
    handleFocus,

    // Programmatic control
    open,
    close,
    toggle,

    // Helpers
    getClassNames,
    getStyle,
  };
}

export default usePanelShellLogic;
