// src/index.js
// Foundation layer - handles browser compatibility and Phase 1 initialization
// Then hands control to Bootstrap for gate-keeping and user setup

import React from "react";
import ReactDOM from "react-dom/client";
import { initializePhase0, initializePhase1 } from "@Init/appInitializer.js";
import { app as log } from "@Utils/logger.js";
import { startupLogger, isStartupProfilingEnabled } from "@Utils/startupLogger.js";
import { Bootstrap } from "@UI/react/components/auth/Bootstrap";

// Import global styles
import "@UI/react/styles/global.scss";

/**
 * Check browser compatibility
 * Ensures the user's browser supports all required features
 */
function checkBrowserCompatibility() {
  const required = {
    WebGL: !!document.createElement("canvas").getContext("webgl2"),
    WebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    WebSocket: "WebSocket" in window,
    IndexedDB: "indexedDB" in window,
  };

  const missing = Object.entries(required)
    .filter(([feature, supported]) => !supported)
    .map(([feature]) => feature);

  if (missing.length > 0) {
    log.warn(`Missing browser features: ${missing.join(", ")}`);
    return false;
  }

  return true;
}

/**
 * Show error screen for fatal errors
 */
function showFatalError(message) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #f8f9fa;
      color: #1e293b;
      font-family: system-ui;
      padding: 20px;
    ">
      <h1 style="color: #dc2626;">Fatal Error</h1>
      <p style="max-width: 600px; text-align: center; line-height: 1.5;">
        ${message}
      </p>
      <button 
        onclick="window.location.reload()"
        style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #2563eb;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 16px;
        "
      >
        Reload Page
      </button>
    </div>
  `;
}

/**
 * Main initialization function
 * Runs Phase 1, then hands control to Bootstrap → CIAWebApp
 */
async function initializeApp() {
  log.info("CIA Web - Collaborative Immersive Analytics starting...");

  const startupProfilingEnabled = isStartupProfilingEnabled();
  if (startupProfilingEnabled) {
    startupLogger.begin();
  }
  if (window.updateLoadingStatus) {
    window.updateLoadingStatus("Checking browser compatibility...");
  }

  // Check browser compatibility first
  if (!checkBrowserCompatibility()) {
    showFatalError(
      "Your browser doesn't support all required features. " +
        "Please use a modern browser like Chrome, Firefox, or Edge."
    );
    return;
  }

  try {
    // Run Phase 0: Server Sync Check (detects database resets)
    log.info("Foundation: Checking server sync status...");
    if (window.updateLoadingStatus) {
      window.updateLoadingStatus("Checking server sync status...");
    }
    const phase0Result = await initializePhase0();
    window.__CIA_PHASE0_RESULT = phase0Result;

    if (phase0Result.serverReset) {
      log.warn("Server database was reset - will clear stale local data");
    } else if (phase0Result.offline) {
      log.warn("Server offline - using local data only");
    }

    // Run Phase 1: Core Services (before React)
    // This initializes services that don't depend on user context
    log.info("Foundation: Initializing core services...");
    if (window.updateLoadingStatus) {
      window.updateLoadingStatus("Initializing core services...");
    }
    await initializePhase1();
    log.info("Foundation: Core services ready");

    // Verify critical services are available
    if (!window.CIA || !window.CIA.datasetManager) {
      throw new Error("Phase 1 failed to initialize DatasetManager");
    }

    // Create or find root element
    let rootElement = document.getElementById("react-root");
    if (!rootElement) {
      rootElement = document.createElement("div");
      rootElement.id = "react-root";
      document.body.appendChild(rootElement);
    }

    // Render Bootstrap component
    // Bootstrap will handle:
    // - Authentication (future)
    // - Username collection
    // - Phase 2 initialization
    // - Then render CIAWebApp
    if (window.updateLoadingStatus) {
      window.updateLoadingStatus("Starting UI...");
    }
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <Bootstrap />
      </React.StrictMode>
    );

    log.info("Foundation: React application rendered");
    log.debug("Bootstrap layer will handle user setup and Phase 2");
    log.debug("Type CIA.help() in console for debug commands");
  } catch (error) {
    log.error("Fatal error during core initialization:", error);
    showFatalError(
      `Failed to initialize core services: ${error.message}. ` +
        `Check the console for details and try refreshing the page.`
    );
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Global error handlers for debugging
window.addEventListener("error", (event) => {
  log.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  log.error("Unhandled promise rejection:", event.reason);
});

// Version for debugging
window.CIAWebAppVersion = "2.0.0";
