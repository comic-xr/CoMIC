/**
 * XR Input Manager: exposes XR session for controller/ray use. No renderer or data logic.
 * Controller raycasting is handled by VTK's helper (drawControllersRay); this module
 * exposes the session so the app can query input sources when needed. No teleport.
 */

export type XRControllerRay = {
  origin: [number, number, number];
  direction: [number, number, number];
  handedness: 'left' | 'right' | 'none';
};

/**
 * Provides access to the current XR session for input (e.g. controller ray).
 * Session is set by the app from XRSessionManager.getSession() when in XR.
 */
export class XRInputManager {
  private session: XRSession | null = null;

  /** Set the active XR session (call when entering/leaving XR). Isolated from data/renderer. */
  setSession(session: XRSession | null): void {
    this.session = session;
  }

  /** Get the current XR session; null when in desktop mode. */
  getSession(): XRSession | null {
    return this.session;
  }

  /**
   * Get controller ray from the current frame. Must be called from within an XR animation frame
   * callback (e.g. when VTK helper runs). For app use, prefer relying on VTK's drawn controller rays.
   */
  getControllerRayFromFrame(
    frame: XRFrame,
    referenceSpace: XRReferenceSpace,
    handedness: 'left' | 'right' | 'none'
  ): XRControllerRay | null {
    const sources = Array.from(frame.session.inputSources);
    const source = sources.find(
      (s: XRInputSource) => s.handedness === handedness && s.targetRaySpace != null
    );
    if (source?.targetRaySpace == null) return null;
    const pose = frame.getPose(source.targetRaySpace, referenceSpace);
    if (pose == null) return null;
    const o = pose.transform.position;
    const d = pose.transform.orientation;
    const dir = this.quaternionToDirection(d.x, d.y, d.z, d.w);
    return {
      origin: [o.x, o.y, o.z],
      direction: dir,
      handedness: source.handedness ?? 'none',
    };
  }

  /** WebXR target ray is -Z in ray space; rotate (0,0,-1) by the orientation quaternion. */
  private quaternionToDirection(
    x: number,
    y: number,
    z: number,
    w: number
  ): [number, number, number] {
    const dx = 2 * (x * z - w * y);
    const dy = 2 * (y * z + w * x);
    const dz = -1 + 2 * (x * x + y * y);
    const len = Math.hypot(dx, dy, dz) || 1;
    return [dx / len, dy / len, dz / len];
  }
}
