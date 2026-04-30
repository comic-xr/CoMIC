/**
 * WebXR feature detection. No session creation; graceful fallback when unsupported.
 * Isolated from renderer and data — used only by the WebXR layer.
 */

export interface XRSupportResult {
  /** navigator.xr is available */
  available: boolean;
  /** immersive-vr sessions are supported */
  immersiveVr: boolean;
  /** immersive-ar sessions are supported (optional) */
  immersiveAr: boolean;
}

/** Check if WebXR is available (navigator.xr exists). */
export function isWebXRAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'xr' in navigator;
}

/**
 * Check support for immersive-vr and optionally immersive-ar.
 * Resolves to a result object; never throws — returns supported: false if unavailable.
 */
export async function checkXRSupport(): Promise<XRSupportResult> {
  const available = isWebXRAvailable();
  if (!available) {
    return { available: false, immersiveVr: false, immersiveAr: false };
  }
  const xr = (
    navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }
  ).xr;
  if (!xr) {
    return { available: false, immersiveVr: false, immersiveAr: false };
  }
  try {
    const [immersiveVr, immersiveAr] = await Promise.all([
      xr.isSessionSupported('immersive-vr'),
      xr.isSessionSupported('immersive-ar').catch(() => false),
    ]);
    return { available: true, immersiveVr, immersiveAr };
  } catch {
    return { available: true, immersiveVr: false, immersiveAr: false };
  }
}

/**
 * Check if we can offer "Enter VR" (immersive-vr supported).
 * Use this for showing/hiding the VR button; graceful fallback to desktop when false.
 */
export async function supportsImmersiveVR(): Promise<boolean> {
  const result = await checkXRSupport();
  return result.immersiveVr;
}
