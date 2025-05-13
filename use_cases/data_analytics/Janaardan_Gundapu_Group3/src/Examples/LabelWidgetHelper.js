// src/Examples/LabelWidgetHelper.js
import vtkLabelWidget from '@kitware/vtk.js/Widgets/Widgets3D/LabelWidget';
import vtkInteractorObserver from '@kitware/vtk.js/Rendering/Core/InteractorObserver';
import {
  bindSVGRepresentation,
  multiLineTextCalculator,
  VerticalTextAlignment,
  makeListenableSVGNode,
} from './SVGHelpers';

export function initLabelWidgets(widgetManager, renderer, {
  addLabelBtn,
  deleteLabelBtn,
  txtIpt,
  fontSizeInput,
  colorInput,
}) {
  const labelTextProps = new Map();
  const labelCleanups  = new Map();
  let currentLabelView = null;

  function setupSVGLabel(viewWidget) {
    return bindSVGRepresentation(renderer, viewWidget.getWidgetState(), {
      mapState(widgetState, { size }) {
        const ts     = widgetState.getText();
        const origin = ts.getOrigin();
        if (origin && ts.getVisible()) {
          const [x, y] = vtkInteractorObserver.computeWorldToDisplay(
            renderer, ...origin
          );
          return {
            text:     ts.getText(),
            active:   ts.getActive(),
            position: [x, size[1] - y],
          };
        }
        return null;
      },
      render(data, h) {
        if (!data) {
          return [];
        }
        const { text, position, active } = data;
        const { fontColor, fontSize }    = labelTextProps.get(viewWidget);
        const nodes = [];

        if (!text.trim()) {
          nodes.push(h('circle', {
            key: 'c',
            attrs: { r: 5, cx: position[0], cy: position[1], fill: 'red' },
          }));
        }

        const lines = text.split('\n');
        const dys   = multiLineTextCalculator(
          lines.length, fontSize, VerticalTextAlignment.MIDDLE
        );

        lines.forEach((line, i) => {
          nodes.push(makeListenableSVGNode(
            h('text', {
              key: i,
              attrs: {
                x:            position[0],
                y:            position[1],
                dx:           12,
                dy:           dys[i],
                fill:         fontColor,
                'font-size':  fontSize,
                'text-anchor':'middle',
                'font-weight': active ? 'bold' : 'normal',
              },
              style: { cursor: 'pointer' },
              on: {
                pointerenter: () => {
                  widgetManager.disablePicking();
                  viewWidget.activateHandle({
                    selectedState: viewWidget.getWidgetState().getText(),
                  });
                },
                pointerleave: () => {
                  viewWidget.deactivateAllHandles();
                  widgetManager.enablePicking();
                },
              },
            }, line)
          ));
        });

        return nodes;
      },
      verticalAlignment: VerticalTextAlignment.Middle,
    });
  }

  addLabelBtn.addEventListener('click', () => {
    const widget     = vtkLabelWidget.newInstance();
    const viewWidget = widgetManager.addWidget(widget);
    widgetManager.grabFocus(viewWidget);

    // default WORLD coords → sticks to your object
    // (no setCoordinateSystem call)

    labelTextProps.set(viewWidget, {
      fontSize:  Number(fontSizeInput.value),
      fontColor: colorInput.value,
    });
    labelCleanups.set(viewWidget, setupSVGLabel(viewWidget));

    viewWidget.onStartInteractionEvent(() => {
      currentLabelView    = viewWidget;
      txtIpt.value        = viewWidget.getText() || '';
      fontSizeInput.value = labelTextProps.get(viewWidget).fontSize;
      colorInput.value    = labelTextProps.get(viewWidget).fontColor;
    });
    renderer.getRenderWindow().render();
  });

  deleteLabelBtn.addEventListener('click', () => {
    if (!currentLabelView) return;
    labelCleanups.get(currentLabelView)?.();
    labelCleanups.delete(currentLabelView);
    labelTextProps.delete(currentLabelView);
    currentLabelView = null;
    renderer.getRenderWindow().render();
  });

  txtIpt.addEventListener('input', () => {
    if (!currentLabelView) return;
    currentLabelView.setText(txtIpt.value);
    renderer.getRenderWindow().render();
  });

  fontSizeInput.addEventListener('input', () => {
    if (!currentLabelView) return;
    const fs = Number(fontSizeInput.value);
    labelTextProps.set(currentLabelView, {
      ...labelTextProps.get(currentLabelView),
      fontSize: fs,
    });
    currentLabelView.getWidgetState().modified();
    renderer.getRenderWindow().render();
  });

  colorInput.addEventListener('input', () => {
    if (!currentLabelView) return;
    const c = colorInput.value;
    labelTextProps.set(currentLabelView, {
      ...labelTextProps.get(currentLabelView),
      fontColor: c,
    });
    currentLabelView.getWidgetState().modified();
    renderer.getRenderWindow().render();
  });
}
