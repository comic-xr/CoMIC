// src/collaboration/presence/awarenessTracking.js
// Lightweight awareness tracking for activity badges and focused view attribution

import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { presence as log } from "@Utils/logger.js";

let cleanupFns = [];

export function initializeAwarenessTracking() {
  if (!presenceSystem?._initialized) {
    log.warn("Awareness tracking skipped: presence not initialized");
    return () => {};
  }

  const viewConfigManager = getViewConfigurationManager?.();
  if (!viewConfigManager) {
    log.warn("Awareness tracking skipped: viewConfigurationManager missing");
    return () => {};
  }

  log.debug("Initializing awareness tracking");

  const unsubscribeFocus = eventBus.on(BUS_EVENTS.VIEW_FOCUSED, ({ viewId }) => {
    if (!viewId) return;
    const view = viewConfigManager.getView?.(viewId);
    const viewName = view?.name || null;
    presenceSystem.setFocusedView(viewId, viewName);
  });

  const unsubscribeRemoved = eventBus.on(BUS_EVENTS.VIEW_REMOVED, ({ viewId }) => {
    if (!viewId) return;
    presenceSystem.clearFocusedViewIf(viewId);
  });

  const unsubscribeCamera = viewConfigManager.on(
    "cameraChanged",
    ({ viewId, isLinkedUpdate }) => {
      if (!viewId || isLinkedUpdate) return;
      presenceSystem.setActivity({
        type: "navigation",
        label: "Navigating",
        viewId,
      });
    }
  );

  const unsubscribeFilter = viewConfigManager.on(
    "filterChanged",
    ({ viewId, isLinkedUpdate }) => {
      if (!viewId || isLinkedUpdate) return;
      presenceSystem.setActivity({
        type: "filter",
        label: "Filtering",
        viewId,
      });
    }
  );

  const unsubscribeAnnotation = viewConfigManager.on(
    "annotationChanged",
    ({ viewId, isLinkedUpdate }) => {
      if (!viewId || isLinkedUpdate) return;
      presenceSystem.setActivity({
        type: "annotation",
        label: "Annotating",
        viewId,
      });
    }
  );

  cleanupFns = [
    unsubscribeFocus,
    unsubscribeRemoved,
    unsubscribeCamera,
    unsubscribeFilter,
    unsubscribeAnnotation,
  ];

  return () => {
    cleanupFns.forEach((fn) => fn?.());
    cleanupFns = [];
  };
}

export default initializeAwarenessTracking;
