// src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.jsx
// Main layout orchestrator for the three-edge panel system
// CSS Grid layout with separated activity bars and panel content

import React, { useMemo, cloneElement, useCallback, isValidElement, useContext } from 'react';
import { LayoutPanelProvider } from '@UI/react/components/panels/LayoutPanel/LayoutPanelContext';
import { LayoutPanel } from '@UI/react/components/panels/LayoutPanel';
import { CanvasWorkspace } from '@UI/react/components/workspace';
import { useLayoutState, usePanelPersistence, PANEL_CONSTRAINTS, useResizeHandler } from './ThreeEdgeLayout.logic.js';
import { usePanelState } from '@UI/react/hooks/usePanelState';
import { useFocusMode } from '@UI/react/hooks/useFocusMode';
import { OverlayPanel } from '@UI/react/components/panels/OverlayPanel';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel';
import LeftPanelContext, { LEFT_PANEL_TABS } from '@UI/react/components/panels/LeftPanel/LeftPanelContext';
import RightPanelContext, { RIGHT_PANEL_TABS } from '@UI/react/components/panels/RightPanel/RightPanelContext';
import './ThreeEdgeLayout.scss';

/**
 * ThreeEdgeLayout - Main application layout container
 *
 * CSS Grid layout with 3 rows: top bar, main content, bottom bar.
 * Main content area contains activity bars, panels, and workspace.
 *
 * Secondary bar slots (secondaryTopBar, secondaryBottomBar) receive
 * layout props via cloneElement: leftPanelWidth, rightPanelWidth,
 * leftPanelOpen, rightPanelOpen.
 */
export function ThreeEdgeLayout({
    topBar,
    centerPanel,
    bottomBar,
    leftActivityBar,
    leftPanelContent,
    rightActivityBar,
    rightPanelContent,
    secondaryTopBarZones,    // { left, center, right }
    secondaryBottomBarZones, // { left, center, right }
    secondaryTopBar,
    secondaryBottomBar,
    children, // Additional content rendered inside LayoutContext (e.g., floating panels)
}) {
    // Layout state management (legacy - keeps backward compatibility)
    const {
        leftOpen,
        setLeftOpen,
        rightOpen,
        setRightOpen,
        leftWidth,
        setLeftWidth,
        rightWidth,
        setRightWidth
    } = useLayoutState();

    // New overlay panel state management
    const leftPanelState = usePanelState('left');
    const rightPanelState = usePanelState('right');

    // Focus mode management
    const focusModeState = useFocusMode(leftPanelState, rightPanelState);

    // Persist state to localStorage
    usePanelPersistence({
        leftOpen,
        rightOpen,
        leftWidth,
        rightWidth
    });

    // Calculate actual widths for secondary bar zones
    const layoutDimensions = useMemo(() => ({
        leftPanelWidth: leftOpen ? leftWidth : PANEL_CONSTRAINTS.left.collapsed,
        rightPanelWidth: rightOpen ? rightWidth : PANEL_CONSTRAINTS.right.collapsed,
        leftPanelOpen: leftOpen,
        rightPanelOpen: rightOpen,
    }), [leftOpen, leftWidth, rightOpen, rightWidth]);

    // Panel state helper functions
    const shouldShowPanel = useCallback((side, tabId) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        return state.shouldShow(tabId);
    }, [leftPanelState, rightPanelState]);

    const isPreviewMode = useCallback((side, tabId) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        return state.isPreview(tabId);
    }, [leftPanelState, rightPanelState]);

    const startPeek = useCallback((side, tabId) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        state.startPeek(tabId);
    }, [leftPanelState, rightPanelState]);

    const endPeek = useCallback((side) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        state.endPeek();
    }, [leftPanelState, rightPanelState]);

    const pinPeek = useCallback((side) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        state.pinPeek();
    }, [leftPanelState, rightPanelState]);

    const onPanelMouseEnter = useCallback((side) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        state.onPanelMouseEnter();
    }, [leftPanelState, rightPanelState]);

    const onPanelMouseLeave = useCallback((side) => {
        const state = side === 'left' ? leftPanelState : rightPanelState;
        state.onPanelMouseLeave();
    }, [leftPanelState, rightPanelState]);

    // Context value for child components
    const contextValue = useMemo(() => ({
        // Legacy state
        leftOpen,
        setLeftOpen,
        rightOpen,
        setRightOpen,
        leftWidth,
        rightWidth,
        ...layoutDimensions,

        // New overlay panel state
        leftPeekingTab: leftPanelState.peekingTab,
        rightPeekingTab: rightPanelState.peekingTab,
        leftActiveTab: leftPanelState.activeTab,
        rightActiveTab: rightPanelState.activeTab,

        // Panel state helpers
        shouldShowPanel,
        isPreviewMode,

        // Panel actions
        startPeek,
        endPeek,
        pinPeek,
        setLeftActiveTab: leftPanelState.setActiveTab,
        setRightActiveTab: rightPanelState.setActiveTab,

        // Panel mouse handlers
        onPanelMouseEnter,
        onPanelMouseLeave,

        // Focus mode
        ...focusModeState,
    }), [
        leftOpen, setLeftOpen, rightOpen, setRightOpen, leftWidth, rightWidth,
        layoutDimensions,
        leftPanelState.peekingTab, rightPanelState.peekingTab,
        leftPanelState.activeTab, rightPanelState.activeTab,
        shouldShowPanel, isPreviewMode, startPeek, endPeek, pinPeek,
        leftPanelState.setActiveTab, rightPanelState.setActiveTab,
        onPanelMouseEnter, onPanelMouseLeave,
        focusModeState,
    ]);

    return (
        <LayoutContext.Provider value={contextValue}>
            <GridZonesLayout
                topBar={topBar}
                leftActivityBar={leftActivityBar}
                leftPanelContent={leftPanelContent}
                rightActivityBar={rightActivityBar}
                rightPanelContent={rightPanelContent}
                // Pass both patterns - GridZonesLayout handles them
                secondaryTopBarZones={secondaryTopBarZones}
                secondaryBottomBarZones={secondaryBottomBarZones}
                secondaryTopBar={secondaryTopBar}
                secondaryBottomBar={secondaryBottomBar}
                centerPanel={centerPanel}
                bottomBar={bottomBar}
                leftOpen={leftOpen}
                setLeftOpen={setLeftOpen}
                rightOpen={rightOpen}
                setRightOpen={setRightOpen}
                leftWidth={leftWidth}
                setLeftWidth={setLeftWidth}
                rightWidth={rightWidth}
                setRightWidth={setRightWidth}
                layoutDimensions={layoutDimensions}
            />
            {/* Render children inside LayoutContext (e.g., floating panels) */}
            {children}
        </LayoutContext.Provider>
    );
}

// =============================================================================
// GRID STYLES HOOK
// =============================================================================

function useGridStyles(leftOpen, rightOpen, leftWidth, rightWidth) {
    return useMemo(() => {
        const leftActivityWidth = PANEL_CONSTRAINTS.left.collapsed;
        const rightActivityWidth = PANEL_CONSTRAINTS.right.collapsed;

        const leftContentWidth = leftOpen
            ? Math.max(0, leftWidth - leftActivityWidth)
            : 0;
        const rightContentWidth = rightOpen
            ? Math.max(0, rightWidth - rightActivityWidth)
            : 0;

        return {
            '--left-activity-width': `${leftActivityWidth}px`,
            '--right-activity-width': `${rightActivityWidth}px`,
            '--left-content-width': `${leftContentWidth}px`,
            '--right-content-width': `${rightContentWidth}px`,
            '--sec-bar-left-min': leftOpen ? `${leftWidth}px` : '180px',
            '--sec-bar-right-min': rightOpen ? `${rightWidth}px` : '180px',
        };
    }, [leftOpen, rightOpen, leftWidth, rightWidth]);
}

// =============================================================================
// GRID ZONES LAYOUT
// =============================================================================

function GridZonesLayout({
    topBar,
    leftActivityBar,
    leftPanelContent,
    rightActivityBar,
    rightPanelContent,
    // Pattern 1: Zone objects
    secondaryTopBarZones,
    secondaryBottomBarZones,
    // Pattern 2: Rendered components
    secondaryTopBar,
    secondaryBottomBar,
    centerPanel,
    bottomBar,
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    leftWidth,
    setLeftWidth,
    rightWidth,
    setRightWidth,
    layoutDimensions,
}) {
    // Access layout context for overlay panel state
    const layoutContext = useContext(LayoutContext);
    const {
        leftPeekingTab,
        rightPeekingTab,
        onPanelMouseEnter,
        onPanelMouseLeave,
        pinPeek,
    } = layoutContext;

    const { popOutPanel } = useFloatingPanels();
    const leftPanelContext = useContext(LeftPanelContext);
    const rightPanelContext = useContext(RightPanelContext);
    const activeLeftTab = leftPanelContext?.activeTab;
    const activeRightTab = rightPanelContext?.activeTab;

    const { isResizing: leftResizing, handleMouseDown: leftMouseDown } = useResizeHandler('left', setLeftWidth);
    const { isResizing: rightResizing, handleMouseDown: rightMouseDown } = useResizeHandler('right', setRightWidth);

    // Determine if panels should show (either pinned open or peeking)
    const showLeftPanel = leftOpen || leftPeekingTab;
    const showRightPanel = rightOpen || rightPeekingTab;
    const leftIsPreview = !leftOpen && leftPeekingTab;
    const rightIsPreview = !rightOpen && rightPeekingTab;
    const currentLeftTabId = leftPeekingTab || activeLeftTab;
    const currentRightTabId = rightPeekingTab || activeRightTab;

    const handleLeftPopOut = useCallback(() => {
        const tabId = leftPeekingTab || activeLeftTab;
        if (!tabId) return;

        const tabConfig = LEFT_PANEL_TABS.find((tab) => tab.id === tabId);
        popOutPanel(`left-${tabId}`, {
            title: tabConfig?.label || tabId,
            icon: tabConfig?.icon,
            color: tabConfig?.color,
            x: 100,
            y: 100,
            width: 400,
            height: 600,
        });
        setLeftOpen(true);
    }, [leftPeekingTab, activeLeftTab, popOutPanel, setLeftOpen]);

    const handleRightPopOut = useCallback(() => {
        const tabId = rightPeekingTab || activeRightTab;
        if (!tabId) return;

        const tabConfig = RIGHT_PANEL_TABS.find((tab) => tab.id === tabId);
        const baseX = typeof window !== 'undefined' ? window.innerWidth - 500 : 100;
        popOutPanel(`right-${tabId}`, {
            title: tabConfig?.label || tabId,
            icon: tabConfig?.icon,
            color: tabConfig?.color,
            x: baseX,
            y: 100,
            width: 400,
            height: 600,
        });
        setRightOpen(true);
    }, [rightPeekingTab, activeRightTab, popOutPanel, setRightOpen]);

    // Grid styles for overlay mode - panels don't take columns
    const gridStyles = useMemo(() => {
        const leftActivityWidth = PANEL_CONSTRAINTS.left.collapsed;
        const rightActivityWidth = PANEL_CONSTRAINTS.right.collapsed;

        return {
            '--left-activity-width': `${leftActivityWidth}px`,
            '--right-activity-width': `${rightActivityWidth}px`,
            '--left-panel-width': `${leftWidth - leftActivityWidth}px`,
            '--right-panel-width': `${rightWidth - rightActivityWidth}px`,
        };
    }, [leftWidth, rightWidth]);

    const layoutClassName = [
        'three-edge-layout',
        'three-edge-layout--grid-zones',
        'three-edge-layout--overlay-mode',
    ].filter(Boolean).join(' ');

    // ==========================================================================
    // SECONDARY BAR RENDERING - Supports both patterns
    // ==========================================================================

    const renderSecondaryTopBar = () => {
        // Pattern 2: Rendered component (preferred)
        if (secondaryTopBar && isValidElement(secondaryTopBar)) {
            // Clone and inject layout dimensions so component can use them
            // The wrapper uses flex to ensure children fill width
            return (
                <div
                    className="three-edge-layout__sec-top three-edge-layout__sec-top--component"
                    style={{ display: 'flex', width: '100%' }}
                >
                    {cloneElement(secondaryTopBar, {
                        ...layoutDimensions,
                        style: { ...(secondaryTopBar.props?.style || {}), width: '100%' }
                    })}
                </div>
            );
        }

        // Pattern 1: Zone objects (legacy)
        const secTopLeft = secondaryTopBarZones?.left || null;
        const secTopCenter = secondaryTopBarZones?.center || null;
        const secTopRight = secondaryTopBarZones?.right || null;

        if (secTopLeft || secTopCenter || secTopRight) {
            return (
                <div className="three-edge-layout__sec-top">
                    <div className="three-edge-layout__sec-top-left">
                        {secTopLeft}
                    </div>
                    <div className="three-edge-layout__sec-top-center">
                        {secTopCenter}
                    </div>
                    <div className="three-edge-layout__sec-top-right">
                        {secTopRight}
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderSecondaryBottomBar = () => {
        // Pattern 2: Rendered component (preferred)
        if (secondaryBottomBar && isValidElement(secondaryBottomBar)) {
            return (
                <div
                    className="three-edge-layout__sec-bot three-edge-layout__sec-bot--component"
                    style={{ display: 'flex', width: '100%' }}
                >
                    {cloneElement(secondaryBottomBar, {
                        ...layoutDimensions,
                        style: { ...(secondaryBottomBar.props?.style || {}), width: '100%' }
                    })}
                </div>
            );
        }

        // Pattern 1: Zone objects (legacy)
        const secBotLeft = secondaryBottomBarZones?.left || null;
        const secBotCenter = secondaryBottomBarZones?.center || null;
        const secBotRight = secondaryBottomBarZones?.right || null;

        if (secBotLeft || secBotCenter || secBotRight) {
            return (
                <div className="three-edge-layout__sec-bot">
                    <div className="three-edge-layout__sec-bot-left">
                        {secBotLeft}
                    </div>
                    <div className="three-edge-layout__sec-bot-center">
                        {secBotCenter}
                    </div>
                    <div className="three-edge-layout__sec-bot-right">
                        {secBotRight}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className={layoutClassName} style={gridStyles}>
            {/* Row 1: Top Bar (spans all columns) */}
            {topBar && (
                <div className="three-edge-layout__top">
                    {topBar}
                </div>
            )}

            {/* Row 2: Secondary Top Bar */}
            {renderSecondaryTopBar()}

            {/* Row 3: Main Content Area - Activity bars + Workspace with overlay panels */}
            <div className="three-edge-layout__left-activity">
                {leftActivityBar}
            </div>

            <div className="three-edge-layout__workspace">
                {/* Canvas fills the workspace */}
                <div className="three-edge-layout__canvas-container">
                    {centerPanel}
                </div>

                {/* Left Panel - Overlay */}
                <OverlayPanel
                    side="left"
                    isOpen={leftOpen}
                    isPreview={leftIsPreview}
                    onClose={() => setLeftOpen(false)}
                    onPin={() => {
                        pinPeek?.('left');
                        setLeftOpen(true);
                    }}
                    onPopOut={handleLeftPopOut}
                    title=""
                    tabId={currentLeftTabId}
                    onMouseEnter={() => onPanelMouseEnter?.('left')}
                    onMouseLeave={() => onPanelMouseLeave?.('left')}
                    width={leftWidth - PANEL_CONSTRAINTS.left.collapsed}
                >
                    {showLeftPanel && leftPanelContent}
                    {showLeftPanel && (
                        <div
                            className={`overlay-resize-handle overlay-resize-handle--left ${leftResizing ? 'overlay-resize-handle--active' : ''}`}
                            onMouseDown={leftMouseDown}
                        />
                    )}
                </OverlayPanel>

                {/* Right Panel - Overlay */}
                <OverlayPanel
                    side="right"
                    isOpen={rightOpen}
                    isPreview={rightIsPreview}
                    onClose={() => setRightOpen(false)}
                    onPin={() => {
                        pinPeek?.('right');
                        setRightOpen(true);
                    }}
                    onPopOut={handleRightPopOut}
                    title=""
                    tabId={currentRightTabId}
                    onMouseEnter={() => onPanelMouseEnter?.('right')}
                    onMouseLeave={() => onPanelMouseLeave?.('right')}
                    width={rightWidth - PANEL_CONSTRAINTS.right.collapsed}
                >
                    {showRightPanel && rightPanelContent}
                    {showRightPanel && (
                        <div
                            className={`overlay-resize-handle overlay-resize-handle--right ${rightResizing ? 'overlay-resize-handle--active' : ''}`}
                            onMouseDown={rightMouseDown}
                        />
                    )}
                </OverlayPanel>
            </div>

            <div className="three-edge-layout__right-activity">
                {rightActivityBar}
            </div>

            {/* Row 4: Secondary Bottom Bar */}
            {renderSecondaryBottomBar()}

            {/* Row 5: Status Bar (spans all columns) */}
            {bottomBar && (
                <div className="three-edge-layout__bottom">
                    {bottomBar}
                </div>
            )}
        </div>
    );
}

export { GridZonesLayout, useGridStyles };

// =============================================================================
// LAYOUT CONTEXT
// =============================================================================

export const LayoutContext = React.createContext({
    // Legacy panel state (for backward compatibility)
    leftOpen: true,
    setLeftOpen: () => { },
    rightOpen: true,
    setRightOpen: () => { },
    leftWidth: PANEL_CONSTRAINTS.left.default,
    rightWidth: PANEL_CONSTRAINTS.right.default,
    leftPanelWidth: PANEL_CONSTRAINTS.left.default,
    rightPanelWidth: PANEL_CONSTRAINTS.right.default,
    leftPanelOpen: true,
    rightPanelOpen: true,

    // New overlay panel state
    leftPeekingTab: null,
    rightPeekingTab: null,
    leftActiveTab: null,
    rightActiveTab: null,

    // Panel state helpers
    shouldShowPanel: () => false,
    isPreviewMode: () => false,

    // Panel actions
    startPeek: () => { },
    endPeek: () => { },
    pinPeek: () => { },
    setLeftActiveTab: () => { },
    setRightActiveTab: () => { },

    // Panel mouse handlers
    onPanelMouseEnter: () => { },
    onPanelMouseLeave: () => { },

    // Focus mode
    focusMode: false,
    focusedCell: null,
    enterFocusMode: () => { },
    exitFocusMode: () => { },
    toggleFocusMode: () => { },
    focusCell: () => { },
    exitCell: () => { },
});

export function useLayoutContext() {
    return React.useContext(LayoutContext);
}
