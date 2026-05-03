// ----------------------------------------------------------------------------
// VR Spatial UI - 3D Floating Panels in VR
// ----------------------------------------------------------------------------

import { vr as log } from "@Utils/logger.js";
import { vrModeManager } from "@VR/vrModeManager.js";

class VRSpatialUI {
  constructor() {
    this.panels = new Map();
  }

  initialize() {
    log.debug("VR spatial UI initialized (placeholder)");

    vrModeManager.onModeChange((mode) => {
      if (mode === "vr") {
        log.debug("VR mode: Would create spatial UI here");
        // this.createVRMenus();
      } else {
        log.debug("Desktop mode: Would cleanup spatial UI here");
        // this.cleanupVRMenus();
      }
    });
  }

  // Placeholder methods
  createVRMenus() {
    log.debug("TODO: Create VR spatial menus");
  }

  cleanupVRMenus() {
    log.debug("TODO: Cleanup VR spatial menus");
  }
}

export const vrSpatialUI = new VRSpatialUI();
