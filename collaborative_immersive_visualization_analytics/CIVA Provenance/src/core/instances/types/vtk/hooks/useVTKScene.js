// src/core/instances/types/vtk/hooks/useVTKScene.js

/**
 * React hook for VTK Scene Feature
 *
 * Provides a clean interface to scene settings like background, grid, and axes.
 */

import { useState, useCallback, useEffect } from 'react';
import { vtkSceneFeature } from '@VTK/features/VTKSceneFeature';

/**
 * Hook for controlling VTK scene settings
 *
 * @param {string} instanceId - VTK instance identifier
 * @returns {Object} Scene control methods and state
 *
 * @example
 * const {
 *   backgroundPreset,
 *   setBackgroundPreset,
 *   showGrid,
 *   toggleGrid,
 *   showAxes,
 *   toggleAxes,
 * } = useVTKScene(instanceId);
 */
export function useVTKScene(instanceId) {
  // Local state synced with feature
  const [sceneState, setSceneState] = useState(() => {
    return vtkSceneFeature.getState(instanceId) || {
      backgroundPreset: 'light',
      showGrid: false,
      showAxes: false,
      gridPlane: 'xz',
    };
  });

  // Sync state when instanceId changes
  useEffect(() => {
    const state = vtkSceneFeature.getState(instanceId);
    if (state) {
      setSceneState(state);
    }
  }, [instanceId]);

  // Refresh state helper
  const refreshState = useCallback(() => {
    const state = vtkSceneFeature.getState(instanceId);
    if (state) {
      setSceneState(state);
    }
  }, [instanceId]);

  // ===========================================================================
  // BACKGROUND CONTROLS
  // ===========================================================================

  const setBackgroundPreset = useCallback((preset) => {
    vtkSceneFeature.setBackgroundPreset(instanceId, preset);
    refreshState();
  }, [instanceId, refreshState]);

  const setBackgroundColor = useCallback((color, options) => {
    vtkSceneFeature.setBackgroundColor(instanceId, color, options);
    refreshState();
  }, [instanceId, refreshState]);

  const backgroundPresets = vtkSceneFeature.getBackgroundPresets();

  // ===========================================================================
  // GRID CONTROLS
  // ===========================================================================

  const toggleGrid = useCallback(() => {
    vtkSceneFeature.toggleGrid(instanceId);
    refreshState();
  }, [instanceId, refreshState]);

  const setGridVisible = useCallback((visible) => {
    vtkSceneFeature.setGridVisible(instanceId, visible);
    refreshState();
  }, [instanceId, refreshState]);

  const setGridPlane = useCallback((plane) => {
    vtkSceneFeature.setGridPlane(instanceId, plane);
    refreshState();
  }, [instanceId, refreshState]);

  const setGridColor = useCallback((color, opacity) => {
    vtkSceneFeature.setGridColor(instanceId, color, opacity);
    refreshState();
  }, [instanceId, refreshState]);

  // ===========================================================================
  // AXES CONTROLS
  // ===========================================================================

  const toggleAxes = useCallback(() => {
    vtkSceneFeature.toggleAxes(instanceId);
    refreshState();
  }, [instanceId, refreshState]);

  const setAxesVisible = useCallback((visible) => {
    vtkSceneFeature.setAxesVisible(instanceId, visible);
    refreshState();
  }, [instanceId, refreshState]);

  const setAxesOptions = useCallback((options) => {
    vtkSceneFeature.setAxesOptions(instanceId, options);
    refreshState();
  }, [instanceId, refreshState]);

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // State
    backgroundPreset: sceneState.backgroundPreset,
    backgroundColorTop: sceneState.backgroundColorTop,
    backgroundColorBottom: sceneState.backgroundColorBottom,
    useGradient: sceneState.useGradient,
    showGrid: sceneState.showGrid,
    gridPlane: sceneState.gridPlane,
    gridColor: sceneState.gridColor,
    gridOpacity: sceneState.gridOpacity,
    showAxes: sceneState.showAxes,
    axesColor: sceneState.axesColor,

    // Background methods
    setBackgroundPreset,
    setBackgroundColor,
    backgroundPresets,

    // Grid methods
    toggleGrid,
    setGridVisible,
    setGridPlane,
    setGridColor,

    // Axes methods
    toggleAxes,
    setAxesVisible,
    setAxesOptions,

    // Tools for toolbar
    getTools: () => vtkSceneFeature.getTools(instanceId),
  };
}

export default useVTKScene;
