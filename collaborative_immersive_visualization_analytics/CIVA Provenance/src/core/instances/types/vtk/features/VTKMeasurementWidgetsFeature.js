// src/core/instances/types/vtk/features/VTKMeasurementWidgetsFeature.js

/**
 * VTK Measurement Widgets Feature
 *
 * Provides interactive measurement and annotation tools:
 * - AngleWidget: Measure angles between three points
 * - LineWidget: Measure distances between two points
 * - LabelWidget: Add text labels at specific positions
 *
 * @see https://kitware.github.io/vtk-js/examples/AngleWidget.html
 * @see https://kitware.github.io/vtk-js/examples/LineWidget.html
 * @see https://kitware.github.io/vtk-js/examples/LabelWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";

// VTK.js widget imports
import vtkAngleWidget from "@kitware/vtk.js/Widgets/Widgets3D/AngleWidget";
import vtkLineWidget from "@kitware/vtk.js/Widgets/Widgets3D/LineWidget";
import vtkLabelWidget from "@kitware/vtk.js/Widgets/Widgets3D/LabelWidget";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Measurement widget types
 */
const MEASUREMENT_TYPES = {
  angle: {
    name: 'Angle',
    icon: 'corner-up-right',
    description: 'Measure angle between three points',
    unit: '°',
    create: () => vtkAngleWidget.newInstance(),
  },
  distance: {
    name: 'Distance',
    icon: 'ruler',
    description: 'Measure distance between two points',
    unit: 'units',
    create: () => vtkLineWidget.newInstance(),
  },
  label: {
    name: 'Label',
    icon: 'type',
    description: 'Add text annotation',
    unit: '',
    create: () => vtkLabelWidget.newInstance(),
  },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  activeMeasurement: null,
  measurements: [],
  // Display options
  handleSize: 10,
  lineWidth: 2,
  fontSize: 14,
  // Colors
  handleColor: [1, 0.5, 0],
  lineColor: [1, 1, 0],
  textColor: [1, 1, 1],
};

// =============================================================================
// VTK MEASUREMENT WIDGETS FEATURE
// =============================================================================

export class VTKMeasurementWidgetsFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKMeasurementWidgetsFeature',
      name: 'Measurement Tools',
      description: 'Angle, distance, and label tools',
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
   * Initialize measurement widgets feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects, widgetManager } = instanceData;

    if (!sceneObjects || !widgetManager) {
      log.warn(`Cannot initialize measurement widgets: missing sceneObjects or widgetManager for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      widgetManager,
      instanceData,
      // Active widget instances
      widgets: new Map(),
      handles: new Map(),
      // Stored measurements
      measurements: [],
      // Callbacks
      measurementCallbacks: new Map(),
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Measurement widgets feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._removeAllWidgets(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Measurement widgets feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      activeMeasurement: state.activeMeasurement,
      measurements: state.measurements,
      widgetCount: state.widgets.size,
    };
  }

  // ===========================================================================
  // MEASUREMENT CONTROLS
  // ===========================================================================

  /**
   * Start a new measurement
   */
  startMeasurement(instanceId, measurementType) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    const typeInfo = MEASUREMENT_TYPES[measurementType];
    if (!typeInfo) {
      log.warn(`Unknown measurement type: ${measurementType}`);
      return null;
    }

    const { widgetManager, sceneObjects } = state;

    // Deactivate current measurement if different
    if (state.activeMeasurement && state.activeMeasurement !== measurementType) {
      this.deactivateMeasurement(instanceId);
    }

    // Create unique ID for this measurement
    const measurementId = `${measurementType}-${Date.now()}`;

    try {
      const widget = typeInfo.create();

      // Configure widget based on type
      this._configureWidget(widget, measurementType, state);

      // Place widget in scene bounds
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
      handle.setEnabled(true);

      // Set up measurement callback
      this._setupMeasurementCallback(state, measurementId, measurementType, widget);

      // Store references
      state.widgets.set(measurementId, widget);
      state.handles.set(measurementId, handle);
      state.activeMeasurement = measurementId;

      sceneObjects.renderWindow?.render();

      log.debug(`Started ${measurementType} measurement: ${measurementId}`);
      return measurementId;
    } catch (error) {
      log.error(`Failed to start ${measurementType} measurement: ${error.message}`);
      return null;
    }
  }

  /**
   * Configure widget based on type
   */
  _configureWidget(widget, type, state) {
    // Common configuration
    const widgetState = widget.getWidgetState();

    switch (type) {
      case 'angle':
        // AngleWidget specific configuration
        break;

      case 'distance':
        // LineWidget specific configuration
        if (widget.setHandleVisibility) {
          widget.setHandleVisibility(true);
        }
        break;

      case 'label':
        // LabelWidget specific configuration
        if (widgetState.setText) {
          widgetState.setText('Label');
        }
        break;
    }
  }

  /**
   * Set up measurement callback
   */
  _setupMeasurementCallback(state, measurementId, type, widget) {
    const callback = () => {
      const value = this._getMeasurementValue(widget, type);
      const measurement = state.measurements.find(m => m.id === measurementId);

      if (measurement) {
        measurement.value = value;
      } else {
        state.measurements.push({
          id: measurementId,
          type,
          value,
          timestamp: Date.now(),
        });
      }
    };

    // Subscribe to widget state changes
    const widgetState = widget.getWidgetState();
    if (widgetState && widgetState.onModified) {
      const subscription = widgetState.onModified(callback);
      state.measurementCallbacks.set(measurementId, subscription);
    }
  }

  /**
   * Get measurement value from widget
   */
  _getMeasurementValue(widget, type) {
    const widgetState = widget.getWidgetState();

    switch (type) {
      case 'angle': {
        // Get angle from three handle positions
        const handles = widgetState.getHandleList?.() || [];
        if (handles.length >= 3) {
          const p1 = handles[0].getOrigin();
          const p2 = handles[1].getOrigin(); // vertex
          const p3 = handles[2].getOrigin();

          if (p1 && p2 && p3) {
            const v1 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
            const v2 = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];

            const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
            const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
            const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);

            if (mag1 > 0 && mag2 > 0) {
              const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
              return (angle * 180 / Math.PI).toFixed(2);
            }
          }
        }
        return null;
      }

      case 'distance': {
        // Get distance from two handle positions
        const handles = widgetState.getHandleList?.() || [];
        if (handles.length >= 2) {
          const p1 = handles[0].getOrigin();
          const p2 = handles[1].getOrigin();

          if (p1 && p2) {
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const dz = p2[2] - p1[2];
            return Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(3);
          }
        }
        return null;
      }

      case 'label': {
        return widgetState.getText?.() || 'Label';
      }

      default:
        return null;
    }
  }

  /**
   * Deactivate current measurement
   */
  deactivateMeasurement(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.activeMeasurement) return;

    const handle = state.handles.get(state.activeMeasurement);
    if (handle) {
      handle.setEnabled(false);
    }

    state.activeMeasurement = null;
    state.sceneObjects.renderWindow?.render();

    log.debug(`Deactivated measurement for instance: ${instanceId}`);
  }

  /**
   * Toggle measurement type
   */
  toggleMeasurement(instanceId, measurementType) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Check if this type is already active
    if (state.activeMeasurement?.startsWith(measurementType)) {
      this.deactivateMeasurement(instanceId);
    } else {
      this.startMeasurement(instanceId, measurementType);
    }
  }

  /**
   * Remove a specific measurement
   */
  removeMeasurement(instanceId, measurementId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const { widgetManager } = state;
    const widget = state.widgets.get(measurementId);
    const handle = state.handles.get(measurementId);
    const callback = state.measurementCallbacks.get(measurementId);

    // Clean up callback
    if (callback && callback.unsubscribe) {
      callback.unsubscribe();
    }

    // Remove widget
    if (widget && handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
      widget.delete();
    }

    state.widgets.delete(measurementId);
    state.handles.delete(measurementId);
    state.measurementCallbacks.delete(measurementId);

    // Remove from measurements array
    state.measurements = state.measurements.filter(m => m.id !== measurementId);

    if (state.activeMeasurement === measurementId) {
      state.activeMeasurement = null;
    }

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Remove all widgets
   */
  _removeAllWidgets(state) {
    const { widgetManager } = state;

    // Clean up callbacks
    for (const callback of state.measurementCallbacks.values()) {
      if (callback && callback.unsubscribe) {
        callback.unsubscribe();
      }
    }

    // Remove all widgets
    for (const [id, widget] of state.widgets) {
      const handle = state.handles.get(id);
      if (handle) {
        handle.setEnabled(false);
        widgetManager.removeWidget(widget);
      }
      widget.delete();
    }

    state.widgets.clear();
    state.handles.clear();
    state.measurementCallbacks.clear();
    state.measurements = [];
    state.activeMeasurement = null;
  }

  /**
   * Clear all measurements
   */
  clearAllMeasurements(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    this._removeAllWidgets(state);
    state.sceneObjects.renderWindow?.render();

    log.debug(`Cleared all measurements for instance: ${instanceId}`);
  }

  /**
   * Get all measurements
   */
  getMeasurements(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return [];

    return state.measurements.map(m => ({
      ...m,
      unit: MEASUREMENT_TYPES[m.type]?.unit || '',
      displayName: MEASUREMENT_TYPES[m.type]?.name || m.type,
    }));
  }

  /**
   * Set label text
   */
  setLabelText(instanceId, measurementId, text) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const widget = state.widgets.get(measurementId);
    if (!widget) return;

    const widgetState = widget.getWidgetState();
    if (widgetState && widgetState.setText) {
      widgetState.setText(text);
      state.sceneObjects.renderWindow?.render();
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

    const measurements = this.getMeasurements(instanceId);
    const activeMeasurementType = state.activeMeasurement?.split('-')[0];

    return [
      {
        id: 'measurement-tools',
        type: 'menu',
        icon: 'ruler',
        label: activeMeasurementType
          ? MEASUREMENT_TYPES[activeMeasurementType]?.name || 'Measure'
          : 'Measure',
        description: `${measurements.length} measurement(s)`,
        options: [
          // Measurement type options
          ...Object.entries(MEASUREMENT_TYPES).map(([id, info]) => ({
            id: `measure-${id}`,
            icon: info.icon,
            label: info.name,
            description: info.description,
            active: activeMeasurementType === id,
            onClick: () => this.toggleMeasurement(instanceId, id),
          })),
          { type: 'separator' },
          // List of measurements
          ...measurements.map(m => ({
            id: m.id,
            icon: MEASUREMENT_TYPES[m.type]?.icon || 'hash',
            label: `${m.displayName}: ${m.value ?? '...'} ${m.unit}`,
            description: 'Click to remove',
            onClick: () => this.removeMeasurement(instanceId, m.id),
          })),
          // Clear all option
          ...(measurements.length > 0 ? [
            { type: 'separator' },
            {
              id: 'measure-clear-all',
              icon: 'trash-2',
              label: 'Clear All',
              description: 'Remove all measurements',
              onClick: () => this.clearAllMeasurements(instanceId),
            },
          ] : []),
        ],
      },
    ];
  }
}

// Export singleton instance
export const vtkMeasurementWidgetsFeature = new VTKMeasurementWidgetsFeature();
export default vtkMeasurementWidgetsFeature;
