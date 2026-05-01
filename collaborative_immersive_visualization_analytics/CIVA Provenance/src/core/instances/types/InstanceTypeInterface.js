// src/core/instances/types/InstanceTypeInterface.js
// Defines the contract that all instance type plugins must implement
// This is the foundation of the plugin architecture

/**
 * InstanceTypeHandler Interface
 *
 * All instance type plugins (VTK, Plotly, custom visualizations, etc.)
 * must implement this interface. The core system interacts with instances
 * ONLY through this interface, never through direct implementation.
 *
 * This enables contributors to add new visualization types without
 * modifying core code. They just create a new handler, implement
 * these methods, and register it.
 *
 * Philosophy:
 * - The core asks "what" should happen (show annotations, load data)
 * - The handler decides "how" it happens for this specific type
 * - Contributors work within their handler without touching core
 */
export class InstanceTypeHandler {
  /**
   * Get the unique identifier for this instance type
   * Examples: 'vtk', 'plotly', 'threejs', 'custom-webgl'
   *
   * @returns {string} Type identifier
   */
  getType() {
    throw new Error("InstanceTypeHandler.getType() must be implemented");
  }

  /**
   * Get human-readable name for this instance type
   * Used in UI to show what kind of instance this is
   *
   * @returns {string} Display name
   */
  getDisplayName() {
    throw new Error("InstanceTypeHandler.getDisplayName() must be implemented");
  }

  // =========================================================================
  // FILE TYPE CAPABILITY DECLARATION
  // This is the single source of truth for what formats a handler supports
  // =========================================================================

  /**
   * Get the file types this handler supports and what operations it can perform on them
   *
   * This is the SINGLE SOURCE OF TRUTH for a handler's format capabilities.
   * All other capability checks (canExtractMetadata, canHandle, etc.) query this list.
   *
   * IMPORTANT: Handlers must override this method to declare their capabilities.
   * The default implementation returns an empty array.
   *
   * @returns {Array<Object>} Array of supported file type configurations
   *
   * Each configuration object should have:
   * - extension {string}: File extension (e.g., 'vtp', 'json', 'csv')
   * - mimeType {string}: MIME type for this format
   * - displayName {string}: Human-readable name for UI
   * - capabilities {Object}: What this handler can do with this format
   *   - canRender {boolean}: Can visualize this format
   *   - canExtractMetadata {boolean}: Can quickly extract metadata
   *   - canExport {boolean}: Can export to this format
   * - priority {number}: Handler priority (higher = preferred), optional
   *
   * Example return value:
   * [
   *   {
   *     extension: 'vtp',
   *     mimeType: 'application/vnd.vtk.polydata+xml',
   *     displayName: 'VTK PolyData',
   *     icon: "box",           // Lucide icon name
   *     color: "#c084fc",    // Hex color for this type
   *     capabilities: {
   *       canRender: true,
   *       canExtractMetadata: true,
   *       canExport: false,
   *     },
   *     priority: 10
   *   },
   *   {
   *     extension: 'stl',
   *     mimeType: 'model/stl',
   *     displayName: 'STL Model',
   *     capabilities: {
   *       canRender: true,
   *       canExtractMetadata: false,
   *       canExport: true,
   *     },
   *     priority: 5
   *   }
   * ]
   */
  getSupportedFileTypes() {
    // Default: no formats supported
    // Handlers MUST override this to declare their capabilities
    return [];
  }

  /**
   * Check if this handler can extract metadata from a file type
   *
   * This is a CONVENIENCE METHOD that queries getSupportedFileTypes().
   * Handlers typically don't need to override this - just implement
   * getSupportedFileTypes() properly and this will work automatically.
   *
   * @param {string} fileType - File extension (e.g., 'vtp', 'json')
   * @returns {boolean} True if this handler can extract metadata from this format
   */
  canExtractMetadata(fileType) {
    const supportedTypes = this.getSupportedFileTypes();
    const typeConfig = supportedTypes.find(
      (t) => t.extension.toLowerCase() === fileType.toLowerCase()
    );
    return typeConfig?.capabilities?.canExtractMetadata || false;
  }

  /**
   * Check if this handler can render a file type
   *
   * This is a CONVENIENCE METHOD that queries getSupportedFileTypes().
   * Handlers typically don't need to override this - just implement
   * getSupportedFileTypes() properly and this will work automatically.
   *
   * @param {string} fileType - File extension (e.g., 'vtp', 'json')
   * @returns {boolean} True if this handler can render this format
   */
  canHandle(fileType) {
    const supportedTypes = this.getSupportedFileTypes();
    const typeConfig = supportedTypes.find(
      (t) => t.extension.toLowerCase() === fileType.toLowerCase()
    );
    return typeConfig?.capabilities?.canRender || false;
  }

  /**
   * Check if this handler can handle a specific dataset
   *
   * This is similar to canHandle() but operates on dataset objects rather than
   * just file extensions. This allows handlers to make more sophisticated decisions
   * based on dataset metadata, not just the file type.
   *
   * For example, a handler might accept JSON files but only if they contain
   * specific fields. Or it might accept VTP files but only if they're under
   * a certain size. The dataset object provides that additional context.
   *
   * Most handlers can just use the default implementation which checks the
   * fileType property. Override this only if you need more sophisticated logic.
   *
   * @param {Object} dataset - Dataset metadata object
   * @returns {boolean} Can this handler display this dataset
   */
  canHandleDataset(dataset) {
    // Default: check if we can handle the file type
    return dataset?.fileType ? this.canHandle(dataset.fileType) : false;
  }

  /**
   * Extract lightweight metadata from a dataset file
   *
   * This is called during dataset upload to get basic information that can
   * be displayed in the UI before any visualization occurs. The goal is to
   * be fast - read file headers or minimal parsing only, not full data loading.
   *
   * Handlers should check canExtractMetadata(fileType) before calling this.
   * If canExtractMetadata returns false, this method will return null.
   *
   * @param {File} file - The raw file object
   * @param {string} fileType - File extension (e.g., 'vtp', 'json', 'csv')
   * @returns {Promise<Object|null>} Metadata object or null if not supported
   *
   * Example return value for VTK:
   * {
   *   format: 'vtp',
   *   pointCount: 142573,
   *   cellCount: 284001,
   *   bounds: { xMin: -50, xMax: 50, ... },
   *   dataArrays: ['temperature', 'pressure'],
   *   estimatedMemory: '12 MB'
   * }
   */
  async extractMetadata(file, fileType) {
    // Default: no metadata extraction implemented
    // Handlers that can extract metadata override this method
    return null;
  }

  // =========================================================================
  // CORE RENDERING LIFECYCLE
  // These methods handle the basic instance lifecycle
  // =========================================================================

  /**
   * Initialize a new instance in the provided container
   *
   * This is where you set up your rendering pipeline. For VTK, this
   * means creating renderers and cameras. For Plotly, this means
   * initializing the plot. For custom WebGL, this means setting up
   * your WebGL context.
   *
   * @param {HTMLElement} containerElement - DOM element to render into
   * @param {Object} options - Instance configuration
   * @param {string} options.instanceId - Unique instance ID
   * @param {string} options.datasetId - Optional dataset to load
   * @returns {Object} Instance-specific data (saved to instance metadata)
   */
  async initialize(containerElement, options) {
    throw new Error("InstanceTypeHandler.initialize() must be implemented");
  }

  /**
   * Clean up instance resources
   *
   * Called when instance is deleted. Must dispose of all resources
   * to prevent memory leaks. For VTK, this means deleting VTK objects.
   * For WebGL, this means disposing of buffers and contexts.
   *
   * @param {Object} instanceData - The data returned from initialize()
   */
  async cleanup(instanceData) {
    throw new Error("InstanceTypeHandler.cleanup() must be implemented");
  }

  /**
   * Load data into this instance
   *
   * The handler receives the dataset metadata and data object.
   * It's responsible for rendering that data in its specific way.
   * VTK uses polydata directly. Plotly might transform it to traces.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} dataset - Dataset metadata
   * @param {Object} data - The actual data (polydata, JSON, etc.)
   */
  async loadData(instanceData, dataset, data) {
    throw new Error("InstanceTypeHandler.loadData() must be implemented");
  }

  /**
   * Handle window resize
   *
   * Called when the instance viewport resizes. Some renderers need
   * to update their internal dimensions.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {number} width - New width
   * @param {number} height - New height
   */
  async onResize(instanceData, width, height) {
    // Default: do nothing (many renderers handle this automatically)
  }

  // =========================================================================
  // UI INTEGRATION
  // These methods provide UI elements for the instance
  // =========================================================================

  /**
   * Get available tools/widgets for this instance type
   *
   * Returns configuration for tools that should be shown in the
   * instance toolbar. Each tool includes an ID, label, icon, and
   * callback. The core just renders buttons - the handler handles
   * what happens when clicked.
   *
   * @param {Object} instanceData - Instance-specific data
   * @returns {Array<Object>} Tool configurations
   *
   * Example return value:
   * [
   *   {
   *     id: 'clip',
   *     type: 'button',
   *     label: 'Clip Plane',
   *     icon: 'scissors',
   *     onClick: () => this.activateClipWidget(instanceData)
   *   },
   *   {
   *     type: 'separator'
   *   },
   *   {
   *     id: 'colormap',
   *     type: 'menu',
   *     label: 'Color Map',
   *     icon: 'palette',
   *     options: [...]
   *   }
   * ]
   */
  getTools(instanceData) {
    // Default: no tools
    return [];
  }

  /**
   * Get formatted metadata string for a dataset
   *
   * Returns a human-readable string describing the dataset's key properties.
   * Used in the file tree to show dataset information before any instance is created.
   * This is type-specific - VTK shows point counts, CSV shows row counts, etc.
   *
   * @param {Object} dataset - Dataset object with metadata
   * @returns {string} Formatted metadata string (e.g., "142,573 points • VTK PolyData")
   *
   * Example return values:
   * - VTK: "142,573 points • 284,001 cells"
   * - CSV: "1,205 rows • 8 columns"
   * - Image: "1920×1080 • PNG"
   */
  getDatasetMetadataString(dataset) {
    // Default: just show file type
    if (dataset.fileType) {
      return dataset.fileType.toUpperCase();
    }
    return "Unknown";
  }

  /**
   * Get instance header information
   *
   * Returns data to display in the instance viewport header.
   * This might include stats, current view info, or type-specific
   * indicators. The core renders this but doesn't care what it means.
   *
   * @param {Object} instanceData - Instance-specific data
   * @returns {Object} Header info
   *
   * Example return value:
   * {
   *   stats: [
   *     { label: 'Points', value: '142,573' },
   *     { label: 'Polygons', value: '284,001' }
   *   ],
   *   indicators: [
   *     { icon: 'cube', label: '3D View', color: '#4CAF50' }
   *   ]
   * }
   */
  getHeaderInfo(instanceData) {
    // Default: no extra info
    return { stats: [], indicators: [] };
  }

  /**
   * Export instance content
   *
   * Returns the instance content in an exportable format.
   * VTK might return a screenshot or VTP file. Plotly might return JSON.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {string} format - Desired export format ('png', 'json', etc.)
   * @returns {Blob|string} Exported content
   */
  async export(instanceData, format) {
    throw new Error("Export not supported for this instance type");
  }

  // ===========================================================================
  // THUMBNAIL RENDERING (for server-side capture)
  // ===========================================================================

  /**
   * Render a minimal visualization for thumbnail capture
   *
   * This method is called by the embed page (loaded by the thumbnail worker)
   * to render ONLY the visualization without any UI chrome. The handler must:
   *
   * 1. Fetch the dataset file data (via API, not managers - embed mode is minimal)
   * 2. Parse the data in the appropriate format
   * 3. Create a rendering pipeline and render to the container
   * 4. Call onReady() when the visualization is complete and ready for screenshot
   * 5. Call onError(message) if anything fails
   *
   * IMPORTANT: The WebGL context MUST be created with preserveDrawingBuffer: true
   * or the screenshot will capture a blank/black canvas.
   *
   * IMPORTANT: This runs in a minimal environment (headless browser, no auth,
   * no managers initialized). Fetch data directly via API endpoints.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {string} datasetId - Dataset/file ID to render
   * @param {Object} options - Render options
   * @param {number} options.width - Target width in pixels
   * @param {number} options.height - Target height in pixels
   * @param {Function} options.onReady - Callback when visualization is ready for screenshot
   * @param {Function} options.onError - Callback with error message if rendering fails
   * @returns {Function} Cleanup function to release resources when done
   *
   * @example
   * // In embed.js (handler-agnostic):
   * const cleanup = handler.renderForThumbnail(container, datasetId, {
   *   width: 800,
   *   height: 600,
   *   onReady: () => document.body.setAttribute('data-testid', 'visualization-ready'),
   *   onError: (msg) => console.error(msg),
   * });
   *
   * // Later, to clean up:
   * cleanup();
   */
  renderForThumbnail(container, datasetId, options) {
    // Default implementation: not supported
    const { onError } = options;
    onError?.(
      `Thumbnail rendering not implemented for handler type: ${this.getType()}`
    );

    // Return no-op cleanup function
    return () => {};
  }

  // =========================================================================
  // COLLABORATIVE FEATURES
  // These methods handle how collaborative features work for this type
  // =========================================================================

  /**
   * Get the default view state for this instance type
   *
   * This returns the type-specific defaults for visualization state.
   * When a ViewConfiguration is created with null camera/colorMaps,
   * the handler provides these defaults.
   *
   * This keeps ViewConfiguration completely TYPE-AGNOSTIC - it just
   * stores whatever state it's given without understanding the structure.
   *
   * @returns {Object} Default view state
   * @returns {Object|null} return.camera - Type-specific camera defaults
   * @returns {Object|null} return.colorMaps - Type-specific colormap defaults
   * @returns {Array} return.filters - Default filters (usually empty)
   * @returns {Array} return.widgets - Default widgets (usually empty)
   */
  getDefaultViewState() {
    // Default implementation returns nulls
    // Each handler overrides with type-specific defaults
    return {
      camera: null,
      colorMaps: null,
      filters: [],
      widgets: [],
    };
  }

  /**
   * Get the current shared state for this instance
   *
   * This state will be synced to other collaborators via Y.js.
   * Return only the state that should be shared - don't include
   * internal implementation details.
   *
   * The state structure is type-specific. VTK returns camera positions
   * and widget states. A chart visualization might return axis ranges
   * and selected data points.
   *
   * @param {Object} instanceData - Instance-specific data
   * @returns {Object|null} Shareable state, or null if not ready
   *
   * Example for VTK:
   * {
   *   camera: { position: [x,y,z], focalPoint: [x,y,z], viewUp: [x,y,z] },
   *   widgets: { sphere: { center: [x,y,z], radius: 5 } },
   *   visualization: { colorMap: 'rainbow', opacity: 0.8 }
   * }
   */
  async getSharedState(instanceData) {
    // Default: no shared state
    return null;
  }

  /**
   * Apply shared state received from another collaborator
   *
   * This is called when remote changes arrive via Y.js.
   * The handler should update its visualization to match the provided state.
   *
   * IMPORTANT: Set a flag to prevent sync loops. When you apply remote state,
   * your visualization will change (camera moves, widgets activate), which
   * might trigger local change events. You don't want to sync those changes
   * back out because they came from a remote user.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} state - The state to apply (structure is type-specific)
   * @param {string} sourceUserId - ID of the user who made this change
   * @returns {Promise<void>}
   *
   * Example implementation:
   * async applySharedState(instanceData, state, sourceUserId) {
   *   this._isApplyingRemoteState = true;
   *   try {
   *     if (state.camera) {
   *       instanceData.camera.setPosition(...state.camera.position);
   *       // ... apply other camera properties
   *     }
   *     instanceData.renderWindow.render();
   *   } finally {
   *     this._isApplyingRemoteState = false;
   *   }
   * }
   */
  async applySharedState(instanceData, state, sourceUserId) {
    // Default: do nothing
    // Handlers that want to sync state must override this
  }

  /**
   * Show/hide collaborative cursors
   *
   * The global system tells the instance "show cursors for these users"
   * or "hide all cursors". The handler decides how to render them.
   * VTK projects them into 3D space. Plotly might show them as markers.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {boolean} visible - Should cursors be visible
   * @param {Array<Object>} users - Users whose cursors to show
   */
  async setCursorVisibility(instanceData, visible, users = []) {
    // Default: do nothing (some instance types may not support cursors)
  }

  /**
   * Update cursor position for a user
   *
   * Called when a remote user moves their cursor. The handler receives
   * the cursor data (which is type-specific) and renders it appropriately.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {string} userId - User whose cursor moved
   * @param {Object} cursorData - Cursor position/data (type-specific)
   */
  async updateCursor(instanceData, userId, cursorData) {
    // Default: do nothing
  }

  /**
   * Show/hide annotations
   *
   * The global system tells the instance "show annotations" or "hide them".
   * The handler decides how to render annotations for this data type.
   * VTK projects them into 3D. Plotly might show them as plot annotations.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {boolean} visible - Should annotations be visible
   * @param {Array<Object>} annotations - Annotations to show
   */
  async setAnnotationVisibility(instanceData, visible, annotations = []) {
    // Default: do nothing
  }

  /**
   * Add a new annotation
   *
   * Called when user creates an annotation. The handler is responsible
   * for capturing the annotation data in a type-specific way and
   * returning it so it can be synced.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} annotationData - Annotation details
   * @returns {Object} Complete annotation with type-specific data
   */
  async addAnnotation(instanceData, annotationData) {
    // Default: no annotation support
    return null;
  }

  /**
   * Raycast from screen coordinates to find 3D world position
   *
   * Used for click-to-annotate and other picking operations.
   * Each handler implements this based on its rendering technology.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {HTMLElement} container - The container element
   * @returns {Object|null} { hit: boolean, position: {x,y,z}, normal: {x,y,z} } or null
   */
  raycastAt(instanceData, screenX, screenY, container) {
    // Default: no raycasting support
    return null;
  }

  /**
   * Synchronize camera/view state from another user
   *
   * When users are in "follow mode", the handler receives camera state
   * from the followed user and applies it to this instance.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} cameraState - Camera/view state (type-specific)
   */
  async syncCamera(instanceData, cameraState) {
    // Default: do nothing
  }

  // =========================================================================
  // VR CAPABILITIES
  // These methods declare and implement VR support for this instance type
  // =========================================================================

  /**
   * Does this instance type support viewing in VR?
   *
   * If true, the instance can be "sent to VR" where it renders in an
   * immersive headset while other instances remain on desktop.
   *
   * @returns {boolean} True if instance can render in VR
   */
  supportsInstanceVR() {
    // Default: no VR support
    return false;
  }

  /**
   * Does this instance type adapt when the entire app is in VR mode?
   *
   * If true, the instance can adjust its rendering when the whole
   * application switches to VR (e.g., the user puts on a headset and
   * sees the entire workspace in 3D space).
   *
   * @returns {boolean} True if instance adapts to application VR mode
   */
  supportsApplicationVR() {
    // Default: no special handling for app VR mode
    return false;
  }

  /**
   * Get VR requirements and capabilities
   *
   * Returns detailed information about what VR features this type needs.
   * Used by the VR system to determine if it can launch VR mode.
   *
   * @returns {Object} VR capability details
   */
  getVRCapabilities() {
    return {
      instanceVR: this.supportsInstanceVR(),
      applicationVR: this.supportsApplicationVR(),

      requirements: {
        controllers: false,
        handTracking: false,
        roomScale: false,
        minFPS: 60,
      },

      optional: {
        eyeTracking: false,
        haptics: false,
        spatialAudio: false,
      },
    };
  }

  /**
   * Enter VR mode for this instance
   *
   * Called when user clicks "Send to VR" for this specific instance.
   * The instance should initialize VR rendering while the desktop view
   * continues to work for other instances.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {XRSession} xrSession - WebXR session
   * @returns {Promise<Object>} VR-specific data (stored separately)
   */
  async enterInstanceVR(instanceData, xrSession) {
    throw new Error(
      `${this.getDisplayName()} does not support instance-level VR. ` +
        `Set supportsInstanceVR() to true and implement this method.`
    );
  }

  /**
   * Exit VR mode for this instance
   *
   * Called when user exits VR for this specific instance.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrData - VR data returned from enterInstanceVR
   */
  async exitInstanceVR(instanceData, vrData) {
    // Default: do nothing
  }

  /**
   * Update instance VR rendering
   *
   * Called every frame while in VR mode. The handler should render
   * the stereo views for left and right eyes.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrData - VR-specific data
   * @param {XRFrame} frame - Current XR frame with pose data
   */
  async updateInstanceVR(instanceData, vrData, frame) {
    // Default: do nothing
  }

  /**
   * Handle VR controller input for this instance
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrData - VR-specific data
   * @param {XRInputSource} inputSource - Controller that generated input
   * @param {string} action - Action performed ('select', 'squeeze', 'trigger')
   * @param {Object} pose - Controller pose in space
   */
  async handleVRInput(instanceData, vrData, inputSource, action, pose) {
    // Default: do nothing
  }

  /**
   * Notify instance that application entered VR mode
   *
   * Called when the ENTIRE application switches to VR mode.
   * The instance should adapt its rendering for this context.
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrContext - Global VR context information
   * @returns {Promise<Object>} Any VR adaptation state to store
   */
  async onApplicationVREnter(instanceData, vrContext) {
    // Default: do nothing special
    return null;
  }

  /**
   * Notify instance that application exited VR mode
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrAdaptationState - State from onApplicationVREnter
   */
  async onApplicationVRExit(instanceData, vrAdaptationState) {
    // Default: do nothing
  }

  /**
   * Get VR-optimized viewport settings
   *
   * When in application VR mode, instances might need different viewport
   * configurations.
   *
   * @param {Object} instanceData - Instance-specific data
   * @returns {Object} VR viewport settings
   */
  getVRViewportSettings(instanceData) {
    return {
      resolution: { width: 1920, height: 1920 },
      targetFPS: 90,
      multisampling: 4,
      viewDistance: 2.0,
      viewportSize: { width: 2.0, height: 1.5 },
    };
  }

  /**
   * Render remote user avatars in VR
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrData - VR-specific data (if in instance VR)
   * @param {Array<Object>} users - Remote users with their VR poses
   */
  async renderVRAvatars(instanceData, vrData, users) {
    // Default: do nothing
  }

  /**
   * Render annotations in VR space
   *
   * @param {Object} instanceData - Instance-specific data
   * @param {Object} vrData - VR-specific data (if in instance VR)
   * @param {Array<Object>} annotations - Annotations to show
   */
  async renderVRAnnotations(instanceData, vrData, annotations) {
    // Default: use regular annotation rendering
    return this.setAnnotationVisibility(instanceData, true, annotations);
  }

  // =========================================================================
  // VR EXPLORATION
  // These methods enable immersive VR exploration features
  // =========================================================================

  /**
   * Does this handler support immersive VR exploration?
   *
   * Different from supportsInstanceVR() which just views in VR.
   * Exploration means fly-through, scaling, slicing, etc.
   *
   * @returns {boolean}
   */
  supportsVRExploration() {
    return false;
  }

  /**
   * Get VR exploration capabilities
   *
   * @returns {Object}
   */
  getVRExplorationCapabilities() {
    return {
      supported: this.supportsVRExploration(),
      explorationModes: [], // ['fly', 'teleport', 'walk', 'scale']
      tools: [], // ['slice', 'measure', 'annotate', 'clip', 'probe']
      maxRegionSize: null,
      supportsLiveSync: false,
      requiresPreprocessing: [],
    };
  }

  /**
   * Prepare data for VR exploration
   *
   * Called before entering VR to check if preprocessing is needed.
   * May return status indicating preprocessing required.
   *
   * @param {Object} instanceData
   * @param {VRExplorationSession} session
   * @returns {Promise<Object>} { ready: boolean, message?: string }
   */
  async prepareForVRExploration(instanceData, session) {
    return { ready: true };
  }

  /**
   * Enter VR exploration mode
   *
   * @param {Object} instanceData
   * @param {VRExplorationSession} session
   * @param {XRSession} xrSession
   * @returns {Promise<Object>} VR exploration context
   */
  async enterVRExploration(instanceData, session, xrSession) {
    throw new Error(
      `${this.getDisplayName()} does not support VR exploration. ` +
        `Set supportsVRExploration() to true and implement this method.`
    );
  }

  /**
   * Update VR exploration frame
   *
   * @param {Object} vrContext - From enterVRExploration
   * @param {XRFrame} frame
   * @param {Object} inputState
   */
  async updateVRExploration(vrContext, frame, inputState) {
    // Default: do nothing
  }

  /**
   * Exit VR exploration
   *
   * @param {Object} vrContext
   * @returns {Promise<Object>} Final state for archival
   */
  async exitVRExploration(vrContext) {
    return {};
  }

  // =========================================================================
  // VR TOOL SUPPORT
  // =========================================================================

  /**
   * Add a slice plane
   *
   * @param {Object} vrContext
   * @param {Object} plane - { id, origin, normal, visible, color, opacity }
   */
  async addSlicePlane(vrContext, plane) {
    // Override in handler
  }

  /**
   * Update a slice plane
   *
   * @param {Object} vrContext
   * @param {Object} plane
   */
  async updateSlicePlane(vrContext, plane) {
    // Override in handler
  }

  /**
   * Remove a slice plane
   *
   * @param {Object} vrContext
   * @param {string} planeId
   */
  async removeSlicePlane(vrContext, planeId) {
    // Override in handler
  }

  /**
   * Perform raycast in VR
   *
   * @param {Object} vrContext
   * @param {Object} ray - { origin, direction }
   * @returns {Object|null} { hit, position, normal, distance }
   */
  raycastVR(vrContext, ray) {
    return null;
  }

  /**
   * Get data value at position
   *
   * @param {Object} vrContext
   * @param {Object} position - { x, y, z }
   * @returns {Object|null} Data value info
   */
  probeDataVR(vrContext, position) {
    return null;
  }
}

/**
 * Quick reference for implementers:
 *
 * MUST OVERRIDE:
 * - getType() - Your type identifier
 * - getDisplayName() - Human-readable name
 * - getSupportedFileTypes() - What formats you support
 * - initialize() - Set up rendering
 * - cleanup() - Dispose resources
 * - loadData() - Display data
 * - getDefaultViewState() - View states for collaborative feature sync
 *
 * SHOULD OVERRIDE if applicable:
 * - extractMetadata() - Fast metadata extraction
 * - getTools() - Toolbar buttons/menus
 * - getHeaderInfo() - Stats to show in header
 * - getSharedState() / applySharedState() - Collaboration sync
 * - VR methods if you support VR
 *
 * DON'T NEED TO OVERRIDE (convenience methods):
 * - canHandle() - Queries getSupportedFileTypes()
 * - canExtractMetadata() - Queries getSupportedFileTypes()
 * - canHandleDataset() - Uses canHandle() internally
 */

// ============================================================================
// FUTURE: PlotlyInstanceHandler example (for reference)
// ============================================================================

/*
// PlotlyInstanceHandler.getDefaultViewState()
getDefaultViewState() {
  return {
    camera: {
      // 2D pan/zoom, completely different from VTK
      center: { x: 0.5, y: 0.5 },
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    },
    colorMaps: {
      colorscale: 'Viridis',
      showscale: true,
    },
    filters: [],
    widgets: [],
  };
}
*/

// ============================================================================
// FUTURE: ImageInstanceHandler example (for reference)
// ============================================================================

/*
// ImageInstanceHandler.getDefaultViewState()
getDefaultViewState() {
  return {
    camera: {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
    },
    colorMaps: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
    },
    filters: [],
    widgets: [],
  };
}
*/
