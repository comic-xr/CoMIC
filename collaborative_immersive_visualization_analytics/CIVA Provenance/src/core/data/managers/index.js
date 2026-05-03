// src/core/data/managers/index.js
// Manager exports for CIA Web
//
// Managers handle business logic and server synchronization.
// They maintain local caches but treat server as source of truth.

export { BaseManager } from "./BaseManager.js";

// Canvas System
export { CanvasManager, canvasManager } from "./CanvasManager.js";
export { SubsetManager, subsetManager } from "./SubsetManager.js";

// Content Management
export {
  ContentHandler,
  NoteHandler,
  ImageHandler,
  contentManager,
} from "./ContentManager.js";

// Workspace Hierarchy
export { workspaceManager } from "./WorkspaceManager.js";

export { DatasetManager } from "./DatasetManager.js";
export { ViewConfigurationManager } from "./ViewConfigurationManager.js";

// ViewGroup System
export { ViewGroupManager, viewGroupManager } from "./ViewGroupManager.js";