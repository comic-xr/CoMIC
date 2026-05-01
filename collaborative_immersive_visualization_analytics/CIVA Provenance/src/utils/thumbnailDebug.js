// =============================================================================
// THUMBNAIL DEBUG UTILITIES
// =============================================================================
//
// Use these utilities to debug thumbnail generation failures.
// Run in browser console or add to a debug component.
//
// Common issues:
// 1. Job not queued - server didn't trigger generation
// 2. Worker failed - headless browser error
// 3. Storage failed - MinIO/S3 upload issue
// 4. WebGL context lost - canvas became invalid
// 5. Race condition - view deleted before thumbnail captured
//
// =============================================================================

/**
 * Debug thumbnail status for a view
 * Call from browser console: await window.CIA.debugThumbnail('view-123')
 */
async function debugThumbnail(viewId) {
  console.group(`🔍 Thumbnail Debug: ${viewId}`);

  try {
    // 1. Check if view exists
    const viewManager = window.CIA?.getViewConfigurationManager?.();
    const view = viewManager?.getView?.(viewId);

    if (!view) {
      console.error("❌ View not found in ViewConfigurationManager");
      console.groupEnd();
      return { error: "View not found" };
    }

    console.log("✅ View found:", {
      id: view.id,
      name: view.name,
      datasetId: view.datasetId,
      status: view.status,
      thumbnailUrl: view.thumbnailUrl,
    });

    // 2. Try to fetch thumbnail from server
    const apiBase = window.API_BASE_URL || "http://localhost:3001/api";

    console.log(
      `📡 Fetching thumbnail from: ${apiBase}/views/${viewId}/thumbnail`
    );

    const response = await fetch(`${apiBase}/views/${viewId}/thumbnail`);

    console.log("Response status:", response.status, response.statusText);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (response.status === 404) {
      console.warn("⚠️ Thumbnail not found (404) - may not be generated yet");

      // Check if generation was ever requested
      const statusResponse = await fetch(
        `${apiBase}/views/${viewId}/thumbnail/status`
      ).catch(() => null);
      if (statusResponse?.ok) {
        const status = await statusResponse.json();
        console.log("📊 Generation status:", status);
      }

      console.groupEnd();
      return {
        status: "not-found",
        suggestion: "Trigger regeneration or check worker logs",
      };
    }

    if (response.status === 200) {
      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");

      console.log("✅ Thumbnail exists:", {
        contentType,
        contentLength: `${contentLength} bytes`,
      });

      // Try to display it
      if (contentType?.includes("image")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        console.log("🖼️ Thumbnail URL (copy to browser):", url);

        // Show in console
        console.log(
          "%c ",
          `
                    background: url(${url}) no-repeat center;
                    background-size: contain;
                    padding: 100px;
                `
        );
      }

      console.groupEnd();
      return { status: "ok", contentType, contentLength };
    }

    console.error("❌ Unexpected response:", response.status);
    console.groupEnd();
    return { status: "error", code: response.status };
  } catch (error) {
    console.error("❌ Debug failed:", error);
    console.groupEnd();
    return { error: error.message };
  }
}

/**
 * Request thumbnail regeneration for a view
 */
async function regenerateThumbnail(viewId) {
  console.group(`🔄 Regenerating thumbnail: ${viewId}`);

  const apiBase = window.API_BASE_URL || "http://localhost:3001/api";

  try {
    const response = await fetch(
      `${apiBase}/views/${viewId}/thumbnail/regenerate`,
      {
        method: "POST",
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Regeneration queued:", result);
      console.log("💡 Check worker logs and wait for completion");
    } else {
      console.error(
        "❌ Regeneration failed:",
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }

  console.groupEnd();
}

/**
 * List all views and their thumbnail status
 */
async function listThumbnailStatus() {
  console.group("📋 All Views Thumbnail Status");

  const viewManager = window.CIA?.getViewConfigurationManager?.();
  if (!viewManager?._viewConfigs) {
    console.error("ViewConfigurationManager not available");
    console.groupEnd();
    return;
  }

  const views = Array.from(viewManager._viewConfigs.values());
  console.log(`Found ${views.length} views`);

  const apiBase = window.API_BASE_URL || "http://localhost:3001/api";

  const results = await Promise.all(
    views.map(async (view) => {
      try {
        const response = await fetch(`${apiBase}/views/${view.id}/thumbnail`, {
          method: "HEAD", // Just check existence
        });

        return {
          id: view.id,
          name: view.name,
          status: view.status,
          hasThumbnail: response.status === 200,
          thumbnailStatus: response.status,
        };
      } catch (error) {
        return {
          id: view.id,
          name: view.name,
          hasThumbnail: false,
          error: error.message,
        };
      }
    })
  );

  // Group by status
  const withThumbnail = results.filter((r) => r.hasThumbnail);
  const withoutThumbnail = results.filter((r) => !r.hasThumbnail);

  console.log(`✅ With thumbnail: ${withThumbnail.length}`);
  console.table(withThumbnail);

  console.log(`⚠️ Without thumbnail: ${withoutThumbnail.length}`);
  console.table(withoutThumbnail);

  console.groupEnd();
  return results;
}

/**
 * Check if thumbnail worker is running
 */
async function checkThumbnailWorker() {
  console.group("🔧 Thumbnail Worker Status");

  const apiBase = window.API_BASE_URL || "http://localhost:3001/api";

  try {
    // Try health endpoint
    const healthResponse = await fetch(
      `${apiBase}/health/thumbnail-worker`
    ).catch(() => null);

    if (healthResponse?.ok) {
      const health = await healthResponse.json();
      console.log("Worker health:", health);
    } else {
      console.warn("⚠️ Worker health endpoint not available");
    }

    // Try queue status
    const queueResponse = await fetch(
      `${apiBase}/admin/thumbnail-queue/status`
    ).catch(() => null);

    if (queueResponse?.ok) {
      const queue = await queueResponse.json();
      console.log("Queue status:", queue);
    } else {
      console.log("💡 Queue status endpoint may require admin auth");
    }
  } catch (error) {
    console.error("Check failed:", error);
  }

  console.groupEnd();
}

// =============================================================================
// REGISTER DEBUG UTILITIES
// =============================================================================

if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.debugThumbnail = debugThumbnail;
  window.CIA.regenerateThumbnail = regenerateThumbnail;
  window.CIA.listThumbnailStatus = listThumbnailStatus;
  window.CIA.checkThumbnailWorker = checkThumbnailWorker;

  console.log("🔧 Thumbnail debug utilities loaded:");
  console.log("  - window.CIA.debugThumbnail(viewId)");
  console.log("  - window.CIA.regenerateThumbnail(viewId)");
  console.log("  - window.CIA.listThumbnailStatus()");
  console.log("  - window.CIA.checkThumbnailWorker()");
}

export {
  debugThumbnail,
  regenerateThumbnail,
  listThumbnailStatus,
  checkThumbnailWorker,
};
