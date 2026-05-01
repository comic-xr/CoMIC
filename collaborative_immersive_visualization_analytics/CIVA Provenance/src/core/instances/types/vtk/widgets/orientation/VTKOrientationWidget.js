// src/core/instances/types/vtk/widgets/orientation/VTKOrientationWidget.js
// Orientation marker widget showing XYZ orientation in corner
// Supports multiple marker styles: cube (labeled faces) and axes (colored arrows)

import { render as log } from "@Utils/logger.js";
import vtkOrientationMarkerWidget from "@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget";
import vtkAnnotatedCubeActor from "@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor";
import vtkAxesActor from "@kitware/vtk.js/Rendering/Core/AxesActor";

/**
 * Supported orientation marker styles
 */
export const ORIENTATION_STYLES = {
  cube: {
    id: 'cube',
    label: 'Annotated Cube',
    description: 'Labeled cube showing face directions (+X, -X, etc.)',
    icon: 'cube',
  },
  axes: {
    id: 'axes',
    label: 'Axes Arrows',
    description: 'Colored XYZ arrow axes (R=X, G=Y, B=Z)',
    icon: 'axis3d',
  },
};

/**
 * VTKOrientationWidget
 *
 * Provides a 3D orientation marker in the corner of the viewport.
 * Supports multiple visual styles that rotate with the camera.
 *
 * CONTRIBUTOR PATTERN:
 * - Each instance has its own widget (no global state)
 * - Widget lifecycle tied to instance lifecycle
 * - Configuration passed at creation time
 * - Clean separation: widget logic, UI config, sync (not needed here)
 */
export class VTKOrientationWidget {
  constructor() {
    // Per-instance widget storage
    // Maps instanceId -> { widget, actor, config, interactor }
    this.instances = new Map();
  }

  /**
   * Initialize widget for a specific instance
   *
   * @param {string} instanceId - Unique instance identifier
   * @param {Object} sceneObjects - VTK scene components from the instance
   * @param {Object} config - Widget configuration options
   */
  initialize(instanceId, sceneObjects, config = {}) {
    // Don't recreate if already exists for this instance
    if (this.instances.has(instanceId)) {
      log.warn(`Orientation widget already exists for ${instanceId}`);
      return;
    }

    log.debug(`Initializing orientation widget for ${instanceId}`);

    const { interactor } = sceneObjects;

    if (!interactor) {
      log.error(`No interactor available for instance ${instanceId}`);
      return;
    }

    // Build full config with defaults
    const cfg = {
      enabled: true,
      style: 'cube',
      corner: "BOTTOM_RIGHT",
      viewportSize: 0.12,
      minPixelSize: 40,
      maxPixelSize: 100,
      ...config,
    };

    // Create the actor based on chosen style
    const actor = this._createActorForStyle(cfg.style, cfg);

    // Create the orientation marker widget
    const widget = vtkOrientationMarkerWidget.newInstance({
      actor: actor,
      interactor: interactor,
    });

    widget.setEnabled(cfg.enabled);
    widget.setViewportCorner(vtkOrientationMarkerWidget.Corners[cfg.corner]);
    widget.setViewportSize(cfg.viewportSize);
    widget.setMinPixelSize(cfg.minPixelSize);
    widget.setMaxPixelSize(cfg.maxPixelSize);

    // Store widget data for this instance
    this.instances.set(instanceId, {
      widget,
      actor,
      config: cfg,
      interactor,
    });

    log.debug(`Orientation widget created for ${instanceId} (style: ${cfg.style})`);
  }

  /**
   * Create the appropriate actor for the given style
   *
   * @param {string} style - 'cube' or 'axes'
   * @param {Object} config - Style configuration
   * @returns {vtkActor} The created actor
   */
  _createActorForStyle(style, config) {
    switch (style) {
      case 'axes':
        return this._createAxesActor(config);
      case 'cube':
      default:
        return this._createCubeActor(config);
    }
  }

  /**
   * Create and configure the annotated cube actor
   *
   * @param {Object} config - Face styling configuration
   * @returns {vtkAnnotatedCubeActor} Configured cube actor
   */
  _createCubeActor(config) {
    const cube = vtkAnnotatedCubeActor.newInstance();

    // Default style applied to all faces
    cube.setDefaultStyle({
      text: "+X",
      fontStyle: "bold",
      fontFamily: "Arial",
      fontColor: "black",
      fontSizeScale: (res) => res / 2,
      faceColor: "#60a5fa",
      faceRotation: 0,
      edgeThickness: 0.1,
      edgeColor: "black",
      resolution: 400,
    });

    // Customize individual faces
    cube.setXPlusFaceProperty({
      text: "+X",
      faceColor: config.xPlusColor || "#60a5fa",
    });

    cube.setXMinusFaceProperty({
      text: "-X",
      faceColor: config.xMinusColor || "#fbbf24",
      faceRotation: 90,
      fontStyle: "italic",
    });

    cube.setYPlusFaceProperty({
      text: "+Y",
      faceColor: config.yPlusColor || "#34d399",
      fontSizeScale: (res) => res / 4,
    });

    cube.setYMinusFaceProperty({
      text: "-Y",
      faceColor: config.yMinusColor || "#7dd3fc",
      fontColor: "white",
    });

    cube.setZPlusFaceProperty({
      text: "+Z",
      faceColor: config.zPlusColor || "#f87171",
      edgeColor: "yellow",
    });

    cube.setZMinusFaceProperty({
      text: "-Z",
      faceColor: config.zMinusColor || "#a78bfa",
      faceRotation: 45,
      edgeThickness: 0,
    });

    return cube;
  }

  /**
   * Create and configure the axes arrow actor
   *
   * @param {Object} config - Axes styling configuration
   * @returns {vtkAxesActor} Configured axes actor
   */
  _createAxesActor(config) {
    const axes = vtkAxesActor.newInstance();

    // Configure axis colors (R=X, G=Y, B=Z convention)
    axes.setXAxisColor(config.xAxisColor || [255, 80, 80]);
    axes.setYAxisColor(config.yAxisColor || [80, 220, 80]);
    axes.setZAxisColor(config.zAxisColor || [80, 130, 255]);

    axes.update();

    return axes;
  }

  /**
   * Switch the marker style for an instance
   * Recreates the actor and swaps it into the existing widget
   *
   * @param {string} instanceId - Instance to update
   * @param {string} newStyle - 'cube' or 'axes'
   */
  setStyle(instanceId, newStyle) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      log.warn(`No orientation widget found for ${instanceId}`);
      return;
    }

    if (!ORIENTATION_STYLES[newStyle]) {
      log.warn(`Unknown orientation style: ${newStyle}`);
      return;
    }

    if (widgetData.config.style === newStyle) {
      return; // Already this style
    }

    const { widget, actor, config, interactor } = widgetData;
    const wasEnabled = config.enabled;

    // Disable current widget before swapping
    widget.setEnabled(false);

    // Delete old actor
    if (actor) {
      actor.delete();
    }

    // Delete old widget
    widget.delete();

    // Create new actor with the new style
    const newActor = this._createActorForStyle(newStyle, config);

    // Create new widget with the new actor
    const newWidget = vtkOrientationMarkerWidget.newInstance({
      actor: newActor,
      interactor: interactor,
    });

    // Re-apply all configuration
    newWidget.setViewportCorner(vtkOrientationMarkerWidget.Corners[config.corner]);
    newWidget.setViewportSize(config.viewportSize);
    newWidget.setMinPixelSize(config.minPixelSize);
    newWidget.setMaxPixelSize(config.maxPixelSize);
    newWidget.setEnabled(wasEnabled);

    // Update stored data
    config.style = newStyle;
    widgetData.widget = newWidget;
    widgetData.actor = newActor;

    log.debug(`Orientation widget style changed to '${newStyle}' for ${instanceId}`);
  }

  /**
   * Get the current style for an instance
   *
   * @param {string} instanceId - Instance to query
   * @returns {string} Current style name ('cube', 'axes')
   */
  getStyle(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? widgetData.config.style || 'cube' : 'cube';
  }

  /**
   * Toggle widget visibility for an instance
   *
   * @param {string} instanceId - Instance to toggle
   * @param {boolean} visible - True to show, false to hide
   */
  setVisible(instanceId, visible) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      log.warn(`No orientation widget found for ${instanceId}`);
      return;
    }

    widgetData.widget.setEnabled(visible);
    widgetData.config.enabled = visible;

    log.debug(
      `Orientation widget ${visible ? "enabled" : "disabled"} for ${instanceId}`
    );
  }

  /**
   * Update widget configuration
   *
   * @param {string} instanceId - Instance to update
   * @param {Object} newConfig - Configuration changes
   */
  updateConfig(instanceId, newConfig) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      log.warn(`No orientation widget found for ${instanceId}`);
      return;
    }

    const { widget, config } = widgetData;

    // Handle style change via setStyle (requires actor swap)
    if (newConfig.style && newConfig.style !== config.style) {
      this.setStyle(instanceId, newConfig.style);
      // Re-read widgetData after style change
      return;
    }

    // Update corner position if changed
    if (newConfig.corner && newConfig.corner !== config.corner) {
      widget.setViewportCorner(
        vtkOrientationMarkerWidget.Corners[newConfig.corner]
      );
      config.corner = newConfig.corner;
    }

    // Update size if changed
    if (newConfig.viewportSize !== undefined) {
      widget.setViewportSize(newConfig.viewportSize);
      config.viewportSize = newConfig.viewportSize;
    }

    if (newConfig.minPixelSize !== undefined) {
      widget.setMinPixelSize(newConfig.minPixelSize);
      config.minPixelSize = newConfig.minPixelSize;
    }

    if (newConfig.maxPixelSize !== undefined) {
      widget.setMaxPixelSize(newConfig.maxPixelSize);
      config.maxPixelSize = newConfig.maxPixelSize;
    }

    log.debug(`Orientation widget config updated for ${instanceId}`);
  }

  /**
   * Get current widget configuration
   *
   * @param {string} instanceId - Instance to query
   * @returns {Object|null} Current configuration or null if not found
   */
  getConfig(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? { ...widgetData.config } : null;
  }

  /**
   * Check if widget is enabled for an instance
   *
   * @param {string} instanceId - Instance to check
   * @returns {boolean} True if enabled
   */
  isEnabled(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? widgetData.config.enabled : false;
  }

  /**
   * Clean up widget for a specific instance
   *
   * @param {string} instanceId - Instance to clean up
   */
  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      return;
    }

    log.debug(`Cleaning up orientation widget for ${instanceId}`);

    const { widget, actor } = widgetData;

    if (widget) {
      widget.setEnabled(false);
      widget.delete();
    }

    if (actor) {
      actor.delete();
    }

    this.instances.delete(instanceId);

    log.debug(`Orientation widget cleaned up for ${instanceId}`);
  }

  /**
   * Clean up all widgets (app shutdown)
   */
  destroy() {
    log.debug(`Destroying all orientation widgets`);

    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });

    this.instances.clear();

    log.debug(`All orientation widgets destroyed`);
  }
}

// Export singleton instance for use by VTKInstanceHandler
export const vtkOrientationWidget = new VTKOrientationWidget();

// Make available for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.vtkOrientationWidget = vtkOrientationWidget;
}
