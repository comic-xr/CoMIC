/**
 * Project convention: on-disk and fetched datasets are immutable inputs.
 * Loaders MUST NOT write back into asset URLs, mutate shared VTK caches in place, or destructively edit scalar buffers.
 * Reduced views are always new in-memory vtkImageData instances (or disposable blob URLs from the API).
 */

export const IMMUTABLE_ASSET_PIPELINE = true;
