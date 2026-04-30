/**
 * Core WebXR Module
 *
 * Responsible for:
 * - WebXR session initialization (AR/VR)
 * - XR device detection and capabilities
 * - Input source handling (controllers, hands)
 * - Reference space management
 * - XR frame loop integration
 * - Device-specific workarounds
 * - WebXR feature detection
 *
 * API Contract:
 * - XRSessionManager: Initialize and manage XR sessions
 * - XRInputManager: Handle XR input sources and events
 * - ReferenceSpaceManager: Manage spatial reference frames
 * - XRCapabilitiesDetector: Query device capabilities
 *
 * DO NOT:
 * - Handle rendering (belongs in renderer/)
 * - Process user interactions beyond XR events (belongs in interaction/)
 * - Manage app state (belongs in state/)
 * - Track metrics (belongs in metrics/)
 */

// Export public API
export type { XRSessionConfig, InputSourceEvent } from './types';
export { isWebXRAvailable, checkXRSupport, supportsImmersiveVR } from './xr-feature-detection';
export type { XRSupportResult } from './xr-feature-detection';
export { XRSessionManager } from './xr-session-manager';
export type { XRSessionState, XROpenGLRenderWindow } from './xr-session-manager';
export { XRInputManager } from './xr-input-manager';
export type { XRControllerRay } from './xr-input-manager';
