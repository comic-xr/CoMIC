import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { app as log } from "@Utils/logger.js";

const CAPTURE_SPECS = [
  {
    name: "cia:instance-focused",
    eventType: "view",
    eventSource: "view:focus",
    minIntervalMs: 150,
    project: (detail) => ({
      viewId: detail?.viewId || null,
      instanceId: detail?.instanceId || null,
      cellId: detail?.cellId || null,
      row: detail?.row ?? null,
      col: detail?.col ?? null,
      source: detail?.source || null,
    }),
  },
  {
    name: "cia:request-instance",
    eventType: "view",
    eventSource: "view:request-instance",
    project: (detail) => ({
      datasetId: detail?.datasetId || null,
      fileId: detail?.fileId || null,
      fileName: detail?.fileName || null,
      row: detail?.row ?? null,
      col: detail?.col ?? null,
    }),
  },
  {
    name: "cia:navigate-to-cell",
    eventType: "navigation",
    eventSource: "workspace:navigate-cell",
    project: (detail) => ({
      row: detail?.row ?? null,
      col: detail?.col ?? null,
      direction: detail?.direction || null,
    }),
  },
  {
    name: "cia:filter-apply",
    eventType: "filter",
    eventSource: "filter:apply",
    project: (detail) => ({
      filterId: detail?.filterId || null,
      filterName: detail?.filterConfig?.name || null,
      filterType: detail?.filterConfig?.type || null,
      scope: detail?.filterConfig?.scope || null,
    }),
  },
  {
    name: "cia:filter-batch-apply",
    eventType: "filter",
    eventSource: "filter:batch-apply",
    project: (detail) => ({
      count: Array.isArray(detail?.filters) ? detail.filters.length : 0,
      filterIds: Array.isArray(detail?.filters)
        ? detail.filters
            .map((filter) => filter?.id || null)
            .filter(Boolean)
            .slice(0, 10)
        : [],
    }),
  },
  {
    name: "cia:transform-changed",
    eventType: "transform",
    eventSource: "transform:update",
    minIntervalMs: 400,
    project: (detail) => ({
      instanceId: detail?.instanceId || null,
      translate: sanitizeValue(detail?.translate),
      rotate: sanitizeValue(detail?.rotate),
      scale: sanitizeValue(detail?.scale),
    }),
  },
  {
    name: "cia:view-snapshot",
    eventType: "view",
    eventSource: "view:snapshot",
    project: (detail) => ({
      viewId: detail?.viewId || detail?.view?.id || null,
      viewName: detail?.view?.name || null,
    }),
  },
  {
    name: "recording:marker",
    eventType: "marker",
    eventSource: "recording:marker",
    project: (detail) => ({
      id: detail?.id || null,
      type: detail?.type || "note",
      text: detail?.text || "",
      timestamp: detail?.timestamp ?? null,
    }),
  },
  {
    name: "cia:right-panel-tab-change",
    eventType: "ui",
    eventSource: "ui:right-panel-tab-change",
    project: (detail) => ({
      tabId: detail?.tabId || detail?.tab || null,
      label: detail?.label || null,
    }),
  },
  {
    name: "cia:workspace-arrange",
    eventType: "workspace",
    eventSource: "workspace:arrange",
    project: (detail) => ({
      layout: detail?.layout || null,
      rows: detail?.rows ?? null,
      cols: detail?.cols ?? null,
    }),
  },
];

function sanitizeValue(value, depth = 0) {
  if (value == null) return value;
  if (depth > 2) return "[truncated]";

  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const result = {};
    for (const [key, nestedValue] of Object.entries(value).slice(0, 12)) {
      if (typeof nestedValue === "function") continue;
      if (nestedValue instanceof Element) continue;
      result[key] = sanitizeValue(nestedValue, depth + 1);
    }
    return result;
  }

  if (typeof value === "string" && value.length > 300) {
    return `${value.slice(0, 297)}...`;
  }

  return value;
}

class RecordingCaptureService {
  constructor() {
    this.initialized = false;
    this.isRecordingActive = false;
    this.queue = [];
    this.listeners = [];
    this.flushTimer = null;
    this.isFlushing = false;
    this.flushPromise = null;
    this.lastCaptureTimes = new Map();
  }

  initialize() {
    if (this.initialized || typeof window === "undefined") {
      return;
    }

    CAPTURE_SPECS.forEach((spec) => {
      const handler = (event) => {
        this.capture(spec, event.detail);
      };
      window.addEventListener(spec.name, handler);
      this.listeners.push(() => window.removeEventListener(spec.name, handler));
    });

    const setRecordingActive = () => {
      this.isRecordingActive = true;
    };
    const setRecordingPaused = () => {
      this.isRecordingActive = false;
    };

    window.addEventListener("recording:start", setRecordingActive);
    window.addEventListener("recording:resume", setRecordingActive);
    window.addEventListener("recording:stop", setRecordingPaused);
    window.addEventListener("recording:pause", setRecordingPaused);
    this.listeners.push(() =>
      window.removeEventListener("recording:start", setRecordingActive)
    );
    this.listeners.push(() =>
      window.removeEventListener("recording:resume", setRecordingActive)
    );
    this.listeners.push(() =>
      window.removeEventListener("recording:stop", setRecordingPaused)
    );
    this.listeners.push(() =>
      window.removeEventListener("recording:pause", setRecordingPaused)
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void this.flush();
      }
    };
    const handleBeforeUnload = () => {
      void this.flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    this.listeners.push(() =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    );
    this.listeners.push(() =>
      window.removeEventListener("beforeunload", handleBeforeUnload)
    );

    this.flushTimer = window.setInterval(() => {
      void this.flush();
    }, 1000);

    this.initialized = true;
    log.debug("Recording capture service initialized");
  }

  destroy() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners = [];

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.initialized = false;
  }

  buildHeaders() {
    return {
      "Content-Type": "application/json",
      "x-user-id": sessionManager.getUserId?.() || "anonymous",
      "x-user-email": sessionManager.getUserEmail?.() || "anonymous@local",
      "x-user-name": sessionManager.getUserName?.() || "Anonymous",
    };
  }

  getProjectId() {
    return sessionManager.getProjectId?.() || sessionManager.getRoomId?.() || null;
  }

  capture(spec, detail) {
    if (!this.isRecordingActive) {
      return;
    }

    const payload = spec.project ? spec.project(detail) : sanitizeValue(detail);
    const signature = `${spec.eventSource}:${JSON.stringify(payload)}`;
    const now = Date.now();
    const lastCapture = this.lastCaptureTimes.get(signature) || 0;

    if (spec.minIntervalMs && now - lastCapture < spec.minIntervalMs) {
      return;
    }

    this.lastCaptureTimes.set(signature, now);
    this.queue.push({
      eventType: spec.eventType,
      eventSource: spec.eventSource,
      eventData: payload,
    });

    if (this.queue.length >= 10) {
      void this.flush();
    }
  }

  async flush() {
    if (this.isFlushing) {
      return this.flushPromise;
    }

    if (this.queue.length === 0) {
      return;
    }

    const projectId = this.getProjectId();
    if (!projectId) {
      this.queue = [];
      return;
    }

    const events = this.queue.splice(0, this.queue.length);
    const apiBase = config.apiBaseUrl || "http://localhost:3001/api";
    this.isFlushing = true;
    this.flushPromise = (async () => {
      try {
        const response = await fetch(
          `${apiBase}/projects/${projectId}/recordings/events`,
          {
            method: "POST",
            headers: this.buildHeaders(),
            body: JSON.stringify({ events }),
            keepalive: true,
          }
        );

        if (!response.ok) {
          throw new Error(`Recording capture failed: ${response.status}`);
        }
      } catch (error) {
        this.queue.unshift(...events);
        log.warn("Recording capture flush failed:", error);
      } finally {
        this.isFlushing = false;
        this.flushPromise = null;
      }
    })();

    return this.flushPromise;
  }
}

export const recordingCaptureService = new RecordingCaptureService();
