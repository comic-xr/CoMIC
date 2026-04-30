/**
 * Type definitions for renderer module
 */

export interface RendererConfig {
  /** Container element for the VTK render window (VTK will create and append a canvas). */
  container: HTMLElement;
  /** Background color as [r, g, b] in 0–1. Default [0, 0, 0]. */
  background?: [number, number, number];
  /** Resize when window resizes. Default true. */
  listenWindowResize?: boolean;
}

export interface SceneConfig {
  background?: number;
  fog?: boolean;
  fogColor?: number;
  fogNear?: number;
  fogFar?: number;
}

export interface CameraConfig {
  type: 'perspective' | 'orthographic';
  fov?: number;
  near?: number;
  far?: number;
}
