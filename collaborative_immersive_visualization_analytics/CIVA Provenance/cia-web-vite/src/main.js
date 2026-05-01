// For streamlined VR development install the WebXR emulator extension
// https://github.com/MozillaReality/WebXR-emulator-extension

import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkCalculator from '@kitware/vtk.js/Filters/General/Calculator';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWebXRRenderWindowHelper from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkPolyDataNormals from '@kitware/vtk.js/Filters/Core/PolyDataNormals';

import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';
import { XrSessionTypes } from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkResourceLoader from '@kitware/vtk.js/IO/Core/ResourceLoader';

// Custom UI controls, including button to start XR session
import controlPanel from './controller.js';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';

// Dynamically load WebXR polyfill from CDN for WebVR and Cardboard API backwards compatibility
if (navigator.xr === undefined) {
  vtkResourceLoader
    .loadScript(
      'https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js'
    )
    .then(() => {
      // eslint-disable-next-line no-new, no-undef
      new WebXRPolyfill();
    });
}

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
  rootContainer: document.getElementById('vtk-container')
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const XRHelper = vtkWebXRRenderWindowHelper.newInstance({
  renderWindow: fullScreenRenderer.getApiSpecificRenderWindow(),
  drawControllersRay: true,
});

// ----------------------------------------------------------------------------
// Example code
// ----------------------------------------------------------------------------

const vtpReader = vtkXMLPolyDataReader.newInstance();

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function createPipeline(fileContents) {
  vtpReader.parseAsArrayBuffer(fileContents);
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = function onLoad(e) {
    createPipeline(reader.result);
  };
  reader.readAsArrayBuffer(file);
}

const mapper = vtkMapper.newInstance();
const actor = vtkActor.newInstance();

actor.setMapper(mapper);

function handleFile(e) {
  preventDefaults(e);
  const dataTransfer = e.dataTransfer;
  const files = e.target.files || dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const fileReader = new FileReader();
    fileReader.onload = function onLoad(e) {
      vtpReader.parseAsArrayBuffer(fileReader.result);
      mapper.setInputData(vtpReader.getOutputData(0));
      renderer.addActor(actor)
      renderer.resetCamera();
      renderWindow.render();
    };
    fileReader.readAsArrayBuffer(files[0]);
  }
}

// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------

// Insert the control panel into the DOM
const controllerContainer = document.createElement('div');
controllerContainer.innerHTML = controlPanel;
fullScreenRenderer.addController(controllerContainer);

// Attach event listeners
const representationSelector = document.querySelector('.representations');
const vrbutton = document.querySelector('.vrbutton');
const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', handleFile);

representationSelector.addEventListener('change', (e) => {
  const newRepValue = Number(e.target.value);
  actor.getProperty().setRepresentation(newRepValue);
  renderWindow.render();
});

vrbutton.addEventListener('click', (e) => {
  if (vrbutton.textContent === 'Send To VR') {
    XRHelper.startXR(XrSessionTypes.InlineVr);
    vrbutton.textContent = 'Return From VR';
  } else {
    XRHelper.stopXR();
    vrbutton.textContent = 'Send To VR';
  }
});