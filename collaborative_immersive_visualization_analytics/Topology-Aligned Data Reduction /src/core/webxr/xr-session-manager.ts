/**
 * XR Session Manager: WebXR session lifecycle using VTK's helper.
 * Isolated from renderer logic — receives the OpenGL render window from outside (e.g. App).
 * Head-tracked navigation and controller rays are handled by the helper; no teleport.
 */

import vtkWebXRRenderWindowHelper from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper';
import Constants from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants';
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';

const XrSessionTypes = Constants.XrSessionTypes;

/** VTK OpenGL render window — provided by RendererManager, no XR code in renderer. */
export type XROpenGLRenderWindow = ReturnType<typeof vtkOpenGLRenderWindow.newInstance>;

export type XRSessionState = 'none' | 'requesting' | 'running' | 'ending';

export interface XRSessionManagerConfig {
  /** Enable controller ray visualization (no teleport). */
  controllerRays?: boolean;
  /** Session type: 0 = HmdVR, 3 = HmdAR. */
  sessionType?: number;
}

/**
 * Manages WebXR session via VTK's RenderWindowHelper.
 * Call setRenderWindow(openGLRenderWindow) after the renderer is ready, then startSession() on user gesture.
 */
export class XRSessionManager {
  private helper: ReturnType<typeof vtkWebXRRenderWindowHelper.newInstance> | null = null;
  private openGLRenderWindow: XROpenGLRenderWindow | null = null;
  private state: XRSessionState = 'none';
  private config: Required<XRSessionManagerConfig>;

  constructor(config: XRSessionManagerConfig = {}) {
    this.config = {
      controllerRays: config.controllerRays ?? true,
      sessionType: config.sessionType ?? XrSessionTypes.HmdVR,
    };
  }

  /**
   * Set the VTK OpenGL render window to use for XR. Call once after the renderer is initialized.
   * Isolated: renderer exposes the window; this module does not touch renderer logic.
   */
  setRenderWindow(openGLRenderWindow: XROpenGLRenderWindow | null): void {
    this.openGLRenderWindow = openGLRenderWindow;
    if (this.helper != null && openGLRenderWindow != null) {
      this.helper.setRenderWindow(openGLRenderWindow);
    } else if (openGLRenderWindow == null && this.helper != null) {
      this.helper.setRenderWindow(null);
    }
  }

  /** Current session state. */
  getState(): XRSessionState {
    return this.state;
  }

  /** Whether an XR session is currently running. */
  isSessionActive(): boolean {
    return this.state === 'running' && this.helper?.getXrSession() != null;
  }

  /** Get the active XR session (for input/raycasting). Null when not in XR. */
  getSession(): XRSession | null {
    return this.helper?.getXrSession() ?? null;
  }

  /**
   * Request and start an immersive-vr session. Call from a user gesture.
   * Graceful fallback: on failure or unsupported, leaves desktop mode; never throws to caller.
   */
  async startSession(): Promise<{ started: boolean; error?: string }> {
    if (this.openGLRenderWindow == null) {
      return { started: false, error: 'Render window not set' };
    }
    if (this.state === 'running' || this.state === 'requesting') {
      return { started: this.state === 'running' };
    }
    if (typeof navigator === 'undefined' || !('xr' in navigator)) {
      return { started: false, error: 'WebXR not available' };
    }

    try {
      if (this.helper == null) {
        this.helper = vtkWebXRRenderWindowHelper.newInstance({
          initialized: false,
          renderWindow: this.openGLRenderWindow,
          xrSessionType: this.config.sessionType,
        });
        const helperWithRays = this.helper as ReturnType<
          typeof vtkWebXRRenderWindowHelper.newInstance
        > & { setDrawControllersRay?(v: boolean): void };
        if (typeof helperWithRays.setDrawControllersRay === 'function') {
          helperWithRays.setDrawControllersRay(this.config.controllerRays);
        }
      } else {
        this.helper.setRenderWindow(this.openGLRenderWindow);
      }

      this.state = 'requesting';
      return new Promise((resolve) => {
        const sessionType = this.config.sessionType;
        try {
          (this.helper as ReturnType<typeof vtkWebXRRenderWindowHelper.newInstance>).startXR(
            sessionType
          );
        } catch (e) {
          this.state = 'none';
          resolve({
            started: false,
            error: e instanceof Error ? e.message : String(e),
          });
          return;
        }
        // VTK helper calls enterXR when session is granted; we have no direct callback.
        // Poll for session start (helper enters XR asynchronously).
        const check = (): void => {
          const session = this.helper?.getXrSession();
          if (session != null) {
            this.state = 'running';
            resolve({ started: true });
            return;
          }
          if (this.state === 'ending' || this.state === 'none') {
            resolve({ started: false, error: 'Session denied or ended' });
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
        // Timeout fallback if session never starts (e.g. user denies)
        setTimeout(() => {
          if (this.state === 'requesting') {
            this.state = 'none';
            resolve({ started: false, error: 'Session request timed out or denied' });
          }
        }, 10000);
      });
    } catch (e) {
      this.state = 'none';
      return {
        started: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /**
   * End the XR session and return to desktop mode. No teleport; camera state is restored by VTK.
   */
  async endSession(): Promise<void> {
    if (this.helper == null || !this.helper.getXrSession()) {
      this.state = 'none';
      return;
    }
    this.state = 'ending';
    try {
      await (this.helper as ReturnType<typeof vtkWebXRRenderWindowHelper.newInstance>).stopXR();
    } finally {
      this.state = 'none';
    }
  }
}
