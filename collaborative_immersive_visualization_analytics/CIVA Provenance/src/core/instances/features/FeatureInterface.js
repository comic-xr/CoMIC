// src/core/instances/features/FeatureInterface.js

/**
 * Feature Interface
 *
 * Base class for all instance features. Features are optional functionality
 * that can be added to instances, like dimensionality reduction, annotations,
 * clipping planes, measurements, etc.
 *
 * Features are:
 * - Self-contained (manage their own state)
 * - Reusable (work across multiple instances)
 * - Optional (instances work without them)
 * - Composable (multiple features can coexist)
 *
 * LIFECYCLE:
 * 1. Feature is created once (in handler constructor)
 * 2. initialize() called for each instance that uses it
 * 3. getTools() called when UI needs toolbar buttons
 * 4. cleanup() called when instance is destroyed
 */
export class FeatureInterface {
  /**
   * Initialize the feature for a specific instance
   *
   * Called when an instance is created and this feature should be enabled for it.
   * This is where you set up any per-instance state or event listeners.
   *
   * @param {string} instanceId - The instance to enable this feature for
   * @param {Object} instanceData - Handler-specific instance data (e.g., VTK sceneObjects)
   * @returns {Promise<void>}
   */
  async initialize(instanceId, instanceData) {
    throw new Error("Feature.initialize() must be implemented");
  }

  /**
   * Clean up the feature when instance is destroyed
   *
   * Called when an instance is deleted. Must properly dispose of all resources
   * to prevent memory leaks.
   *
   * @param {string} instanceId - The instance being destroyed
   * @returns {Promise<void>}
   */
  async cleanup(instanceId) {
    throw new Error("Feature.cleanup() must be implemented");
  }

  /**
   * Get the feature's current state for an instance
   *
   * Returns the current state of this feature for a specific instance.
   * UI components can use this to display current feature state.
   *
   * @param {string} instanceId - The instance to query
   * @returns {Object|null} Feature state, or null if not available
   */
  getState(instanceId) {
    throw new Error("Feature.getState() must be implemented");
  }

  /**
   * Get tools provided by this feature
   *
   * Returns an array of tool definitions for the UI toolbar.
   * Tools should be dynamically updated based on current feature state.
   *
   * Tools can be:
   * - Buttons (simple actions)
   * - Menus (dropdown with multiple options)
   * - Toggles (on/off states)
   *
   * @param {string} instanceId - Instance to get tools for
   * @returns {Array<Object>} Tool definitions
   *
   * Example return value:
   * [
   *   {
   *     id: 'my-tool',
   *     label: 'My Tool',
   *     icon: 'icon-name',
   *     type: 'button',
   *     onClick: () => this.doSomething(instanceId)
   *   },
   *   {
   *     id: 'my-menu',
   *     label: 'Options',
   *     icon: 'menu',
   *     type: 'menu',
   *     options: [
   *       { id: 'opt1', label: 'Option 1', onClick: () => ... },
   *       { id: 'opt2', label: 'Option 2', onClick: () => ... }
   *     ]
   *   }
   * ]
   */
  getTools(instanceId) {
    // Default: no tools
    // Features can override to provide their own tools
    return [];
  }

  /**
   * Check if this feature is available for an instance
   *
   * Some features might not be available for all instances.
   * For example, a mesh decimation feature only works if the instance has mesh data.
   *
   * @param {string} instanceId - Instance to check
   * @param {Object} instanceData - Instance data for checking compatibility
   * @returns {boolean} True if feature can be used with this instance
   */
  isAvailable(instanceId, instanceData) {
    // Default: feature is always available
    return true;
  }

  /**
   * Get feature metadata
   *
   * Returns information about this feature that can be used by documentation
   * generators, debug tools, or feature discovery UIs.
   *
   * @returns {Object} Feature metadata
   */
  getMetadata() {
    return {
      id: this.constructor.name,
      name: "Unnamed Feature",
      description: "No description provided",
      version: "1.0.0",
      author: "Unknown",
    };
  }
}
