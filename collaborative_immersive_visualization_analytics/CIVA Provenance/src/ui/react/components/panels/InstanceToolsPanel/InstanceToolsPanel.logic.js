/**
 * @file InstanceToolsPanel.logic.js
 * @description Business logic hook for Instance Tools Panel V2
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getCellColorHex } from '@UI/react/utils/canvasColors.js';
import { instanceTools } from '@Core/instances/types/vtk/vtkInstanceTools.js';
import { vtkOrientationWidget } from '@Core/instances/types/vtk/widgets/orientation/VTKOrientationWidget.js';
import vtkSceneFeature from '@Core/instances/types/vtk/features/VTKSceneFeature.js';
import { TOOL_SECTIONS, TRANSFORM_LIMITS } from './constants';
import { normalizeInstanceToolsResult } from '@UI/react/utils/instanceTools.js';

/**
 * useInstanceToolsPanel - Main logic hook for Instance Tools Panel V2
 */
export function useInstanceToolsPanel({ workspaceId } = {}) {
  // -------------------------------------------------------------------------
  // Tab State
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('tools');
  const [activeSection, setActiveSection] = useState('camera');
  const [expandedSections, setExpandedSections] = useState({
    camera: true,
    transform: true,
    widgets: true,
    appearance: true,
    colormap: true,
    scene: true,
    slice: false,
    windowLevel: false,
  });

  // -------------------------------------------------------------------------
  // Tools State - Real tools from workspaceManager
  // -------------------------------------------------------------------------
  const [tools, setTools] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState({});

  // -------------------------------------------------------------------------
  // Instance State
  // -------------------------------------------------------------------------
  const [activeInstance, setActiveInstance] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // -------------------------------------------------------------------------
  // Transform State (Actor)
  // -------------------------------------------------------------------------
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 100, y: 100, z: 100 });
  const [uniformScale, setUniformScale] = useState(true);

  // -------------------------------------------------------------------------
  // Camera State
  // -------------------------------------------------------------------------
  const [cameraState, setCameraState] = useState({
    position: [0, 0, 100],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0],
    viewAngle: 30,
  });
  const [cameraTransformExpanded, setCameraTransformExpanded] = useState(false);
  const [savedCameraStates, setSavedCameraStates] = useState([]); // Max 5 saved states

  // -------------------------------------------------------------------------
  // Slice State
  // -------------------------------------------------------------------------
  const [sliceOrientation, setSliceOrientation] = useState('axial');
  const [slicePosition, setSlicePosition] = useState(127);
  const [sliceMax, setSliceMax] = useState(256);

  // -------------------------------------------------------------------------
  // Window/Level State
  // -------------------------------------------------------------------------
  const [windowValue, setWindowValue] = useState(400);
  const [levelValue, setLevelValue] = useState(40);
  const [activeWindowLevelPreset, setActiveWindowLevelPreset] = useState(null);

  // -------------------------------------------------------------------------
  // Appearance State
  // -------------------------------------------------------------------------
  const [opacity, setOpacity] = useState(100);
  const [representation, setRepresentation] = useState('surface');
  const [pointSize, setPointSize] = useState(5);
  const [lineWidth, setLineWidth] = useState(2);

  // -------------------------------------------------------------------------
  // Measurement Widgets State
  // -------------------------------------------------------------------------
  const [lineWidgetActive, setLineWidgetActive] = useState(false);
  const [angleWidgetActive, setAngleWidgetActive] = useState(false);
  const [planeWidgetActive, setPlaneWidgetActive] = useState(false);

  // -------------------------------------------------------------------------
  // Colormap State
  // -------------------------------------------------------------------------
  const [currentColormap, setCurrentColormap] = useState('viridis');

  // -------------------------------------------------------------------------
  // Scene State
  // -------------------------------------------------------------------------
  const [backgroundPreset, setBackgroundPreset] = useState('dark');

  // -------------------------------------------------------------------------
  // Layers & Widgets State
  // -------------------------------------------------------------------------
  const [layers, setLayers] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [layersExpanded, setLayersExpanded] = useState(true);

  // -------------------------------------------------------------------------
  // Display Tab - Scene Overlays State
  // -------------------------------------------------------------------------
  const [overlayState, setOverlayState] = useState({
    orientation: true,
    grid: false,
    axes: false,
    scalebar: false,
    coordinates: false,
    fps: false,
  });
  const [overlayConfigs, setOverlayConfigs] = useState({
    orientation: { style: 'cube', position: 'BOTTOM_RIGHT', sizePreset: 'md', sizePercent: 12, sizePixels: 80 },
    grid: { plane: 'xz', divisions: 10, opacity: 50 },
    axes: { showLabels: true, showTicks: true },
    scalebar: { style: 'ticked', position: 'BOTTOM_RIGHT', orientation: 'horizontal', behavior: 'auto', units: 'auto' },
    coordinates: { position: 'BOTTOM_LEFT', precision: 2 },
  });

  // -------------------------------------------------------------------------
  // Scroll Tracking for Dot Navigation
  // -------------------------------------------------------------------------
  const sectionRefs = useRef({});
  const containerRef = useRef(null);

  // -------------------------------------------------------------------------
  // Subscribe to Active Instance Changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    const updateActiveInstance = () => {
      const instance = workspaceManager?.getActiveInstance?.();
      setActiveInstance(instance || null);
    };

    updateActiveInstance();

    const handleInstanceFocus = () => updateActiveInstance();
    const handleViewClosed = () => setTimeout(updateActiveInstance, 50);
    const handleNameChange = () => setRefreshKey(k => k + 1);

    window.addEventListener('cia:instance-focused', handleInstanceFocus);
    window.addEventListener('cia:active-instance-changed', handleInstanceFocus);
    window.addEventListener('cia:close-view', handleViewClosed);

    const viewManager = getViewConfigurationManager();
    if (viewManager?.on) {
      viewManager.on('viewTrashed', handleViewClosed);
      viewManager.on('viewDeleted', handleViewClosed);
      viewManager.on('viewDeactivated', handleViewClosed);
      viewManager.on('viewUpdated', handleNameChange);
      viewManager.on('viewRenamed', handleNameChange);
    }

    return () => {
      window.removeEventListener('cia:instance-focused', handleInstanceFocus);
      window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
      window.removeEventListener('cia:close-view', handleViewClosed);

      if (viewManager?.off) {
        viewManager.off('viewTrashed', handleViewClosed);
        viewManager.off('viewDeleted', handleViewClosed);
        viewManager.off('viewDeactivated', handleViewClosed);
        viewManager.off('viewUpdated', handleNameChange);
        viewManager.off('viewRenamed', handleNameChange);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Load Tools from WorkspaceManager
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeInstance?.instanceId) {
      setTools([]);
      return;
    }

    const loadTools = () => {
      try {
        const toolsList = workspaceManager.getInstanceTools(activeInstance.instanceId);
        const normalized = normalizeInstanceToolsResult(toolsList);
        // Transform to consistent format
        const formattedTools = (normalized.tools || []).map(tool => ({
          id: tool.id,
          icon: tool.icon,
          label: tool.label,
          description: tool.tooltip || tool.description,
          type: tool.items || tool.options ? 'menu' : 'button',
          active: tool.active,
          disabled: tool.disabled,
          options: tool.items || tool.options,
          onClick: tool.onClick,
        }));
        setTools(formattedTools);
      } catch (err) {
        console.warn('Failed to load tools:', err);
        setTools([]);
      }
    };

    loadTools();

    // Listen for tool updates
    const handleToolsUpdate = (event) => {
      if (event.detail?.instanceId === activeInstance.instanceId) {
        loadTools();
      }
    };

    window.addEventListener('cia:tools-updated', handleToolsUpdate);
    return () => window.removeEventListener('cia:tools-updated', handleToolsUpdate);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Sync Transform State from VTK Instance
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeInstance?.instanceId) return;

    // Sync current transform state when instance becomes active
    const syncTransformFromInstance = () => {
      const state = instanceTools.getTransformState(activeInstance.instanceId);
      if (state) {
        setPosition({
          x: state.position[0],
          y: state.position[1],
          z: state.position[2],
        });
        setRotation({
          x: state.rotation[0],
          y: state.rotation[1],
          z: state.rotation[2],
        });
        // VTK scale is 0-N, UI is percentage (0-200)
        setScale({
          x: state.scale[0] * 100,
          y: state.scale[1] * 100,
          z: state.scale[2] * 100,
        });
      }
    };

    // Initial sync
    syncTransformFromInstance();

    // Listen for transform changes from other sources
    const handleTransformChange = (event) => {
      if (event.detail?.instanceId === activeInstance.instanceId) {
        setPosition({
          x: event.detail.position[0],
          y: event.detail.position[1],
          z: event.detail.position[2],
        });
        setRotation({
          x: event.detail.rotation[0],
          y: event.detail.rotation[1],
          z: event.detail.rotation[2],
        });
        setScale({
          x: event.detail.scale[0] * 100,
          y: event.detail.scale[1] * 100,
          z: event.detail.scale[2] * 100,
        });
      }
    };

    window.addEventListener('cia:transform-changed', handleTransformChange);
    return () => window.removeEventListener('cia:transform-changed', handleTransformChange);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Sync Appearance State from VTK Instance
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeInstance?.instanceId) return;

    // Sync current appearance state when instance becomes active
    const currentOpacity = instanceTools.getOpacity(activeInstance.instanceId);
    const currentRep = instanceTools.getRepresentation(activeInstance.instanceId);
    const currentPointSize = instanceTools.getPointSize(activeInstance.instanceId);
    const currentLineWidth = instanceTools.getLineWidth(activeInstance.instanceId);

    setOpacity(Math.round(currentOpacity * 100));
    setRepresentation(currentRep);
    setPointSize(currentPointSize);
    setLineWidth(currentLineWidth);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Sync Camera State from VTK Instance
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeInstance?.instanceId) return;

    // Sync current camera state when instance becomes active
    const syncCameraFromInstance = () => {
      const state = instanceTools.getCameraState(activeInstance.instanceId);
      if (state) {
        setCameraState({
          position: state.position || [0, 0, 100],
          focalPoint: state.focalPoint || [0, 0, 0],
          viewUp: state.viewUp || [0, 1, 0],
          viewAngle: state.viewAngle || 30,
        });
      }
    };

    // Initial sync
    syncCameraFromInstance();

    // Listen for camera changes from viewport interaction
    const handleCameraChange = (event) => {
      if (event.detail?.instanceId === activeInstance.instanceId) {
        syncCameraFromInstance();
      }
    };

    window.addEventListener('cia:camera-changed', handleCameraChange);
    return () => window.removeEventListener('cia:camera-changed', handleCameraChange);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Toggle Menu Handler
  // -------------------------------------------------------------------------
  const handleToggleMenu = useCallback((menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  }, []);

  // -------------------------------------------------------------------------
  // Derived Instance Info
  // -------------------------------------------------------------------------
  const instanceInfo = useMemo(() => {
    if (!activeInstance) return null;

    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();
    const viewId = activeInstance.viewConfigId || activeInstance.viewId;
    const viewConfig = viewManager?.getView?.(viewId);
    const datasetId = viewConfig?.datasetId || activeInstance.instanceData?.dataset?.id;
    const dataset = datasetId ? datasetManager?.getDataset?.(datasetId) : null;

    let position = null;
    let colorHex = '#60a5fa';

    try {
      const activeCanvasId = canvasManager?.getActiveCanvasId?.();
      if (activeCanvasId) {
        const canvas = canvasManager?.getCanvas?.(activeCanvasId);
        if (canvas?.placements) {
          const placement = canvas.placements.find(
            p => p.content?.viewConfigurationId === viewId
          );
          if (placement) {
            position = { row: placement.row, col: placement.col };
            colorHex = getCellColorHex(placement.row, placement.col);
          }
        }
      }
    } catch (e) {
      // Fall back to default color
    }

    return {
      viewId,
      instanceId: activeInstance.instanceId,
      name: viewConfig?.name || activeInstance.name || `Instance`,
      dataset: dataset?.name || activeInstance.instanceData?.dataset?.name || 'No data loaded',
      type: activeInstance.type || viewConfig?.handlerType || 'vtk',
      color: colorHex,
      position,
    };
  }, [activeInstance, refreshKey]);

  // -------------------------------------------------------------------------
  // Section Navigation
  // -------------------------------------------------------------------------
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const navigateToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Track scroll position for dot navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentSection = TOOL_SECTIONS[0].id;

      TOOL_SECTIONS.forEach(section => {
        const ref = sectionRefs.current[section.id];
        if (ref && ref.offsetTop <= scrollTop + 50) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // -------------------------------------------------------------------------
  // Transform Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  const handlePositionChange = useCallback((axis, value) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    if (!activeInstance?.instanceId) return;
    instanceTools.setPosition(activeInstance.instanceId, newPosition.x, newPosition.y, newPosition.z);
  }, [activeInstance?.instanceId, position]);

  const handleRotationChange = useCallback((axis, value) => {
    const newRotation = { ...rotation, [axis]: value };
    setRotation(newRotation);
    if (!activeInstance?.instanceId) return;
    instanceTools.setRotation(activeInstance.instanceId, newRotation.x, newRotation.y, newRotation.z);
  }, [activeInstance?.instanceId, rotation]);

  const handleScaleChange = useCallback((axis, value) => {
    let newScale;
    if (uniformScale) {
      newScale = { x: value, y: value, z: value };
    } else {
      newScale = { ...scale, [axis]: value };
    }
    setScale(newScale);
    if (!activeInstance?.instanceId) return;
    // UI uses percentage (10-200%), VTK uses multiplier (0.1-2.0)
    instanceTools.setScale(
      activeInstance.instanceId,
      newScale.x / 100,
      newScale.y / 100,
      newScale.z / 100
    );
  }, [activeInstance?.instanceId, scale, uniformScale]);

  const handleResetTransform = useCallback(() => {
    setPosition({ x: 0, y: 0, z: 0 });
    setRotation({ x: 0, y: 0, z: 0 });
    setScale({ x: 100, y: 100, z: 100 });
    if (!activeInstance?.instanceId) return;
    instanceTools.resetTransform(activeInstance.instanceId);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Camera Handlers
  // -------------------------------------------------------------------------
  const handleCameraPreset = useCallback((preset) => {
    if (!activeInstance?.instanceId) return;

    if (preset === 'reset') {
      instanceTools.resetCamera(activeInstance.instanceId);
    } else {
      // Map UI preset IDs to VTK view names
      const viewMap = {
        iso: 'isometric',
        top: 'top',
        bottom: 'bottom',
        left: 'left',
        right: 'right',
        front: 'front',
        back: 'back',
      };
      const view = viewMap[preset] || preset;
      instanceTools.setCameraView(activeInstance.instanceId, view);
    }
  }, [activeInstance?.instanceId]);

  // Camera position change handler
  const handleCameraPositionChange = useCallback((axis, value) => {
    if (!activeInstance?.instanceId) return;
    const newPosition = [...cameraState.position];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    newPosition[axisIndex] = value;

    setCameraState(prev => ({ ...prev, position: newPosition }));

    // Apply to VTK camera
    const state = {
      ...cameraState,
      position: newPosition,
    };
    instanceTools.setCameraState(activeInstance.instanceId, state);
  }, [activeInstance?.instanceId, cameraState]);

  // Camera focal point change handler
  const handleCameraFocalPointChange = useCallback((axis, value) => {
    if (!activeInstance?.instanceId) return;
    const newFocalPoint = [...cameraState.focalPoint];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    newFocalPoint[axisIndex] = value;

    setCameraState(prev => ({ ...prev, focalPoint: newFocalPoint }));

    // Apply to VTK camera
    const state = {
      ...cameraState,
      focalPoint: newFocalPoint,
    };
    instanceTools.setCameraState(activeInstance.instanceId, state);
  }, [activeInstance?.instanceId, cameraState]);

  // Camera view angle change handler
  const handleCameraViewAngleChange = useCallback((value) => {
    if (!activeInstance?.instanceId) return;

    setCameraState(prev => ({ ...prev, viewAngle: value }));

    // Apply to VTK camera
    const state = {
      ...cameraState,
      viewAngle: value,
    };
    instanceTools.setCameraState(activeInstance.instanceId, state);
  }, [activeInstance?.instanceId, cameraState]);

  // Toggle camera transform subsection
  const handleToggleCameraTransform = useCallback(() => {
    setCameraTransformExpanded(prev => !prev);
  }, []);

  // Save current camera state
  const handleSaveCameraState = useCallback(() => {
    if (!activeInstance?.instanceId) return;

    const state = instanceTools.getCameraState(activeInstance.instanceId);
    if (!state) return;

    const savedState = {
      id: Date.now(),
      name: `View ${savedCameraStates.length + 1}`,
      timestamp: new Date().toLocaleTimeString(),
      ...state,
    };

    // Keep only the last 5 states
    setSavedCameraStates(prev => [savedState, ...prev].slice(0, 5));
  }, [activeInstance?.instanceId, savedCameraStates.length]);

  // Restore a saved camera state
  const handleRestoreCameraState = useCallback((savedState) => {
    if (!activeInstance?.instanceId || !savedState) return;

    const { position, focalPoint, viewUp, viewAngle, parallelScale, clippingRange } = savedState;

    // Update local state
    setCameraState({
      position: position || [0, 0, 100],
      focalPoint: focalPoint || [0, 0, 0],
      viewUp: viewUp || [0, 1, 0],
      viewAngle: viewAngle || 30,
    });

    // Apply to VTK
    instanceTools.setCameraState(activeInstance.instanceId, {
      position,
      focalPoint,
      viewUp,
      viewAngle,
      parallelScale,
      clippingRange,
    });
  }, [activeInstance?.instanceId]);

  // Delete a saved camera state
  const handleDeleteCameraState = useCallback((stateId) => {
    setSavedCameraStates(prev => prev.filter(s => s.id !== stateId));
  }, []);

  // -------------------------------------------------------------------------
  // Scene Overlay Handlers (wired to VTK)
  // -------------------------------------------------------------------------

  // Sync overlay state from VTK when instance changes
  useEffect(() => {
    if (!activeInstance?.instanceId) return;

    const instanceId = activeInstance.instanceId;

    // Sync orientation widget state
    const orientationEnabled = instanceTools.isWidgetActive(instanceId, 'orientation');

    // Sync scene feature states (grid, axes)
    const sceneState = vtkSceneFeature.getState?.(instanceId) || {};
    const gridEnabled = sceneState.showGrid || false;
    const axesEnabled = sceneState.showAxes || false;

    setOverlayState(prev => ({
      ...prev,
      orientation: orientationEnabled,
      grid: gridEnabled,
      axes: axesEnabled,
    }));
  }, [activeInstance?.instanceId]);

  // Toggle scene overlay
  const handleToggleOverlay = useCallback((overlayId) => {
    if (!activeInstance?.instanceId) return;

    const instanceId = activeInstance.instanceId;
    const newState = !overlayState[overlayId];

    // Apply to VTK based on overlay type
    switch (overlayId) {
      case 'orientation':
        instanceTools.toggleOrientation(instanceId);
        break;
      case 'grid':
        vtkSceneFeature.toggleGrid(instanceId);
        break;
      case 'axes':
        vtkSceneFeature.toggleAxes(instanceId);
        break;
      // Future: Add handlers for scalebar, coordinates, fps
      default:
        break;
    }

    // Update local state
    setOverlayState(prev => ({
      ...prev,
      [overlayId]: newState,
    }));
  }, [activeInstance?.instanceId, overlayState]);

  // Update overlay configuration
  const handleUpdateOverlayConfig = useCallback((overlayId, newConfig) => {
    if (!activeInstance?.instanceId) return;

    const instanceId = activeInstance.instanceId;

    // Apply config to VTK based on overlay type
    switch (overlayId) {
      case 'orientation':
        // Update orientation widget configuration
        vtkOrientationWidget.updateConfig(instanceId, {
          viewportSize: newConfig.sizePercent / 100,
          corner: newConfig.position,
        });
        instanceTools.forceRender(instanceId);
        break;
      case 'grid':
        // Update grid plane if changed
        if (newConfig.plane) {
          vtkSceneFeature.setGridPlane?.(instanceId, newConfig.plane);
        }
        // Update grid divisions if changed
        if (newConfig.divisions) {
          vtkSceneFeature.setGridDivisions?.(instanceId, newConfig.divisions);
        }
        // Update grid opacity if changed
        if (newConfig.opacity !== undefined) {
          vtkSceneFeature.setGridOpacity?.(instanceId, newConfig.opacity / 100);
        }
        instanceTools.forceRender(instanceId);
        break;
      // Future: Add config handlers for axes, scalebar, coordinates
      default:
        break;
    }

    // Update local state
    setOverlayConfigs(prev => ({
      ...prev,
      [overlayId]: newConfig,
    }));
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Slice Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  const handleSliceOrientationChange = useCallback((orientation) => {
    setSliceOrientation(orientation);
    if (!activeInstance?.instanceId) return;
    instanceTools.setSliceOrientation(activeInstance.instanceId, orientation);

    // Update slice max based on data dimensions
    const dimensions = instanceTools.getDataDimensions(activeInstance.instanceId);
    const maxMap = {
      axial: dimensions.z,
      sagittal: dimensions.x,
      coronal: dimensions.y,
    };
    setSliceMax(maxMap[orientation] || 256);
  }, [activeInstance?.instanceId]);

  const handleSlicePositionChange = useCallback((position) => {
    setSlicePosition(position);
    if (!activeInstance?.instanceId) return;
    // Convert absolute position to percentage for VTK
    const percentage = (position / sliceMax) * 100;
    instanceTools.setSlicePosition(activeInstance.instanceId, percentage);
  }, [activeInstance?.instanceId, sliceMax]);

  // -------------------------------------------------------------------------
  // Window/Level Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  const handleWindowChange = useCallback((value) => {
    setWindowValue(value);
    if (!activeInstance?.instanceId) return;
    instanceTools.setWindowLevel(activeInstance.instanceId, value, levelValue);
  }, [activeInstance?.instanceId, levelValue]);

  const handleLevelChange = useCallback((value) => {
    setLevelValue(value);
    if (!activeInstance?.instanceId) return;
    instanceTools.setWindowLevel(activeInstance.instanceId, windowValue, value);
  }, [activeInstance?.instanceId, windowValue]);

  const handleWindowLevelPreset = useCallback((presetId, windowWidth, windowLevel) => {
    setActiveWindowLevelPreset(presetId);
    setWindowValue(windowWidth);
    setLevelValue(windowLevel);
    if (!activeInstance?.instanceId) return;
    instanceTools.applyWindowLevelPreset(activeInstance.instanceId, presetId, windowWidth, windowLevel);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Appearance Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  const handleOpacityChange = useCallback((value) => {
    setOpacity(value);
    if (!activeInstance?.instanceId) return;
    // VTK uses 0-1 scale, UI uses 0-100
    instanceTools.setOpacity(activeInstance.instanceId, value / 100);
  }, [activeInstance?.instanceId]);

  const handleRepresentationChange = useCallback((mode) => {
    setRepresentation(mode);
    if (!activeInstance?.instanceId) return;
    instanceTools.setRepresentation(activeInstance.instanceId, mode);
  }, [activeInstance?.instanceId]);

  const handlePointSizeChange = useCallback((size) => {
    setPointSize(size);
    if (!activeInstance?.instanceId) return;
    instanceTools.setPointSize(activeInstance.instanceId, size);
  }, [activeInstance?.instanceId]);

  const handleLineWidthChange = useCallback((width) => {
    setLineWidth(width);
    if (!activeInstance?.instanceId) return;
    instanceTools.setLineWidth(activeInstance.instanceId, width);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Measurement Widgets Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  // Sync widget state from VTK when instance changes
  useEffect(() => {
    if (!activeInstance?.instanceId) return;
    const instanceId = activeInstance.instanceId;

    // Sync measurement widget states
    setLineWidgetActive(instanceTools.isWidgetActive?.(instanceId, 'line') || false);
    setAngleWidgetActive(instanceTools.isWidgetActive?.(instanceId, 'angle') || false);
    setPlaneWidgetActive(instanceTools.isWidgetActive?.(instanceId, 'plane') || false);
  }, [activeInstance?.instanceId]);

  const handleToggleLineWidget = useCallback(() => {
    if (!activeInstance?.instanceId) return;
    instanceTools.toggleRulerMeasurement?.(activeInstance.instanceId);
    setLineWidgetActive(prev => !prev);
  }, [activeInstance?.instanceId]);

  const handleToggleAngleWidget = useCallback(() => {
    if (!activeInstance?.instanceId) return;
    instanceTools.toggleAngleMeasurement?.(activeInstance.instanceId);
    setAngleWidgetActive(prev => !prev);
  }, [activeInstance?.instanceId]);

  const handleTogglePlaneWidget = useCallback(() => {
    if (!activeInstance?.instanceId) return;
    instanceTools.toggleClippingPlane?.(activeInstance.instanceId);
    setPlaneWidgetActive(prev => !prev);
  }, [activeInstance?.instanceId]);

  const handleClearAllWidgets = useCallback(() => {
    if (!activeInstance?.instanceId) return;
    const instanceId = activeInstance.instanceId;

    if (lineWidgetActive) instanceTools.toggleRulerMeasurement?.(instanceId);
    if (angleWidgetActive) instanceTools.toggleAngleMeasurement?.(instanceId);
    if (planeWidgetActive) instanceTools.toggleClippingPlane?.(instanceId);

    setLineWidgetActive(false);
    setAngleWidgetActive(false);
    setPlaneWidgetActive(false);
  }, [activeInstance?.instanceId, lineWidgetActive, angleWidgetActive, planeWidgetActive]);

  // -------------------------------------------------------------------------
  // Colormap Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  // Sync colormap state from VTK when instance changes
  useEffect(() => {
    if (!activeInstance?.instanceId) return;
    const colormap = instanceTools.getCurrentColormap?.(activeInstance.instanceId);
    if (colormap) setCurrentColormap(colormap);
  }, [activeInstance?.instanceId]);

  const handleColormapChange = useCallback((colormapId) => {
    if (!activeInstance?.instanceId) return;
    instanceTools.setColorMap?.(activeInstance.instanceId, colormapId);
    setCurrentColormap(colormapId);
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Scene Handlers (wired to VTK)
  // -------------------------------------------------------------------------
  // Sync scene state from VTK when instance changes
  useEffect(() => {
    if (!activeInstance?.instanceId) return;
    const sceneState = vtkSceneFeature.getState?.(activeInstance.instanceId);
    if (sceneState?.backgroundPreset) {
      setBackgroundPreset(sceneState.backgroundPreset);
    }
  }, [activeInstance?.instanceId]);

  const handleBackgroundChange = useCallback((presetId) => {
    if (!activeInstance?.instanceId) return;
    vtkSceneFeature.setBackgroundPreset?.(activeInstance.instanceId, presetId);
    setBackgroundPreset(presetId);
  }, [activeInstance?.instanceId]);

  const handleGridPlaneChange = useCallback((plane) => {
    if (!activeInstance?.instanceId) return;
    vtkSceneFeature.setGridPlane?.(activeInstance.instanceId, plane);
    setOverlayConfigs(prev => ({
      ...prev,
      grid: { ...prev.grid, plane },
    }));
  }, [activeInstance?.instanceId]);

  // -------------------------------------------------------------------------
  // Layers Handlers
  // -------------------------------------------------------------------------
  const handleLayerVisibilityToggle = useCallback((layerId) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const handleLayerOpacityChange = useCallback((layerId, opacity) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, opacity } : layer
    ));
  }, []);

  const handleLayerReorder = useCallback((draggedId, targetId) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const draggedIndex = newLayers.findIndex(l => l.id === draggedId);
      const targetIndex = newLayers.findIndex(l => l.id === targetId);
      const [draggedLayer] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(targetIndex, 0, draggedLayer);
      return newLayers;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Widgets Handlers
  // -------------------------------------------------------------------------
  const handleWidgetVisibilityToggle = useCallback((widgetId) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ));
  }, []);

  const handleWidgetOpacityChange = useCallback((widgetId, opacity) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, opacity } : widget
    ));
  }, []);

  const handleWidgetDelete = useCallback((widgetId) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
  }, []);

  // -------------------------------------------------------------------------
  // Return API
  // -------------------------------------------------------------------------
  return {
    // Instance
    activeInstance,
    instanceInfo,
    hasInstance: !!activeInstance,

    // Real Tools from workspaceManager
    tools,
    expandedMenus,
    handleToggleMenu,

    // Tab State
    activeTab,
    setActiveTab,

    // Section Navigation
    activeSection,
    setActiveSection,
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

    // Slice (wired to VTK)
    sliceOrientation,
    setSliceOrientation: handleSliceOrientationChange,
    slicePosition,
    setSlicePosition: handleSlicePositionChange,
    sliceMax,

    // Window/Level (wired to VTK)
    windowValue,
    setWindowValue: handleWindowChange,
    levelValue,
    setLevelValue: handleLevelChange,
    activeWindowLevelPreset,
    setActiveWindowLevelPreset,
    handleWindowLevelPreset,

    // Appearance (wired to VTK)
    opacity,
    setOpacity: handleOpacityChange,
    representation,
    setRepresentation: handleRepresentationChange,
    pointSize,
    setPointSize: handlePointSizeChange,
    lineWidth,
    setLineWidth: handleLineWidthChange,

    // Measurement Widgets (wired to VTK)
    lineWidgetActive,
    angleWidgetActive,
    planeWidgetActive,
    handleToggleLineWidget,
    handleToggleAngleWidget,
    handleTogglePlaneWidget,
    handleClearAllWidgets,

    // Colormap (wired to VTK)
    currentColormap,
    handleColormapChange,

    // Scene (wired to VTK)
    backgroundPreset,
    handleBackgroundChange,
    handleGridPlaneChange,

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

    // Layers & Widgets
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

    // Scene Overlays (wired to VTK)
    overlayState,
    overlayConfigs,
    handleToggleOverlay,
    handleUpdateOverlayConfig,
  };
}

export default useInstanceToolsPanel;
