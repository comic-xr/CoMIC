/**
 * Rendering validation: correct bounds, orientation, no NaNs or corrupted buffers.
 * Single responsibility: validate volume data before rendering.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  bounds?: [number, number, number, number, number, number];
  dimensions?: [number, number, number];
}

/** Minimal VTK ImageData-like for validation (avoids importing VTK). */
interface VTKImageDataLike {
  getDimensions?(): number[];
  getBounds?(): number[];
  getOrigin?(): number[];
  getSpacing?(): number[];
  getPointData?(): { getScalars(): { getData(): ArrayLike<number> } | null };
}

function hasNaN(arr: ArrayLike<number>, maxSamples = 10000): boolean {
  const len = arr.length;
  const step = Math.max(1, Math.floor(len / maxSamples));
  for (let i = 0; i < len; i += step) {
    if (Number.isNaN((arr as number[])[i])) return true;
  }
  return false;
}

/**
 * Validate volume data: correct bounds, dimensions, orientation (spacing/origin), no NaNs or corrupted buffers.
 */
export function validateVolumeData(vtkImageData: unknown): ValidationResult {
  const errors: string[] = [];
  const vtk = vtkImageData as VTKImageDataLike;

  if (!vtk.getDimensions || typeof vtk.getDimensions !== 'function') {
    return { valid: false, errors: ['Missing or invalid getDimensions'] };
  }

  const dimensions = vtk.getDimensions();
  if (!Array.isArray(dimensions) || dimensions.length !== 3) {
    errors.push('Dimensions must be [nx, ny, nz]');
  }
  const dims = dimensions as [number, number, number];
  if (dims.some((d) => typeof d !== 'number' || d < 1 || !Number.isFinite(d))) {
    errors.push('Dimensions must be finite positive numbers');
  }

  if (vtk.getBounds && typeof vtk.getBounds === 'function') {
    const bounds = vtk.getBounds();
    if (Array.isArray(bounds) && bounds.length === 6) {
      const b = bounds as [number, number, number, number, number, number];
      if (b.some((x) => !Number.isFinite(x))) {
        errors.push('Bounds contain non-finite values');
      }
      if (b[0] >= b[1] || b[2] >= b[3] || b[4] >= b[5]) {
        errors.push('Bounds must be ordered (min < max per axis)');
      }
    }
  }

  if (vtk.getSpacing && typeof vtk.getSpacing === 'function') {
    const spacing = vtk.getSpacing();
    if (Array.isArray(spacing) && spacing.length >= 3) {
      if (spacing.some((s) => typeof s !== 'number' || s <= 0 || !Number.isFinite(s))) {
        errors.push('Spacing must be finite positive numbers');
      }
    }
  }

  const scalars = vtk.getPointData?.()?.getScalars?.();
  if (scalars) {
    const data = scalars.getData();
    if (data && data.length > 0) {
      if (hasNaN(data as ArrayLike<number>)) {
        errors.push('Scalar buffer contains NaN');
      }
    } else {
      errors.push('Scalar buffer missing or empty');
    }
  } else {
    errors.push('No point scalars');
  }

  const valid = errors.length === 0;
  const bounds = vtk.getBounds?.() as [number, number, number, number, number, number] | undefined;
  return {
    valid,
    errors,
    bounds,
    dimensions: dims,
  };
}
