// src/services/ThumbnailCaptureService.js
// Client-side service for capturing visual thumbnails of views
//
// Captures SVG or raster thumbnails from visualization containers
// for use in progressive loading, bookmarks, and snapshot previews.

import { thumbnails as log } from "@Utils/logger.js";

/**
 * Maximum dimensions for thumbnails
 */
const MAX_THUMBNAIL_WIDTH = 400;
const MAX_THUMBNAIL_HEIGHT = 300;

/**
 * Maximum size for inline storage (64KB base64)
 */
const MAX_INLINE_SIZE = 64 * 1024;

/**
 * ThumbnailCaptureService - Captures visual thumbnails from view containers
 *
 * Supports two capture modes:
 * 1. SVG capture - For vector-based visualizations (charts, graphs)
 * 2. Raster capture - For complex visualizations (3D, canvas-based)
 */
class ThumbnailCaptureService {
  constructor() {
    this.maxWidth = MAX_THUMBNAIL_WIDTH;
    this.maxHeight = MAX_THUMBNAIL_HEIGHT;
  }

  /**
   * Capture a thumbnail from a container element
   * Automatically detects the best capture method
   *
   * @param {HTMLElement} containerElement - The container to capture
   * @param {Object} options - Capture options
   * @param {string} options.preferFormat - Preferred format: 'svg', 'webp', 'png'
   * @param {number} options.quality - Quality for raster formats (0-1)
   * @returns {Promise<ThumbnailData|null>}
   */
  async capture(containerElement, options = {}) {
    if (!containerElement) {
      log.warn("Cannot capture thumbnail: no container element");
      return null;
    }

    const { preferFormat = "auto", quality = 0.7 } = options;

    try {
      // Check if container has SVG content
      const svgElement = containerElement.querySelector("svg");

      if (preferFormat === "svg" || (preferFormat === "auto" && svgElement)) {
        const result = await this.captureSVG(containerElement);
        if (result) return result;
      }

      // Fall back to raster capture
      return await this.captureRaster(containerElement, {
        format: preferFormat === "auto" ? "webp" : preferFormat,
        quality,
      });
    } catch (err) {
      log.error("Failed to capture thumbnail:", err);
      return null;
    }
  }

  /**
   * Capture SVG thumbnail from visualization
   * Works great for D3/chart visualizations
   *
   * @param {HTMLElement} containerElement
   * @returns {Promise<ThumbnailData|null>}
   */
  async captureSVG(containerElement) {
    const svgElement = containerElement.querySelector("svg");
    if (!svgElement) {
      log.debug("No SVG element found in container");
      return null;
    }

    try {
      // Clone the SVG to avoid modifying the original
      const clone = svgElement.cloneNode(true);

      // Simplify the SVG for smaller file size
      this.simplifySVG(clone);

      // Ensure viewBox is set for proper scaling
      if (!clone.getAttribute("viewBox")) {
        const bbox = svgElement.getBBox?.() || {
          x: 0,
          y: 0,
          width: svgElement.clientWidth || this.maxWidth,
          height: svgElement.clientHeight || this.maxHeight,
        };
        clone.setAttribute(
          "viewBox",
          `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
        );
      }

      // Set dimensions for the thumbnail
      clone.setAttribute("width", this.maxWidth);
      clone.setAttribute("height", this.maxHeight);
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");

      // Serialize to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const base64Data = btoa(unescape(encodeURIComponent(svgString)));

      // Get original dimensions
      const viewBox =
        clone.getAttribute("viewBox")?.split(" ").map(Number) || [];
      const width = viewBox[2] || svgElement.clientWidth || this.maxWidth;
      const height = viewBox[3] || svgElement.clientHeight || this.maxHeight;

      return {
        format: "svg",
        data: base64Data,
        width: Math.round(width),
        height: Math.round(height),
        fileSize: base64Data.length,
        isInline: base64Data.length < MAX_INLINE_SIZE,
      };
    } catch (err) {
      log.error("SVG capture failed:", err);
      return null;
    }
  }

  /**
   * Capture raster thumbnail using html2canvas or canvas API
   *
   * @param {HTMLElement} containerElement
   * @param {Object} options
   * @returns {Promise<ThumbnailData|null>}
   */
  async captureRaster(containerElement, options = {}) {
    const { format = "webp", quality = 0.7 } = options;

    try {
      // Check for existing canvas element (e.g., WebGL)
      const existingCanvas = containerElement.querySelector("canvas");

      let canvas;
      if (existingCanvas) {
        // Use existing canvas directly
        canvas = this.resizeCanvas(existingCanvas);
      } else {
        // Use html2canvas if available, otherwise create simple snapshot
        canvas = await this.captureWithHtml2Canvas(containerElement);
      }

      if (!canvas) {
        log.warn("Could not create canvas for raster capture");
        return null;
      }

      // Convert to data URL
      const mimeType =
        format === "webp"
          ? "image/webp"
          : format === "png"
          ? "image/png"
          : "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const base64Data = dataUrl.split(",")[1];

      return {
        format,
        data: base64Data,
        width: canvas.width,
        height: canvas.height,
        fileSize: base64Data.length,
        isInline: base64Data.length < MAX_INLINE_SIZE,
      };
    } catch (err) {
      log.error("Raster capture failed:", err);
      return null;
    }
  }

  /**
   * Capture using html2canvas library (if available)
   *
   * @param {HTMLElement} element
   * @returns {Promise<HTMLCanvasElement|null>}
   */
  async captureWithHtml2Canvas(element) {
    // Check if html2canvas is available
    if (typeof window !== "undefined" && window.html2canvas) {
      try {
        return await window.html2canvas(element, {
          width: this.maxWidth,
          height: this.maxHeight,
          scale: 0.5, // Lower resolution for thumbnails
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
      } catch (err) {
        log.warn("html2canvas failed, falling back:", err);
      }
    }

    // Fallback: create a simple colored placeholder
    return this.createPlaceholderCanvas(element);
  }

  /**
   * Create a placeholder canvas when real capture isn't possible
   *
   * @param {HTMLElement} element
   * @returns {HTMLCanvasElement}
   */
  createPlaceholderCanvas(element) {
    const canvas = document.createElement("canvas");
    canvas.width = this.maxWidth;
    canvas.height = this.maxHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Get background color from element or use default
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor || "#2a2a2a";

    // Fill with background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add a subtle pattern to indicate it's a placeholder
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width + canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(0, i);
      ctx.stroke();
    }

    return canvas;
  }

  /**
   * Resize an existing canvas to thumbnail dimensions
   *
   * @param {HTMLCanvasElement} sourceCanvas
   * @returns {HTMLCanvasElement}
   */
  resizeCanvas(sourceCanvas) {
    const canvas = document.createElement("canvas");

    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = sourceCanvas.width / sourceCanvas.height;
    let width = this.maxWidth;
    let height = this.maxHeight;

    if (aspectRatio > this.maxWidth / this.maxHeight) {
      height = Math.round(width / aspectRatio);
    } else {
      width = Math.round(height * aspectRatio);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }

    return canvas;
  }

  /**
   * Simplify SVG for smaller thumbnail file size
   *
   * @param {SVGElement} svg
   */
  simplifySVG(svg) {
    // Remove event handlers and interactive elements
    const interactiveAttrs = [
      "onclick",
      "onmouseover",
      "onmouseout",
      "onmousedown",
      "onmouseup",
    ];
    svg.querySelectorAll("*").forEach((el) => {
      interactiveAttrs.forEach((attr) => el.removeAttribute(attr));
    });

    // Remove hidden elements
    svg
      .querySelectorAll(
        '[visibility="hidden"], [display="none"], [opacity="0"]'
      )
      .forEach((el) => el.remove());

    // Remove scripts and styles (if any)
    svg.querySelectorAll("script, style").forEach((el) => el.remove());

    // Simplify paths with many points
    svg.querySelectorAll("path").forEach((path) => {
      const d = path.getAttribute("d");
      if (d && d.length > 2000) {
        // For very long paths, attempt to simplify
        path.setAttribute("d", this.simplifyPathData(d));
      }
    });

    // Remove data attributes (often used for tooltips)
    svg.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes)
        .filter((attr) => attr.name.startsWith("data-"))
        .forEach((attr) => el.removeAttribute(attr.name));
    });

    // Remove IDs and classes (not needed for thumbnails)
    svg.querySelectorAll("[id], [class]").forEach((el) => {
      // Keep IDs that might be referenced by gradients/filters
      const id = el.getAttribute("id");
      if (
        id &&
        !svg.querySelector(`[href="#${id}"], [xlink\\:href="#${id}"]`)
      ) {
        el.removeAttribute("id");
      }
      el.removeAttribute("class");
    });
  }

  /**
   * Simplify SVG path data by reducing precision and removing redundant points
   *
   * @param {string} pathData
   * @returns {string}
   */
  simplifyPathData(pathData) {
    // Reduce coordinate precision to 1 decimal place
    return pathData.replace(
      /(\d+)\.(\d{2,})/g,
      (match, int, dec) => `${int}.${dec.charAt(0)}`
    );
  }

  /**
   * Create a data URL from thumbnail data
   *
   * @param {ThumbnailData} thumbnail
   * @returns {string}
   */
  toDataUrl(thumbnail) {
    const mimeType =
      thumbnail.format === "svg"
        ? "image/svg+xml"
        : `image/${thumbnail.format}`;
    return `data:${mimeType};base64,${thumbnail.data}`;
  }
}

/**
 * @typedef {Object} ThumbnailData
 * @property {string} format - 'svg', 'webp', 'png', or 'jpeg'
 * @property {string} data - Base64 encoded thumbnail data
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {number} fileSize - Size in bytes
 * @property {boolean} isInline - Whether small enough for inline storage
 */

// Export singleton instance
export const thumbnailCaptureService = new ThumbnailCaptureService();

// Export class for testing/custom instances
export { ThumbnailCaptureService };
