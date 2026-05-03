import React from "react";
import { createRoot } from "react-dom/client";

import { ui as log } from "@Utils/logger.js";
import { CIAWebApp } from "@UI/react/CIAWebApp.jsx";

// Store the root instance to prevent multiple createRoot calls
let reactRoot = null;

export function mountReactUI(roomName = "default-analytics-room") {
  log.debug("Mounting React UI...");

  let rootElement = document.getElementById("react-root");

  if (!rootElement) {
    log.debug("Creating react-root element");
    rootElement = document.createElement("div");
    rootElement.id = "react-root";
    document.body.appendChild(rootElement);
  }

  // If root already exists, just update it
  if (reactRoot) {
    log.debug("Updating existing React root");
    reactRoot.render(<CIAWebApp roomName={roomName} />);
  } else {
    log.debug("Creating new React root");
    reactRoot = createRoot(rootElement);
    reactRoot.render(<CIAWebApp roomName={roomName} />);
  }

  log.info("React UI mounted successfully");
}

// Optional: Export function to unmount React (for cleanup if needed)
export function unmountReactUI() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;

    const rootElement = document.getElementById("react-root");
    if (rootElement) {
      rootElement.remove();
    }

    log.info("React UI unmounted");
  }
}
