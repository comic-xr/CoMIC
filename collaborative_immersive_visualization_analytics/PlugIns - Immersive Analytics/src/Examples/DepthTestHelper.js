// src/Examples/DepthTestHelper.js
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

/**
 * Toggle depth testing for a given actor.
 * Uses actor.setForceTranslucent() under the hood:
 * forcing translucent will bypass the depth-test pass.
 */
export function initDepthTest(
  renderer,         // your vtkRenderer
  actor,            // the vtkActor you want to control
  { enableDepthTestBtn, disableDepthTestBtn }
) {
  let depthTestOn = true;

  enableDepthTestBtn.addEventListener('click', () => {
    if (!depthTestOn) {
      // turn depth test back on: render with normal depth-buffering
      actor.setForceTranslucent(false);
      renderer.getRenderWindow().render();
      depthTestOn = true;
    }
  });

  disableDepthTestBtn.addEventListener('click', () => {
    if (depthTestOn) {
      // bypass depth test: actor always draws on top
      actor.setForceTranslucent(true);  // :contentReference[oaicite:0]{index=0}
      renderer.getRenderWindow().render();
      depthTestOn = false;
    }
  });

  return { isActive: () => !depthTestOn };
}
