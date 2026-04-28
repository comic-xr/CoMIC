/**
 * Utility for transforming 3D models (axis inversion, representation)
 * @param {Object} actor - The vtk.js actor
 * @param {Object} renderWindow - The vtk.js render window
 * @returns {Object} Model transformation functions
 */
export default function createModelTransformer(actor, renderWindow) {
  // Track inversion state
  let xInverted = false;
  let yInverted = false;
  let zInverted = false;
  
  /**
   * Updates model transformation based on axis inversions
   */
  function updateTransformation() {
    if (!actor) return;
    
    // Instead of using negative scaling, use rotations
    // Create a rotation matrix based on which axes are inverted
    const rotateX = xInverted ? 180 : 0;
    const rotateY = yInverted ? 180 : 0;
    const rotateZ = zInverted ? 180 : 0;
    
    // Reset transformations
    actor.setScale(1, 1, 1);
    actor.setOrientation(0, 0, 0);
    
    // Apply rotations in sequence
    if (rotateX !== 0) actor.rotateX(rotateX);
    if (rotateY !== 0) actor.rotateY(rotateY);
    if (rotateZ !== 0) actor.rotateZ(rotateZ);
    
    renderWindow.render();
  }
  
  /**
   * Sets the representation mode (points, wireframe, surface)
   * @param {number} mode - 0: points, 1: wireframe, 2: surface
   */
  function setRepresentation(mode) {
    if (!actor) return;
    actor.getProperty().setRepresentation(Number(mode));
    renderWindow.render();
  }
  
  /**
   * Sets axis inversion state
   * @param {string} axis - 'x', 'y', or 'z'
   * @param {boolean} inverted - Whether the axis should be inverted
   */
  function setAxisInversion(axis, inverted) {
    if (axis === 'x') xInverted = inverted;
    else if (axis === 'y') yInverted = inverted;
    else if (axis === 'z') zInverted = inverted;
    
    updateTransformation();
    
    return { xInverted, yInverted, zInverted };
  }
  
  /**
   * Gets current inversion state
   */
  function getInversionState() {
    return { xInverted, yInverted, zInverted };
  }
  
  // Return public interface
  return {
    updateTransformation,
    setRepresentation,
    setAxisInversion,
    getInversionState
  };
}