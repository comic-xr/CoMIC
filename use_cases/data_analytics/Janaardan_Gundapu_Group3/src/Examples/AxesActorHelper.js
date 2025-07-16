// In AxesActorHelper.js
import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor';
import createModelTransformer from '../utils/ModelTransformer';

export function initAxesActor(widgetManager, renderer, {
  addAxesBtn,
  removeAxesBtn,
  recenterCheckbox,
  invertXCheckbox,
  invertYCheckbox,
  invertZCheckbox,
}, actor) {  // Add the 3D model actor as a parameter
  let axesActor = null;
  // Create model transformer if we have an actor
  const modelTransformer = actor ? createModelTransformer(actor, renderer.getRenderWindow()) : null;

  function updateRendering() {
    if (!axesActor) return;
    axesActor.update();
    renderer.resetCamera();
    renderer.getRenderWindow().render();
  }

  addAxesBtn.addEventListener('click', () => {
    if (axesActor) return;
    axesActor = vtkAxesActor.newInstance();
    renderer.addActor(axesActor);
    updateRendering();
  });

  removeAxesBtn.addEventListener('click', () => {
    if (!axesActor) return;
    renderer.removeActor(axesActor);
    axesActor = null;
    renderer.getRenderWindow().render();
  });

  recenterCheckbox.addEventListener('change', (e) => {
    if (!axesActor) return;
    const config = axesActor.getConfig();
    config.recenter = e.target.checked;
    axesActor.setConfig(config);
    updateRendering();
  });

  invertXCheckbox.addEventListener('change', (e) => {
    if (!axesActor) return;
    const config = axesActor.getXConfig();
    config.invert = e.target.checked;
    axesActor.setXConfig(config);
    
    // Update the model if we have a transformer
    if (modelTransformer) {
      modelTransformer.setAxisInversion('x', e.target.checked);
    }
    
    updateRendering();
  });

  invertYCheckbox.addEventListener('change', (e) => {
    if (!axesActor) return;
    const config = axesActor.getYConfig();
    config.invert = e.target.checked;
    axesActor.setYConfig(config);
    
    // Update the model if we have a transformer
    if (modelTransformer) {
      modelTransformer.setAxisInversion('y', e.target.checked);
    }
    
    updateRendering();
  });

  invertZCheckbox.addEventListener('change', (e) => {
    if (!axesActor) return;
    const config = axesActor.getZConfig();
    config.invert = e.target.checked;
    axesActor.setZConfig(config);
    
    // Update the model if we have a transformer
    if (modelTransformer) {
      modelTransformer.setAxisInversion('z', e.target.checked);
    }
    
    updateRendering();
  });
}