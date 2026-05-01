import { render as log } from "@Utils/logger.js";
import VtkJsAngleWidget from "@kitware/vtk.js/Widgets/Widgets3D/AngleWidget";

/**
 * VTKAngleWidget
 * Angle measurement widget following the plugin pattern
 */
export class VTKAngleWidget {
  constructor() {
    this.instances = new Map();
  }

  initialize(instanceId, config) {
    if (this.instances.has(instanceId)) {
      log.warn(`Angle widget already exists for ${instanceId}`);
      return;
    }

    log.debug(`Initializing angle measurement for ${instanceId}`);

    const { widgetManager, sceneObjects } = config;

    try {
      // Create VTK.js widget
      const widget = VtkJsAngleWidget.newInstance();

      // Place widget
      const inputData = sceneObjects.mapper.getInputData();
      if (inputData) {
        const bounds = inputData.getBounds();
        const center = [
          (bounds[0] + bounds[1]) / 2,
          (bounds[2] + bounds[3]) / 2,
          (bounds[4] + bounds[5]) / 2,
        ];

        const diagonal = Math.sqrt(
          Math.pow(bounds[1] - bounds[0], 2) +
            Math.pow(bounds[3] - bounds[2], 2) +
            Math.pow(bounds[5] - bounds[4], 2)
        );
        const offset = diagonal * 0.15;

        widget.placeWidget(bounds);

        // Set initial handle positions (3 handles for angle)
        const widgetState = widget.getWidgetState();
        const handles = widgetState.getMoveHandle();
        const pointHandles = handles.filter((h) =>
          h.isA("vtkSphereHandleRepresentation")
        );

        if (pointHandles.length >= 3) {
          pointHandles[0].setOrigin([center[0] - offset, center[1], center[2]]);
          pointHandles[1].setOrigin([center[0], center[1] + offset, center[2]]);
          pointHandles[2].setOrigin([center[0] + offset, center[1], center[2]]);
        }
      }

      // Add to widget manager
      const handle = widgetManager.addWidget(widget);
      handle.setEnabled(true);
      handle.setVisibility(true);

      // Update on interaction
      handle.onInteractionEvent(() => {
        // Angle is calculated automatically by the widget
        log.trace(`Angle measurement updated`);
        sceneObjects.renderWindow.render();
      });

      // Store widget data
      this.instances.set(instanceId, {
        widget,
        handle,
        widgetManager,
        sceneObjects,
        config,
      });

      // Force initial render
      sceneObjects.renderWindow.render();

      log.debug(`Angle widget created for ${instanceId}`);
    } catch (error) {
      log.error(`Error initializing angle widget:`, error);
    }
  }

  isEnabled(instanceId) {
    return this.instances.has(instanceId);
  }

  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);
    if (!widgetData) return;

    log.debug(`Cleaning up angle widget for ${instanceId}`);

    const { widget, handle, widgetManager, sceneObjects } = widgetData;

    if (handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    sceneObjects.renderWindow.render();
    this.instances.delete(instanceId);

    log.debug(`Angle widget cleaned up for ${instanceId}`);
  }

  destroy() {
    log.debug(`Destroying all angle widgets`);
    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });
    this.instances.clear();
  }
}

// Export singleton
export const vtkAngleWidget = new VTKAngleWidget();
