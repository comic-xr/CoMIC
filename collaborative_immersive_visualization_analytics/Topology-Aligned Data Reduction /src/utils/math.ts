/**
 * Mathematical utilities (vectors, matrices, calculations)
 */

export function vector3(x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x, y, z };
}

export function quaternion(
  x: number,
  y: number,
  z: number,
  w: number
): { x: number; y: number; z: number; w: number } {
  return { x, y, z, w };
}

/**
 * Linear interpolation between two values
 */
export function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Distance between two 3D points
 */
export function distance(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
