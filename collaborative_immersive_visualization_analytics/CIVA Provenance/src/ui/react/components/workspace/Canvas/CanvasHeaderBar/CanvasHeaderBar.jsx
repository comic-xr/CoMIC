// src/ui/react/components/workspace/Canvas/CanvasHeaderBar/CanvasHeaderBar.jsx
// Canvas header bar with room, workspace, edit tools, flow, size, and canvas mode
//
// Based on canvas-chrome-v12.jsx SecondaryHeader spec
// Height: 62px (18px label bar + 44px content bar)
// Layout: Room | Workspace | Edit Tools | (spacer) | Flow | Size | Canvas Mode
//
// Uses ToolbarZone for self-contained zones with integrated labels

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import {
    WorkspaceSelector,
    FlowDirectionToggle,
    CanvasSizeDisplay,
    ViewportSizeDisplay,
} from '@UI/react/components/molecules';
import { RoomPresenceIndicator } from '@UI/react/components/organisms';
import {
    ToolbarZone,
    ToolbarDivider,
    ToolbarSpacer,
    ToolbarContainer,
} from '../ToolbarZone';
import './CanvasHeaderBar.scss';

// =============================================================================
// EDIT TOOLS ZONE CONTENT
// =============================================================================

const EDIT_TOOLS = [
    { id: 'select', icon: 'mousePointer', label: 'Select', title: 'Select Tool' },
    { id: 'pan', icon: 'hand', label: 'Pan', title: 'Pan Tool' },
];

const EditToolsContent = memo(function EditToolsContent({
    activeTool = 'select',
    onToolChange,
    mergeMode = false,
    onMergeModeChange,
    editMode = false,
    onEditModeChange,
    compact = false,
}) {
    return (
        <div className="canvas-header-bar__edit-zone">
            {/* Tool selection */}
            <div className="canvas-header-bar__tool-group">
                {EDIT_TOOLS.map(tool => (
                    <button
                        key={tool.id}
                        type="button"
                        className={`canvas-header-bar__tool-btn ${activeTool === tool.id ? 'canvas-header-bar__tool-btn--active' : ''}`}
                        onClick={() => onToolChange?.(tool.id)}
                        title={tool.title}
                    >
                        <Icon name={tool.icon} size={12} />
                        {!compact && <span className="canvas-header-bar__tool-label">{tool.label}</span>}
                    </button>
                ))}
            </div>

            <div className="canvas-header-bar__tool-separator" />

            {/* Merge mode */}
            <button
                type="button"
                className={`canvas-header-bar__tool-btn canvas-header-bar__tool-btn--merge ${mergeMode ? 'canvas-header-bar__tool-btn--active' : ''}`}
                onClick={() => onMergeModeChange?.(!mergeMode)}
                title="Merge Cells"
            >
                <Icon name="combine" size={12} />
                {!compact && <span className="canvas-header-bar__tool-label">Merge</span>}
            </button>

            <div className="canvas-header-bar__tool-separator" />

            {/* Edit mode toggle */}
            <button
                type="button"
                className={`canvas-header-bar__tool-btn canvas-header-bar__tool-btn--edit ${editMode ? 'canvas-header-bar__tool-btn--active' : ''}`}
                onClick={() => onEditModeChange?.(!editMode)}
                title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            >
                <Icon name="pencil" size={12} />
                {!compact && <span className="canvas-header-bar__tool-label">Edit</span>}
            </button>
        </div>
    );
});

// =============================================================================
// CANVAS MODE ZONE CONTENT
// =============================================================================

const CANVAS_MODE_OPTIONS = [
    { id: 'docked', icon: 'dock', label: 'Dock', title: 'Docked Mode' },
    { id: 'floating', icon: 'windowRestore', label: 'Float', title: 'Floating Mode' },
    { id: 'fullscreen', icon: 'maximize', label: 'Full', title: 'Fullscreen Mode' },
];

const CanvasModeContent = memo(function CanvasModeContent({
    canvasMode = 'docked',
    onCanvasModeChange,
    compact = false,
}) {
    return (
        <div className="canvas-header-bar__canvas-mode">
            {CANVAS_MODE_OPTIONS.map(mode => (
                <button
                    key={mode.id}
                    type="button"
                    className={`canvas-header-bar__mode-btn ${canvasMode === mode.id ? 'canvas-header-bar__mode-btn--active' : ''}`}
                    onClick={() => onCanvasModeChange?.(mode.id)}
                    title={mode.title}
                >
                    <Icon name={mode.icon} size={12} />
                    {!compact && <span className="canvas-header-bar__mode-label">{mode.label}</span>}
                </button>
            ))}
        </div>
    );
});

// =============================================================================
// SIZE ZONE CONTENT
// =============================================================================

const SizeContent = memo(function SizeContent({
    canvasSize,
    viewportSize,
    canvasPlacements,
    onCanvasSizeChange,
    onViewportSizeChange,
}) {
    return (
        <div className="canvas-header-bar__size-content">
            <CanvasSizeDisplay
                size={canvasSize}
                placements={canvasPlacements}
                onChange={onCanvasSizeChange}
            />
            <ViewportSizeDisplay
                size={viewportSize}
                maxSize={canvasSize}
                onChange={onViewportSizeChange}
            />
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasHeaderBar - Top bar for canvas workspace
 *
 * Based on canvas-chrome-v12.jsx SecondaryHeader spec
 * Height: 62px (18px label bar + 44px content bar)
 *
 * Uses ToolbarZone components for self-aligned label+content zones
 */
export function CanvasHeaderBar({
    // Room (uses RoomPresenceIndicator)
    room,
    roomMembers = [],
    availableRooms = [],
    onRoomChange,
    onOpenRoomsPanel,
    onCreateRoom,

    // Workspace (uses WorkspaceSelector)
    workspace,
    workspaces = [],
    onWorkspaceChange,
    onCreateWorkspace,

    // Edit tools
    activeTool = 'select',
    onToolChange,
    mergeMode = false,
    onMergeModeChange,
    editMode = false,
    onEditModeChange,

    // Flow (uses FlowDirectionToggle)
    flowDirection = 'row',
    onFlowDirectionChange,

    // Size (uses CanvasSizeDisplay and ViewportSizeDisplay)
    canvasSize = { cols: 10, rows: 10 },
    viewportSize = { cols: 3, rows: 3 },
    canvasPlacements = [],
    onCanvasSizeChange,
    onViewportSizeChange,

    // Canvas mode
    canvasMode = 'docked',
    onCanvasModeChange,
    compactMode = false,

    className = '',
}) {
    return (
        <ToolbarContainer className={`canvas-header-bar ${className}`}>
            {/* Room Zone */}
            <ToolbarZone label="Room" width={180} labelColor="pink">
                <RoomPresenceIndicator
                    room={room}
                    members={roomMembers}
                    availableRooms={availableRooms}
                    onRoomChange={onRoomChange}
                    onClick={onOpenRoomsPanel}
                    onCreateRoom={onCreateRoom}
                    hideLabel
                />
            </ToolbarZone>

            <ToolbarDivider />

            {/* Workspace Zone */}
            <ToolbarZone label="Workspace" width={160} labelColor="purple">
                <WorkspaceSelector
                    workspace={workspace}
                    workspaces={workspaces}
                    onSelect={onWorkspaceChange}
                    onCreate={onCreateWorkspace}
                    hideLabel
                />
            </ToolbarZone>

            <ToolbarDivider />

            {/* Edit Tools Zone */}
            <ToolbarZone label="Edit" labelColor="amber">
                <EditToolsContent
                    activeTool={activeTool}
                    onToolChange={onToolChange}
                    mergeMode={mergeMode}
                    onMergeModeChange={onMergeModeChange}
                    editMode={editMode}
                    onEditModeChange={onEditModeChange}
                    compact={compactMode}
                />
            </ToolbarZone>

            <ToolbarDivider />

            {/* Spacer */}
            <ToolbarSpacer />

            <ToolbarDivider />

            {/* Flow Zone */}
            <ToolbarZone label="Flow" labelColor="teal">
                <FlowDirectionToggle
                    direction={flowDirection}
                    onChange={onFlowDirectionChange}
                />
            </ToolbarZone>

            <ToolbarDivider />

            {/* Size Zone */}
            <ToolbarZone label="Size" labelColor="green">
                <SizeContent
                    canvasSize={canvasSize}
                    viewportSize={viewportSize}
                    canvasPlacements={canvasPlacements}
                    onCanvasSizeChange={onCanvasSizeChange}
                    onViewportSizeChange={onViewportSizeChange}
                />
            </ToolbarZone>

            <ToolbarDivider />

            {/* Canvas Mode Zone */}
            <ToolbarZone label="Canvas" labelColor="blue">
                <CanvasModeContent
                    canvasMode={canvasMode}
                    onCanvasModeChange={onCanvasModeChange}
                    compact={compactMode}
                />
            </ToolbarZone>
        </ToolbarContainer>
    );
}

export default memo(CanvasHeaderBar);
