/**
 * Vision Root Module
 * Orchestrates the optical feed and the AI tracking overlays.
 */

import { initCamera, setVisionMode } from './camera.js';
import { initTracker, currentDetectCount } from './tracker.js';

export function initVision() {
    initCamera();
    initTracker();
}

// Re-export specific methods needed elsewhere
export { setVisionMode, currentDetectCount };
