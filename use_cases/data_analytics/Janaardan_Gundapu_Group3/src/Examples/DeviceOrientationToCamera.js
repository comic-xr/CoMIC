import vtkDeviceOrientationToCamera from '@kitware/vtk.js/Interaction/Misc/DeviceOrientationToCamera';

/**
 * Keeps device orientation synced to the camera,
 * and additionally ensures `actor` stays at the *initial*
 * camera-to-actor distance in front of the camera.
 *
 * @param {vtkRenderWindow} renderWindow
 * @param {vtkRenderer}      renderer
 * @param {vtkRenderWindowInteractor} interactor
 * @param {{enableDeviceOrientationBtn: HTMLElement, disableDeviceOrientationBtn: HTMLElement}} controls
 * @param {vtkActor} actor  The model actor you want to keep in front of the camera
 */
export function initDeviceOrientation(
  renderWindow,
  renderer,
  interactor,
  { enableDeviceOrientationBtn, disableDeviceOrientationBtn },
  actor
) {
  let camSub = null;
  let listenerId = null;
  let initialDistance = 0;

  enableDeviceOrientationBtn.addEventListener('click', () => {
    if (!vtkDeviceOrientationToCamera.isDeviceOrientationSupported()) {
      console.warn('Device orientation not supported.');
      return;
    }

    // Compute and store the initial distance from camera to actor
    const cam = renderer.getActiveCamera();
    const camPos = cam.getPosition();
    const actorPos = actor.getPosition();
    const dx = actorPos[0] - camPos[0];
    const dy = actorPos[1] - camPos[1];
    const dz = actorPos[2] - camPos[2];
    initialDistance = Math.hypot(dx, dy, dz);

    // 1) Sync device orientation → camera
    vtkDeviceOrientationToCamera.addWindowListeners();
    listenerId = vtkDeviceOrientationToCamera.addCameraToSynchronize(
      interactor,
      cam,
      () => renderer.resetCameraClippingRange()
    );

    // 2) On every camera change, reposition actor at the same initial distance
    camSub = cam.onModified(() => {
      const pos = cam.getPosition();
      const fp  = cam.getFocalPoint();
      // direction vector from cam to focal point
      const dir = [
        fp[0] - pos[0],
        fp[1] - pos[1],
        fp[2] - pos[2],
      ];
      // normalize
      const len = Math.hypot(...dir);
      const unit = dir.map((c) => c / len);
      // place actor at camPos + unit * initialDistance
      actor.setPosition(
        pos[0] + unit[0] * initialDistance,
        pos[1] + unit[1] * initialDistance,
        pos[2] + unit[2] * initialDistance
      );
      renderWindow.render();
    });

    renderWindow.render();
  });

  disableDeviceOrientationBtn.addEventListener('click', () => {
    if (listenerId !== null) {
      vtkDeviceOrientationToCamera.removeCameraToSynchronize(listenerId);
      vtkDeviceOrientationToCamera.removeWindowListeners();
      listenerId = null;
    }
    if (camSub) {
      camSub.unsubscribe();
      camSub = null;
    }
    renderWindow.render();
  });

  return {
    isActive: () => listenerId !== null,
  };
}
