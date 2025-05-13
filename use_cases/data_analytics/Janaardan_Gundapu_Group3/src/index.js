// src/index.js

import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/Profiles/Glyph';

import vtkFullScreenRenderWindow         from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWebXRRenderWindowHelper        from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper';
import { XrSessionTypes }                from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkWidgetManager                  from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkXMLPolyDataReader              from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkMapper                         from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor                          from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkRenderer                       from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkAxesActor                      from '@kitware/vtk.js/Rendering/Core/AxesActor';
import vtkAnnotatedCubeActor             from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkOrientationMarkerWidget        from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkPlaneSource                    from '@kitware/vtk.js/Filters/Sources/PlaneSource';

import controlPanel               from './controller.html';
import { initLabelWidgets }       from './Examples/LabelWidgetHelper';
import { initLineWidgets }        from './Examples/LineWidgetHelper';
import { initQuadView }           from './Examples/QuadViewHelper';
import { initDeviceOrientation }  from './Examples/DeviceOrientationToCamera';
import { initDepthTest }          from './Examples/DepthTestHelper';
import createModelTransformer     from './utils/ModelTransformer';

// 1) Full-screen renderer + HTML UI
const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
});
const rendererBL   = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const interactor   = renderWindow.getInteractor();
interactor.setInteractorStyle(
  vtkInteractorStyleTrackballCamera.newInstance()
);
fullScreenRenderer.addController(controlPanel);

// 2) Widget manager
const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(rendererBL);

// 3) Grab UI elements
const widgetSelector              = document.getElementById('widgetSelector');
const vrButton                    = document.querySelector('.vrbutton');
const repSelector                 = document.getElementById('representationSelector');
const fileInput                   = document.getElementById('fileInput');

const addLabelBtn                 = document.getElementById('addLabel');
const deleteLabelBtn              = document.getElementById('deleteLabel');
const txtIpt                      = document.getElementById('txtIpt');
const fontSizeInput               = document.getElementById('fontSize');
const colorInput                  = document.getElementById('color');

const addLineBtn                  = document.getElementById('addLine');
const removeLineBtn               = document.getElementById('removeLine');
const idh1Select                  = document.getElementById('idh1');
const visiH1Checkbox              = document.getElementById('visiH1');
const idh2Select                  = document.getElementById('idh2');
const visiH2Checkbox              = document.getElementById('visiH2');
const distanceOutput              = document.getElementById('distance');

const axesRecenterCheckbox        = document.querySelector('.recenter');
const axesInvertXCheckbox         = document.querySelector('.xAxisInvert');
const axesInvertYCheckbox         = document.querySelector('.yAxisInvert');
const axesInvertZCheckbox         = document.querySelector('.zAxisInvert');

const enableQuadViewBtn           = document.getElementById('enableQuadView');
const disableQuadViewBtn          = document.getElementById('disableQuadView');
const repBL                       = document.getElementById('repBL');
const repBR                       = document.getElementById('repBR');
const repTL                       = document.getElementById('repTL');
const repTR                       = document.getElementById('repTR');

const enableDeviceOrientationBtn  = document.getElementById('enableDeviceOrientation');
const disableDeviceOrientationBtn = document.getElementById('disableDeviceOrientation');

const enableDepthTestBtn          = document.getElementById('enableDepthTest');
const disableDepthTestBtn         = document.getElementById('disableDepthTest');

// 4) Show/hide controls per widget
const widgetControls = {
  file:              [repSelector, fileInput],
  label:             [addLabelBtn, deleteLabelBtn, txtIpt, fontSizeInput, colorInput],
  line:              [addLineBtn, removeLineBtn, idh1Select, visiH1Checkbox, idh2Select, visiH2Checkbox, distanceOutput],
  axes:              [axesRecenterCheckbox, axesInvertXCheckbox, axesInvertYCheckbox, axesInvertZCheckbox],
  quadview:          [enableQuadViewBtn, disableQuadViewBtn, repBL, repBR, repTL, repTR],
  deviceOrientation: [enableDeviceOrientationBtn, disableDeviceOrientationBtn],
  depthTest:         [enableDepthTestBtn, disableDepthTestBtn],
};
function showControls(type) {
  Object.values(widgetControls).flat().forEach(el => el.closest('tr').style.display = 'none');
  document.querySelectorAll('tr.always').forEach(r => r.style.display = '');
  widgetControls[type].forEach(el => el.closest('tr').style.display = '');
}
showControls('file');
widgetSelector.addEventListener('change', e => showControls(e.target.value));

// 5) Load model → actorBL
const reader  = vtkXMLPolyDataReader.newInstance();
const mapper  = vtkMapper.newInstance();
const actorBL = vtkActor.newInstance();
actorBL.setMapper(mapper);
let modelTransformer = null;
fileInput.addEventListener('change', e => {
  const files = e.target.files; if (!files.length) return;
  const fr = new FileReader();
  fr.onload = () => {
    reader.parseAsArrayBuffer(fr.result);
    mapper.setInputData(reader.getOutputData(0));
    rendererBL.addActor(actorBL);
    rendererBL.resetCamera();
    renderWindow.render();
    modelTransformer = createModelTransformer(actorBL, renderWindow);
  };
  fr.readAsArrayBuffer(files[0]);
});
repSelector.addEventListener('change', () => {
  actorBL.getProperty().setRepresentation(Number(repSelector.value));
  renderWindow.render();
});

// 6) WebXR helper + Quad View
const XRHelper = vtkWebXRRenderWindowHelper.newInstance({
  renderWindow: fullScreenRenderer.getApiSpecificRenderWindow(),
  drawControllersRay: true,
});
let xrActive = false;

const rendererBR = vtkRenderer.newInstance();
const rendererTL = vtkRenderer.newInstance();
const rendererTR = vtkRenderer.newInstance();

initQuadView(
  renderWindow,
  rendererBL,
  actorBL,
  XRHelper,
  { enableQuadViewBtn, disableQuadViewBtn, repBL, repBR, repTL, repTR },
  rendererBR,
  rendererTL,
  rendererTR
);

vrButton.addEventListener('click', () => {
  if (!xrActive) {
    XRHelper.startXR(XrSessionTypes.InlineVr);
    XRHelper.resetXRScene(1.0, -300);
    vrButton.textContent = 'Return From VR';
  } else {
    XRHelper.stopXR();
    vrButton.textContent = 'Send To VR';
  }
  xrActive = !xrActive;
});

// 7) Orientation cube (bottom-right)
const cubeActor = vtkAnnotatedCubeActor.newInstance({
  xPlusFaceProperty:  { text:'X',  faceColor:'#f00', fontColor:'#fff' },
  xMinusFaceProperty: { text:'-X', faceColor:'#00f', fontColor:'#fff' },
  yPlusFaceProperty:  { text:'Y',  faceColor:'#0f0', fontColor:'#fff' },
  yMinusFaceProperty: { text:'-Y', faceColor:'#ff0', fontColor:'#000' },
  zPlusFaceProperty:  { text:'Z',  faceColor:'#f0f', fontColor:'#fff' },
  zMinusFaceProperty: { text:'-Z', faceColor:'#0ff', fontColor:'#000' },
});
const orientationWidget = vtkOrientationMarkerWidget.newInstance({
  actor: cubeActor,
  interactor,
});
orientationWidget.setEnabled(true);
orientationWidget.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT);
orientationWidget.setViewportSize(0.15);
orientationWidget.setMinPixelSize(100);
orientationWidget.setMaxPixelSize(300);

// 8) Label & Line widgets
initLabelWidgets(widgetManager, rendererBL, {
  addLabelBtn, deleteLabelBtn, txtIpt, fontSizeInput, colorInput,
});
initLineWidgets(widgetManager, renderWindow, {
  addLineBtn, removeLineBtn, idh1Select, visiH1Checkbox, idh2Select, visiH2Checkbox, distanceOutput,
});

// 9) Axes overlay (bottom-left)
const axesActor  = vtkAxesActor.newInstance();
const axesWidget = vtkOrientationMarkerWidget.newInstance({ actor: axesActor, interactor });
axesWidget.setEnabled(true);
axesWidget.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT);
axesWidget.setViewportSize(0.15);
axesWidget.setMinPixelSize(100);
axesWidget.setMaxPixelSize(300);
function updateAxes() {
  axesActor.update();
  rendererBL.resetCameraClippingRange();
  renderWindow.render();
}
axesRecenterCheckbox.addEventListener('change', e => {
  const cfg = axesActor.getConfig(); cfg.recenter = e.target.checked; axesActor.setConfig(cfg); updateAxes();
});
axesInvertXCheckbox.addEventListener('change', e => {
  const cfg = axesActor.getXConfig(); cfg.invert = e.target.checked; axesActor.setXConfig(cfg);
  if (modelTransformer) modelTransformer.setAxisInversion('x', e.target.checked);
  updateAxes();
});
axesInvertYCheckbox.addEventListener('change', e => {
  const cfg = axesActor.getYConfig(); cfg.invert = e.target.checked; axesActor.setYConfig(cfg);
  if (modelTransformer) modelTransformer.setAxisInversion('y', e.target.checked);
  updateAxes();
});
axesInvertZCheckbox.addEventListener('change', e => {
  const cfg = axesActor.getZConfig(); cfg.invert = e.target.checked; axesActor.setZConfig(cfg);
  if (modelTransformer) modelTransformer.setAxisInversion('z', e.target.checked);
  updateAxes();
});

// 10) Keyboard controls
document.addEventListener('keydown', e => {
  if (xrActive) return;
  const cam = rendererBL.getActiveCamera();
  switch (e.key) {
    case 'ArrowLeft':  cam.azimuth(-10); break;
    case 'ArrowRight': cam.azimuth(10);  break;
    case 'ArrowUp':    cam.elevation(10);break;
    case 'ArrowDown':  cam.elevation(-10);break;
    case 'w': case 'W': cam.dolly(1.2);   break;
    case 's': case 'S': cam.dolly(0.8);   break;
  }
  rendererBL.resetCameraClippingRange();
  cam.modified();
  renderWindow.render();
});

// 11) Device Orientation (keep actor in front)
initDeviceOrientation(
  renderWindow,
  rendererBL,
  interactor,
  { enableDeviceOrientationBtn, disableDeviceOrientationBtn },
  actorBL
);

// 12) Depth Test
initDepthTest(
  rendererBL,
  actorBL,
  { enableDepthTestBtn, disableDepthTestBtn }
);

// 13) Test‐Plane helper
window.addTestPlane = () => {
  const planeSource = vtkPlaneSource.newInstance({
    origin: [-100, -100, 0],
    point1: [ 100, -100, 0],
    point2: [-100,  100, 0],
  });
  const planeMapper = vtkMapper.newInstance();
  planeMapper.setInputConnection(planeSource.getOutputPort());
  const planeActor = vtkActor.newInstance();
  planeActor.setMapper(planeMapper);
  planeActor.getProperty().setColor(0, 1, 0);
  rendererBL.addActor(planeActor);
  renderWindow.render();
  return planeActor;
};

// 14) Debug exports
global.rendererBL       = rendererBL;
global.renderWindow     = renderWindow;
global.widgetManager    = widgetManager;
global.modelTransformer = modelTransformer;
