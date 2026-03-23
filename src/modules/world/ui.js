import { Components as UIComponents } from "../../ui/Components/Components.js";

import {
  installViewportLayoutListener,
  shouldShowRotateToLandscapePrompt,
  updateContextMobileViewportHints,
} from "./mobileViewportDetection.js";

class StatusBar {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.isVisible = false;

    this.panel = null;

    this.drawStatusBar(context, operators);

    this.bindToggleButton();
  }

  bindToggleButton() {
    const toggleBtn = document.getElementById('Information');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    this.isVisible = !this.isVisible;

    this.panel.dom.style.display = this.isVisible ? 'flex' : 'none';
  }

  show() {
    this.isVisible = true;

    this.panel.dom.style.display = 'flex';
  }

  hide() {
    this.isVisible = false;

    this.panel.dom.style.display = 'none';
  }

  drawStatusBar(context, operators) {
    const editor = context.editor;

    const signals = editor.signals;

    const panel = UIComponents.row();

    this.panel = panel;

    panel.addClass('IntroductionHUD');

    panel.setId('ApplicationStateBar');

    panel.setStyles({

      display: 'none'
    });

    const activeSection = UIComponents.column().gap('0.25rem');

    const activeLabel = UIComponents.span('ACTIVE SELECTION');

    activeLabel.addClass('hud-label');

    const objectInput = UIComponents.input();

    objectInput.setId('object-selector-input');

    objectInput.setValue('Global Id Here');

    objectInput.addClass('hud-input');

    objectInput.setStyles({ width: '200px' });

    objectInput.onEnter(() => {
      const globalId = objectInput.getValue();

      operators.execute("spatial.select", context, { GlobalId: globalId, additive: false });
    });

    activeSection.add(activeLabel, objectInput);

    const divider1 = UIComponents.div();

    divider1.addClass('hud-divider');

    const sourceSection = UIComponents.column().gap('0.25rem');

    const sourceLabel = UIComponents.span('SOURCE');

    sourceLabel.addClass('hud-label');

    const sourceValue = UIComponents.span('—');

    sourceValue.addClass('hud-input');

    sourceValue.setStyles({ background: 'transparent', border: 'none' });

    sourceSection.add(sourceLabel, sourceValue);

    const divider2 = UIComponents.div();

    divider2.addClass('hud-divider');

    const selectionSection = UIComponents.column().gap('0.25rem');

    const selectionLabel = UIComponents.span('SELECTED');

    selectionLabel.addClass('hud-label');

    const selectionValue = UIComponents.span('0');

    selectionValue.addClass('hud-coins');

    selectionSection.add(selectionLabel, selectionValue);

    const divider3 = UIComponents.div();
    divider3.addClass('hud-divider');

    const objectsSection = UIComponents.column().gap('0.25rem');
    const objectsLabel = UIComponents.span('OBJECTS');
    objectsLabel.addClass('hud-label');
    const objectsValue = UIComponents.span('0');
    objectsValue.addClass('hud-input');
    objectsSection.add(objectsLabel, objectsValue);

    const divider4 = UIComponents.div();
    divider4.addClass('hud-divider');

    const verticesSection = UIComponents.column().gap('0.25rem');
    const verticesLabel = UIComponents.span('VERTICES');
    verticesLabel.addClass('hud-label');
    const verticesValue = UIComponents.span('0');
    verticesValue.addClass('hud-input');
    verticesSection.add(verticesLabel, verticesValue);

    const divider5 = UIComponents.div();
    divider5.addClass('hud-divider');

    const trianglesSection = UIComponents.column().gap('0.25rem');
    const trianglesLabel = UIComponents.span('TRIANGLES');
    trianglesLabel.addClass('hud-label');
    const trianglesValue = UIComponents.span('0');
    trianglesValue.addClass('hud-input');
    trianglesSection.add(trianglesLabel, trianglesValue);

    panel.add(
      activeSection, divider1, sourceSection, divider2, selectionSection,
      divider3, objectsSection, divider4, verticesSection, divider5, trianglesSection
    );

    document.getElementById('Viewport').appendChild(panel.dom);

    this.listenSelection(signals, selectionValue);

    this.listenActiveObject(signals, objectInput, sourceValue);

    this.listenSceneInfo(editor, objectsValue, verticesValue, trianglesValue);
  }

  listenSelection(signals, selectionCountComponent) {
    signals.selectionChanged.add((count) => {
      selectionCountComponent.dom.textContent = count;
    });
  }

  listenSceneInfo(editor, objectsValue, verticesValue, trianglesValue) {
    const signals = editor.signals;

    const update = () => {
      const scene = editor.scene;
      let objects = 0, vertices = 0, triangles = 0;

      for (let i = 0, l = scene.children.length; i < l; i++) {
        const object = scene.children[i];

        object.traverseVisible(function (child) {
          objects++;

          if (child.isMesh || child.isPoints) {
            const geometry = child.geometry;
            const positionAttribute = geometry.attributes.position;

            if (positionAttribute !== undefined && positionAttribute !== null) {
              vertices += positionAttribute.count;
            }

            if (child.isMesh) {
              if (geometry.index !== null) {
                triangles += geometry.index.count / 3;
              } else if (positionAttribute !== undefined && positionAttribute !== null) {
                triangles += positionAttribute.count / 3;
              }
            }
          }
        });
      }

      objectsValue.dom.textContent = editor.utils.formatNumber(objects);
      verticesValue.dom.textContent = editor.utils.formatNumber(vertices);
      trianglesValue.dom.textContent = editor.utils.formatNumber(triangles);
    };

    signals.objectAdded.add(update);
    signals.objectRemoved.add(update);
    signals.objectChanged.add(update);
    signals.geometryChanged.add(update);
    signals.sceneRendered.add(update);
    signals.cameraChanged.add(update);
  }

  listenActiveObject(signals, activeObjectComponent, sourceComponent) {
    signals.objectSelected.add((object) => {
      if (object) {
        if (object.isIfc) {
          sourceComponent.dom.textContent = 'IFC4';
        } else if (object.isGltf) {
          sourceComponent.dom.textContent = 'GLTF';
        } else if (object.isObj) {
          sourceComponent.dom.textContent = 'OBJ';
        } else if (object.isUsd) {
          sourceComponent.dom.textContent = 'USD';
        } else if (object.isAECO) {
          sourceComponent.dom.textContent = 'AECO';
        } else {
          sourceComponent.dom.textContent = '—';
        }

        activeObjectComponent.setValue(object.GlobalId || object.uuid || '');
      } else {
        sourceComponent.dom.textContent = '—';

        activeObjectComponent.setValue('');
      }
    });
  }
}

class ToolbarUI {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.toolbar = document.getElementById("ViewportToolBar");

    this.createToolbarButtons();

    this.listenIsolationChanged();
  }

  listenIsolationChanged() {
    const editor = this.context.editor;
    if (!editor?.signals?.isolationChanged || !this.isolateOperatorDom) return;
    editor.signals.isolationChanged.add((isIsolated) => {
      this.isolateOperatorDom.classList.toggle('Active', isIsolated);
    });
  }

  createToolbarButtons() {

    const toolbarTools = [
      {
        id: "FocusOnSelectionTool",
        name: "Focus on Selection",
        icon: "center_focus_strong",
        type: "Tool",
        moduleId: "world",
        operator: "viewer.focus_on_selection",
      },
      {
        id: "IsolateElementsTool",
        name: "Isolate Elements",
        icon: "layers_clear",
        type: "Tool",
        moduleId: "world",
        operator: "viewer.isolate_elements",
      },
    ];
    toolbarTools.forEach((tool) => {
      const div = UIComponents.div().addClass('Operator');

      const op = UIComponents.icon(tool.icon)

      op.onClick( () => {
        this.operators.execute(tool.operator, this.context);
        
        if (tool.operator === 'viewer.isolate_elements') {
          const editor = this.context.editor;
          div.dom.classList.toggle('Active', editor.isIsolated());
        }
      });

      div.add(op);

      const tooltip = UIComponents.tooltip(tool.name, { 
        position: 'right', 
      });

      tooltip.attachTo(div.dom, { followMouse: true });

      this.toolbar.appendChild(div.dom);
      if (tool.operator === 'viewer.isolate_elements') {
        if (this.context.editor?.isIsolated()) {
          div.dom.classList.add('Active');
        }
        this.isolateOperatorDom = div.dom;
      }
    });
  }
}

class LoadingUI {
  
    constructor({ context, operators }) {

      const spinners = new Map();
    
      const showSpinner = (context, text, parent) => {

          parent = parent || context.dom;
          let spinner = spinners.get(parent);

          if (!spinner) {
            spinner = UIComponents.spinner({ text: text || 'Loading...' });

            spinners.set(parent, spinner);
          }

          spinner.show(parent);

          text ? spinner.updateText(text) : null;
      }

      const hideSpinner = (parent) => {
        if (parent) {
          
          const spinner = spinners.get(parent);

          if (spinner) {
            spinner.hide();

            spinners.delete(parent);
          }
        } else {
          
          spinners.forEach((spinner) => spinner.hide());

          spinners.clear();
        }
      }

      context.signals.showSpinner.add( function (options) {
      
        if (options && options.hide) {
          hideSpinner(options.parent);
        } else if (options) {
          showSpinner(context, options.text, options.parent);
        } else {
          hideSpinner();
        }

    });

  }
}

class MobileLandscapeGuidance {
  constructor({ context }) {
    this.context = context;

    this.unsubscribeViewport = null;

    this.overlayRoot = null;

    const uiConfig = context.config && context.config.ui;

    if (uiConfig && uiConfig.mobileLandscapePrompt === false) {
      return;
    }

    const hostElement = context.dom;

    if (!hostElement || typeof document === "undefined") {
      return;
    }

    const overlay = UIComponents.div();

    overlay.addClass("MobileLandscapeGuidance");

    const panel = UIComponents.column();

    panel.addClass("MobileLandscapeGuidance-panel");

    const title = UIComponents.h3("Rotate your device");

    title.addClass("MobileLandscapeGuidance-title");

    const body = UIComponents.paragraph(
      "Rotate to landscape orientation to use the viewport. This message clears when your device is sideways."
    );

    body.addClass("MobileLandscapeGuidance-body");

    panel.add(title, body);

    overlay.add(panel);

    this.overlayRoot = overlay;

    const applyVisibility = () => {
      updateContextMobileViewportHints(this.context);

      const show = shouldShowRotateToLandscapePrompt();

      overlay.dom.style.display = show ? "flex" : "none";
    };

    hostElement.appendChild(overlay.dom);

    if (typeof window !== "undefined") {
      this.unsubscribeViewport = installViewportLayoutListener(window, applyVisibility);
    }

    applyVisibility();
  }

  destroy() {
    if (typeof this.unsubscribeViewport === "function") {
      this.unsubscribeViewport();
    }

    this.unsubscribeViewport = null;

    if (this.overlayRoot && this.overlayRoot.dom && this.overlayRoot.dom.parentNode) {
      this.overlayRoot.dom.parentNode.removeChild(this.overlayRoot.dom);
    }

    this.overlayRoot = null;
  }
}

export default [StatusBar, ToolbarUI, LoadingUI, MobileLandscapeGuidance];