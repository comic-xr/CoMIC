/**
 * @file InstanceToolsPanel.jsx
 * @description Instance Tools Panel V2 - Main container component
 *
 * Features:
 * - Adaptive ViewGroup strip (connectors ≤5 views, grid 6+)
 * - Dot-based section navigation with scroll tracking
 * - Full transform controls (position, rotation, scale)
 * - Draggable layer reordering
 * - Widget value hover/click interaction
 * - Layers & Widgets stationary at bottom
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useInstanceToolsPanel } from './InstanceToolsPanel.logic';
import { TOOL_SECTIONS, PANEL_TABS } from './constants';

// Components
import { ViewGroupStrip } from './components/ViewGroupStrip/ViewGroupStrip';
import { InstanceHeader } from './components/InstanceHeader/InstanceHeader';
import { DotNavigation } from './components/DotNavigation/DotNavigation';
import { CameraSection } from './components/ToolSections/CameraSection';
import { TransformSection } from './components/ToolSections/TransformSection';
import { WidgetsSection } from './components/ToolSections/WidgetsSection';
import { AppearanceSection } from './components/ToolSections/AppearanceSection';
import { ColormapSection } from './components/ToolSections/ColormapSection';
import { SceneSection } from './components/ToolSections/SceneSection';
import { SliceSection } from './components/ToolSections/SliceSection';
import { WindowLevelSection } from './components/ToolSections/WindowLevelSection';
import { LayersAndWidgets } from './components/LayersAndWidgets/LayersAndWidgets';
import { AnnotationsTab } from './components/ToolSections/AnnotationsTab';
import { DisplayTab } from './components/ToolSections/DisplayTab';

import './InstanceToolsPanel.scss';

/**
 * SectionHeader - Collapsible section header
 */
const SectionHeader = memo(function SectionHeader({
  section,
  isExpanded,
  onToggle,
  sectionRef,
}) {
  return (
    <div
      ref={sectionRef}
      className={`section-header ${isExpanded ? 'section-header--expanded' : ''}`}
      data-color={section.color}
      onClick={onToggle}
    >
      <Icon
        name="chevronRight"
        size={10}
        className={`section-header__chevron ${isExpanded ? 'section-header__chevron--expanded' : ''}`}
      />
      <Icon name={section.icon} size={14} className="section-header__icon" />
      <span className="section-header__label">{section.label}</span>
    </div>
  );
});

/**
 * NoInstancePlaceholder - Shown when no instance is selected
 */
const NoInstancePlaceholder = memo(function NoInstancePlaceholder() {
  return (
    <div className="instance-tools-panel__no-instance">
      <Icon name="monitor" size={32} />
      <h3>No Instance Selected</h3>
      <p>Click on an instance viewport to select it and view its tools.</p>
      <span className="instance-tools-panel__hint">
        Tip: The mini toolbar appears on hover in each viewport
      </span>
    </div>
  );
});

/**
 * ToolsTabContent - Scrollable tools content with sections
 */
const ToolsTabContent = memo(function ToolsTabContent({
  logic,
}) {
  const {
    activeSection,
    expandedSections,
    toggleSection,
    navigateToSection,
    sectionRefs,
    containerRef,
    // Transform
    position,
    rotation,
    scale,
    uniformScale,
    setUniformScale,
    handlePositionChange,
    handleRotationChange,
    handleScaleChange,
    handleResetTransform,
    // Measurement Widgets
    lineWidgetActive,
    angleWidgetActive,
    planeWidgetActive,
    handleToggleLineWidget,
    handleToggleAngleWidget,
    handleTogglePlaneWidget,
    handleClearAllWidgets,
    // Appearance
    opacity,
    setOpacity,
    representation,
    setRepresentation,
    pointSize,
    setPointSize,
    lineWidth,
    setLineWidth,
    // Colormap
    currentColormap,
    handleColormapChange,
    // Scene
    backgroundPreset,
    handleBackgroundChange,
    handleGridPlaneChange,
    overlayState,
    handleToggleOverlay,
    overlayConfigs,
    // Slice
    sliceOrientation,
    setSliceOrientation,
    slicePosition,
    setSlicePosition,
    sliceMax,
    // Window/Level
    windowValue,
    setWindowValue,
    levelValue,
    setLevelValue,
    activeWindowLevelPreset,
    handleWindowLevelPreset,
    // Camera
    handleCameraPreset,
    cameraState,
    cameraTransformExpanded,
    handleToggleCameraTransform,
    handleCameraPositionChange,
    handleCameraFocalPointChange,
    handleCameraViewAngleChange,
    savedCameraStates,
    handleSaveCameraState,
    handleRestoreCameraState,
    handleDeleteCameraState,
  } = logic;

  // Helper to get section by id
  const getSectionById = (id) => TOOL_SECTIONS.find(s => s.id === id);

  return (
    <div className="tools-tab-content">
      {/* Dot Navigation */}
      <DotNavigation
        sections={TOOL_SECTIONS}
        activeSection={activeSection}
        onNavigate={navigateToSection}
      />

      {/* Scrollable Sections */}
      <div ref={containerRef} className="tools-tab-content__scroll">
        {/* Camera Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('camera')}
            isExpanded={expandedSections.camera}
            onToggle={() => toggleSection('camera')}
            sectionRef={(el) => { sectionRefs.current.camera = el; }}
          />
          {expandedSections.camera && (
            <div className="tools-tab-content__section-content">
              <CameraSection
                onPresetClick={handleCameraPreset}
                cameraState={cameraState}
                cameraTransformExpanded={cameraTransformExpanded}
                onToggleCameraTransform={handleToggleCameraTransform}
                onCameraPositionChange={handleCameraPositionChange}
                onCameraFocalPointChange={handleCameraFocalPointChange}
                onCameraViewAngleChange={handleCameraViewAngleChange}
                savedCameraStates={savedCameraStates}
                onSaveCameraState={handleSaveCameraState}
                onRestoreCameraState={handleRestoreCameraState}
                onDeleteCameraState={handleDeleteCameraState}
              />
            </div>
          )}
        </div>

        {/* Transform Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('transform')}
            isExpanded={expandedSections.transform}
            onToggle={() => toggleSection('transform')}
            sectionRef={(el) => { sectionRefs.current.transform = el; }}
          />
          {expandedSections.transform && (
            <div className="tools-tab-content__section-content">
              <TransformSection
                position={position}
                rotation={rotation}
                scale={scale}
                uniformScale={uniformScale}
                onPositionChange={handlePositionChange}
                onRotationChange={handleRotationChange}
                onScaleChange={handleScaleChange}
                onUniformScaleToggle={() => setUniformScale(!uniformScale)}
                onReset={handleResetTransform}
              />
            </div>
          )}
        </div>

        {/* Widgets Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('widgets')}
            isExpanded={expandedSections.widgets}
            onToggle={() => toggleSection('widgets')}
            sectionRef={(el) => { sectionRefs.current.widgets = el; }}
          />
          {expandedSections.widgets && (
            <div className="tools-tab-content__section-content">
              <WidgetsSection
                lineActive={lineWidgetActive}
                angleActive={angleWidgetActive}
                planeActive={planeWidgetActive}
                onToggleLine={handleToggleLineWidget}
                onToggleAngle={handleToggleAngleWidget}
                onTogglePlane={handleTogglePlaneWidget}
                onClearAll={handleClearAllWidgets}
              />
            </div>
          )}
        </div>

        {/* Appearance Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('appearance')}
            isExpanded={expandedSections.appearance}
            onToggle={() => toggleSection('appearance')}
            sectionRef={(el) => { sectionRefs.current.appearance = el; }}
          />
          {expandedSections.appearance && (
            <div className="tools-tab-content__section-content">
              <AppearanceSection
                opacity={opacity}
                representation={representation}
                pointSize={pointSize}
                lineWidth={lineWidth}
                onOpacityChange={setOpacity}
                onRepresentationChange={setRepresentation}
                onPointSizeChange={setPointSize}
                onLineWidthChange={setLineWidth}
              />
            </div>
          )}
        </div>

        {/* Colormap Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('colormap')}
            isExpanded={expandedSections.colormap}
            onToggle={() => toggleSection('colormap')}
            sectionRef={(el) => { sectionRefs.current.colormap = el; }}
          />
          {expandedSections.colormap && (
            <div className="tools-tab-content__section-content">
              <ColormapSection
                currentColormap={currentColormap}
                onColormapChange={handleColormapChange}
              />
            </div>
          )}
        </div>

        {/* Scene Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('scene')}
            isExpanded={expandedSections.scene}
            onToggle={() => toggleSection('scene')}
            sectionRef={(el) => { sectionRefs.current.scene = el; }}
          />
          {expandedSections.scene && (
            <div className="tools-tab-content__section-content">
              <SceneSection
                backgroundPreset={backgroundPreset}
                onBackgroundChange={handleBackgroundChange}
                showGrid={overlayState?.grid}
                gridPlane={overlayConfigs?.grid?.plane}
                onToggleGrid={() => handleToggleOverlay?.('grid')}
                onGridPlaneChange={handleGridPlaneChange}
                showAxes={overlayState?.axes}
                onToggleAxes={() => handleToggleOverlay?.('axes')}
                showOrientation={overlayState?.orientation}
                onToggleOrientation={() => handleToggleOverlay?.('orientation')}
              />
            </div>
          )}
        </div>

        {/* Slice Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('slice')}
            isExpanded={expandedSections.slice}
            onToggle={() => toggleSection('slice')}
            sectionRef={(el) => { sectionRefs.current.slice = el; }}
          />
          {expandedSections.slice && (
            <div className="tools-tab-content__section-content">
              <SliceSection
                orientation={sliceOrientation}
                position={slicePosition}
                maxPosition={sliceMax}
                onOrientationChange={setSliceOrientation}
                onPositionChange={setSlicePosition}
              />
            </div>
          )}
        </div>

        {/* Window/Level Section */}
        <div className="tools-tab-content__section">
          <SectionHeader
            section={getSectionById('windowLevel')}
            isExpanded={expandedSections.windowLevel}
            onToggle={() => toggleSection('windowLevel')}
            sectionRef={(el) => { sectionRefs.current.windowLevel = el; }}
          />
          {expandedSections.windowLevel && (
            <div className="tools-tab-content__section-content">
              <WindowLevelSection
                windowValue={windowValue}
                levelValue={levelValue}
                activePreset={activeWindowLevelPreset}
                onWindowChange={setWindowValue}
                onLevelChange={setLevelValue}
                onPresetSelect={handleWindowLevelPreset}
              />
            </div>
          )}
        </div>

        {/* Bottom Spacer */}
        <div className="tools-tab-content__spacer" />
      </div>
    </div>
  );
});

/**
 * AnnotationsTabContent - Wrapper for AnnotationsTab with state management
 */
const AnnotationsTabContent = memo(function AnnotationsTabContent({ logic }) {
  const {
    annotations = [],
    handleCreateAnnotation,
    handleUpdateAnnotation,
    handleDeleteAnnotation,
    handleBulkUpdateAnnotations,
    handleBulkDeleteAnnotations,
  } = logic;

  // Mock data for demonstration (remove when real annotation service is connected)
  const [mockAnnotations, setMockAnnotations] = React.useState([
    {
      id: 'a-1',
      type: 'text',
      text: 'Suspicious lesion - needs follow-up',
      color: '#ef4444',
      scope: 'workspace',
      visible: true,
      locked: false,
      author: 'Dr. Smith',
      authorId: 'user-2',
      timestamp: '2 hours ago',
    },
    {
      id: 'a-2',
      type: 'marker',
      text: 'Injection site',
      color: '#22c55e',
      scope: 'instance',
      visible: true,
      locked: false,
      author: 'You',
      authorId: 'user-1',
      timestamp: '1 hour ago',
    },
    {
      id: 'a-3',
      type: 'arrow',
      text: 'Main blood vessel',
      color: '#3b82f6',
      scope: 'workspace',
      visible: true,
      locked: true,
      author: 'Dr. Jones',
      authorId: 'user-3',
      timestamp: 'Yesterday',
    },
  ]);

  const handleMockUpdate = React.useCallback((id, updates) => {
    setMockAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const handleMockDelete = React.useCallback((id) => {
    setMockAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleMockBulkUpdate = React.useCallback((ids, updates) => {
    setMockAnnotations((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, ...updates } : a))
    );
  }, []);

  const handleMockBulkDelete = React.useCallback((ids) => {
    setMockAnnotations((prev) => prev.filter((a) => !ids.includes(a.id)));
  }, []);

  // Use real handlers if available, otherwise use mock
  const actualAnnotations = annotations.length > 0 ? annotations : mockAnnotations;
  const actualUpdate = handleUpdateAnnotation || handleMockUpdate;
  const actualDelete = handleDeleteAnnotation || handleMockDelete;
  const actualBulkUpdate = handleBulkUpdateAnnotations || handleMockBulkUpdate;
  const actualBulkDelete = handleBulkDeleteAnnotations || handleMockBulkDelete;

  return (
    <AnnotationsTab
      annotations={actualAnnotations}
      onCreateAnnotation={handleCreateAnnotation}
      onUpdateAnnotation={actualUpdate}
      onDeleteAnnotation={actualDelete}
      onBulkUpdate={actualBulkUpdate}
      onBulkDelete={actualBulkDelete}
      currentUserId="user-1"
    />
  );
});

/**
 * InstanceToolsPanel - Main V2 panel component
 */
export const InstanceToolsPanel = memo(function InstanceToolsPanel({
  workspaceId,
  viewGroup, // Optional: pass viewGroup for strip display
}) {
  const logic = useInstanceToolsPanel({ workspaceId });

  const {
    hasInstance,
    instanceInfo,
    activeTab,
    setActiveTab,
    layers,
    widgets,
    layersExpanded,
    setLayersExpanded,
    handleLayerVisibilityToggle,
    handleLayerOpacityChange,
    handleLayerReorder,
    handleWidgetVisibilityToggle,
    handleWidgetOpacityChange,
    handleWidgetDelete,
  } = logic;

  return (
    <div className="instance-tools-panel">
      {/* Panel Header */}
      <div className="panel-header panel-header--amber">
        <Icon name="wrench" size={14} className="panel-header__icon" />
        <span className="panel-header__title">Instance Tools</span>
        {hasInstance && (
          <span className="panel-header__count">1 active</span>
        )}
      </div>

      {!hasInstance ? (
        <NoInstancePlaceholder />
      ) : (
        <>
          {/* ViewGroup Strip (if provided) */}
          {viewGroup && (
            <ViewGroupStrip
              viewGroup={viewGroup}
              onViewSelect={(id) => console.log('View selected:', id)}
            />
          )}

          {/* Instance Header */}
          <InstanceHeader instanceInfo={instanceInfo} />

          {/* Tab Bar */}
          <div className="instance-tools-panel__tabs">
            {PANEL_TABS.map(tab => (
              <button
                key={tab.id}
                className={`instance-tools-panel__tab ${activeTab === tab.id ? 'instance-tools-panel__tab--active' : ''}`}
                data-color={tab.color}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon} size={12} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content (scrollable middle) */}
          <div className="instance-tools-panel__content">
            {activeTab === 'tools' && <ToolsTabContent logic={logic} />}
            {activeTab === 'display' && <DisplayTab logic={logic} />}
            {activeTab === 'annotations' && <AnnotationsTabContent logic={logic} />}
          </div>

          {/* Layers & Widgets (stationary bottom) */}
          <LayersAndWidgets
            layers={layers}
            widgets={widgets}
            expanded={layersExpanded}
            onToggleExpanded={() => setLayersExpanded(!layersExpanded)}
            onLayerVisibilityToggle={handleLayerVisibilityToggle}
            onLayerOpacityChange={handleLayerOpacityChange}
            onLayerReorder={handleLayerReorder}
            onWidgetVisibilityToggle={handleWidgetVisibilityToggle}
            onWidgetOpacityChange={handleWidgetOpacityChange}
            onWidgetDelete={handleWidgetDelete}
          />
        </>
      )}
    </div>
  );
});

export default InstanceToolsPanel;
