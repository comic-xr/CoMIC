// src/core/vr/tools/VRToolInterface.js
// Base interface for VR tools

import { vr as log } from '@Utils/logger.js';

/**
 * Base class for VR tools
 *
 * All VR tools should extend this class and implement:
 * - activate(context) - Called when tool is selected
 * - deactivate() - Called when tool is deselected
 * - handleInput(inputState, frame) - Called each frame to handle controller input
 * - getControllerHints() - Returns UI hints for controller buttons
 */
export class VRToolInterface {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon;
    this.category = config.category || 'general';

    this._isActive = false;
    this._context = null;
  }

  /**
   * Get tool metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      category: this.category,
    };
  }

  /**
   * Check if tool is currently active
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Activate the tool
   * @param {Object} context - Tool context from VRToolManager
   */
  async activate(context) {
    this._context = context;
    this._isActive = true;
    log.debug(`Tool activated: ${this.name}`);
  }

  /**
   * Deactivate the tool
   */
  async deactivate() {
    this._isActive = false;
    this._context = null;
    log.debug(`Tool deactivated: ${this.name}`);
  }

  /**
   * Handle controller input
   * @param {Object} inputState - Current controller state
   * @param {XRFrame} frame - XR frame
   * @returns {Object|null} Action to be processed, or null
   */
  handleInput(inputState, frame) {
    // Override in subclass
    return null;
  }

  /**
   * Render tool visuals
   * @param {Object} renderer - VTK renderer
   */
  render(renderer) {
    // Override in subclass
  }

  /**
   * Get controller button hints for UI
   * @returns {Object} Hints for left and right controllers
   */
  getControllerHints() {
    return {
      left: {},
      right: {},
    };
  }

  /**
   * Get tool settings panel definition
   * @returns {Object|null} Settings panel config
   */
  getSettingsPanel() {
    return null;
  }

  /**
   * Update tool settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    // Override in subclass
  }
}

export default VRToolInterface;
