import vtkLineWidget from '@kitware/vtk.js/Widgets/Widgets3D/LineWidget';

export function initLineWidgets(widgetManager, renderWindow, {
  addLineBtn,
  removeLineBtn,
  idh1Select,
  visiH1Checkbox,
  idh2Select,
  visiH2Checkbox,
  distanceOutput,
}) {
  let lineFactory = null;
  let lineView    = null;
  let handles     = {};

  function updateDistance() {
    if (!lineFactory) return;
    distanceOutput.textContent = lineFactory.getDistance().toFixed(3);
    renderWindow.render();
  }

  idh1Select.addEventListener('input', () => {
    if (!handles[1]) return;
    handles[1].setShape(idh1Select.value);
    lineView.updateHandleVisibility(0);
    renderWindow.render();
  });
  visiH1Checkbox.addEventListener('input', () => {
    if (!handles[1]) return;
    handles[1].setVisible(visiH1Checkbox.checked);
    lineView.updateHandleVisibility(0);
    renderWindow.render();
  });
  idh2Select.addEventListener('input', () => {
    if (!handles[2]) return;
    handles[2].setShape(idh2Select.value);
    lineView.updateHandleVisibility(1);
    renderWindow.render();
  });
  visiH2Checkbox.addEventListener('input', () => {
    if (!handles[2]) return;
    handles[2].setVisible(visiH2Checkbox.checked);
    lineView.updateHandleVisibility(1);
    renderWindow.render();
  });

  addLineBtn.addEventListener('click', () => {
    // Reset existing
    if (lineView) {
      widgetManager.removeWidget(lineView);
      lineView    = null;
      lineFactory = null;
      handles     = {};
      distanceOutput.textContent = '--';
    }

    const factory = vtkLineWidget.newInstance();
    const view    = widgetManager.addWidget(factory);
    widgetManager.grabFocus(view);
    widgetManager.enablePicking();

    view.onStartInteractionEvent(updateDistance);
    view.onInteractionEvent(updateDistance);
    view.onEndInteractionEvent(updateDistance);

    lineFactory = factory;
    lineView    = view;
    const state  = factory.getWidgetState();
    handles = {
      1: state.getHandle1(),
      2: state.getHandle2(),
    };

    idh1Select.value       = handles[1].getShape() || 'sphere';
    idh2Select.value       = handles[2].getShape() || 'sphere';
    visiH1Checkbox.checked = handles[1].getVisible();
    visiH2Checkbox.checked = handles[2].getVisible();

    updateDistance();
  });

  removeLineBtn.addEventListener('click', () => {
    if (!lineView) return;
    widgetManager.removeWidget(lineView);
    lineView    = null;
    lineFactory = null;
    handles     = {};
    distanceOutput.textContent = '--';
  });
}
