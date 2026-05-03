// src/core/vr/tools/VRToolManager.js
// Manages VR tool lifecycle and input routing

import { vr as log } from '@Utils/logger.js';
import { VRSlicePlaneTool } from './VRSlicePlaneTool.js';
import { VRMeasureTool } from './VRMeasureTool.js';
import { VRAnnotationTool } from './VRAnnotationTool.js';
import { VRClipBoxTool } from './VRClipBoxTool.js';
import { VRProbeTool } from './VRProbeTool.js';

export class VRToolManager {
  constructor(handler, vrContext) {
    this._handler = handler;
    this._vrContext = vrContext;
    this._activeTool = null;

    // Register available tools
    this._tools = new Map([
      ['slice', new VRSlicePlaneTool()],
      ['measure', new VRMeasureTool()],
      ['annotate', new VRAnnotationTool()],
      ['clip', new VRClipBoxTool()],
      ['probe', new VRProbeTool()],
    ]);

    // Context passed to tools
    this._toolContext = {
      handler: this._handler,
      vrContext: this._vrContext,
      manager: this,
    };
  }

  /**
   * Activate a tool
   */
  async activateTool(toolId) {
    // Deactivate current tool
    if (this._activeTool) {
      await this._activeTool.deactivate();
    }

    // Activate new tool
    const tool = this._tools.get(toolId);
    if (!tool) {
      log.warn(`Unknown tool: ${toolId}`);
      return;
    }

    await tool.activate(this._toolContext);
    this._activeTool = tool;

    log.debug(`Activated tool: ${toolId}`);
  }

  /**
   * Deactivate current tool
   */
  async deactivateTool() {
    if (this._activeTool) {
      await this._activeTool.deactivate();
      this._activeTool = null;
    }
  }

  /**
   * Get active tool
   */
  getActiveTool() {
    return this._activeTool;
  }

  /**
   * Get active tool ID
   */
  getActiveToolId() {
    if (!this._activeTool) return null;
    return this._activeTool.id;
  }

  /**
   * Update - called every frame
   */
  update(inputState, frame) {
    if (!this._activeTool) return null;

    // Let active tool handle input
    const action = this._activeTool.handleInput(inputState, frame);

    // Render tool visuals
    this._activeTool.render(this._vrContext.renderer);

    return action;
  }

  /**
   * Get controller hints for UI
   */
  getControllerHints() {
    if (!this._activeTool) {
      return {
        left: {},
        right: { trigger: 'Select tool' },
      };
    }
    return this._activeTool.getControllerHints();
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    return Array.from(this._tools.entries()).map(([id, tool]) => ({
      id,
      name: tool.name,
      icon: tool.icon,
      category: tool.category,
    }));
  }

  /**
   * Register a custom tool
   */
  registerTool(toolId, tool) {
    this._tools.set(toolId, tool);
    log.debug(`Registered custom tool: ${toolId}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId) {
    if (this._activeTool?.id === toolId) {
      this.deactivateTool();
    }
    this._tools.delete(toolId);
  }

  /**
   * Cleanup
   */
  async cleanup() {
    await this.deactivateTool();
    this._tools.clear();
  }
}

export default VRToolManager;
