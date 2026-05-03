// src/core/instances/types/vtk/widgets/plane/VTKPlaneWidget.js
// Clipping plane widget - FIXED for correct VTK.js API

import { render as log } from "@Utils/logger.js";
import vtkImplicitPlaneWidget from "@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";

/**
 * VTKPlaneWidget
 *
 * Provides interactive clipping plane for cutting through data.
 *
 * CRITICAL FIX: VTK.js ImplicitPlaneWidget doesn't have getPlanes() method!
 * Instead, we need to manually create a vtkPlane from the widget state.
 */
export class VTKPlaneWidget {
  constructor() {
    // Per-instance widget storage
    this.instances = new Map();
  }

  /**
   * Initialize widget for a specific instance
   */
  initialize(instanceId, config) {
    if (this.instances.has(instanceId)) {
      log.warn(`Plane widget already exists for ${instanceId}`);
      return;
    }

    log.debug(`Initializing clipping plane for ${instanceId}`);

    const { widgetManager, sceneObjects, placeFactor = 1.25 } = config;

    try {
      // Create VTK.js widget
      const widget = vtkImplicitPlaneWidget.newInstance();
      widget.setPlaceFactor(placeFactor);

      // Get bounds for initial placement
      const inputData = sceneObjects.mapper.getInputData();
      if (inputData) {
        widget.placeWidget(inputData.getBounds());
      }

      // Add to widget manager and get handle
      const handle = widgetManager.addWidget(widget);
      handle.setEnabled(true);

      // Create a vtkPlane for clipping
      const clipPlane = vtkPlane.newInstance();

      // Helper function to update clipping plane from widget state
      const updateClippingPlane = () => {
        const widgetState = widget.getWidgetState();

        // Get the plane's normal and origin from widget state
        const normal = widgetState.getNormal();
        const origin = widgetState.getOrigin();

        if (normal && origin) {
          // Update the clipping plane
          clipPlane.setNormal(normal);
          clipPlane.setOrigin(origin);

          // Apply clipping
          sceneObjects.mapper.removeAllClippingPlanes();
          sceneObjects.mapper.addClippingPlane(clipPlane);
          sceneObjects.renderWindow.render();
        }
      };

      // Update clipping when plane moves
      handle.onInteractionEvent(() => {
        updateClippingPlane();
      });

      // Apply initial clipping
      updateClippingPlane();

      // Store widget data
      this.instances.set(instanceId, {
        widget,
        handle,
        widgetManager,
        sceneObjects,
        clipPlane,
        config,
      });

      log.debug(`Clipping plane created for ${instanceId}`);
    } catch (error) {
      log.error(`Error initializing clipping plane:`, error);
      throw error;
    }
  }

  /**
   * Check if widget is enabled for an instance
   */
  isEnabled(instanceId) {
    return this.instances.has(instanceId);
  }

  /**
   * Get widget configuration
   */
  getConfig(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? { ...widgetData.config } : null;
  }

  /**
   * Get current plane (for sync or export)
   */
  getPlane(instanceId) {
    const widgetData = this.instances.get(instanceId);
    if (!widgetData) return null;

    const widgetState = widgetData.widget.getWidgetState();
    return {
      normal: widgetState.getNormal(),
      origin: widgetState.getOrigin(),
    };
  }

  /**
   * Set plane position (for sync or import)
   */
  setPlane(instanceId, planeData) {
    const widgetData = this.instances.get(instanceId);
    if (!widgetData) return;

    const { widget, clipPlane, sceneObjects } = widgetData;
    const widgetState = widget.getWidgetState();

    // Update widget state
    if (planeData.normal) {
      widgetState.setNormal(planeData.normal);
    }
    if (planeData.origin) {
      widgetState.setOrigin(planeData.origin);
    }

    // Update clipping plane
    if (planeData.normal) {
      clipPlane.setNormal(planeData.normal);
    }
    if (planeData.origin) {
      clipPlane.setOrigin(planeData.origin);
    }

    // Apply clipping
    sceneObjects.mapper.removeAllClippingPlanes();
    sceneObjects.mapper.addClippingPlane(clipPlane);
    sceneObjects.renderWindow.render();
  }

  /**
   * Clean up widget for a specific instance
   */
  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      return;
    }

    log.debug(`Cleaning up clipping plane for ${instanceId}`);

    const { widget, handle, widgetManager, sceneObjects } = widgetData;

    // Remove clipping
    sceneObjects.mapper.removeAllClippingPlanes();

    // Disable and remove widget
    if (handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    // Render to show changes
    sceneObjects.renderWindow.render();

    // Remove from storage
    this.instances.delete(instanceId);

    log.debug(`Clipping plane cleaned up for ${instanceId}`);
  }

  /**
   * Clean up all widgets (app shutdown)
   */
  destroy() {
    log.debug(`Destroying all clipping planes`);

    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });

    this.instances.clear();

    log.debug(`All clipping planes destroyed`);
  }
}

// Export singleton instance
export const vtkPlaneWidget = new VTKPlaneWidget();
