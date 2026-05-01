// TensorFlow.js for PCA operations
import * as tf from "@tensorflow/tfjs";

import { MEMORY_THRESHOLDS } from "@Core/config/constants.js";
import {
  logProgress,
  logSuccess,
  logError,
  logInfo,
  logWarning,
} from "@Utils/logger.js";

// ----------------------------------------------------------------------------
// TensorFlow.js Configuration and Memory Management
// ----------------------------------------------------------------------------

export async function initializeTensorFlow() {
  try {
    logProgress("Initializing TensorFlow.js...");

    // Wait for TensorFlow.js to be ready
    await tf.ready();

    // Get backend info
    const backend = tf.getBackend();
    logSuccess(`TensorFlow.js ready with backend: ${backend}`);

    // Only set flags that actually exist and are valid
    if (backend === "webgl") {
      try {
        // These are verified working flags for WebGL backend
        tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0);
        tf.env().set("WEBGL_FLUSH_THRESHOLD", 1);
        logInfo("WebGL optimizations applied");
      } catch (flagError) {
        logWarning(`Some WebGL flags could not be set: ${flagError.message}`);
      }
    }

    return true;
  } catch (error) {
    logError(`TensorFlow.js initialization failed: ${error.message}`);
    return false;
  }
}

export function logMemoryUsage(context = "") {
  try {
    const tfMemory = tf.memory();
    const jsMemory = performance.memory;

    logProgress(`Memory ${context}:`);
    logProgress(
      `  TF.js: ${tfMemory.numTensors} tensors, ${(
        tfMemory.numBytes /
        1024 /
        1024
      ).toFixed(2)}MB`
    );

    if (jsMemory) {
      const usedMB = Math.round(jsMemory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(jsMemory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(jsMemory.jsHeapSizeLimit / 1024 / 1024);
      logProgress(
        `  JS Heap: ${usedMB}MB used / ${totalMB}MB allocated (limit: ${limitMB}MB)`
      );

      if (usedMB / limitMB > MEMORY_THRESHOLDS.HIGH_MEMORY_WARNING) {
        logWarning(
          `High memory usage: ${((usedMB / limitMB) * 100).toFixed(
            1
          )}% of limit`
        );
      }
    }

    if (tfMemory.numTensors > MEMORY_THRESHOLDS.HIGH_TENSOR_COUNT) {
      logWarning(`High tensor count: ${tfMemory.numTensors} tensors active`);
    }
  } catch (error) {
    logWarning(`Could not get memory info: ${error.message}`);
  }
}

export function cleanupTensors() {
  try {
    // Force TensorFlow.js cleanup
    const beforeMemory = tf.memory();
    tf.dispose();
    const afterMemory = tf.memory();

    const tensorDiff = beforeMemory.numTensors - afterMemory.numTensors;
    const memoryDiff =
      (beforeMemory.numBytes - afterMemory.numBytes) / 1024 / 1024;

    if (tensorDiff > 0) {
      logSuccess(
        `Cleanup freed ${tensorDiff} tensors and ${memoryDiff.toFixed(2)}MB`
      );
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      logProgress("JavaScript garbage collection triggered");
    }
  } catch (error) {
    logWarning(`Cleanup error: ${error.message}`);
  }
}
