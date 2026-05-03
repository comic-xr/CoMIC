export class VTKMyWidget {
  constructor() {
    // Per-instance storage
    this.instances = new Map();
  }

  initialize(instanceId, config) {
    // Create widget
    // Add to widgetManager
    // Set up event listeners
    // Store in this.instances
  }

  isEnabled(instanceId) {
    return this.instances.has(instanceId);
  }

  cleanup(instanceId) {
    // Disable widget
    // Remove from widgetManager
    // Delete from this.instances
  }

  destroy() {
    // Clean up ALL instances
  }
}

// Export singleton
export const vtkMyWidget = new VTKMyWidget();
