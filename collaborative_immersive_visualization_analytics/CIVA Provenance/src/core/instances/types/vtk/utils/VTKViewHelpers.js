import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";

import { logProgress } from "@Utils/logger.js";

let renderer, renderWindow, camera, interactor;
let original3DInteractorStyle = null;
let image2DInteractorStyle = null;

export function initializeViewHelpers(
  rendererRef,
  renderWindowRef,
  cameraRef,
  interactorRef
) {
  renderer = rendererRef;
  renderWindow = renderWindowRef;
  camera = cameraRef;
  interactor = interactorRef;

  // Store the original 3D style
  original3DInteractorStyle = interactor.getInteractorStyle();

  // Create 2D style (only create once)
  image2DInteractorStyle = vtkInteractorStyleImage.newInstance();
}

export function setup2DView() {
  // Position camera to look down at the XY plane for 2D visualization
  // Get the bounds of the current data
  const bounds = renderer.computeVisiblePropBounds();
  const centerX = (bounds[0] + bounds[1]) / 2;
  const centerY = (bounds[2] + bounds[3]) / 2;
  const centerZ = 0; // Since all Z coordinates are 0

  const rangeX = bounds[1] - bounds[0];
  const rangeY = bounds[3] - bounds[2];
  const maxRange = Math.max(rangeX, rangeY);

  // Position camera directly above looking straight down
  camera.setPosition(centerX, centerY, maxRange * 2);
  camera.setFocalPoint(centerX, centerY, centerZ);
  camera.setViewUp(0, 1, 0); // Y axis points up

  // Force orthographic (parallel) projection for true 2D
  camera.setParallelProjection(true);
  camera.setParallelScale(maxRange * 0.55);

  // Switch to 2D interactor style
  if (interactor && image2DInteractorStyle) {
    interactor.setInteractorStyle(image2DInteractorStyle);
    logProgress("Switched to 2D interactor style (pan and zoom only)");
  }

  // Force render
  renderWindow.render();

  logProgress(
    "Locked to 2D viewing mode (no rotation, orthographic projection)"
  );
}

export function restore3DView() {
  // Restore perspective projection
  camera.setParallelProjection(false);

  // Restore 3D interactor style
  if (interactor && original3DInteractorStyle) {
    interactor.setInteractorStyle(original3DInteractorStyle);
    logProgress("Restored 3D interactor style (rotation enabled)");
  }

  // ADD THIS: Reset camera to show full 3D scene
  if (renderer) {
    renderer.resetCamera();
    logProgress("Camera repositioned for 3D view");
  }

  logProgress(
    "Restored 3D viewing mode (rotation enabled, perspective projection)"
  );
}
