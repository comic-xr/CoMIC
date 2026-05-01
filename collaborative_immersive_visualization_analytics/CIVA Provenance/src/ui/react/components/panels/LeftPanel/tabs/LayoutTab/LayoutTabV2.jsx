/**
 * @file LayoutTabV2.jsx
 * @description Layout Tab V4.6 main component.
 *
 * Features:
 * - Canvas Map with ViewGroups and Viewports visualization
 * - Three tabs: ViewGroups, Viewports, Templates
 * - ViewGroup multi-select mode with batch actions
 * - Drill-in mode for editing ViewGroup layouts
 * - Viewport sharing for collaboration
 * - VR-friendly with 36px+ touch targets and 12px minimum text
 *
 * @example
 * <LayoutTabV2 workspaceId="ws-1" />
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { TabButton } from '@UI/react/components/molecules/TabButton';
import { useLayoutTab } from './hooks/useLayoutTab.js';
import { BUILTIN_LAYOUTS, getLayoutById } from './constants/layouts.js';
import {
    CanvasMap,
    ViewGroupListItem,
    ViewportListItem,
    ViewListItem,
    ViewGroupEditor,
    TemplatesTabContent,
} from './components';
import './LayoutTab.scss';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Tab selector with ViewGroups/Viewports/Templates tabs
 * Uses TabButton molecule for consistency with FilesTab/DatasetsTab
 */
const TabSelector = memo(function TabSelector({
    activeTab,
    onChange,
    viewGroupCount,
    viewportCount,
    drillInMode,
}) {
    return (
        <div className="layout-tab-v2__tabs">
            <TabButton
                icon="hive"
                label={drillInMode ? 'Views' : 'ViewGroups'}
                active={activeTab === 'viewgroups'}
                badge={viewGroupCount}
                color="purple"
                onClick={() => onChange('viewgroups')}
            />
            <TabButton
                icon="aspectRatio"
                label="Viewports"
                active={activeTab === 'viewports'}
                badge={viewportCount}
                color="teal"
                onClick={() => onChange('viewports')}
            />
            <TabButton
                icon="wand_stars"
                label="Templates"
                active={activeTab === 'templates'}
                color="amber"
                onClick={() => onChange('templates')}
            />
        </div>
    );
});

/**
 * Multi-select action bar for ViewGroups
 */
const ViewGroupMultiSelectBar = memo(function ViewGroupMultiSelectBar({
    selectedCount,
    viewGroups,
    selectedIds,
    onCombine,
    onLink,
    onSwap,
    onMatch,
    onDelete,
    onExit,
}) {
    const hasLinked = selectedIds.some(id =>
        viewGroups.find(v => v.id === id)?.linkedTo
    );

    return (
        <div className="layout-tab-v2__multiselect-bar">
            <span className="layout-tab-v2__multiselect-count">
                {selectedCount} selected
            </span>
            <div className="layout-tab-v2__multiselect-actions">
                <button
                    onClick={onCombine}
                    disabled={selectedCount < 2}
                    className="layout-tab-v2__multiselect-action"
                >
                    <Icon name="combine" size={13} />
                    <span>Combine</span>
                </button>
                <button
                    onClick={onLink}
                    disabled={selectedCount < 2}
                    className={`layout-tab-v2__multiselect-action ${hasLinked ? 'layout-tab-v2__multiselect-action--active' : ''}`}
                >
                    <Icon name={hasLinked ? 'unlink' : 'link2'} size={13} />
                    <span>{hasLinked ? 'Unlink' : 'Link'}</span>
                </button>
                <button
                    onClick={onSwap}
                    disabled={selectedCount !== 2}
                    className="layout-tab-v2__multiselect-action"
                >
                    <Icon name="arrowLeftRight" size={13} />
                    <span>Swap</span>
                </button>
                <button
                    onClick={onMatch}
                    disabled={selectedCount < 2}
                    className="layout-tab-v2__multiselect-action"
                >
                    <Icon name="alignHorizontalSpaceBetween" size={13} />
                    <span>Match</span>
                </button>
                <button
                    onClick={onDelete}
                    className="layout-tab-v2__multiselect-action layout-tab-v2__multiselect-action--delete"
                >
                    <Icon name="trash" size={13} />
                </button>
            </div>
            <button
                onClick={onExit}
                className="layout-tab-v2__multiselect-done"
            >
                Done
            </button>
        </div>
    );
});

/**
 * Canvas Map container with header controls
 */
const CanvasMapContainer = memo(function CanvasMapContainer({
    canvas,
    viewGroups,
    viewports,
    selectedViewGroupId,
    selectedViewportId,
    drillInViewGroupId,
    drillInViewGroup,
    drillInLayout,
    allLayouts,
    customLayouts,
    isCollapsed,
    onToggleCollapse,
    height,
    onResize,
    zoom,
    onZoomChange,
    showViewGroups,
    onToggleViewGroups,
    showViewports,
    onToggleViewports,
    onSelectViewGroup,
    onSelectViewport,
    onDoubleClickViewGroup,
    onDropLayout,
    onUpdateCanvas,
    onDrillOut,
    onUpdateViewGroup,
    onChangeLayout,
    onSaveAsCustomLayout,
}) {
    const [isDraggingResize, setIsDraggingResize] = useState(false);

    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        setIsDraggingResize(true);

        const startY = e.clientY;
        const startHeight = height;

        const handleMouseMove = (moveEvent) => {
            const newHeight = Math.max(120, Math.min(400, startHeight + (moveEvent.clientY - startY)));
            onResize(newHeight);
        };

        const handleMouseUp = () => {
            setIsDraggingResize(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [height, onResize]);

    return (
        <div className="layout-tab-v2__map-container">
            {/* Header */}
            <div className="layout-tab-v2__map-header">
                <div
                    className="layout-tab-v2__map-title"
                    onClick={onToggleCollapse}
                >
                    <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size={16} />
                    <Icon
                        name="map"
                        size={14}
                        style={{ color: drillInViewGroupId ? drillInViewGroup?.color : 'var(--color-accent-teal)' }}
                    />
                    <span>{drillInViewGroupId ? 'ViewGroup Editor' : 'Canvas Map'}</span>
                </div>

                {!drillInViewGroupId && (
                    <span className="layout-tab-v2__map-size">
                        {canvas.cols}×{canvas.rows}
                    </span>
                )}

                <div className="layout-tab-v2__map-controls">
                    {!isCollapsed && !drillInViewGroupId && (
                        <>
                            {/* Layer toggles - styled with text labels */}
                            <button
                                className={`layout-tab-v2__layer-toggle ${showViewGroups ? 'layout-tab-v2__layer-toggle--active' : ''}`}
                                onClick={onToggleViewGroups}
                                data-layer="viewgroups"
                                title={showViewGroups ? 'Hide ViewGroups' : 'Show ViewGroups'}
                            >
                                <Icon name={showViewGroups ? 'eye' : 'eyeOff'} size={12} />
                                <span>Groups</span>
                            </button>
                            <button
                                className={`layout-tab-v2__layer-toggle ${showViewports ? 'layout-tab-v2__layer-toggle--active' : ''}`}
                                onClick={onToggleViewports}
                                data-layer="viewports"
                                title={showViewports ? 'Hide Viewports' : 'Show Viewports'}
                            >
                                <Icon name={showViewports ? 'eye' : 'eyeOff'} size={12} />
                                <span>Viewports</span>
                            </button>

                            <div className="layout-tab-v2__divider" />

                            {/* Zoom controls */}
                            <button
                                className="layout-tab-v2__zoom-btn"
                                onClick={() => onZoomChange(Math.max(50, zoom - 25))}
                            >
                                <Icon name="zoomOut" size={14} />
                            </button>
                            <span className="layout-tab-v2__zoom-value">{zoom}%</span>
                            <button
                                className="layout-tab-v2__zoom-btn"
                                onClick={() => onZoomChange(Math.min(150, zoom + 25))}
                            >
                                <Icon name="zoomIn" size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas size controls */}
            {!isCollapsed && !drillInViewGroupId && (
                <div className="layout-tab-v2__size-controls">
                    <span className="layout-tab-v2__size-label">Size:</span>
                    <div className="layout-tab-v2__size-control">
                        <Icon name="columns" size={14} />
                        <button
                            onClick={() => onUpdateCanvas({ ...canvas, cols: Math.max(1, canvas.cols - 1) })}
                            disabled={canvas.cols <= 1}
                        >
                            −
                        </button>
                        <span>{canvas.cols}</span>
                        <button
                            onClick={() => onUpdateCanvas({ ...canvas, cols: Math.min(10, canvas.cols + 1) })}
                            disabled={canvas.cols >= 10}
                        >
                            +
                        </button>
                    </div>
                    <span className="layout-tab-v2__size-x">×</span>
                    <div className="layout-tab-v2__size-control">
                        <Icon name="rows" size={14} />
                        <button
                            onClick={() => onUpdateCanvas({ ...canvas, rows: Math.max(1, canvas.rows - 1) })}
                            disabled={canvas.rows <= 1}
                        >
                            −
                        </button>
                        <span>{canvas.rows}</span>
                        <button
                            onClick={() => onUpdateCanvas({ ...canvas, rows: Math.min(10, canvas.rows + 1) })}
                            disabled={canvas.rows >= 10}
                        >
                            +
                        </button>
                    </div>
                    <button className="layout-tab-v2__fit-btn">
                        <Icon name="shrink" size={14} />
                        <span>Fit</span>
                    </button>
                </div>
            )}

            {/* Canvas map content OR ViewGroupEditor */}
            {!isCollapsed && (
                <div
                    className="layout-tab-v2__map-content"
                    style={{ height: drillInViewGroupId ? 'auto' : height }}
                >
                    {drillInViewGroupId && drillInViewGroup ? (
                        <ViewGroupEditor
                            viewGroup={drillInViewGroup}
                            layout={drillInLayout}
                            allLayouts={allLayouts}
                            customLayouts={customLayouts}
                            onBack={onDrillOut}
                            onUpdateViewGroup={onUpdateViewGroup}
                            onChangeLayout={onChangeLayout}
                            onSaveAsCustomLayout={onSaveAsCustomLayout}
                        />
                    ) : (
                        <CanvasMap
                            canvas={canvas}
                            viewGroups={viewGroups}
                            viewports={viewports}
                            selectedViewGroupId={selectedViewGroupId}
                            selectedViewportId={selectedViewportId}
                            showViewGroups={showViewGroups}
                            showViewports={showViewports}
                            zoom={zoom}
                            onSelectViewGroup={onSelectViewGroup}
                            onSelectViewport={onSelectViewport}
                            onDoubleClickViewGroup={onDoubleClickViewGroup}
                            onDropLayout={onDropLayout}
                        />
                    )}
                </div>
            )}

            {/* Resize handle */}
            {!isCollapsed && (
                <div
                    className={`layout-tab-v2__resize-handle ${isDraggingResize ? 'layout-tab-v2__resize-handle--dragging' : ''}`}
                    onMouseDown={handleResizeStart}
                >
                    <div className="layout-tab-v2__resize-bar" />
                </div>
            )}
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LayoutTabV2 main component
 *
 * @param {Object} props - Component props
 * @param {string} props.workspaceId - Current workspace ID
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const LayoutTabV2 = memo(function LayoutTabV2({
    workspaceId,
    className = '',
}) {
    // Get all state and handlers from hook
    const {
        // Data state
        viewGroups,
        canvas,
        viewports,
        customLayouts,

        // Selection state
        selectedViewGroupId,
        selectedViewportId,
        drillInViewGroupId,

        // Multi-select state
        multiSelectMode,
        setMultiSelectMode,
        selectedViewGroupIds,

        // UI state
        activeTab,
        setActiveTab,
        mapCollapsed,
        setMapCollapsed,
        mapHeight,
        setMapHeight,
        mapZoom,
        setMapZoom,
        showViewGroups,
        setShowViewGroups,
        showViewports,
        setShowViewports,

        // Derived state
        allLayouts,
        drillInViewGroup,
        drillInLayout,

        // Selection handlers
        handleSelectViewGroup,
        handleSelectViewport,

        // Drill-in handlers
        handleDrillIn,
        handleDrillOut,

        // ViewGroup handlers
        handleUpdateViewGroup,
        handleAddViewGroup,
        handleDropLayout,
        handleDeleteViewGroup,
        handleDuplicateViewGroup,

        // Multi-select handlers
        handleToggleViewGroupCheck,
        handleCombineViewGroups,
        handleLinkViewGroups,
        handleSwapViewGroups,
        handleMatchSizeViewGroups,
        handleDeleteSelectedViewGroups,
        handleExitMultiSelect,

        // Viewport handlers
        handleDuplicateViewport,
        handleDeleteViewport,
        handleToggleShareViewport,
        handleRenameViewport,
        handleAddViewport,

        // Canvas handlers
        handleUpdateCanvas,

        // Custom layout handlers
        handleSaveAsCustomLayout,
        handleChangeLayout,

        // Template handlers
        savedTemplates,
        handleLoadTemplate,
        handleSaveCurrentAsTemplate,
    } = useLayoutTab({ workspaceId });

    const handleRenameViewGroup = useCallback((viewGroup, newName) => {
        handleUpdateViewGroup({ ...viewGroup, name: newName });
    }, [handleUpdateViewGroup]);

    return (
        <div className={`layout-tab-v2 ${className}`}>
            {/* Header */}
            <div className="panel-header panel-header--green">
                <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Layout</span>
                <span className="panel-header__count">
                    {viewGroups.length} groups · {viewports.length} viewports
                </span>
            </div>

            {/* Canvas Map / ViewGroup Editor */}
            <CanvasMapContainer
                canvas={canvas}
                viewGroups={viewGroups}
                viewports={viewports}
                selectedViewGroupId={selectedViewGroupId}
                selectedViewportId={selectedViewportId}
                drillInViewGroupId={drillInViewGroupId}
                drillInViewGroup={drillInViewGroup}
                drillInLayout={drillInLayout}
                allLayouts={allLayouts}
                customLayouts={customLayouts}
                isCollapsed={mapCollapsed}
                onToggleCollapse={() => setMapCollapsed(!mapCollapsed)}
                height={mapHeight}
                onResize={setMapHeight}
                zoom={mapZoom}
                onZoomChange={setMapZoom}
                showViewGroups={showViewGroups}
                onToggleViewGroups={() => setShowViewGroups(!showViewGroups)}
                showViewports={showViewports}
                onToggleViewports={() => setShowViewports(!showViewports)}
                onSelectViewGroup={handleSelectViewGroup}
                onSelectViewport={handleSelectViewport}
                onDoubleClickViewGroup={handleDrillIn}
                onDropLayout={handleDropLayout}
                onUpdateCanvas={handleUpdateCanvas}
                onDrillOut={handleDrillOut}
                onUpdateViewGroup={handleUpdateViewGroup}
                onChangeLayout={handleChangeLayout}
                onSaveAsCustomLayout={handleSaveAsCustomLayout}
            />

            {/* Tab Selector */}
            <TabSelector
                activeTab={activeTab}
                onChange={setActiveTab}
                viewGroupCount={drillInViewGroupId ? drillInViewGroup?.views.length || 0 : viewGroups.length}
                viewportCount={viewports.length}
                drillInMode={!!drillInViewGroupId}
            />

            {/* Tab Content */}
            <div className="layout-tab-v2__content">
                {/* ViewGroups Tab */}
                {activeTab === 'viewgroups' && (
                    <>
                        {/* Drill-in header */}
                        {drillInViewGroupId && drillInViewGroup && (
                            <div
                                className="layout-tab-v2__drillin-header"
                                style={{ '--vg-color': drillInViewGroup.color }}
                            >
                                <button
                                    className="layout-tab-v2__back-btn"
                                    onClick={handleDrillOut}
                                >
                                    <Icon name="arrowLeft" size={18} />
                                </button>
                                <div
                                    className="layout-tab-v2__drillin-color"
                                    style={{ background: drillInViewGroup.color }}
                                />
                                <span className="layout-tab-v2__drillin-name">
                                    {drillInViewGroup.name}
                                </span>
                                <span className="layout-tab-v2__drillin-meta">
                                    {drillInLayout?.name || 'Single'} • {drillInViewGroup.views.length} views
                                </span>
                            </div>
                        )}

                        {/* Normal mode toolbar */}
                        {!drillInViewGroupId && (
                            <div className="layout-tab-v2__toolbar">
                                <button
                                    className={`layout-tab-v2__multiselect-toggle ${multiSelectMode ? 'layout-tab-v2__multiselect-toggle--active' : ''}`}
                                    onClick={() => {
                                        setMultiSelectMode(!multiSelectMode);
                                        if (multiSelectMode) {
                                            handleExitMultiSelect();
                                        }
                                    }}
                                >
                                    <Icon name={multiSelectMode ? 'checkSquare' : 'square'} size={14} />
                                    <span>Select Multiple</span>
                                </button>
                                <div className="layout-tab-v2__toolbar-spacer" />
                                {!multiSelectMode && (
                                    <button
                                        className="layout-tab-v2__add-btn"
                                        onClick={() => handleAddViewGroup('single')}
                                    >
                                        <Icon name="plus" size={14} />
                                        <span>Add ViewGroup</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Multi-select action bar */}
                        {multiSelectMode && selectedViewGroupIds.length > 0 && (
                            <ViewGroupMultiSelectBar
                                selectedCount={selectedViewGroupIds.length}
                                viewGroups={viewGroups}
                                selectedIds={selectedViewGroupIds}
                                onCombine={handleCombineViewGroups}
                                onLink={handleLinkViewGroups}
                                onSwap={handleSwapViewGroups}
                                onMatch={handleMatchSizeViewGroups}
                                onDelete={handleDeleteSelectedViewGroups}
                                onExit={handleExitMultiSelect}
                            />
                        )}

                        {/* List */}
                        <div className="layout-tab-v2__list">
                            {drillInViewGroupId && drillInViewGroup ? (
                                // Views list (drill-in mode)
                                drillInViewGroup.views.length > 0 ? (
                                    drillInViewGroup.views.map(view => (
                                        <ViewListItem
                                            key={view.id}
                                            view={view}
                                            isSelected={false}
                                            onClick={() => {}}
                                        />
                                    ))
                                ) : (
                                    <div className="layout-tab-v2__empty">
                                        No views yet. Click cells above to add.
                                    </div>
                                )
                            ) : (
                                // ViewGroups list
                                viewGroups.map(vg => (
                                    <ViewGroupListItem
                                        key={vg.id}
                                        viewGroup={vg}
                                        layout={getLayoutById(vg.layoutId, customLayouts) || BUILTIN_LAYOUTS[0]}
                                        isSelected={selectedViewGroupId === vg.id}
                                        isMultiSelectMode={multiSelectMode}
                                        isChecked={selectedViewGroupIds.includes(vg.id)}
                                        onClick={() => handleSelectViewGroup(vg.id)}
                                        onDoubleClick={() => handleDrillIn(vg.id)}
                                        onToggleCheck={() => handleToggleViewGroupCheck(vg.id)}
                                        onDuplicate={handleDuplicateViewGroup}
                                        onDelete={handleDeleteViewGroup}
                                        onSettings={() => console.log('Settings:', vg.id)}
                                        onRename={(name) => handleRenameViewGroup(vg, name)}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Viewports Tab */}
                {activeTab === 'viewports' && (
                    <div className="layout-tab-v2__list">
                        {viewports.map(vp => (
                            <ViewportListItem
                                key={vp.id}
                                viewport={vp}
                                isSelected={selectedViewportId === vp.id}
                                onClick={() => handleSelectViewport(vp.id)}
                                onRename={(newName) => handleRenameViewport(vp, newName)}
                                onDuplicate={handleDuplicateViewport}
                                onDelete={handleDeleteViewport}
                                onSettings={() => console.log('VP Settings:', vp.id)}
                                onToggleShare={handleToggleShareViewport}
                            />
                        ))}
                        <button
                            className="layout-tab-v2__add-item-btn"
                            onClick={handleAddViewport}
                        >
                            <Icon name="plus" size={16} />
                            <span>Add Viewport</span>
                        </button>
                    </div>
                )}

                {/* Templates Tab */}
                {activeTab === 'templates' && (
                    <TemplatesTabContent
                        templates={savedTemplates}
                        customLayouts={customLayouts}
                        onLoadTemplate={handleLoadTemplate}
                        onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
                        onDeleteTemplate={(template) => console.log('Delete template:', template)}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="layout-tab-v2__footer">
                <button className="layout-tab-v2__help-btn">
                    <Icon name="helpCircle" size={16} />
                </button>
                <button className="layout-tab-v2__save-btn">
                    <Icon name="save" size={16} />
                    <span>Save Layout</span>
                </button>
            </div>
        </div>
    );
});

export default LayoutTabV2;
