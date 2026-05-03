// src/core/instances/types/vtk/features/VTKAnnotationWidgetsFeature.js

/**
 * VTK Annotation Widgets Feature
 *
 * Provides various interactive annotation widgets:
 * - SeedWidget: Place point markers
 * - SplineWidget: Draw smooth curves
 * - PolyLineWidget: Draw connected line segments
 * - SphereWidget: Place spherical markers
 * - PaintWidget: Freeform drawing/painting
 * - ShapeWidget: Draw shapes (rectangles, ellipses)
 * - EllipseWidget: Draw ellipses/circles
 * - RectangleWidget: Draw rectangles
 * - TransformControlsWidget: Transform objects (translate, rotate, scale)
 *
 * @see https://kitware.github.io/vtk-js/examples/SeedWidget.html
 * @see https://kitware.github.io/vtk-js/examples/SplineWidget.html
 * @see https://kitware.github.io/vtk-js/examples/PolyLineWidget.html
 * @see https://kitware.github.io/vtk-js/examples/SphereWidget.html
 * @see https://kitware.github.io/vtk-js/examples/PaintWidget.html
 * @see https://kitware.github.io/vtk-js/examples/TransformControlsWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js widget imports
import vtkSeedWidget from "@kitware/vtk.js/Widgets/Widgets3D/SeedWidget";
import vtkSplineWidget from "@kitware/vtk.js/Widgets/Widgets3D/SplineWidget";
import vtkPolyLineWidget from "@kitware/vtk.js/Widgets/Widgets3D/PolyLineWidget";
import vtkSphereWidget from "@kitware/vtk.js/Widgets/Widgets3D/SphereWidget";
import vtkPaintWidget from "@kitware/vtk.js/Widgets/Widgets3D/PaintWidget";
import vtkShapeWidget from "@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget";
import vtkEllipseWidget from "@kitware/vtk.js/Widgets/Widgets3D/EllipseWidget";
import vtkRectangleWidget from "@kitware/vtk.js/Widgets/Widgets3D/RectangleWidget";
import vtkTransformControlsWidget from "@kitware/vtk.js/Widgets/Widgets3D/TransformControlsWidget";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Available widget types
 */
const WIDGET_TYPES = {
  seed: {
    name: 'Seed Points',
    icon: 'target',
    description: 'Place point markers',
    create: () => vtkSeedWidget.newInstance(),
  },
  spline: {
    name: 'Spline',
    icon: 'pen-tool',
    description: 'Draw smooth curves',
    create: () => vtkSplineWidget.newInstance(),
  },
  polyline: {
    name: 'Polyline',
    icon: 'trending-up',
    description: 'Draw connected lines',
    create: () => vtkPolyLineWidget.newInstance(),
  },
  sphere: {
    name: 'Sphere',
    icon: 'circle',
    description: 'Place spherical markers',
    create: () => vtkSphereWidget.newInstance(),
  },
  paint: {
    name: 'Paint',
    icon: 'edit-3',
    description: 'Freeform drawing',
    create: () => vtkPaintWidget.newInstance(),
  },
  shape: {
    name: 'Shape',
    icon: 'hexagon',
    description: 'Draw shapes',
    create: () => vtkShapeWidget.newInstance(),
  },
  ellipse: {
    name: 'Ellipse',
    icon: 'circle',
    description: 'Draw ellipses/circles',
    create: () => vtkEllipseWidget.newInstance(),
  },
  rectangle: {
    name: 'Rectangle',
    icon: 'square',
    description: 'Draw rectangles',
    create: () => vtkRectangleWidget.newInstance(),
  },
  transform: {
    name: 'Transform',
    icon: 'move',
    description: 'Transform objects (translate, rotate, scale)',
    create: () => vtkTransformControlsWidget.newInstance(),
  },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  activeWidget: null,
  annotations: [],
  // Widget options
  pointSize: 10,
  lineWidth: 2,
  color: [1, 0.5, 0],
};

// =============================================================================
// VTK ANNOTATION WIDGETS FEATURE
// =============================================================================

export class VTKAnnotationWidgetsFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKAnnotationWidgetsFeature',
      name: 'Annotation Widgets',
      description: 'Interactive annotation tools',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    return instanceData?.widgetManager != null;
  }

  /**
   * Initialize annotation widgets feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects, widgetManager } = instanceData;

    if (!sceneObjects || !widgetManager) {
      log.warn(`Cannot initialize annotation widgets: missing sceneObjects or widgetManager for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      widgetManager,
      // Active widget instances
      widgets: new Map(),
      handles: new Map(),
      // Collected annotations data
      annotations: [],
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Annotation widgets feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up annotation widgets resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Remove all widgets
    this._removeAllWidgets(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Annotation widgets feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      activeWidget: state.activeWidget,
      annotations: state.annotations,
      widgetCount: state.widgets.size,
    };
  }

  // ===========================================================================
  // WIDGET CONTROLS
  // ===========================================================================

  /**
   * Activate a widget type
   */
  activateWidget(instanceId, widgetType) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const widgetInfo = WIDGET_TYPES[widgetType];
    if (!widgetInfo) {
      log.warn(`Unknown widget type: ${widgetType}`);
      return;
    }

    const { widgetManager, sceneObjects } = state;

    // Deactivate current widget if different
    if (state.activeWidget && state.activeWidget !== widgetType) {
      this.deactivateWidget(instanceId);
    }

    // Create widget if not exists
    if (!state.widgets.has(widgetType)) {
      try {
        const widget = widgetInfo.create();

        // Get bounds for placement
        const { mapper } = sceneObjects;
        if (mapper) {
          const inputData = mapper.getInputData();
          if (inputData) {
            const bounds = inputData.getBounds();
            widget.placeWidget(bounds);
          }
        }

        // Add to widget manager
        const handle = widgetManager.addWidget(widget);

        state.widgets.set(widgetType, widget);
        state.handles.set(widgetType, handle);

        log.debug(`Created ${widgetType} widget`);
      } catch (error) {
        log.error(`Failed to create ${widgetType} widget: ${error.message}`);
        return;
      }
    }

    // Enable the widget
    const handle = state.handles.get(widgetType);
    if (handle) {
      handle.setEnabled(true);
    }

    state.activeWidget = widgetType;
    sceneObjects.renderWindow?.render();

    log.debug(`Activated ${widgetType} widget for instance: ${instanceId}`);
  }

  /**
   * Deactivate current widget
   */
  deactivateWidget(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.activeWidget) return;

    const handle = state.handles.get(state.activeWidget);
    if (handle) {
      handle.setEnabled(false);
    }

    state.activeWidget = null;
    state.sceneObjects.renderWindow?.render();

    log.debug(`Deactivated widget for instance: ${instanceId}`);
  }

  /**
   * Toggle widget
   */
  toggleWidget(instanceId, widgetType) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.activeWidget === widgetType) {
      this.deactivateWidget(instanceId);
    } else {
      this.activateWidget(instanceId, widgetType);
    }
  }

  /**
   * Remove a widget
   */
  removeWidget(instanceId, widgetType) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { widgetManager } = state;
    const widget = state.widgets.get(widgetType);
    const handle = state.handles.get(widgetType);

    if (widget && handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
      widget.delete();
    }

    state.widgets.delete(widgetType);
    state.handles.delete(widgetType);

    if (state.activeWidget === widgetType) {
      state.activeWidget = null;
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Remove all widgets
   */
  _removeAllWidgets(state) {
    const { widgetManager } = state;

    for (const [type, widget] of state.widgets) {
      const handle = state.handles.get(type);
      if (handle) {
        handle.setEnabled(false);
        widgetManager.removeWidget(widget);
      }
      widget.delete();
    }

    state.widgets.clear();
    state.handles.clear();
    state.activeWidget = null;
  }

  /**
   * Clear all annotations
   */
  clearAllWidgets(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._removeAllWidgets(state);
    state.annotations = [];
    state.sceneObjects.renderWindow?.render();

    log.debug(`Cleared all widgets for instance: ${instanceId}`);
  }

  /**
   * Get widget data (for saving/export)
   */
  getWidgetData(instanceId, widgetType) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    const widget = state.widgets.get(widgetType);
    if (!widget) return null;

    // Get widget-specific data
    const widgetState = widget.getWidgetState();
    if (!widgetState) return null;

    // Extract relevant data based on widget type
    switch (widgetType) {
      case 'seed':
        return {
          type: 'seed',
          handles: widgetState.getHandleList?.() || [],
        };
      case 'spline':
      case 'polyline':
        return {
          type: widgetType,
          points: widgetState.getHandleList?.() || [],
        };
      case 'sphere':
        return {
          type: 'sphere',
          center: widgetState.getCenter?.() || [0, 0, 0],
          radius: widgetState.getRadius?.() || 1,
        };
      case 'ellipse':
      case 'rectangle':
        return {
          type: widgetType,
          origin: widgetState.getOrigin?.() || [0, 0, 0],
          corner: widgetState.getCorner?.() || [1, 1, 1],
        };
      case 'transform':
        return {
          type: 'transform',
          position: widgetState.getOrigin?.() || [0, 0, 0],
          scale: widgetState.getScale?.() || [1, 1, 1],
        };
      default:
        return { type: widgetType };
    }
  }

  // ===========================================================================
  // TOOLS INTERFACE
  // ===========================================================================

  /**
   * Get tools for the toolbar
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return [];

    return [
      {
        id: 'annotation-widgets',
        type: 'menu',
        icon: 'edit',
        label: state.activeWidget
          ? WIDGET_TYPES[state.activeWidget]?.name || 'Widget'
          : 'Annotate',
        description: 'Annotation tools',
        options: [
          ...Object.entries(WIDGET_TYPES).map(([id, info]) => ({
            id: `widget-${id}`,
            icon: info.icon,
            label: info.name,
            description: info.description,
            active: state.activeWidget === id,
            onClick: () => this.toggleWidget(instanceId, id),
          })),
          { type: 'separator' },
          {
            id: 'widget-clear-all',
            icon: 'trash-2',
            label: 'Clear All',
            description: 'Remove all annotations',
            onClick: () => this.clearAllWidgets(instanceId),
          },
        ],
      },
    ];
  }
}

// Export singleton instance
export const vtkAnnotationWidgetsFeature = new VTKAnnotationWidgetsFeature();
export default vtkAnnotationWidgetsFeature;
