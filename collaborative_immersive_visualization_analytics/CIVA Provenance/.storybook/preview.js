// Import global styles
import "../src/ui/react/styles/global.scss";
import React from "react";
import { AdaptiveProvider } from "../src/ui/react/context/AdaptiveContext";
import { MockDataProvider } from "../src/ui/react/__mocks__/MockDataProvider";

// Mock window.CIA for Storybook (prevents "DatasetManager not initialized" errors)
if (typeof window !== "undefined" && !window.CIA) {
  window.CIA = {
    datasetManager: {
      getAllDatasets: () => [],
      getDataset: () => null,
      on: () => ({ off: () => {} }),
      off: () => {},
      emit: () => {},
    },
    annotationManager: {
      getAnnotationsForDataset: () => [],
      on: () => ({ off: () => {} }),
      off: () => {},
    },
    instanceManager: {
      getAllInstances: () => [],
      on: () => ({ off: () => {} }),
      off: () => {},
    },
  };
}

// Initialize session manager for Storybook (prevents "Session not initialized" errors)
try {
  const { sessionManager } = require("../src/core/session/sessionManager.js");
  if (sessionManager && !sessionManager.roomId) {
    sessionManager.roomId = "storybook-demo";
    sessionManager.roomName = "Storybook Demo";
    sessionManager.userId = "storybook-user";
  }
} catch (e) {
  console.warn("Could not initialize sessionManager for Storybook:", e);
}

/** @type { import('@storybook/react-webpack5').Preview } */
const preview = {
  globalTypes: {
    adaptiveMode: {
      name: "Adaptive Mode",
      description: "Adaptive mode for VR/desktop sizing",
      defaultValue: "desktop",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "desktop", title: "Desktop" },
          { value: "vr", title: "VR" },
        ],
        dynamicTitle: true,
      },
    },
    adaptiveDensity: {
      name: "Density",
      description: "Adaptive density",
      defaultValue: "comfortable",
      toolbar: {
        icon: "switchalt",
        items: [
          { value: "comfortable", title: "Comfortable" },
          { value: "compact", title: "Compact" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#000000" },
        { name: "glass", value: "rgba(10, 10, 20, 0.95)" },
        { name: "light", value: "#ffffff" },
      ],
    },
    layout: "centered",
  },
  decorators: [
    (Story, context) => (
      <AdaptiveProvider
        key={`${context.globals.adaptiveMode}-${context.globals.adaptiveDensity}`}
        initialMode={context.globals.adaptiveMode}
        initialDensity={context.globals.adaptiveDensity}
        autoSyncVR={false}
      >
        <MockDataProvider workspaceId="storybook-ws">
          <Story />
        </MockDataProvider>
      </AdaptiveProvider>
    ),
  ],
};

export default preview;
