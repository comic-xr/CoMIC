/**
 * Renderer Manager
 * Initializes and manages the VTK.js render window, renderer, and render loop.
 * Builds the pipeline manually so container and size are set before the first render
 * (avoids "renNode is undefined" in ForwardPass when using GenericRenderWindow with delayed container).
 */

import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';
// Register full volume rendering stack (view nodes + mappers used by the forward pass).
import '@kitware/vtk.js/Rendering/OpenGL/Profiles/Volume';
import '@kitware/vtk.js/Rendering/OpenGL/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/OpenGL/Renderer';
import '@kitware/vtk.js/Rendering/OpenGL/Camera';
import '@kitware/vtk.js/Rendering/OpenGL/Volume';
import '@kitware/vtk.js/Rendering/OpenGL/VolumeMapper';
import type { RendererConfig } from './types';

export class RendererManager {
  private renderWindow: ReturnType<typeof vtkRenderWindow.newInstance> | null = null;
  private openGLRenderWindow: ReturnType<typeof vtkOpenGLRenderWindow.newInstance> | null = null;
  private interactor: ReturnType<typeof vtkRenderWindowInteractor.newInstance> | null = null;
  private animationId: number | null = null;
  private frameDeltaHook: ((deltaMs: number) => void) | null = null;
  private lastFrameTimeMs: number | null = null;
  private config: RendererConfig;

  constructor(config: RendererConfig) {
    this.config = {
      background: [0, 0, 0],
      listenWindowResize: true,
      ...config,
    };
  }

  /**
   * Initialize the VTK render window and attach it to the container.
   * Call after the container is in the DOM.
   * Runs after one animation frame so the container has non-zero size (avoids renNode undefined).
   * When done, calls onReady() so you can call getRenderer(), startRenderLoop(), etc.
   */
  init(onReady?: () => void): void {
    if (this.renderWindow != null) {
      onReady?.();
      return;
    }

    const container = this.config.container;
    const doInit = (): void => {
      if (this.renderWindow != null) {
        onReady?.();
        return;
      }
      const dims = container.getBoundingClientRect();
      if (dims.width < 1 || dims.height < 1) {
        requestAnimationFrame(doInit);
        return;
      }

      const renderWindow = vtkRenderWindow.newInstance();
      const renderer = vtkRenderer.newInstance();
      renderWindow.addRenderer(renderer);

      const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
      renderWindow.addView(openGLRenderWindow);

      openGLRenderWindow.setContainer(container);
      this.updateSize(openGLRenderWindow);

      // Defer first render and interactor to the next frame so the canvas is in the DOM
      // and the OpenGL view node hierarchy can be built (avoids renNode undefined).
      requestAnimationFrame(() => {
        if (this.renderWindow != null) {
          onReady?.();
          return;
        }
        renderWindow.render();

        // VTK Interactor — mouse drag rotates/pans/zooms the camera (TrackballCamera style).
        const interactor = vtkRenderWindowInteractor.newInstance();
        interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
        interactor.setView(openGLRenderWindow);
        interactor.bindEvents(container);
        interactor.initialize();

        if (this.config.background != null) {
          renderer.setBackground(...this.config.background);
        }

        if (this.config.listenWindowResize ?? true) {
          window.addEventListener('resize', this.handleResize);
        }

        this.renderWindow = renderWindow;
        this.openGLRenderWindow = openGLRenderWindow;
        this.interactor = interactor;

        onReady?.();
      });
    };

    requestAnimationFrame(doInit);
  }

  private updateSize(
    openGLRenderWindow: ReturnType<typeof vtkOpenGLRenderWindow.newInstance>
  ): void {
    const container = this.config.container;
    if (container == null) return;
    const dims = container.getBoundingClientRect();
    const devicePixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
    let w = Math.floor(dims.width * devicePixelRatio);
    let h = Math.floor(dims.height * devicePixelRatio);
    if (w < 1) w = 1;
    if (h < 1) h = 1;
    openGLRenderWindow.setSize(w, h);
  }

  private handleResize = (): void => {
    if (this.openGLRenderWindow != null) {
      this.updateSize(this.openGLRenderWindow);
      this.renderWindow?.render();
    }
  };

  /** Get the VTK render window. */
  getRenderWindow(): ReturnType<typeof vtkRenderWindow.newInstance> {
    if (this.renderWindow == null) {
      throw new Error('RendererManager not initialized; call init() first.');
    }
    return this.renderWindow;
  }

  /**
   * Get the OpenGL render window (for WebXR layer only). No XR logic in renderer.
   * Returns null if not initialized.
   */
  getOpenGLRenderWindow(): ReturnType<typeof vtkOpenGLRenderWindow.newInstance> | null {
    return this.openGLRenderWindow;
  }

  /** Get the VTK renderer. */
  getRenderer(): ReturnType<typeof vtkRenderer.newInstance> {
    if (this.renderWindow == null) {
      throw new Error('RendererManager not initialized; call init() first.');
    }
    return this.renderWindow.getRenderers()[0];
  }

  /** Optional callback with milliseconds since the previous frame (for FPS metrics). */
  setFrameDeltaHook(cb: ((deltaMs: number) => void) | null): void {
    this.frameDeltaHook = cb;
    this.lastFrameTimeMs = null;
  }

  /** Single render. */
  render(): void {
    if (this.renderWindow == null) return;
    this.renderWindow.render();
  }

  /**
   * Start the render loop (requestAnimationFrame → render).
   * Call stopRenderLoop() to cancel.
   */
  startRenderLoop(): void {
    if (this.renderWindow == null) return;
    const loop = (): void => {
      const now = performance.now();
      if (this.lastFrameTimeMs != null && this.frameDeltaHook != null) {
        this.frameDeltaHook(now - this.lastFrameTimeMs);
      }
      this.lastFrameTimeMs = now;
      this.animationId = requestAnimationFrame(loop);
      this.renderWindow!.render();
    };
    loop();
  }

  /** Stop the render loop. */
  stopRenderLoop(): void {
    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.lastFrameTimeMs = null;
  }

  /** Resize the render window to match the container. */
  resize(): void {
    if (this.openGLRenderWindow != null) {
      this.updateSize(this.openGLRenderWindow);
      this.renderWindow?.render();
    }
  }

  /** Release resources and remove the canvas from the container. */
  dispose(): void {
    this.stopRenderLoop();
    if (this.config.listenWindowResize ?? true) {
      window.removeEventListener('resize', this.handleResize);
    }
    if (this.interactor != null) {
      this.interactor.unbindEvents();
    }
    if (this.openGLRenderWindow != null) {
      this.openGLRenderWindow.delete();
      this.openGLRenderWindow = null;
    }
    this.renderWindow = null;
    this.interactor = null;
  }
}
