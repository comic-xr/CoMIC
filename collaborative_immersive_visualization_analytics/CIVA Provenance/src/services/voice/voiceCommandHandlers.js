// src/services/voice/voiceCommandHandlers.js
// Handles voice command events dispatched by voiceCommandService
//
// Listens for 'cia:voice-command' events and routes them to appropriate handlers
// based on category (camera, instance, recording, annotation, etc.)

import { app as log } from "@Utils/logger.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { vrManager } from "@Core/vr/VRManager.js";
import { voiceRoomService } from "@Services/voice/voiceRoomService.js";
import { annotationManager } from "@Core/data/managers/AnnotationManager.js";
import { instanceTools } from "@Core/instances/types/vtk/vtkInstanceTools.js";

// Track initialization state
let isInitialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize voice command handlers
 * Call this once during app startup
 */
export function initializeVoiceCommandHandlers() {
  if (isInitialized) {
    log.warn("Voice command handlers already initialized");
    return;
  }

  window.addEventListener("cia:voice-command", handleVoiceCommand);
  isInitialized = true;

  log.info("Voice command handlers initialized");
}

/**
 * Clean up voice command handlers
 */
export function cleanupVoiceCommandHandlers() {
  window.removeEventListener("cia:voice-command", handleVoiceCommand);
  isInitialized = false;
  log.debug("Voice command handlers cleaned up");
}

// =============================================================================
// MAIN COMMAND ROUTER
// =============================================================================

/**
 * Main voice command event handler
 * Routes commands to category-specific handlers
 */
function handleVoiceCommand(event) {
  const { action, category, name, params } = event.detail;

  log.debug(`Voice command received: ${action}`, { category, name, params });

  try {
    switch (category) {
      case "camera":
        handleCameraCommand(name, params);
        break;

      case "instance":
        handleInstanceCommand(name, params);
        break;

      case "recording":
        handleRecordingCommand(name, params);
        break;

      case "annotation":
        handleAnnotationCommand(name, params);
        break;

      case "tool":
        handleToolCommand(name, params);
        break;

      case "vr":
        handleVRCommand(name, params);
        break;

      case "voice-room":
        handleVoiceRoomCommand(name, params);
        break;

      case "help":
        handleHelpCommand(name, params);
        break;

      default:
        log.warn(`Unknown voice command category: ${category}`);
    }
  } catch (error) {
    log.error(`Error handling voice command ${action}:`, error);
  }
}

// =============================================================================
// CAMERA COMMANDS
// =============================================================================

/**
 * Handle camera-related voice commands
 * Requires an active instance with VTK renderer
 */
function handleCameraCommand(name, params) {
  const activeInstance = workspaceManager.getActiveInstance();

  if (!activeInstance) {
    log.warn("Camera command ignored - no active instance");
    showFeedback("No active instance selected");
    return;
  }

  const instanceId = activeInstance.instanceId;

  // Check if instance has VTK scene objects for camera control
  if (!activeInstance.instanceData?.sceneObjects?.camera) {
    log.warn("Camera command ignored - instance has no camera");
    showFeedback("This view doesn't support camera control");
    return;
  }

  const { camera, renderer, renderWindow } =
    activeInstance.instanceData.sceneObjects;

  switch (name) {
    case "rotate": {
      // Rotate camera by specified degrees around axis
      const { axis, degrees } = params;

      if (axis === "y") {
        // Horizontal rotation (azimuth)
        camera.azimuth(degrees);
      } else if (axis === "x") {
        // Vertical rotation (elevation)
        camera.elevation(degrees);
      }

      renderer.resetCameraClippingRange();
      renderWindow.render();
      log.debug(`Camera rotated ${degrees} degrees on ${axis} axis`);
      break;
    }

    case "zoom": {
      // Zoom in/out by factor
      const { factor } = params;
      camera.dolly(factor);
      renderer.resetCameraClippingRange();
      renderWindow.render();
      log.debug(`Camera zoomed by factor ${factor}`);
      break;
    }

    case "reset": {
      // Reset camera to default view
      instanceTools.resetCamera(instanceId);
      log.debug("Camera reset to default view");
      break;
    }

    default:
      log.warn(`Unknown camera command: ${name}`);
  }
}

// =============================================================================
// INSTANCE COMMANDS
// =============================================================================

/**
 * Handle instance-related voice commands
 */
function handleInstanceCommand(name, params) {
  const activeInstance = workspaceManager.getActiveInstance();

  switch (name) {
    case "close": {
      if (!activeInstance) {
        showFeedback("No instance to close");
        return;
      }

      workspaceManager.deleteInstance(activeInstance.instanceId);
      log.debug("Active instance closed");
      break;
    }

    case "create": {
      // Dispatch event to open new instance dialog
      window.dispatchEvent(new CustomEvent("cia:show-new-instance-dialog"));
      log.debug("New instance dialog requested");
      break;
    }

    case "fullscreen": {
      if (!activeInstance) {
        showFeedback("No instance to fullscreen");
        return;
      }

      // Dispatch event to toggle fullscreen on active instance
      window.dispatchEvent(
        new CustomEvent("cia:instance-fullscreen", {
          detail: { instanceId: activeInstance.instanceId, enter: true },
        })
      );
      log.debug("Instance fullscreen requested");
      break;
    }

    case "exit-fullscreen": {
      // Dispatch event to exit fullscreen
      window.dispatchEvent(
        new CustomEvent("cia:instance-fullscreen", {
          detail: { enter: false },
        })
      );
      log.debug("Exit fullscreen requested");
      break;
    }

    default:
      log.warn(`Unknown instance command: ${name}`);
  }
}

// =============================================================================
// RECORDING COMMANDS
// =============================================================================

/**
 * Handle recording-related voice commands
 */
function handleRecordingCommand(name, params) {
  switch (name) {
    case "start": {
      window.dispatchEvent(
        new CustomEvent("recording:start", {
          detail: { mode: "Workspace", source: "voice" },
        })
      );
      log.debug("Recording start requested via voice");
      break;
    }

    case "stop": {
      window.dispatchEvent(new CustomEvent("recording:stop"));
      log.debug("Recording stop requested via voice");
      break;
    }

    case "pause": {
      window.dispatchEvent(new CustomEvent("recording:pause"));
      log.debug("Recording pause requested via voice");
      break;
    }

    default:
      log.warn(`Unknown recording command: ${name}`);
  }
}

// =============================================================================
// ANNOTATION COMMANDS
// =============================================================================

/**
 * Handle annotation-related voice commands
 */
function handleAnnotationCommand(name, params) {
  const activeInstance = workspaceManager.getActiveInstance();

  switch (name) {
    case "start": {
      // Enter annotation mode
      window.dispatchEvent(
        new CustomEvent("cia:annotation-mode", {
          detail: { enabled: true },
        })
      );
      showFeedback("Annotation mode enabled");
      log.debug("Annotation mode started via voice");
      break;
    }

    case "cancel": {
      // Cancel current annotation
      window.dispatchEvent(
        new CustomEvent("cia:annotation-mode", {
          detail: { enabled: false },
        })
      );
      showFeedback("Annotation cancelled");
      log.debug("Annotation cancelled via voice");
      break;
    }

    case "delete-last": {
      if (!activeInstance || !annotationManager) {
        showFeedback("Cannot delete annotation - no active context");
        return;
      }

      const datasetId = activeInstance.datasetId;
      if (!datasetId) {
        showFeedback("No dataset loaded");
        return;
      }

      // Get annotations and delete the most recent one
      const annotations = annotationManager.getAnnotations(datasetId);
      if (annotations.length > 0) {
        const lastAnnotation = annotations[annotations.length - 1];
        annotationManager.deleteAnnotation(datasetId, lastAnnotation.id);
        showFeedback("Last annotation deleted");
        log.debug(`Deleted annotation: ${lastAnnotation.id}`);
      } else {
        showFeedback("No annotations to delete");
      }
      break;
    }

    case "clear-all": {
      // Request confirmation before clearing all annotations
      window.dispatchEvent(
        new CustomEvent("cia:confirm-action", {
          detail: {
            action: "clear-all-annotations",
            message: "Clear all annotations?",
            onConfirm: () => {
              if (!activeInstance?.datasetId || !annotationManager) return;

              const annotations = annotationManager.getAnnotations(
                activeInstance.datasetId
              );
              annotations.forEach((annotation) => {
                annotationManager.deleteAnnotation(
                  activeInstance.datasetId,
                  annotation.id
                );
              });
              showFeedback("All annotations cleared");
              log.debug("All annotations cleared via voice");
            },
          },
        })
      );
      break;
    }

    default:
      log.warn(`Unknown annotation command: ${name}`);
  }
}

// =============================================================================
// TOOL COMMANDS
// =============================================================================

/**
 * Handle tool selection voice commands
 */
function handleToolCommand(name, params) {
  const { tool } = params;

  // Dispatch tool selection event
  window.dispatchEvent(
    new CustomEvent("cia:select-tool", {
      detail: { tool },
    })
  );

  log.debug(`Tool selected via voice: ${tool}`);
}

// =============================================================================
// VR COMMANDS
// =============================================================================

/**
 * Handle VR-related voice commands
 */
function handleVRCommand(name, params) {
  switch (name) {
    case "enter": {
      vrManager.enterVR().catch((error) => {
        log.error("Failed to enter VR:", error);
        showFeedback("Could not enter VR mode");
      });
      break;
    }

    case "exit": {
      vrManager.exitVR().catch((error) => {
        log.error("Failed to exit VR:", error);
      });
      break;
    }

    case "grab": {
      // VR grab action - dispatch to VR controller handler
      window.dispatchEvent(new CustomEvent("cia:vr-grab"));
      break;
    }

    case "release": {
      window.dispatchEvent(new CustomEvent("cia:vr-release"));
      break;
    }

    case "teleport": {
      window.dispatchEvent(new CustomEvent("cia:vr-teleport"));
      break;
    }

    default:
      log.warn(`Unknown VR command: ${name}`);
  }
}

// =============================================================================
// VOICE ROOM COMMANDS
// =============================================================================

/**
 * Handle voice room (LiveKit) commands
 */
async function handleVoiceRoomCommand(name, params) {
  switch (name) {
    case "mute": {
      await voiceRoomService.setMuted(true);
      showFeedback("Microphone muted");
      break;
    }

    case "unmute": {
      await voiceRoomService.setMuted(false);
      showFeedback("Microphone unmuted");
      break;
    }

    case "join": {
      // Get current room from session or use default
      const roomName = params.roomName || "main";
      await voiceRoomService.joinRoom(roomName);
      showFeedback("Joined voice channel");
      break;
    }

    case "leave": {
      await voiceRoomService.leaveRoom();
      showFeedback("Left voice channel");
      break;
    }

    default:
      log.warn(`Unknown voice-room command: ${name}`);
  }
}

// =============================================================================
// HELP COMMANDS
// =============================================================================

/**
 * Handle help-related voice commands
 */
function handleHelpCommand(name, params) {
  switch (name) {
    case "show-commands": {
      // Show voice command help dialog
      window.dispatchEvent(
        new CustomEvent("cia:show-help", {
          detail: { section: "voice-commands" },
        })
      );
      log.debug("Voice commands help requested");
      break;
    }

    default:
      log.warn(`Unknown help command: ${name}`);
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Show visual/audio feedback for command execution
 */
function showFeedback(message) {
  // Dispatch feedback event for UI to show toast/notification
  window.dispatchEvent(
    new CustomEvent("cia:voice-feedback", {
      detail: { message },
    })
  );
}
