// src/core/data/models/index.js
// Data model exports for CIA Web
//
// These models follow the Three-Layer Data Model:
// - Layer 1: Dataset (raw data + annotations) - defined elsewhere
// - Layer 2: ViewConfiguration (how to view data) - defined elsewhere
// - Layer 3: InstanceWindow (ephemeral renderer) - defined elsewhere
//
// Canvas System Models:
// - WorkspaceCanvas: Infinite pinboard of placements
// - CanvasPlacement: Positioned item on canvas
// - Subset: Saved selection for focus mode
// - Note: Text annotations on canvas
// - CanvasImage: Image attachments on canvas
// - Workspace: Container for canvases with hierarchy

// Canvas System
export { WorkspaceCanvas } from "./WorkspaceCanvas.js";
export { CanvasPlacement, PlacementContentType } from "./CanvasPlacement.js";
export { Subset, SubsetVisibility } from "./Subset.js";

// Content Types
export { Note } from "./Note.js";
export { CanvasImage } from "./CanvasImage.js";

// Workspace Hierarchy
export { Workspace, WorkspaceType, WorkspacePermission } from "./Workspace.js";

// ViewGroup System
export {
    ViewGroup,
    ViewGroupSlot,
    ViewGroupLinkConfig,
    ViewLink,
    Viewport,
    VIEWGROUP_LINK_MODES,
    VIEWGROUP_LINK_STATUS,
    VIEWGROUP_STATES,
    LINK_PROPERTIES,
    PROPERTY_APPLICABLE_TYPES,
    BUILTIN_LAYOUTS,
    VIEWGROUP_COLORS,
} from "./ViewGroup.js";
