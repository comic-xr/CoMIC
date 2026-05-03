import { render as log } from "@Utils/logger.js";
import VtkJsLineWidget from "@kitware/vtk.js/Widgets/Widgets3D/LineWidget";

/**
 * VTKLineWidget
 * Line measurement widget following the plugin pattern
 */
export class VTKLineWidget {
  constructor() {
    this.instances = new Map();
  }

  initialize(instanceId, config) {
    if (this.instances.has(instanceId)) {
      log.warn(`Line widget already exists for ${instanceId}`);
      return;
    }

    log.debug(`Initializing line measurement for ${instanceId}`);

    const { widgetManager, sceneObjects } = config;

    try {
      // Create VTK.js widget
      const widget = VtkJsLineWidget.newInstance();

      // Place widget at reasonable size
      const inputData = sceneObjects.mapper.getInputData();
      if (inputData) {
        const bounds = inputData.getBounds();
        const center = [
          (bounds[0] + bounds[1]) / 2,
          (bounds[2] + bounds[3]) / 2,
          (bounds[4] + bounds[5]) / 2,
        ];

        // Place handles at 1/4 and 3/4 along x-axis
        const diagonal = Math.sqrt(
          Math.pow(bounds[1] - bounds[0], 2) +
            Math.pow(bounds[3] - bounds[2], 2) +
            Math.pow(bounds[5] - bounds[4], 2)
        );
        const offset = diagonal * 0.25;

        widget.placeWidget(bounds);

        // Set initial handle positions
        const widgetState = widget.getWidgetState();
        const handle1 = widgetState.getHandle1();
        const handle2 = widgetState.getHandle2();

        handle1.setOrigin([center[0] - offset, center[1], center[2]]);
        handle2.setOrigin([center[0] + offset, center[1], center[2]]);
      }

      // Add to widget manager
      const handle = widgetManager.addWidget(widget);

      // Make visible and enabled
      handle.setEnabled(true);
      handle.setVisibility(true);

      // Update on interaction
      handle.onInteractionEvent(() => {
        const widgetState = widget.getWidgetState();
        const handle1 = widgetState.getHandle1();
        const handle2 = widgetState.getHandle2();

        const p1 = handle1.getOrigin();
        const p2 = handle2.getOrigin();

        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(p2[0] - p1[0], 2) +
            Math.pow(p2[1] - p1[1], 2) +
            Math.pow(p2[2] - p1[2], 2)
        );

        log.trace(`Line measurement: ${distance.toFixed(2)} units`);

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

      log.debug(`Line widget created for ${instanceId}`);
    } catch (error) {
      log.error(`Error initializing line widget:`, error);
    }
  }

  isEnabled(instanceId) {
    return this.instances.has(instanceId);
  }

  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);
    if (!widgetData) return;

    log.debug(`Cleaning up line widget for ${instanceId}`);

    const { widget, handle, widgetManager, sceneObjects } = widgetData;

    // Disable and remove
    if (handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    // Render
    sceneObjects.renderWindow.render();

    // Remove from storage
    this.instances.delete(instanceId);

    log.debug(`Line widget cleaned up for ${instanceId}`);
  }

  destroy() {
    log.debug(`Destroying all line widgets`);
    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });
    this.instances.clear();
  }
}

// Export singleton
export const vtkLineWidget = new VTKLineWidget();
