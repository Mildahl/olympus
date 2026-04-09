import Paths from "../../utils/paths.js";
import { Components as UIComponents, focusDockedWorkspaceTab } from "../../ui/Components/Components.js";

class SpatialManagerUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;
    this.isActive = false;

    this.panel = UIComponents.floatingPanel({
      context,
      title: "World structure",
      icon: "account_tree",
      minimizedImageSrc: Paths.data("resources/images/spatial_structure.svg"),
      workspaceTabId: "world-spatial-structure",
      workspaceTabLabel: "World structure",
      startMinimized: true,
    });

    this.panel
      .setStyle("width", ["320px"])
      .setStyle("height", ["min(65vh, 680px)"])
      .setStyle("min-width", ["240px"])
      .setStyle("max-width", ["45vw"])
      .setStyle("max-height", ["85vh"]);

    this.content = UIComponents.column();
    this.content.setStyle("height", ["100%"]);
    this.content.setStyle("gap", ["0"]);
    this.panel.setContent(this.content);

    this.editor = context.editor;

    this.nodeStates = new WeakMap();

    this.currentDrag = null;

    this.searchQuery = "";

    this.searchInput = null;

    this.container = null;

    this.draw();
    this.appendDom(context);
    this.isActive = true;

    this.listen(context, operators);
  }

  _isSpatialTabActive() {
    return this.isActive;
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

      if (this._isSpatialTabActive()) {
        this.refreshTree();
      }
    });

    context.signals.spatialExpandAll.add(() => this.expandAll());

    context.signals.spatialCollapseAll.add(() => this.collapseAll());

    editorSignals.sceneGraphChanged.add(() => this.refreshTree());

    editorSignals.editorCleared.add(() => this.refreshTree());

    editorSignals.objectSelected.add((object) => {
      if (!this._isSpatialTabActive()) return;

      if (!object) {
        this.applySpatialOutlinerSelectionHighlight(null);

        return;
      }

      this.expandParents(object);

      this.applySpatialOutlinerSelectionHighlight(object.id);
    });
  }

  draw() {
    this.content.clear();

    this.container = UIComponents.div();

    this.container.addClass("Outliner");

    this.container.setStyle("padding", ["0.5rem"]);

    this.container.setStyle("flex", ["1"]);
    this.container.setStyle("overflow-y", ["auto"]);
    this.content.add(this.container);

    const footerContent = UIComponents.column();

    footerContent.setStyle("width", ["100%"]);

    const searchRow = UIComponents.row();

    searchRow
      .setStyle("padding", ["0.5rem 0.75rem"])
      .setStyle("width", ["100%"]);

    const searchInput = UIComponents.input();

    searchInput.dom.setAttribute("placeholder", "Search...");
    searchInput.addClass("SpatialPanel-searchInput");

    searchInput.setStyle("width", ["100%"]);

    searchInput.setStyle("flex", ["1"]);

    searchInput.dom.addEventListener("input", (e) => {
      this.filterSpatial(e.target.value);
    });

    this.searchInput = searchInput;

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

    this.content.add(footerContent);
  }

  appendDom(context) {
    const panelDom = this.panel.dom;
    if (!panelDom.parentNode) {
      context.dom.appendChild(panelDom);
    }
  }

  show() {
    if (this.panel && this.panel.isMinimized) {
      this.panel.restore();
    }

    if (focusDockedWorkspaceTab(this.context, this.panel)) {
      this.isActive = true;
      return this;
    }

    this.appendDom(this.context);
    this.isActive = true;
    return this;
  }

  hide() {
    if (this.panel && this.panel.dom.parentNode) {
      this.panel.dom.parentNode.removeChild(this.panel.dom);
    }
    this.isActive = false;
    return this;
  }

  shouldIncludeInSpatialOutliner(object) {
    if (!object || object.isLine) return false;

    if (object.isHelperGroup || object.name === "_InstancedMeshes") return false;

    const parentIfc = object.parent;

    if (
      object.userData &&
      object.userData.ifcBodyMesh === true &&
      parentIfc &&
      parentIfc.isIfc &&
      parentIfc.GlobalId
    ) {
      return false;
    }

    return true;
  }

  getSpatialOutlinerChildCount(object) {
    let count = 0;

    const children = object.children;

    for (let i = 0, l = children.length; i < l; i++) {
      if (this.shouldIncludeInSpatialOutliner(children[i])) count++;
    }

    return count;
  }

  hasSpatialOutlinerChildren(object) {
    return this.getSpatialOutlinerChildCount(object) > 0;
  }

  getSortedSpatialOutlinerSiblings(objects) {
    const list = [];

    if (!objects || objects.length === 0) {
      return list;
    }

    for (let i = 0, l = objects.length; i < l; i++) {
      const object = objects[i];

      if (this.shouldIncludeInSpatialOutliner(object)) {
        list.push(object);
      }
    }

    list.sort((first, second) => {
      const firstBranch = this.hasSpatialOutlinerChildren(first);

      const secondBranch = this.hasSpatialOutlinerChildren(second);

      if (firstBranch !== secondBranch) {
        return firstBranch ? -1 : 1;
      }

      const firstSpatial =
        first.isIfc === true && first.isSpatialContainer === true;

      const secondSpatial =
        second.isIfc === true && second.isSpatialContainer === true;

      if (firstSpatial !== secondSpatial) {
        return firstSpatial ? -1 : 1;
      }

      const firstName = first.name ? String(first.name).toLowerCase() : "";

      const secondName = second.name ? String(second.name).toLowerCase() : "";

      return firstName.localeCompare(secondName);
    });

    return list;
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

  applySpatialOutlinerSelectionHighlight(objectId) {
    if (!this.container) return;

    const optionElements = this.container.dom.querySelectorAll(".option");

    for (let index = 0; index < optionElements.length; index++) {
      optionElements[index].classList.remove('Active');
    }

    if (objectId !== null && objectId !== undefined) {
      const selectedOption = this.container.dom.querySelector(
        `.option[value="${objectId}"]`,
      );

      if (selectedOption) {
        selectedOption.classList.add('Active');
      }
    }
  }

  onTabSelected() {
    this.refreshTree();
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

  buildOption(object, draggable, forceExpanded = false) {
    const option = this.newNode(object, draggable);

    const opener = UIComponents.div();

    if (this.hasSpatialOutlinerChildren(object)) {
      const state = forceExpanded ? true : this.nodeStates.get(object);

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
      this.editor.select(object);
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

    const searchActive = this.searchQuery.length > 0;

    if (searchActive) {
      this.container.dom.classList.add("Outliner-search-active");
    } else {
      this.container.dom.classList.remove("Outliner-search-active");
    }

    let visibleNodeCount = 0;

    const addObjects = (objects, pad) => {
      const sortedSiblings = this.getSortedSpatialOutlinerSiblings(objects);

      for (let i = 0, l = sortedSiblings.length; i < l; i++) {
        const object = sortedSiblings[i];

        if (this.nodeStates.has(object) === false) {
          this.nodeStates.set(object, true);
        }

        if (searchActive && !this.subtreeHasMatch(object, this.searchQuery)) {
          continue;
        }

        const option = this.buildOption(object, object !== threeGroup, searchActive);

        option.setStyle("paddingLeft", [pad * 18 + "px"]);

        this.container.add(option);

        visibleNodeCount++;

        const shouldRecurse = searchActive
          ? true
          : this.nodeStates.get(object) === true;

        if (shouldRecurse) {
          addObjects(object.children, pad + 1);
        }
      }
    };

    addObjects([threeGroup], 0);

    if (searchActive && visibleNodeCount === 0) {
      const emptyMessage = UIComponents.text("No nodes match your search");

      emptyMessage
        .setStyle("padding", ["1rem"])
        .setStyle("text-align", ["center"])
        .setStyle("color", ["var(--theme-text-light)"])
        .setStyle("font-size", ["0.8rem"])
        .setStyle("display", ["block"]);

      this.container.add(emptyMessage);
    }

    if (this.editor.selected !== null) {
      this.applySpatialOutlinerSelectionHighlight(this.editor.selected.id);
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

  subtreeHasMatch(object, query) {
    const name = object.name ? object.name.toLowerCase() : "";

    if (name.includes(query)) return true;

    const children = object.children;

    for (let i = 0; i < children.length; i++) {
      if (
        this.shouldIncludeInSpatialOutliner(children[i]) &&
        this.subtreeHasMatch(children[i], query)
      ) {
        return true;
      }
    }

    return false;
  }

  filterSpatial(query) {
    this.searchQuery = query.trim().toLowerCase();

    this.refreshTree();
  }
}

export { SpatialManagerUI };
