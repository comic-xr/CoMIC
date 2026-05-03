/**
 * Thumbnail Worker
 *
 * Server-side thumbnail generation using Playwright.
 * Listens to BullMQ queue and renders visualizations in a headless browser.
 *
 * Security: Thumbnails are generated server-side to ensure authenticity.
 * The client cannot inject fake or misleading thumbnails.
 */

const { Worker } = require("bullmq");
const { chromium } = require("playwright");
const { Client: MinioClient } = require("minio");
const sharp = require("sharp");

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    useSSL: process.env.MINIO_SECURE === "true",
    bucket: process.env.MINIO_BUCKET || "cia-files",
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
    apiUrl: process.env.API_URL || "http://localhost:3001",
    // API URL that the browser can use (from host.docker.internal context)
    // This is passed to the embed page as a query parameter
    browserApiUrl:
      process.env.BROWSER_API_URL || "http://host.docker.internal:3001/api",
  },
  thumbnail: {
    width: 400,
    height: 300,
    quality: 80,
    timeout: 30000, // 30 seconds to render
    waitForSelector: '[data-testid="visualization-ready"]',
  },
  queue: {
    name: "thumbnail",
    concurrency: 2, // Process 2 thumbnails at a time
  },
  internalToken: process.env.INTERNAL_API_TOKEN || null,
};

// =============================================================================
// LOGGING
// =============================================================================

const log = {
  info: (msg, ...args) =>
    console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args),
  error: (msg, ...args) =>
    console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args),
  debug: (msg, ...args) =>
    console.log(`[${new Date().toISOString()}] [DEBUG] ${msg}`, ...args),
};

// =============================================================================
// MINIO CLIENT
// =============================================================================

const minioClient = new MinioClient({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

// =============================================================================
// BROWSER MANAGEMENT
// =============================================================================

let browser = null;

async function getBrowser() {
  if (!browser) {
    log.info("Launching headless browser...");
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        // WebGL support in headless mode - DO NOT use --disable-gpu
        // Use SwiftShader for software WebGL rendering
        "--use-gl=swiftshader",
        "--enable-webgl",
        "--enable-webgl2",
        // Ensure WebGL contexts preserve their drawing buffer for screenshots
        "--enable-unsafe-swiftshader",
        // Allow HTTPS pages to fetch from HTTP APIs (mixed content)
        // Required because frontend is HTTPS but API is HTTP in development
        "--allow-running-insecure-content",
      ],
    });
    log.info("Browser launched");
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    log.info("Browser closed");
  }
}

// =============================================================================
// THUMBNAIL CAPTURE
// =============================================================================

/**
 * Capture a thumbnail for a file/view
 *
 * @param {object} job - Job data
 * @param {string} job.fileId - File ID to render
 * @param {string} job.viewId - View configuration ID (optional)
 * @returns {object} - { success, thumbnailKey, format, width, height }
 */
async function captureThumbnail(job) {
  const { fileId, viewId, projectId } = job;

  log.info(`Capturing thumbnail for file=${fileId}, view=${viewId}`);

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: {
      width: config.thumbnail.width * 2, // 2x for retina
      height: config.thumbnail.height * 2,
    },
    deviceScaleFactor: 2,
    // Accept self-signed SSL certificates from webpack dev server
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Capture console logs from the page for debugging
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") {
      log.error(`[PAGE] ${text}`);
    } else if (type === "warn") {
      log.debug(`[PAGE WARN] ${text}`);
    } else {
      log.debug(`[PAGE] ${text}`);
    }
  });

  // Capture page errors
  page.on("pageerror", (err) => {
    log.error(`[PAGE ERROR] ${err.message}`);
  });

  // Capture failed requests for debugging
  page.on("requestfailed", (request) => {
    log.error(
      `[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`
    );
  });

  try {
    // Build URL to the visualization embed page
    // Include handlerType so embed page knows which handler to use
    // The handlerType is server-determined and passed via job data
    const params = new URLSearchParams({
      mode: viewId ? "view" : "file",
      id: viewId || fileId,
      width: config.thumbnail.width.toString(),
      height: config.thumbnail.height.toString(),
    });

    // Add handlerType if provided (server-authoritative)
    if (job.handlerType) {
      params.set("handlerType", job.handlerType);
    }

    // NOTE: Do NOT pass explicit apiUrl - let embed page use relative /api URL
    // The webpack dev server proxies /api requests to the API server
    // This avoids mixed content issues (HTTPS page fetching HTTP API)

    const url = `${config.app.baseUrl}/embed.html?${params.toString()}`;

    log.info(`Navigating to: ${url}`);

    // Navigate and wait for visualization to render
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: config.thumbnail.timeout,
    });

    // Wait for visualization to be ready (custom attribute set by app)
    try {
      await page.waitForSelector(config.thumbnail.waitForSelector, {
        timeout: config.thumbnail.timeout,
      });
    } catch (e) {
      // If selector not found, wait a bit and hope for the best
      log.debug("Visualization ready selector not found, waiting 3s...");
      await page.waitForTimeout(3000);
    }

    // Find the canvas element specifically - we only want the 3D render, not any UI chrome
    const canvas = await page.$("canvas");

    if (!canvas) {
      // DEBUG: Capture what's actually on the page when there's no canvas
      const pageDebugInfo = await page.evaluate(() => {
        return {
          bodyText: document.body?.innerText?.substring(0, 500),
          bodyHTML: document.body?.innerHTML?.substring(0, 1000),
          hasError:
            document.body?.getAttribute("data-testid") ===
            "visualization-error",
          allElements: Array.from(document.querySelectorAll("*"))
            .map((e) => e.tagName)
            .slice(0, 50),
        };
      });
      log.error(
        "Page debug info (no canvas found):",
        JSON.stringify(pageDebugInfo, null, 2)
      );

      // Take a screenshot of the page for debugging
      const debugScreenshot = await page.screenshot({ type: "png" });
      log.error(`Debug screenshot size: ${debugScreenshot.length} bytes`);

      throw new Error(
        `No canvas element found on page. Body text: ${pageDebugInfo.bodyText}`
      );
    }

    // CRITICAL: Synchronize WebGL context before screenshot
    // WebGL rendering is asynchronous - we need to ensure the frame is fully rendered
    // and the framebuffer content is available for reading
    const syncResult = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return { success: false, error: "No canvas found" };

      // Get WebGL context (try WebGL2 first, then WebGL1)
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) return { success: false, error: "No WebGL context" };

      // Force WebGL to finish all pending operations
      // gl.finish() blocks until all previously called commands have completed
      gl.finish();

      // Read a single pixel to force the framebuffer to be fully resolved
      // This is a common trick to ensure the frame is complete
      const pixel = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
      );

      // Check if we got actual content (not just black)
      const hasContent =
        pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0 || pixel[3] > 0;

      return {
        success: true,
        hasContent,
        centerPixel: Array.from(pixel),
        canvasSize: { width: canvas.width, height: canvas.height },
      };
    });

    log.debug(`WebGL sync result:`, syncResult);

    if (!syncResult.success) {
      log.warn(`WebGL sync warning: ${syncResult.error}`);
    }

    if (!syncResult.hasContent) {
      // Canvas is still black - wait longer and try again
      log.warn("Canvas appears black, waiting additional 2s for render...");
      await page.waitForTimeout(2000);

      // Try sync again
      const retryResult = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
        if (gl) {
          gl.finish();
          const pixel = new Uint8Array(4);
          gl.readPixels(
            Math.floor(canvas.width / 2),
            Math.floor(canvas.height / 2),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixel
          );
          return {
            hasContent:
              pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0 || pixel[3] > 0,
            centerPixel: Array.from(pixel),
          };
        }
        return { hasContent: false };
      });

      log.debug(`Retry sync result:`, retryResult);
    }

    // Small additional wait to ensure compositing is complete
    await page.waitForTimeout(100);

    // CRITICAL: Use canvas.toDataURL() instead of Playwright's screenshot
    // Playwright's canvas.screenshot() may not read from WebGL framebuffer correctly
    // canvas.toDataURL() reads directly from the WebGL framebuffer and respects preserveDrawingBuffer
    const captureResult = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) {
        return { success: false, error: "No canvas found" };
      }

      // Get WebGL context and ensure frame is complete
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        gl.finish();
      }

      try {
        // Use toDataURL to capture the WebGL framebuffer directly
        const dataUrl = canvas.toDataURL("image/png");
        return {
          success: true,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    if (!captureResult.success) {
      throw new Error(`Canvas capture failed: ${captureResult.error}`);
    }

    log.info("Captured canvas via toDataURL");

    // Convert data URL to buffer
    const base64Data = captureResult.dataUrl.replace(
      /^data:image\/png;base64,/,
      ""
    );
    const screenshot = Buffer.from(base64Data, "base64");

    log.info("Captured canvas element screenshot");

    // Optimize with sharp
    const optimized = await sharp(screenshot)
      .resize(config.thumbnail.width, config.thumbnail.height)
      .webp({ quality: config.thumbnail.quality })
      .toBuffer();

    // Upload to MinIO
    const storageKey = `thumbnails/${viewId || fileId}/thumbnail.webp`;
    await minioClient.putObject(
      config.minio.bucket,
      storageKey,
      optimized,
      optimized.length,
      { "Content-Type": "image/webp" }
    );

    log.info(`Thumbnail uploaded: ${storageKey}`);

    return {
      success: true,
      storageKey,
      format: "webp",
      width: config.thumbnail.width,
      height: config.thumbnail.height,
      size: optimized.length,
    };
  } catch (error) {
    log.error(`Failed to capture thumbnail: ${error.message}`);
    throw error;
  } finally {
    await context.close();
  }
}

// =============================================================================
// CALLBACK TO API
// =============================================================================

/**
 * Report job completion back to API server
 */
async function reportCompletion(callbackUrl, jobId, jobData, result) {
  try {
    log.debug(`Reporting completion to: ${callbackUrl}`);

    // Determine thumbnail type based on job data
    // If viewId is set, it's a view thumbnail; otherwise it's a file thumbnail
    const thumbnailType = jobData.viewId ? "view" : "file";

    const headers = { "Content-Type": "application/json" };
    if (config.internalToken) {
      headers["x-internal-token"] = config.internalToken;
    }

    const response = await fetch(callbackUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jobId,
        success: result.success,
        storageKey: result.storageKey,
        format: result.format,
        width: result.width,
        height: result.height,
        error: result.error,
        // Include IDs and type for proper handling
        thumbnailType,
        fileId: jobData.fileId,
        viewId: jobData.viewId,
      }),
    });

    if (!response.ok) {
      log.error(`Failed to report completion: ${response.status}`);
    }
  } catch (error) {
    log.error(`Error reporting completion: ${error.message}`);
  }
}

// =============================================================================
// WORKER
// =============================================================================

async function startWorker() {
  log.info("Starting thumbnail worker...");
  log.info(`Redis: ${config.redis.host}:${config.redis.port}`);
  log.info(`App URL: ${config.app.baseUrl}`);
  log.info(`Queue: ${config.queue.name}`);

  const worker = new Worker(
    config.queue.name,
    async (job) => {
      log.info(`Processing job ${job.id}: ${job.name}`);

      try {
        const result = await captureThumbnail(job.data);

        // Report back to API
        if (job.data.callbackUrl) {
          await reportCompletion(
            job.data.callbackUrl,
            job.id,
            job.data,
            result
          );
        }

        return result;
      } catch (error) {
        log.error(`Job ${job.id} failed: ${error.message}`);

        // Report failure
        if (job.data.callbackUrl) {
          await reportCompletion(job.data.callbackUrl, job.id, job.data, {
            success: false,
            error: error.message,
          });
        }

        throw error;
      }
    },
    {
      connection: config.redis,
      concurrency: config.queue.concurrency,
    }
  );

  worker.on("completed", (job, result) => {
    log.info(`Job ${job.id} completed: ${result.storageKey}`);
  });

  worker.on("failed", (job, err) => {
    log.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on("error", (err) => {
    log.error(`Worker error: ${err.message}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    log.info("Received SIGTERM, shutting down...");
    await worker.close();
    await closeBrowser();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    log.info("Received SIGINT, shutting down...");
    await worker.close();
    await closeBrowser();
    process.exit(0);
  });

  log.info("Thumbnail worker started");
}

// Start
startWorker().catch((err) => {
  log.error(`Failed to start worker: ${err.message}`);
  process.exit(1);
});
