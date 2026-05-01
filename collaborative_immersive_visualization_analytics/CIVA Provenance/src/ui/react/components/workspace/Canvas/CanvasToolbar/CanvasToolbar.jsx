// src/ui/react/components/workspace/Canvas/CanvasToolbar/CanvasToolbar.jsx
// Canvas toolbar footer with navigation, history, and ViewContextBlock
//
// Based on canvas-chrome-v12.jsx spec
// Height: 90px (18px label bar + 72px content bar)
// Layout: Navigation | History | ViewContextBlock (mode + view + links + actions)

import React, { memo, useState, useCallback, useMemo } from 'react';
import { IconButton, ButtonGroup, Icon } from '@UI/react/components/atoms';
import { ViewContextBlock } from '@UI/react/components/organisms';
import { useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic.js';
import { CANVAS_MODES, ASPECT_RATIOS } from '../FloatingCanvas';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';
import {
    ToolbarZone,
    ToolbarDivider,
    ToolbarContainer,
} from '../ToolbarZone';
import './CanvasToolbar.scss';

// =============================================================================
// ZONE DEFINITIONS (simplified - ViewContextBlock handles most functionality)
// =============================================================================

const ZONES = {
    navigation: { width: 160, label: 'Navigation' },
    history: { width: 70, label: 'History' },
    viewMode: { width: 90, label: 'View Mode' },
    subset: { width: 120, label: 'Subset' },
    actions: { width: 120, label: 'Actions' },
    viewContext: { label: 'View Context' }, // flex - handles mode, view, links, actions
};

// =============================================================================
// VIEW MODE TOGGLE (Grid/Focus/Subset)
// =============================================================================

const VIEW_MODES = [
    { id: 'grid', icon: 'grid', label: 'Grid' },
    { id: 'focus', icon: 'focus', label: 'Focus' },
    { id: 'subset', icon: 'layers', label: 'Subset' },
];

const ViewModeZone = memo(function ViewModeZone({
    focusDisabled,
    subsetDisabled,
    onEnterFocus,
    onEnterSubset,
}) {
    const { isGridView, isFocusView, isSubsetView, goHome } = useViewStack();

    const currentMode = isSubsetView ? 'subset' : isFocusView ? 'focus' : 'grid';

    const handleModeChange = useCallback((mode) => {
        if (mode === 'grid') goHome();
        else if (mode === 'focus' && onEnterFocus) onEnterFocus();
        else if (mode === 'subset' && onEnterSubset) onEnterSubset();
    }, [goHome, onEnterFocus, onEnterSubset]);

    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.viewMode.width }}>
            <div className="canvas-toolbar__mode-toggle">
                {VIEW_MODES.map(({ id, icon, label }) => {
                    const isActive = currentMode === id;
                    const isDisabled = (id === 'focus' && focusDisabled) || (id === 'subset' && subsetDisabled);
                    return (
                        <button
                            key={id}
                            type="button"
                            className={`canvas-toolbar__mode-btn ${isActive ? 'canvas-toolbar__mode-btn--active' : ''}`}
                            onClick={() => handleModeChange(id)}
                            disabled={isDisabled || isActive}
                            title={isDisabled ? `${label} unavailable` : label}
                        >
                            <Icon name={icon} size={14} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

// =============================================================================
// NAVIGATION ZONE (Home, Bookmark, Arrows, Position)
// Uses useViewContextLogic for navigation to stay in sync with LayoutPanelContext
// =============================================================================

const NavigationContent = memo(function NavigationContent() {
    // Get navigation from useViewContextLogic - this connects to LayoutPanelContext
    // which is the source of truth for viewport position
    const {
        canvasPosition,
        isAtOrigin,
        onNavigate,
        onHome,
        onBookmark,
    } = useViewContextLogic();

    return (
        <div className="canvas-toolbar__nav-controls">
            <IconButton
                icon="home"
                label="Go to Home Position"
                size="sm"
                active={isAtOrigin}
                onClick={onHome}
            />
            <IconButton
                icon="bookmark"
                label="Save Position"
                size="sm"
                onClick={onBookmark}
            />

            <div className="canvas-toolbar__nav-arrows">
                <IconButton
                    icon="chevronLeft"
                    label="Pan Left"
                    size="xs"
                    onClick={() => onNavigate('left')}
                />
                <div className="canvas-toolbar__nav-arrows-vertical">
                    <IconButton
                        icon="chevronUp"
                        label="Pan Up"
                        size="xs"
                        onClick={() => onNavigate('up')}
                    />
                    <IconButton
                        icon="chevronDown"
                        label="Pan Down"
                        size="xs"
                        onClick={() => onNavigate('down')}
                    />
                </div>
                <IconButton
                    icon="chevronRight"
                    label="Pan Right"
                    size="xs"
                    onClick={() => onNavigate('right')}
                />
            </div>

            <span className="canvas-toolbar__position">
                {formatGridPosition(canvasPosition.col, canvasPosition.row)}
            </span>
        </div>
    );
});

// =============================================================================
// HISTORY ZONE (Undo/Redo)
// =============================================================================

const HistoryContent = memo(function HistoryContent({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}) {
    return (
        <div className="canvas-toolbar__history-controls">
            <IconButton
                icon="undo"
                label="Undo (Ctrl+Z)"
                size="sm"
                disabled={!canUndo}
                onClick={onUndo}
            />
            <IconButton
                icon="redo"
                label="Redo (Ctrl+Shift+Z)"
                size="sm"
                disabled={!canRedo}
                onClick={onRedo}
            />
        </div>
    );
});

// =============================================================================
// SUBSET ZONE (Subset picker - only visible in subset mode)
// =============================================================================

const SubsetZone = memo(function SubsetZone({
    subsetSelection = [],
    availableViews = [],
    onToggleView,
    onSelectAll,
    onClear,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { isSubsetView } = useViewStack();

    if (!isSubsetView) return null;

    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.subset.width }}>
            <div className="canvas-toolbar__subset-picker">
                <button
                    type="button"
                    className={`canvas-toolbar__subset-btn ${isOpen ? 'canvas-toolbar__subset-btn--open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icon name="layers" size={12} />
                    <span>Subset ({subsetSelection.length})</span>
                    <Icon name="chevronDown" size={10} />
                </button>

                {isOpen && (
                    <div className="canvas-toolbar__subset-dropdown">
                        <div className="canvas-toolbar__subset-header">
                            Select views for subset
                        </div>
                        <div className="canvas-toolbar__subset-list">
                            {availableViews.map(view => (
                                <button
                                    key={view.id}
                                    type="button"
                                    className="canvas-toolbar__subset-item"
                                    onClick={() => onToggleView?.(view.id)}
                                >
                                    <span className={`canvas-toolbar__subset-check ${subsetSelection.includes(view.id) ? 'canvas-toolbar__subset-check--checked' : ''}`}>
                                        {subsetSelection.includes(view.id) && <Icon name="check" size={10} />}
                                    </span>
                                    <span
                                        className="canvas-toolbar__subset-dot"
                                        style={{ background: view.color }}
                                    />
                                    <span className="canvas-toolbar__subset-name">{view.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="canvas-toolbar__subset-footer">
                            <button type="button" onClick={onSelectAll}>Select All</button>
                            <button type="button" onClick={onClear}>Clear</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// VIEW CONTEXT ZONE (uses ViewContextBlock component with useViewContextLogic)
// =============================================================================

const ViewContextContent = memo(function ViewContextContent({
    viewMode,
    onModeChange,
    onSnapshot,
    onDuplicate,
    onOpenSettings,
}) {
    // Get view data from the centralized view context hook
    const {
        activeView,
        onCanvasViews,
        availableViews,
        onSelectView,
        onViewAction,
        subsetIds,
        onSubsetChange,
        onUpdateLink,
    } = useViewContextLogic();

    const { isFocusView, currentView } = useViewStack();

    // In focus mode, show the focused view (if available from view stack)
    const viewInfo = isFocusView && currentView?.data ? currentView.data : activeView;

    return (
        <ViewContextBlock
            viewMode={viewMode}
            onModeChange={onModeChange}
            activeView={viewInfo}
            onCanvasViews={onCanvasViews}
            availableViews={availableViews}
            onSelectView={onSelectView}
            onViewAction={onViewAction}
            onUpdateLink={onUpdateLink}
            subsetIds={subsetIds}
            onSubsetChange={onSubsetChange}
            onSnapshot={onSnapshot}
            onDuplicate={onDuplicate}
            onOpenSettings={onOpenSettings}
        />
    );
});

// =============================================================================
// ACTIONS ZONE (Links, Snapshot, Duplicate, Settings)
// =============================================================================

const ActionsZone = memo(function ActionsZone({
    activeView,
    allViews = [],
    links = {},
    recentUnlinks = [],
    onUpdateLink,
    onRestoreLink,
    onSnapshot,
    onDuplicate,
    onSettings,
}) {
    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.actions.width }}>
            <div className="canvas-toolbar__actions">
                <LinksDropdown
                    activeView={activeView}
                    allViews={allViews}
                    links={links}
                    recentUnlinks={recentUnlinks}
                    onUpdateLink={onUpdateLink}
                    onRestoreLink={onRestoreLink}
                />

                <div className="canvas-toolbar__actions-divider" />

                <IconButton
                    icon="camera"
                    label="Snapshot"
                    size="sm"
                    onClick={onSnapshot}
                />
                <IconButton
                    icon="copy"
                    label="Duplicate View"
                    size="sm"
                    onClick={onDuplicate}
                />
                <IconButton
                    icon="settings"
                    label="View Settings"
                    size="sm"
                    onClick={onSettings}
                />
            </div>
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasToolbar - Footer toolbar for canvas workspace
 *
 * Based on canvas-chrome-v12.jsx spec
 * Height: 90px (18px label bar + 72px content bar)
 *
 * Layout: Navigation | History | ViewContextBlock (mode + view + links + actions)
 */
export function CanvasToolbar({
    // View mode (passed to ViewContextBlock)
    viewMode = 'normal',
    onModeChange,

    // History
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,

    // Active view & views (passed to ViewContextBlock)
    activeView,
    availableViews = [],
    offCanvasViews = [],
    onSelectView,
    onViewAction,

    // Subset (passed to ViewContextBlock)
    subsetSelection = [],
    onSubsetChange,

    // Links (passed to ViewContextBlock)
    onUpdateLink,

    // Actions (passed to ViewContextBlock)
    onSnapshot,
    onDuplicate,
    onSettings,

    className = '',
}) {
    return (
        <ToolbarContainer className={`canvas-toolbar ${className}`}>
            {/* Navigation - uses useViewContextLogic internally */}
            <ToolbarZone label="Navigation" width={ZONES.navigation.width} labelColor="blue">
                <NavigationContent />
            </ToolbarZone>

            <ToolbarDivider />

            {/* History */}
            <ToolbarZone label="History" width={ZONES.history.width} labelColor="amber">
                <HistoryContent
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                />
            </ToolbarZone>

            <ToolbarDivider />

            {/* View Context Block - handles mode, view selection, links, actions */}
            <ToolbarZone label="View Context" flex labelColor="teal">
                <ViewContextContent
                    viewMode={viewMode}
                    onModeChange={onModeChange}
                    onSnapshot={onSnapshot}
                    onDuplicate={onDuplicate}
                    onOpenSettings={onSettings}
                />
            </ToolbarZone>
        </ToolbarContainer>
    );
}

export default memo(CanvasToolbar);

// Re-export for convenience
export { CANVAS_MODES, ASPECT_RATIOS };
