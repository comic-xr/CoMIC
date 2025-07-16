import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';

/**
 * Quad‐view helper that places your primary renderer in a 2×2 grid,
 * sharing the *one* camera and the *one* actor instance so that
 * ANY camera change (desktop OR WebXR) shows up identically everywhere.
 */
export function initQuadView(
  renderWindow,
  rendererBL,
  actorBL,
  XRHelper,                        // accepted but unused
  { enableQuadViewBtn, disableQuadViewBtn, repBL, repBR, repTL, repTR },
  rendererBR,
  rendererTL,
  rendererTR
) {
  let quadOn = false;
  let savedVp;

  enableQuadViewBtn.addEventListener('click', () => {
    if (quadOn) return;

    // 1) Remember BL’s original viewport
    savedVp = rendererBL.getViewport();

    // 2) Grab the *single* camera and reuse it everywhere
    const sharedCam = rendererBL.getActiveCamera();
    rendererBR.setActiveCamera(sharedCam);
    rendererTL.setActiveCamera(sharedCam);
    rendererTR.setActiveCamera(sharedCam);

    // 3) Share the same actor
    rendererBR.addActor(actorBL);
    rendererTL.addActor(actorBL);
    rendererTR.addActor(actorBL);

    // 4) Add the three extras to the window
    renderWindow.addRenderer(rendererBR);
    renderWindow.addRenderer(rendererTL);
    renderWindow.addRenderer(rendererTR);

    // 5) Lay them out 2×2
    rendererBL.setViewport(0,   0,   0.5, 0.5);
    rendererBR.setViewport(0.5, 0,   1,   0.5);
    rendererTL.setViewport(0,   0.5, 0.5, 1);
    rendererTR.setViewport(0.5, 0.5, 1,   1);

    quadOn = true;
    renderWindow.render();
  });

  disableQuadViewBtn.addEventListener('click', () => {
    if (!quadOn) return;

    renderWindow.removeRenderer(rendererBR);
    renderWindow.removeRenderer(rendererTL);
    renderWindow.removeRenderer(rendererTR);

    // restore only BL viewport
    rendererBL.setViewport(...savedVp);

    quadOn = false;
    renderWindow.render();
  });

  // Hook up the four dropdowns
  [
    { el: repBL, ren: rendererBL },
    { el: repBR, ren: rendererBR },
    { el: repTL, ren: rendererTL },
    { el: repTR, ren: rendererTR },
  ].forEach(({ el, ren }) => {
    el.addEventListener('change', () => {
      ren.getActors().forEach(a =>
        a.getProperty().setRepresentation(Number(el.value))
      );
      renderWindow.render();
    });
  });

  return { isActive: () => quadOn };
}
