/**
 * PanelShell Component
 *
 * Base component for all floating panels in CIA Web.
 * Handles positioning, dragging, resizing, z-index, and chrome levels.
 * Content is passed as children (supports render prop pattern for size-aware content).
 *
 * Chrome levels:
 * - FULL: Complex panels with drag handle, minimize, dock, close buttons
 * - COMPACT: Simple panels with icon, title, collapse, close
 * - MINIMAL: Toolbars with no header, draggable from body
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePanelShell } from './PanelShellContext';
import { CHROME_LEVELS, SIZE_MODES, DEFAULT_BREAKPOINTS, DEFAULT_DIMENSIONS } from './constants';
import { PanelHeader } from './components/PanelHeader';
import { PanelResizeHandle } from './components/PanelResizeHandle';
import { usePanelDrag } from './hooks/usePanelDrag';
import { usePanelResize } from './hooks/usePanelResize';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import './PanelShell.scss';

/**
 * @typedef {Object} PanelShellProps
 * @property {string} panelId - Unique panel identifier
 * @property {string} title - Panel title
 * @property {string} icon - Icon name from Icon component
 * @property {React.ReactNode | ((props: {width: number, height: number, sizeMode: string}) => React.ReactNode)} children - Panel content
 * @property {'full' | 'compact' | 'minimal'} [chrome='full'] - Chrome level
 * @property {string} [color] - Accent color
 * @property {number} [defaultWidth=320] - Default width
 * @property {number} [defaultHeight=400] - Default height
 * @property {number} [minWidth=200] - Minimum width
 * @property {number} [minHeight=150] - Minimum height
 * @property {number} [maxWidth=800] - Maximum width
 * @property {number} [maxHeight=900] - Maximum height
 * @property {Object} [breakpoints] - Size mode breakpoints
 * @property {boolean} [resizable] - Whether panel is resizable (defaults based on chrome)
 * @property {boolean} [minimizable] - Whether panel is minimizable (defaults based on chrome)
 * @property {boolean} [closable=true] - Whether panel is closable
 * @property {React.ReactNode} [headerActions] - Optional header action buttons (rendered before chrome buttons)
 * @property {() => void} [onClose] - Close callback
 * @property {() => void} [onMinimize] - Minimize callback
 * @property {(width: number, height: number) => void} [onResize] - Resize callback
 * @property {(x: number, y: number) => void} [onMove] - Move callback
 * @property {() => void} [onFocus] - Focus callback
 */

export function PanelShell({
  panelId,
  title,
  icon,
  children,
  chrome = CHROME_LEVELS.FULL,
  color,
  defaultWidth = DEFAULT_DIMENSIONS.width,
  defaultHeight = DEFAULT_DIMENSIONS.height,
  minWidth = DEFAULT_DIMENSIONS.minWidth,
  minHeight = DEFAULT_DIMENSIONS.minHeight,
  maxWidth = DEFAULT_DIMENSIONS.maxWidth,
  maxHeight = DEFAULT_DIMENSIONS.maxHeight,
  breakpoints = DEFAULT_BREAKPOINTS,
  resizable,
  minimizable,
  closable = true,
  onClose,
  onMinimize,
  onResize,
  onMove,
  onFocus,
  headerActions,
}) {
  const { tokens, isVR } = useAdaptive();
  const panelRef = useRef(null);

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
  } = usePanelShell();

  // Get or initialize panel state
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
  const handlePanelClick = useCallback(() => {
    bringToFront(panelId);
    onFocus?.();
  }, [panelId, bringToFront, onFocus]);

  // Don't render if not open
  if (!panelState?.isOpen) return null;

  // Determine if content should render (not minimized)
  const showContent = !minimized;

  // Render children (support render prop pattern)
  const renderContent = () => {
    if (typeof children === 'function') {
      return children({ width, height, sizeMode });
    }
    return children;
  };

  // Build class names
  const classNames = [
    'panel-shell',
    `panel-shell--chrome-${chrome}`,
    `panel-shell--size-${sizeMode}`,
    isDragging && 'panel-shell--dragging',
    isResizing && 'panel-shell--resizing',
    minimized && 'panel-shell--minimized',
    isBelowMinimum && 'panel-shell--below-minimum',
  ].filter(Boolean).join(' ');

  const panelContent = (
    <div
      ref={panelRef}
      className={classNames}
      style={{
        '--panel-color': color || tokens?.colors?.accentBlue || '#3b82f6',
        left: position.x,
        top: position.y,
        width: minimized ? 'auto' : width,
        height: minimized ? 'auto' : height,
        zIndex,
      }}
      onClick={handlePanelClick}
      data-panel-id={panelId}
      data-chrome={chrome}
      data-size-mode={sizeMode}
    >
      {/* Header (not for MINIMAL) */}
      {chrome !== CHROME_LEVELS.MINIMAL && (
        <PanelHeader
          title={title}
          icon={icon}
          chrome={chrome}
          color={color}
          minimized={minimized}
          minimizable={isMinimizable}
          closable={closable}
          sizeMode={sizeMode}
          width={width}
          onDragStart={handleDragStart}
          onMinimize={handleMinimize}
          onClose={handleClose}
          headerActions={headerActions}
        />
      )}

      {/* Content */}
      {showContent && (
        <div
          className="panel-shell__content"
          onMouseDown={chrome === CHROME_LEVELS.MINIMAL ? handleDragStart : undefined}
          onTouchStart={chrome === CHROME_LEVELS.MINIMAL ? handleDragStart : undefined}
        >
          {renderContent()}
        </div>
      )}

      {/* Resize handle (only for resizable panels when not minimized) */}
      {isResizable && showContent && (
        <PanelResizeHandle onResizeStart={handleResizeStart} />
      )}

      {/* Below minimum warning */}
      {isBelowMinimum && showContent && (
        <div className="panel-shell__min-warning">
          ⚠️ Below minimum width ({breakpoints.minWidth}px)
        </div>
      )}
    </div>
  );

  // Render via portal to document.body
  return createPortal(panelContent, document.body);
}

export default PanelShell;
