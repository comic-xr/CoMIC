/**
 * Core Renderer Module
 *
 * Responsible for:
 * - Three.js scene initialization and management
 * - WebGL rendering pipeline
 * - Camera management and frustum control
 * - Lighting setup and management
 * - Mesh creation and geometry handling
 * - Material definitions and shaders
 * - Animation loop management
 * - Post-processing effects (if any)
 *
 * API Contract:
 * - RendererManager: Initialize and manage renderer instance
 * - SceneManager: Create and manage 3D scene
 * - CameraManager: Handle camera state and transformations
 * - LightingManager: Setup and control lights
 * - MeshFactory: Create geometric objects
 * - MaterialFactory: Define reusable materials
 *
 * DO NOT:
 * - Handle user input (belongs in interaction/)
 * - Manage application state (belongs in state/)
 * - Load data (belongs in data/)
 * - Track metrics (belongs in metrics/)
 */

// Export public API
export type { RendererConfig, SceneConfig, CameraConfig } from './types';
export type { VolumePreset } from './scene-manager';
export { RendererManager } from './renderer-manager';
export { SceneManager } from './scene-manager';
export { validateVolumeData } from './rendering-validation';
export type { ValidationResult } from './rendering-validation';
