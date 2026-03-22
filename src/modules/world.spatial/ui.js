import Paths from "../../utils/paths.js";
import { Components as UIComponents } from "../../ui/Components/Components.js";
import { TabPanel } from '../../../drawUI/TabPanel.js';

class SpatialManagerUI extends TabPanel{
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: 'left',
      moduleId: 'world.spatial',
      tabId: 'world-spatial-structure',
      tabLabel: 'Spatial structure',
      icon: 'account_tree',
      title: 'Spatial Structure',
      showHeader: false,
      floatable: true,
      panelStyles: {
        minWidth: '240px',
      },
      autoShow: false,
    });

    this.editor = context.editor;

    this.nodeStates = new WeakMap();

    this.ignoreObjectSelectedSignal = false;

    this.currentDrag = null;

    this.searchQuery = "";

    this.container = null;

    this.draw();

    this.listen(context, operators);
  }

  _isSpatialTabActive() {
    const lm = this.context?.layoutManager;

    return !!(
      lm &&
      lm.isWorkspaceOpen(this.position) &&
      lm.isTabSelected(this.position, this.tabId)
    );
  }

  listen(context, operators) {
    const editorSignals = context.editor.signals;

    context.signals.openSpatialManager.add(() => {
      if (!this._isSpatialTabActive()) {
        this.show();
      }
    });

    context.signals.activeLayerUpdate.add(() => {
      if (this._isSpatialTabActive()) this.refreshTree();
    });

    context.signals.enableEditingSpatialStructure.add((layerGuid) => {
      if (!layerGuid) {
        if (this._isSpatialTabActive()) this.hide();

        return;
      }

      if (!this._isSpatialTabActive()) {
        this.show();
      } else {
        this.refreshTree();
      }
    });

    context.signals.spatialExpandAll.add(() => this.expandAll());

    context.signals.spatialCollapseAll.add(() => this.collapseAll());

    editorSignals.sceneGraphChanged.add(() => this.refreshTree());

    editorSignals.editorCleared.add(() => this.refreshTree());

    editorSignals.objectSelected.add((object) => {
      if (!this._isSpatialTabActive()) return;

      if (this.ignoreObjectSelectedSignal) return;

      if (!object) return this.scrollIntoView(null);

      this.expandParents(object);

      this.scrollIntoView(object.id);
    });
  }

  draw() {
    this.content.clear();

    this.footer.clear();

    this.container = UIComponents.div();

    this.container.addClass("Outliner");

    this.container.setStyle("padding", ["0.5rem"]);

    this.content.add(this.container);

    const footerContent = UIComponents.column();

    footerContent.setStyle("width", ["100%"]);

    const searchRow = UIComponents.row();

    searchRow
      .setStyle("padding", ["0.5rem 0.75rem"])
      .setStyle("width", ["100%"]);

    const searchInput = UIComponents.input();

    searchInput.setValue("Search...");

    searchInput.setStyle("width", ["100%"]);

    searchInput.setStyle("flex", ["1"]);

    searchInput.dom.addEventListener("input", (e) => {
      this.filterSpatial(e.target.value);
    });

    searchRow.add(searchInput);

    footerContent.add(searchRow);

    const buttonsRow = UIComponents.row();

    buttonsRow
      .setStyle("padding", ["0.5rem 0.75rem"])
      .setStyle("gap", ["8px"])
      .setStyle("border-top", ["1px solid var(--border)"]);

    const collapseBtn = UIComponents.button("Collapse All");

    collapseBtn.onClick(() =>
      this.operators.execute("spatial.collapse_all", this.context),
    );

    const expandBtn = UIComponents.button("Expand All");

    expandBtn.onClick(() =>
      this.operators.execute("spatial.expand_all", this.context),
    );

    buttonsRow.add(collapseBtn);

    buttonsRow.add(expandBtn);

    footerContent.add(buttonsRow);

    this.footer.add(footerContent);
  }

  expandParents(object) {
    if (!object) return;

    let parentNeedsExpansion = false;

    let parent = object.parent;

    while (parent !== this.editor.scene) {
      if (this.nodeStates.get(parent) !== true) {
        this.nodeStates.set(parent, true);

        parentNeedsExpansion = true;
      }

      parent = parent.parent;
    }

    if (parentNeedsExpansion) this.refreshTree();
  }

  scrollIntoView(id) {
    if (!this.container) return;

    const options = this.container.dom.querySelectorAll(".option");

    options.forEach((opt) => opt.classList.remove("active"));

    if (id !== null) {
      const selectedOption = this.container.dom.querySelector(
        `.option[value="${id}"]`,
      );

      if (selectedOption) {
        selectedOption.classList.add("active");

        selectedOption.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }

  traverse(object, callback) {
    callback(object);

    for (const child of object.children) {
      this.traverse(child, callback);
    }
  }

  collapseAll() {
    const collapseNode = (node) => {
      this.nodeStates.set(node, false);
    };

    this.traverse(this.editor.scene, collapseNode);

    this.refreshTree();
  }

  expandAll() {
    const expandNode = (node) => {
      this.nodeStates.set(node, true);
    };

    this.traverse(this.editor.scene, expandNode);

    this.refreshTree();
  }

  newNode(object, draggable) {
    const option = UIComponents.div();

    option.addClass("option");

    option.dom.draggable = draggable;

    option.dom.setAttribute("value", object.id);

    if (draggable) {
      option.dom.addEventListener("dragstart", this.onDragStart.bind(this));

      option.dom.addEventListener("dragover", this.onDragOver.bind(this));

      option.dom.addEventListener("dragleave", this.onDragLeave.bind(this));

      option.dom.addEventListener("drop", this.onDrop.bind(this));
    }

    return option;
  }

  buildOption(object, draggable) {
    const option = this.newNode(object, draggable);

    const opener = UIComponents.div();

    if (object.children.length > 0) {
      const state = this.nodeStates.get(object);

      const icon = UIComponents.icon(state ? "remove" : "add");

      icon.setStyle("fontSize", ["14px"]);

      icon.setStyle("cursor", ["pointer"]);

      opener.add(icon);

      opener.addClass(state ? "open" : "closed");

      opener.onClick((event) => {
        event.stopPropagation();

        event.preventDefault();

        this.nodeStates.set(object, !this.nodeStates.get(object));

        this.refreshTree();
      });
    } else {
      const placeholder = UIComponents.span();

      placeholder.setStyle("width", ["14px"]);

      placeholder.setStyle("display", ["inline-block"]);

      opener.add(placeholder);
    }

    option.add(opener);

    const ifcIconClasses = [
      "IfcWall",
      "IfcDoor",
      "IfcProject",
      "IfcSite",
      "IfcWindow",
      "IfcOpening",
    ];

    if (
      object.ifcClassification &&
      ifcIconClasses.includes(object.ifcClassification)
    ) {
      const icon = document.createElement("img");

      icon.className = "icon";

      icon.src = Paths.data(`/resources/icons/entities/${object.ifcClassification}.svg`);

      icon.alt = object.ifcClassification;

      icon.style.marginRight = "6px";

      option.dom.appendChild(icon);
    }

    const nameSpan = UIComponents.span(this.escapeHTML(object.name));

    nameSpan.addClass("object-name");

    option.add(nameSpan);

    if (object.ifcClassification) {
      const badge = UIComponents.badge(object.ifcClassification);

      option.add(badge);
    }

    const hasMeshChild =
      object.isMesh ||
      object.isInstancedRef ||
      (object.children && object.children.some((c) => c.isMesh));

    if (hasMeshChild) {
      const meshBadge = UIComponents.badge("Mesh");

      option.add(meshBadge);
    }

    this.buildExtras(option, object);

    const visibilityBtn = UIComponents.button().addClass("Operator");

    visibilityBtn.addClass("visibility-toggle");

    const updateIcon = () => {
      visibilityBtn.clear();

      const iconName = object.visible ? "visibility" : "visibility_off";

      const icon = UIComponents.icon(iconName);

      if (icon.dom) icon.dom.style.fontSize = "14px";

      visibilityBtn.add(icon);
    };

    updateIcon();

    visibilityBtn.onClick((event) => {
      event.stopPropagation();

      object.visible = !object.visible;

      updateIcon();

      this.context.editor.signals.sceneGraphChanged.dispatch();
    });

    option.add(visibilityBtn);

    option.onClick(() => {
      this.ignoreObjectSelectedSignal = true;

      this.editor.select(object);

      this.editor.signals.objectSelected.dispatch(object);

      this.ignoreObjectSelectedSignal = false;

      this.scrollIntoView(object.id);
    });

    option.onDblClick(() => {
      this.editor.focusById(object.id);
    });

    return option;
  }

  buildExtras(option, object) {
    if (object.isMesh) {
      const geometry = object.geometry;

      const material = object.material;

      const geoSpan = UIComponents.span();

      geoSpan.addClass("type", "Geometry");

      option.add(geoSpan);

      option.add(UIComponents.text(" " + this.escapeHTML(geometry.name)));

      const matSpan = UIComponents.span();

      matSpan.addClass("type", "Material");

      option.add(matSpan);

      option.add(
        UIComponents.text(" " + this.escapeHTML(this.getMaterialName(material))),
      );
    }

    if (
      this.editor.scripts[object.uuid] &&
      this.editor.scripts[object.uuid].length > 0
    ) {
      const scriptSpan = UIComponents.span();

      scriptSpan.addClass("type", "Script");

      option.add(scriptSpan);
    }
  }

  getMaterialName(material) {
    if (Array.isArray(material)) {
      const array = [];

      for (let i = 0; i < material.length; i++) {
        array.push(material[i].name);
      }

      return array.join(",");
    }

    return material.name;
  }

  refreshTree() {
    if (!this.container) return;

    this.container.clear();

    if (!this.context.activeLayer) return;

    const threeGroup = this.context.activeLayer.scene;

    if (!threeGroup) {
      console.warn("No spatial structure");

      return;
    }

    const addObjects = (objects, pad) => {
      for (let i = 0, l = objects.length; i < l; i++) {
        const object = objects[i];

        if (!object || object.isLine) continue;
        if (object.isHelperGroup || object.name === "_InstancedMeshes") continue;

        if (this.nodeStates.has(object) === false) {
          this.nodeStates.set(object, true);
        }

        const option = this.buildOption(object, object !== threeGroup);

        option.setStyle("paddingLeft", [pad * 18 + "px"]);

        this.container.add(option);

        if (this.nodeStates.get(object) === true) {
          addObjects(object.children, pad + 1);
        }
      }
    };

    addObjects([threeGroup], 0);

    if (this.editor.selected !== null) {
      this.scrollIntoView(this.editor.selected.id);
    }
  }

  onDragStart(event) {
    event.dataTransfer.setData("text/plain", "foo");

    this.currentDrag = event.target;
  }

  onDragOver(event) {
    event.preventDefault();

    if (event.target === this.currentDrag) return;

    const targetOption = event.target.closest(".option");

    if (!targetOption) return;

    const area = event.offsetY / targetOption.clientHeight;

    if (area < 0.25) {
      targetOption.classList.remove("dragBottom", "drag");

      targetOption.classList.add("dragTop");
    } else if (area > 0.75) {
      targetOption.classList.remove("dragTop", "drag");

      targetOption.classList.add("dragBottom");
    } else {
      targetOption.classList.remove("dragTop", "dragBottom");

      targetOption.classList.add("drag");
    }
  }

  onDragLeave(event) {
    const targetOption = event.target.closest(".option");

    if (targetOption && targetOption !== this.currentDrag) {
      targetOption.classList.remove("dragTop", "dragBottom", "drag");
    }
  }

  onDrop(event) {
    event.preventDefault();

    const targetOption = event.target.closest(".option");

    if (!targetOption) return;

    targetOption.classList.remove("dragTop", "dragBottom", "drag");

    if (targetOption === this.currentDrag || !this.currentDrag) return;

    const scene = this.editor.scene;

    const objectId = parseInt(this.currentDrag.getAttribute("value"), 10);

    const targetId = parseInt(targetOption.getAttribute("value"), 10);

    const object = scene.getObjectById(objectId);

    const targetObject = scene.getObjectById(targetId);

    if (!object || !targetObject) return;

    const area = event.offsetY / targetOption.clientHeight;

    let newParent;

    let nextObject;

    if (area < 0.25) {
      newParent = targetObject.parent;

      nextObject = targetObject;
    } else if (area > 0.75) {
      newParent = targetObject.parent;

      const nextSibling = targetOption.nextSibling;

      if (nextSibling && nextSibling.classList.contains("option")) {
        const nextId = parseInt(nextSibling.getAttribute("value"), 10);

        nextObject = scene.getObjectById(nextId);
      } else {
        nextObject = null;
      }
    } else {
      newParent = targetObject;

      nextObject = null;
    }

    if (!newParent) return;

    this.operators.execute("world.spatial.move_object", {
      objectId: object.id,
      newParentId: newParent.id,
      nextObjectId: nextObject ? nextObject.id : null,
    });
  }

  escapeHTML(html) {
    if (!html) return "";

    return String(html)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  filterSpatial(query) {
    this.searchQuery = query;

    this.refreshTree();
  }
}

export { SpatialManagerUI };
