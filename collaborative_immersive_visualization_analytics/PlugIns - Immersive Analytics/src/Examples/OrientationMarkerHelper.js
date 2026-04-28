import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';

export function initOrientationMarker(interactor) {
  // Create annotated cube for axes
  const cubeActor = vtkAnnotatedCubeActor.newInstance({
    xPlusFaceProperty:  { text: 'X',  faceColor: '#ff0000', fontColor: '#ffffff' },
    xMinusFaceProperty: { text: '-X', faceColor: '#0000ff', fontColor: '#ffffff' },
    yPlusFaceProperty:  { text: 'Y',  faceColor: '#00ff00', fontColor: '#ffffff' },
    yMinusFaceProperty: { text: '-Y', faceColor: '#ffff00', fontColor: '#000000' },
    zPlusFaceProperty:  { text: 'Z',  faceColor: '#ff00ff', fontColor: '#ffffff' },
    zMinusFaceProperty: { text: '-Z', faceColor: '#00ffff', fontColor: '#000000' },
  });

  // Hook up orientation marker widget
  const widget = vtkOrientationMarkerWidget.newInstance({ actor: cubeActor, interactor });
  widget.setEnabled(true);
  widget.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT);
  widget.setViewportSize(0.15);
  widget.setMinPixelSize(100);
  widget.setMaxPixelSize(300);

  return widget;
}