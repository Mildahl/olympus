import { Components as UIComponents, CollapsibleSection, SimpleFloatingWindow } from "../../ui/Components/Components.js";

import dataStore from "../../data/index.js";

import AECO_TOOLS from "../../tool/index.js";

import Paths from "../../utils/paths.js";

import { focusDockedWorkspaceTab } from "../../ui/Components/Components.js";

class AttributeUI {
  constructor({ context, operators }) {
    this.parent = document.getElementById("Identity");

    this.isActive = false;

    this.AttributePanel = this.basePanel(context);

    this.contextMenu = null;

    this.context = context;

    this.operators = operators;

    this.listen(context, operators);
  }

  listen(context, operators) {
    context.signals.enableEditingAttributes.add(
      async ({ GlobalId, Attributes, PropertiesData }) => {
        this.drawAttributePanel(context, operators, Attributes, PropertiesData);
        const isPanelMinimized = this.AttributePanel && this.AttributePanel.isMinimized;
        if (this.isActive || !isPanelMinimized) {
          this.showPanel(context, operators);
        }
      },
    );
  }

  basePanel(context) {
    const panel = UIComponents.floatingPanel({
      context,
      title: 'Entity Attributes',
      icon: 'info',
      minimizedImageSrc: Paths.data("resources/images/properties.svg"),
      workspaceTabId: 'bim.attribute',
      workspaceTabLabel: 'Attributes',
      startMinimized: true,
    });

    panel.setIcon("info");

    panel.setTitle("Entity Attributes");

    panel
      .setStyle("height", ["fit-content"])
      .setStyle("width", ["fit-content"])
      .setStyle("max-width", ["calc(45vw - var(--phi-1))"])
      .setStyle("max-height", ["80vh"]);

    const container = this._container();

    panel.setContent(container);

    container.add(this._noAttributeDisplay());

    const positionPanel = () => {
      if (!this.parent) return;
      const rect = this.parent.getBoundingClientRect();

      panel.setStyles({
        position: "absolute",
        top: rect.bottom + 5 + "px",
        left: rect.left + "px",
      });
    };

    positionPanel();

    return panel;
  }

  _noAttributeDisplay(context) {
    const noAttributesMsg = UIComponents.text(
      "No attributes to display. Select An IFC Entity",
    );

    noAttributesMsg.setStyle("font-size", ["14px"]);

    noAttributesMsg.setStyle("color", ["var(--text-secondary)"]);

    noAttributesMsg.setStyle("text-align", ["center"]);

    noAttributesMsg.setStyle("padding", ["20px"]);

    return noAttributesMsg;
  }

  _container() {
    const container = UIComponents.column();

    container.setStyle("gap", ["4px"]);

    container.setStyle("overflow-y", ["auto"]);

    return container;
  }

  drawAttributePanel(context, operators, attributeCollection, propertiesData = null) {
    const container = this._container();

    const entityClass =
      attributeCollection?.entityClass ||
      propertiesData?.entityClass ||
      "Entity";

    container.add(this._entity_info_row({ entityClass }));

    const calculateButton = UIComponents.button("Calculate Quantities");

    calculateButton.setIcon("straighten");
        
    calculateButton.setTooltip('Calculate Quantities');

    calculateButton.onClick(() => {
      this.operators.execute("bim.calculate_quantities", context, context.ifc.activeModel, attributeCollection?.entityGlobalId);
    });

    container.add(calculateButton);

    const attributesSection = UIComponents.collapsibleSection({
      title: "Attributes",
      icon: "list_alt",
      collapsed: false,
    });

    const attributesContent = this._container();

    if (
      !attributeCollection ||
      !attributeCollection.attributes ||
      attributeCollection.attributes.length === 0
    ) {
      attributesContent.add(this._noAttributeDisplay(context));
    } else {
      const listbox = UIComponents.list();

      listbox.setStyle("gap", ["2px"]);

      attributeCollection.attributes.forEach((attribute) => {
        listbox.add(this._createAttributeItem(attribute, attributeCollection));
      });

      attributesContent.add(listbox);

    }

    attributesSection.setContent(attributesContent);

    container.add(attributesSection);

    if (propertiesData?.psets?.length > 0) {
      for (const pset of propertiesData.psets) {
        const psetSection = UIComponents.collapsibleSection({
          title: pset.name,
          icon: "tune",
          collapsed: false,
        });

        const psetContent = this._container();

        psetContent.setStyle("gap", ["2px"]);

        const psetList = UIComponents.list();

        psetList.setStyle("gap", ["2px"]);

        pset.attributes.forEach((prop) => {
          psetList.add(this._createPropertyOrQuantityItem(prop, pset, "property", context, operators));
        });

        psetContent.add(psetList);

        psetSection.setContent(psetContent);

        container.add(psetSection);
      }
    }

    if (propertiesData?.qtos?.length > 0) {
      for (const qto of propertiesData.qtos) {
        const qtoSection = UIComponents.collapsibleSection({
          title: qto.name,
          icon: "straighten",
          collapsed: false,
        });

        const qtoContent = this._container();

        qtoContent.setStyle("gap", ["2px"]);

        const qtoList = UIComponents.list();

        qtoList.setStyle("gap", ["2px"]);

        qto.attributes.forEach((prop) => {
          qtoList.add(this._createPropertyOrQuantityItem(prop, qto, "quantity", context, operators));
        });

        qtoContent.add(qtoList);

        qtoSection.setContent(qtoContent);

        container.add(qtoSection);
      }
    }

    this.AttributePanel.setContent(container);
  }

  _entity_info_row(attributeCollectionOrEntityClass) {
    const header = UIComponents.row();

    header.setStyle("padding", ["8px"]);

    header.setStyle("border-bottom", ["1px solid var(--border)"]);

    let entityClass = "Entity";

    if (attributeCollectionOrEntityClass?.entityClass) {
      entityClass = attributeCollectionOrEntityClass.entityClass;
    } else if (typeof attributeCollectionOrEntityClass === "string") {
      entityClass = attributeCollectionOrEntityClass;
    }

    const title = UIComponents.text(entityClass || "No entity selected");

    title.setStyle("font-weight", ["bold"]);

    title.setStyle("font-size", ["12px"]);

    header.add(title);

    return header;
  }

  _createAttributeItem(attribute, attributeCollection) {
    const item = UIComponents.listItem();

    item.addClass("justify-between");

    if (attribute.isModified) {
      item.setStyle("background-color", ["rgba(255, 193, 7, 0.1)"]);

      item.setStyle("border-left", ["3px solid #ffc107"]);
    }

    if (attribute.hasError) {
      item.setStyle("background-color", ["rgba(220, 53, 69, 0.1)"]);

      item.setStyle("border-left", ["3px solid #dc3545"]);
    }

    if (!attribute.isEditable()) {
      item.setStyle("opacity", ["0.7"]);
    }

    const labelContainer = UIComponents.column();

    labelContainer.setStyle("flex", ["1"]);

    labelContainer.setStyle("min-width", ["0"]);

    labelContainer.setStyle("cursor", ["help"]);

    const label = UIComponents.text(attribute.displayName);

    label.setStyle("font-size", ["12px"]);

    label.setStyle("white-space", ["nowrap"]);

    label.setStyle("overflow", ["hidden"]);

    label.setStyle("text-overflow", ["ellipsis"]);

    if (attribute.description) {
      labelContainer.dom.title = attribute.description;
    }

    labelContainer.add(label);

    item.add(labelContainer);

    const input = this._createInputForAttribute(attribute, attributeCollection);

    if (input) {
      input.setStyle("flex", ["1"]);

      input.setStyle("max-width", ["50%"]);

      item.add(input);
    }

    return item;
  }

  _createInputForAttribute(attribute, attributeCollection) {
    const dataType = attribute.dataType;

    const value = attribute.getValue();

    const isEditable = attribute.isEditable();

    const getDataTypeTooltip = () => {
      return attribute.ifcType
        ? `${dataType} (${attribute.ifcType})`
        : dataType;
    };

    const saveAttribute = async (inputElement = null) => {
      if (!attribute.isModified) return;

      const modelName = this.context.ifc.activeModel;

      const attrDict = { [attribute.name]: attribute.getValue() };

      try {
        const result = await this.operators.execute(
          "bim.edit_attributes",
          this.context,
          modelName,
          attributeCollection.entityGlobalId,
          attrDict
        );

        if (result && result.success) {
          attribute.commitValue();

          if (inputElement) {
            this._updateItemState(inputElement, attribute);
          }
        }
      } catch (error) {
        console.error("Failed to save attribute:", error);
      }
    };

    const addSaveListeners = (input) => {
      if (!input || !input.dom) return;

      const inputEl = input.dom.querySelector("input") || input.dom;

      inputEl.addEventListener("blur", () => {
        saveAttribute(input);
      });

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();

          inputEl.blur();
        }
      });
    };

    if (dataType === "entity" || dataType === "list[entity]") {
      const pointerDisplay = this._createPointerDisplay(attribute);

      if (pointerDisplay && pointerDisplay.dom) {
        pointerDisplay.dom.title = getDataTypeTooltip();
      }

      return pointerDisplay;
    }

    if (!isEditable) {
      const text = UIComponents.text(attribute.getDisplayValue());

      text.setStyle("font-size", ["12px"]);

      text.setStyle("color", ["var(--text-secondary)"]);

      text.dom.title = getDataTypeTooltip();

      return text;
    }

    let input;

    switch (dataType) {
      case "string":
        input = UIComponents.input();

        input.setValue(value || "");

        input.setStyle("font-size", ["12px"]);

        input.onEnter(() => {
          attribute.setValue(input.getValue());

          this._updateItemState(input, attribute);
        });

        addSaveListeners(input);

        break;

      case "integer":
        input = UIComponents.number(value || 0);

        input.setStyle("font-size", ["12px"]);

        input.setPrecision(0);

        if (attribute.hasMinConstraint || attribute.hasMaxConstraint) {
          input.setRange(
            attribute.hasMinConstraint ? attribute.minValue : -Infinity,
            attribute.hasMaxConstraint ? attribute.maxValue : Infinity,
          );
        }

        input.dom.addEventListener("change", () => {
          attribute.setValue(parseInt(input.getValue()));

          this._updateItemState(input, attribute);
        });

        addSaveListeners(input);

        break;

      case "float":
        input = UIComponents.number(value || 0.0);

        input.setStyle("font-size", ["12px"]);

        if (attribute.hasMinConstraint || attribute.hasMaxConstraint) {
          input.setRange(
            attribute.hasMinConstraint ? attribute.minValue : -Infinity,
            attribute.hasMaxConstraint ? attribute.maxValue : Infinity,
          );
        }

        input.dom.addEventListener("change", () => {
          attribute.setValue(parseFloat(input.getValue()));

          this._updateItemState(input, attribute);
        });

        addSaveListeners(input);

        break;

      case "boolean":
        input = UIComponents.checkbox(value || false);

        input.dom.addEventListener("change", () => {
          attribute.setValue(input.getValue());

          this._updateItemState(input, attribute);

          saveAttribute(input);
        });

        break;

      case "enum":
        if (attribute.hasEnumOptions()) {
          const options = attribute.getEnumOptions();

          input = UIComponents.select();

          const optionsObj = {};

          options.items.forEach((item) => {
            optionsObj[item] = item;
          });

          input.setOptions(optionsObj);

          input.setValue(options.current || "");

          input.setStyle("font-size", ["12px"]);

          input.dom.addEventListener("change", () => {
            attribute.setValue(input.getValue());

            this._updateItemState(input, attribute);

            saveAttribute(input);
          });
        } else {
          input = UIComponents.text(value || "(no options)");

          input.setStyle("font-size", ["12px"]);
        }

        break;

      case "list[string]":

      case "list[float]":

      case "list[integer]":
        input = UIComponents.text(attribute.getDisplayValue());

        input.setStyle("font-size", ["12px"]);

        input.setStyle("color", ["var(--text-secondary)"]);

        break;

      default:
        input = UIComponents.text(attribute.getDisplayValue());

        input.setStyle("font-size", ["12px"]);
    }

    if (input && input.dom) {
      input.dom.title = getDataTypeTooltip();
    }

    return input;
  }

  _createPointerDisplay(attribute) {

    const pointers = attribute.pointers || [];

    const container = UIComponents.column();

    container.setStyle("gap", ["2px"]);

    if (attribute.isNull || pointers.length === 0) {
      const text = UIComponents.text(
        attribute.isOptional ? "(not set)" : "(null)",
      );

      text.setStyle("font-style", ["italic"]);

      return text;
    }

    if (attribute.dataType === "entity" && pointers.length === 1) {
      return this._createPointerLink(pointers[0]);
    }

    for (const pointer of pointers) {
      const link = this._createPointerLink(pointer);

      container.add(link);
    }

    return container;
  }

  _createPointerLink(pointer) {
    const row = UIComponents.row();

    row.setStyle("gap", ["4px"]);

    row.setStyle("align-items", ["center"]);

    const typeBadge = UIComponents.badge(pointer.type);

    typeBadge.setStyle("font-size", ["10px"]);

    typeBadge.setStyle("padding", ["1px 4px"]);

    typeBadge.setStyle("background-color", ["var(--bg-tertiary)"]);

    typeBadge.setStyle("border-radius", ["3px"]);

    typeBadge.setStyle("color", ["var(--text-secondary)"]);

    row.add(typeBadge);

    if (pointer.globalId) {
      const link = UIComponents.badge(`#${pointer.stepId}`);

      link.setStyle("color", ["var(--accent-color)"]);

      link.setStyle("cursor", ["pointer"]);

      link.onClick(() => {
        this.operators.execute(
          "bim.enable_editing_attributes",
          this.context.ifc.activeModel,
          pointer.globalId,
        );
      });

      row.add(link);

      const guidHint = UIComponents.text(
        pointer.globalId.substring(0, 8) + "...",
      );

      guidHint.setStyle("font-size", ["9px"]);

      guidHint.setStyle("color", ["var(--text-tertiary)"]);

      guidHint.setStyle("opacity", ["0.6"]);

      row.add(guidHint);
    } else {
      const text = UIComponents.text(`#${pointer.stepId}`);

      text.setStyle("font-size", ["11px"]);

      text.setStyle("color", ["var(--text-secondary)"]);

      row.add(text);
    }

    return row;
  }

  _updateItemState(input, attribute) {
    const item = input.dom.closest(".list-item") || input.dom.parentElement;

    if (item) {
      if (attribute.hasError) {
        item.style.backgroundColor = "rgba(220, 53, 69, 0.1)";

        item.style.borderLeft = "3px solid #dc3545";
      } else if (attribute.isModified) {
        item.style.backgroundColor = "rgba(255, 193, 7, 0.1)";

        item.style.borderLeft = "3px solid #ffc107";
      } else {
        item.style.backgroundColor = "";

        item.style.borderLeft = "";
      }
    }
  }

  _createPropertyOrQuantityItem(prop, collection, kind, context, operators) {
    const item = UIComponents.listItem();

    item.addClass("justify-between");

    item.setStyle("align-items", ["center"]);

    if (prop.isModified) {
      item.setStyle("background-color", ["rgba(255, 193, 7, 0.1)"]);

      item.setStyle("border-left", ["3px solid #ffc107"]);
    }

    const labelContainer = UIComponents.column();

    labelContainer.setStyle("flex", ["1"]);

    labelContainer.setStyle("min-width", ["0"]);

    const label = UIComponents.text(prop.displayName || prop.name);

    label.setStyle("font-size", ["12px"]);

    label.setStyle("white-space", ["nowrap"]);

    label.setStyle("overflow", ["hidden"]);

    label.setStyle("text-overflow", ["ellipsis"]);

    if (prop.description) labelContainer.dom.title = prop.description;

    labelContainer.add(label);

    item.add(labelContainer);

    const input = this._createInputForPropertyOrQuantity(prop, collection, kind, context, operators);

    if (input) {
      input.setStyle("flex", ["1"]);

      input.setStyle("max-width", ["50%"]);

      item.add(input);
    }

    return item;
  }

  _createInputForPropertyOrQuantity(prop, collection, kind, context, operators) {
    const dataType = prop.dataType || "string";

    const value = prop.getValue();

    const saveProp = async (inputEl) => {
      if (!prop.isModified) return;

      const psetGlobalId = collection.psetGlobalId;

      const modelName = context.ifc.activeModel;

      const dict = { [prop.name]: prop.getValue() };

      const op = kind === "quantity" ? "bim.edit_quantity_set" : "bim.edit_property_set";
      
      const args =
        kind === "quantity"
          ? [context, modelName, psetGlobalId, dict]
          : [context, modelName, psetGlobalId, dict];
      
      const result = await operators.execute(op, ...args);
  
      if (result?.success) {
        prop.commitValue();
        
        if (inputEl) this._updateItemState(inputEl, prop);
      }

    };

    const addSaveListeners = (input) => {
      if (!input?.dom) return;

      const inputEl = input.dom.querySelector("input") || input.dom;

      inputEl.addEventListener("blur", () => saveProp(input));

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();

          inputEl.blur();
        }
      });
    };

    if (dataType === "string") {
      const input = UIComponents.input();

      input.setValue(value != null ? String(value) : "");

      input.setStyle("font-size", ["12px"]);

      input.onEnter(() => {
        prop.setValue(input.getValue());

        this._updateItemState(input, prop);
      });

      addSaveListeners(input);

      return input;
    }

    if (dataType === "integer") {
      const input = UIComponents.number(value != null ? Number(value) : 0);

      input.setStyle("font-size", ["12px"]);

      input.setPrecision(0);

      input.dom.addEventListener("change", () => {
        prop.setValue(parseInt(input.getValue(), 10));

        this._updateItemState(input, prop);
      });

      addSaveListeners(input);

      return input;
    }

    if (dataType === "float") {
      const input = UIComponents.number(value != null ? Number(value) : 0);

      input.setStyle("font-size", ["12px"]);

      input.dom.addEventListener("change", () => {
        prop.setValue(parseFloat(input.getValue()));

        this._updateItemState(input, prop);
      });

      addSaveListeners(input);

      return input;
    }

    if (dataType === "boolean") {
      const input = UIComponents.checkbox(!!value);

      input.dom.addEventListener("change", () => {
        prop.setValue(input.getValue());

        this._updateItemState(input, prop);

        saveProp(input);
      });

      return input;
    }

    if (dataType === "enum" && prop.hasEnumOptions()) {
      const options = prop.getEnumOptions();

      const input = UIComponents.select();

      const optionsObj = {};

      options.items.forEach((item) => {
        optionsObj[item] = item;
      });

      input.setOptions(optionsObj);

      input.setValue(options.current != null ? options.current : "");

      input.setStyle("font-size", ["12px"]);

      input.dom.addEventListener("change", () => {
        prop.setValue(input.getValue());

        this._updateItemState(input, prop);

        saveProp(input);
      });

      return input;
    }

    return UIComponents.text(prop.getDisplayValue());
  }

  refreshAttributeData(context, operators) {
    const GlobalId = AECO_TOOLS.world.scene.getEntityGlobalId(
      context.editor.selected,
    );

    const AttributeCollection = GlobalId
      ? dataStore.getCollection("BIMAttributes", GlobalId)
      : null;

    return AttributeCollection;
  }

  toggle(context, operators) {
    if (this.isActive) {
      this.hidePanel();
    } else {
      this.showPanel(context, operators);
    }
  }

  appendDom(context) {
    const attributePanel = this.AttributePanel.dom;

    if (!attributePanel.parentNode) context.dom.appendChild(attributePanel);
  }

  showPanel(context, operators) {
    if (this.AttributePanel && this.AttributePanel.isMinimized) {
      this.AttributePanel.restore();
    }

    if (focusDockedWorkspaceTab(context, this.AttributePanel)) {
      this.isActive = true;
      return;
    }

    this.appendDom(context);

    this.isActive = true;
  }

  hidePanel() {
    if (this.AttributePanel && this.AttributePanel.dom.parentNode) {
      this.AttributePanel.dom.parentNode.removeChild(this.AttributePanel.dom);
    }

    this.isActive = false;
  }
}

class RightClickAttributesUI {
  constructor({ context, operators }) {
    
    const viewport = document.getElementById("viewport") || context.dom;

    if (!viewport) return;

    this._contextMenuJustOpened = false;

    viewport.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      e.stopPropagation();

      const selectedMesh = context.editor.selected;

      if (!selectedMesh) return;

      const globalId = AECO_TOOLS.world.scene.getEntityGlobalId(selectedMesh);

      this._contextMenuJustOpened = true;

      this.showContextMenu(
        e.clientX,
        e.clientY,
        context,
        selectedMesh,
        globalId,
      );

      setTimeout(() => {
        this._contextMenuJustOpened = false;
      }, 100);
    });

    document.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;

      if (this._contextMenuJustOpened) return;

      if (this.contextMenu && !this.contextMenu.dom.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.contextMenu) {
        this.hideContextMenu();
      }
    });

  }

  showContextMenu(x, y, context, mesh, globalId) {
    this.hideContextMenu();

    this.contextMenu = new SimpleFloatingWindow({ context, operators: this.operators });

    this.contextMenu.setTitle("Object Information");

    this.contextMenu.setIcon("info");

    this.contextMenu.setStyles({
      minWidth: "280px",
      maxWidth: "400px",
      maxHeight: "70vh",
      zIndex: "10",
    });

    const content = UIComponents.column();

    content.setStyle("padding", ["8px"]);

    content.setStyle("gap", ["8px"]);

    const attributesSection = this._createAttributesSection(globalId);

    content.add(attributesSection);

    this.contextMenu.setContent(content);
    
    this.contextMenu.position({ top: y + "px", left: x + "px" });

    this._adjustContextMenuPosition(x, y);

    this.contextMenu.show();
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.hide();
    }

    this.contextMenu = null;
  }

  _adjustContextMenuPosition(x, y) {
    if (!this.contextMenu) return;

    const menuRect = this.contextMenu.dom.getBoundingClientRect();

    const viewportWidth = window.innerWidth;

    const viewportHeight = window.innerHeight;

    let newX = x;

    let newY = y;

    if (x + menuRect.width > viewportWidth - 10) {
      newX = viewportWidth - menuRect.width - 10;
    }

    if (y + menuRect.height > viewportHeight - 10) {
      newY = viewportHeight - menuRect.height - 10;
    }

    this.contextMenu.setStyles({ left: newX + "px", top: newY + "px" });
  }

  _createAttributesSection(globalId) {
    const section = new CollapsibleSection({
      title: "Attributes",
      icon: "list_alt",
      collapsed: false,
    });

    const content = UIComponents.column();

    content.setStyle("gap", ["4px"]);

    content.setStyle("padding", ["4px"]);

    const AttributeCollection = globalId
      ? dataStore.getCollection("BIMAttributes", globalId)
      : null;

    if (!this._hasAttributes(AttributeCollection)) {
      this._addNoAttributesMessage(content);
    } else {
      this._addEntitytClass(content, AttributeCollection);

      this._addAttributesList(content, AttributeCollection);
    }

    section.setContent(content);

    return section;
  }

  _hasAttributes(AttributeCollection) {
    return (
      AttributeCollection &&
      AttributeCollection.attributes &&
      AttributeCollection.attributes.length > 0
    );
  }

  _addNoAttributesMessage(content) {
    const noData = UIComponents.text("No attributes available");

    noData.setStyle("font-size", ["12px"]);

    noData.setStyle("color", ["var(--text-secondary)"]);

    noData.setStyle("padding", ["8px"]);

    noData.setStyle("font-style", ["italic"]);

    content.add(noData);
  }

  _addEntitytClass(content, AttributeCollection) {
    if (AttributeCollection.entityClass) {
      const entityType = this._createEntityTypeRow(AttributeCollection.entityClass);

      content.add(entityType);
    }
  }

  _createEntityTypeRow(entityClass) {
    const entityType = UIComponents.row();

    entityType.setStyle("padding", ["4px 8px"]);

    entityType.setStyle("background", ["var(--bg-secondary, #2a2a2a)"]);

    entityType.setStyle("border-radius", ["3px"]);

    entityType.setStyle("margin-bottom", ["4px"]);

    const typeLabel = UIComponents.text("IFC Class:");

    typeLabel.setStyle("font-size", ["11px"]);

    typeLabel.setStyle("color", ["var(--text-secondary)"]);

    typeLabel.setStyle("margin-right", ["8px"]);

    entityType.add(typeLabel);

    const typeValue = UIComponents.text(entityClass);

    typeValue.setStyle("font-size", ["11px"]);

    typeValue.setStyle("font-weight", ["600"]);

    typeValue.setStyle("color", ["var(--accent-color, #4fc3f7)"]);

    entityType.add(typeValue);

    return entityType;
  }

  _addAttributesList(content, AttributeCollection) {
    AttributeCollection.attributes.forEach((attribute) => {

      if (attribute.isNull ) return 

      if (attribute.dataType === 'entity') return;

      const displayValue = attribute.getDisplayValue != null
        ? attribute.getDisplayValue()
        : (attribute.getValue != null ? attribute.getValue() : '');

      const displayText = displayValue != null && typeof displayValue === 'object'
        ? JSON.stringify(displayValue)
        : String(displayValue);

      const row = UIComponents.createPropertyRow(
        attribute.displayName,
        displayText,
        attribute.description,
      );

      content.add(row);
    });
  }

  _createPositionSection(mesh) {
    const section = new CollapsibleSection({
      title: "Position",
      icon: "open_with",
      collapsed: false,
    });

    const content = UIComponents.column();

    content.setStyle("gap", ["4px"]);

    content.setStyle("padding", ["4px"]);

    if (!this._hasPositionData(mesh)) {
      this._addNoPositionDataMessage(content);
    } else {
      this._addPositionData(content, mesh);

      this._addRotationData(content, mesh);

      this._addScaleDataIfNeeded(content, mesh);
    }

    section.setContent(content);

    return section;
  }

  _hasPositionData(mesh) {
    return mesh && mesh.position;
  }

  _addNoPositionDataMessage(content) {
    const noData = UIComponents.text("No position data available");

    noData.setStyle("font-size", ["12px"]);

    noData.setStyle("color", ["var(--text-secondary)"]);

    noData.setStyle("padding", ["8px"]);

    noData.setStyle("font-style", ["italic"]);

    content.add(noData);
  }

  _addPositionData(content, mesh) {
    this._addSectionHeader(content, "Position");

    content.add(
      UIComponents.createPropertyRow(
        "X",
        mesh.position.x.toFixed(3),
        "Position X coordinate",
      ),
    );

    content.add(
      UIComponents.createPropertyRow(
        "Y",
        mesh.position.y.toFixed(3),
        "Position Y coordinate",
      ),
    );

    content.add(
      UIComponents.createPropertyRow(
        "Z",
        mesh.position.z.toFixed(3),
        "Position Z coordinate",
      ),
    );
  }

  _addRotationData(content, mesh) {
    this._addSectionHeader(content, "Rotation");

    const radToDeg = (rad) => ((rad * 180) / Math.PI).toFixed(2) + "°";

    content.add(
      UIComponents.createPropertyRow(
        "X",
        radToDeg(mesh.rotation.x),
        "Rotation around X axis",
      ),
    );

    content.add(
      UIComponents.createPropertyRow(
        "Y",
        radToDeg(mesh.rotation.y),
        "Rotation around Y axis",
      ),
    );

    content.add(
      UIComponents.createPropertyRow(
        "Z",
        radToDeg(mesh.rotation.z),
        "Rotation around Z axis",
      ),
    );
  }

  _addScaleDataIfNeeded(content, mesh) {
    if (
      mesh.scale &&
      (mesh.scale.x !== 1 || mesh.scale.y !== 1 || mesh.scale.z !== 1)
    ) {
      this._addSectionHeader(content, "Scale");

      content.add(
        UIComponents.createPropertyRow("X", mesh.scale.x.toFixed(3), "Scale X"),
      );

      content.add(
        UIComponents.createPropertyRow("Y", mesh.scale.y.toFixed(3), "Scale Y"),
      );

      content.add(
        UIComponents.createPropertyRow("Z", mesh.scale.z.toFixed(3), "Scale Z"),
      );
    }
  }

  _addSectionHeader(content, title) {
    const header = UIComponents.text(title);

    header.setStyle("font-size", ["11px"]);

    header.setStyle("font-weight", ["600"]);

    header.setStyle("color", ["var(--text-secondary)"]);

    header.setStyle("margin-top", ["8px"]);

    header.setStyle("margin-bottom", ["4px"]);

    content.add(header);
  }
}


export default [AttributeUI, RightClickAttributesUI];
