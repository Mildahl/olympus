import { TypeData } from "../bim.types/data.js";

import AECO_TOOLS from "../../tool/index.js";

import { Components as UIComponents } from "../../ui/Components/Components.js";

import { BasePanel, SimpleFloatingWindow } from "../../../drawUI/BasePanel.js";

import { UIHelper } from "../../ui/UIHelper.js";

class TypesUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "BIMModeling",
      panelStyles: {
        maxWidth: "90vw",
        maxHeight: "60vh",
        width: "fit-content",
        minWidth: "320px",
        overflow: "visible",
      },
      resizeHandles: ["w", "e", "s", "se", "sw"],
      position: 'below-center',
      draggable: true,
      testing: false,
      onDrag: () => this._repositionDropdown()
    });

    this.toggleSnapMenu = context.signals.toggleSnapMenu;
    
    this.drawingInitialized = false;

    this.parametersPanel = null;

    this.expandedCategory = null;

    this.dropdownPortal = null;

    this.currentDropdownHeader = null;

    this.dataLoaded = false;

    AECO_TOOLS.world.drawing.init(context);

    this.content.setId("Types")

    const drawHeader = () => {
      const topbar = UIComponents.row().addClass('weapons-menu-topbar');

      const title = UIComponents.text('Element Types').addClass('weapons-top-center');

      topbar.add(title);

      return topbar;
    }

    this.header.add(drawHeader());

    this.modelName = UIComponents.text();

    const modelInfo = () => {
      
      const modelNameRow = UIComponents.row().setStyle('flexDirection', ['row-reverse']);

      this.modelName.setValue('No model loaded').addClass('weapons-top-right');

      modelNameRow.add(this.modelName);

      return modelNameRow;
    }

    this.footer.add(modelInfo());

    this.listen(context)
  }
    
  async loadData() {
    if (!TypeData.is_loaded)await TypeData.load();

    if (!TypeData.is_active_type_loaded) await TypeData.loadActivetype()
    
    if(!TypeData.is_selection_loaded) await TypeData.loadSelection()
  }

  async handleTypeUI(GlobalId, ifcClass) {
    await this.loadData();

    const categoryName = ifcClass || this._getCategoryForGlobalId(GlobalId);

    const data = TypeData.data.element_types;
    
    if (!data) return;

    if (categoryName && this.expandedCategory !== categoryName) {
      this.expandedCategory = categoryName;

      this.draw(data);
    }

    if (categoryName && data[categoryName]) {
      const headerDom = this.content.dom.querySelector(`.weapons-menu-header.expanded`);

      if (headerDom) {
        this._showDropdown(headerDom, data[categoryName], categoryName);
      }
    }

    const item = this._getCard(GlobalId);

    if (!item) return;

    this._deactivateCards();

    this._activateItem(item);
  }

  draw(typeData) {
    if (!typeData || Object.keys(typeData).length === 0) {
      this.clearPanel();

      return;
    }

    const createTypeBadge = (typeData, categoryName) => {
      const total = typeData[categoryName].length;

      const header = UIComponents.div().addClass('weapons-menu-header');

      header.dom.title = `${categoryName} Types`;

      const totalBadge = UIComponents.text(total.toString()).addClass('weapons-item-count');

      const title = UIComponents.text(categoryName.replace('Ifc', '').replace('Type', '') + ' Types');

      header.add(totalBadge, title);

      return header;
    }

    const typeColumn = (categoryName, types) => {
      const header = createTypeBadge(typeData, categoryName);

      const isExpanded = this.expandedCategory === categoryName;

      if (isExpanded) header.addClass('expanded');
      
      header.onClick(() => {
        this._closeDropdown();

        if (this.expandedCategory === categoryName) {
          this.expandedCategory = null;
        } else {
          this.expandedCategory = categoryName;

          this._showDropdown(header.dom, typeData[categoryName], categoryName);
        }
      });

      return header;
    }

    const typesMenu = () => {
      const menu = UIComponents.row().addClass('weapons-menu-container');

      Object.keys(typeData).forEach((categoryName) => {
        const type = typeColumn(categoryName, typeData[categoryName]);

        menu.add(type);
      });

      return menu;
    }

    this.clearPanel()

    this.content.add(typesMenu());
  }

  drawTypeCard(context, operators, typeData, categoryName) {

    const { icon, Name, GlobalId, Description, instances, cost } = typeData;

    const { costValue , measureUnit } = cost || {};

    const item = UIComponents.div().addClass("SquareOperator").setSize('100%', '100%');

    const row1 = UIComponents.row().gap('var(--phi-0-5)').setStyles({
      width: '100%',
      flexDirection: 'row-reverse',
    });
    
    const costValueComponent = UIComponents.text()
    .setStyles({
      fontStyle: 'italic',
    })

    costValueComponent.setValue(`${costValue || 20}/ ${measureUnit || 'unit'}` )

    row1.add(costValueComponent);

    const row2 = UIComponents.row()
    
    const editOperatorButton = UIComponents.operator('edit');

    editOperatorButton.onClick(()=>{
      operators.execute('bim.enable_editing_attributes', context, null, GlobalId);
    })

    row2.add(UIComponents.text(Name), editOperatorButton)

    const row3 = UIComponents.row().gap('var(--phi-0-5)')
    .setStyles({
      width: '100%',
      flexDirection: 'row-reverse',
    });

    const occurencesCount = UIComponents.text().addClass("GameNumber")
    .setStyles({
      fontSize: '12px',
    })

    occurencesCount.setValue(instances || 0)

    row3.add(occurencesCount);

    item.add(row1, row2, row3)

    item.onClick(async () => {
      const result = await operators.execute('bim.set_active_type', context, GlobalId);
    });

    item.addClass('weapons-item-card');

    item.dom.setAttribute('data-guid', GlobalId);

    item.dom.setAttribute('data-category', categoryName);

    UIHelper.makeSceneDraggable(item, { GlobalId, Name, categoryName }, {
      onDrop: (x, y, data) => this._handleSceneDrop(x, y, data)
    });

    return item;

  }

  listen(context){
    this.listenBIMInteraction(context);

    this.handleDrawingContext(context);

    this._initSceneDropZone();
  }

  listenBIMInteraction(context){
    context.signals.activeModelChanged.add( async ({FileName}) => {
      
      TypeData.is_loaded = false;

      await this.loadData();

      this.modelName.setValue('Active Model: ' + FileName );
      
      this.draw(TypeData.data.element_types);
    } );

    context.editor.signals.objectSelected.add(async (object) => {

      if(!object || !object.isIfc) return;

      TypeData.is_selection_loaded = false;

      await this.loadData();

      const selectionData = TypeData.data.selection_data;
      
      this.handleTypeUI(selectionData.GlobalId, selectionData.IfcClass);

    });

    context.signals.activeTypeChanged.add(async ({ GlobalId, IfcClass }) => {

      this.handleTypeUI(GlobalId, IfcClass);

    });
  }

  handleDrawingContext(context){
    
    AECO_TOOLS.world.drawing.onStateChanged = (state) => {
      if(state === 'idle') this.toggleSnapMenu.dispatch(false);
      else this.toggleSnapMenu.dispatch(true);
    }

    AECO_TOOLS.world.drawing.onModeChanged = (mode) => {
      const activeTool = AECO_TOOLS.world.drawing.activeTool;

      if (mode && activeTool) {

        this._showParametersPanel(activeTool);

      } else {
        this._hideParametersPanel();

        this._deactivateCards();

        this._closeDropdown();

        this.expandedCategory = null;

        this.draw(TypeData.data.element_types);
      }
    };

    AECO_TOOLS.world.drawing.onOptionsChanged = (options) => {

      if (this.parametersPanel) {

        this.parametersPanel.updateValues(options);

      }
    };
  }

  _activateItem(item) {
    
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });

    item.classList.add('active');
  }

  _deactivateCards() {
    if (this.dropdownPortal) {
      this.dropdownPortal.dom.querySelectorAll('.weapons-item-card.active').forEach((n) => n.classList.remove('active'));
    }
  }

  _getCard(GlobalId) {
    if (this.dropdownPortal) {
      return this.dropdownPortal.dom.querySelector(`.weapons-item-card[data-guid='${GlobalId}']`);
    }

    return null;
  }

  _getCategoryForGlobalId(GlobalId) {
    const data = TypeData.data.element_types;

    if (!data) return null;

    for (const categoryName of Object.keys(data)) {
      const found = data[categoryName].find(item => item.GlobalId === GlobalId);

      if (found) return categoryName;
    }

    return null;
  }

  _showDropdown(headerDom, items, categoryName) {
    this._closeDropdown();
    
    this.currentDropdownHeader = headerDom;

    const rect = headerDom.getBoundingClientRect();
    
    const dropdown = UIComponents.column().addClass('weapons-dropdown-portal');

    dropdown.setStyles({
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      zIndex: '1000',
    });

    items.forEach((item) => {
      const card = this.drawTypeCard(this.context, this.operators, item, categoryName);

      dropdown.add(card);
    });

    this.dropdownPortal = dropdown;

    this.context.dom.appendChild(dropdown.dom);
  }

  _repositionDropdown() {
    if (!this.dropdownPortal || !this.currentDropdownHeader) return;

    const rect = this.currentDropdownHeader.getBoundingClientRect();

    this.dropdownPortal.setStyles({
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
    });
  }

  _closeDropdown() {
    if (this.dropdownPortal && this.dropdownPortal.dom.parentNode) {
      this.dropdownPortal.dom.parentNode.removeChild(this.dropdownPortal.dom);
    }

    this.dropdownPortal = null;

    this.currentDropdownHeader = null;
  }

  _initSceneDropZone() {
    UIHelper.initSceneDropZone(this.context, (x, y, data) => {
      if (data.GlobalId) {
        this._handleSceneDrop(x, y, data);
      }
    });
  }

  async _handleSceneDrop(clientX, clientY, typeData) {
    await this.operators.execute('bim.set_active_type', this.context, typeData.GlobalId);

    setTimeout(() => {
      const syntheticEvent = {
        clientX,
        clientY,
        preventDefault: () => {},
        stopPropagation: () => {},
      };

      AECO_TOOLS.world.drawing._handleMouseClick(this.context, syntheticEvent);
    }, 50);
  }

  _showParametersPanel(ifcClass) {
    
    this._hideParametersPanel();

    this.parametersPanel = new DrawingParametersPanel(this.context);

    const panel = this.parametersPanel.build(ifcClass);

    if (panel) {
      this.parametersPanel.show(this.context.dom);
    }
  }

  _hideParametersPanel() {
    if (this.parametersPanel) {
      this.parametersPanel.dispose();

      this.parametersPanel = null;
    }
  }

}

/**
 * Drawing Parameters Panel - displays context-specific options for all construction types
 * Updates in real-time when options change and supports parameter locking
 */
class DrawingParametersPanel {

  constructor(context) {
    this.context = context;

    this.dom = null;

    this.inputs = {}; 

    this.lockButtons = {}; 

    this.currentIfcClass = null;
  }

  /**
   * Get parameter definitions for a given IFC class
   */
  static getParametersForType(ifcClass) {
    const toolConfig = AECO_TOOLS.world.drawing.AVAILABLETOOLS[ifcClass];

    if (!toolConfig) return [];

    const constructionType = toolConfig.constructionType;

    switch (constructionType) {
      case 'layer':
        
        return [
          { name: 'height', label: 'Height', unit: 'm', min: 0.1, max: 20, step: 0.1 },
          { name: 'thickness', label: 'Thickness', unit: 'm', min: 0.05, max: 2, step: 0.01 },
          { name: 'alignment', label: 'Alignment', type: 'select', options: { center: 'Center', interior: 'Interior', exterior: 'Exterior' } },
        ];

      case 'layer_horizontal':
        
        return [
          { name: 'thickness', label: 'Thickness', unit: 'm', min: 0.05, max: 1, step: 0.01 },
        ];
      
      case 'profiled':
        
        if (ifcClass === 'IfcColumnType') {
          return [
            { name: 'depth', label: 'Height', unit: 'm', min: 0.1, max: 20, step: 0.1 },
            { name: 'width', label: 'Width', unit: 'm', min: 0.05, max: 2, step: 0.01, lockable: true },
            { name: 'thickness', label: 'Thickness', unit: 'm', min: 0.05, max: 2, step: 0.01 },
          ];
        } else if (ifcClass === 'IfcBeamType') {
          return [
            { name: 'depth', label: 'Depth', unit: 'm', min: 0.1, max: 2, step: 0.01 },
          ];
        }

        return [];

      case 'profiled_foundation':
        
        return [
          { name: 'depth', label: 'Pile Length', unit: 'm', min: 1, max: 50, step: 0.5 },
          { name: 'width', label: 'Width', unit: 'm', min: 0.1, max: 2, step: 0.05 },
          { name: 'thickness', label: 'Thickness', unit: 'm', min: 0.1, max: 2, step: 0.05 },
        ];

      case 'bounding_box':
        
        if (ifcClass === 'IfcWindowType') {
          return [
            { name: 'width', label: 'Width', unit: 'm', min: 0.3, max: 5, step: 0.1 },
            { name: 'height', label: 'Height', unit: 'm', min: 0.3, max: 4, step: 0.1 },
            { name: 'sillHeight', label: 'Sill Height', unit: 'm', min: 0, max: 3, step: 0.1 },
          ];
        } else if (ifcClass === 'IfcDoorType') {
          return [
            { name: 'width', label: 'Width', unit: 'm', min: 0.5, max: 3, step: 0.1 },
            { name: 'height', label: 'Height', unit: 'm', min: 1.5, max: 4, step: 0.1 },
          ];
        } else if (ifcClass === 'IfcFurnitureType' || ifcClass === 'IfcSystemFurnitureType') {
          return [
            { name: 'width', label: 'Width', unit: 'm', min: 0.1, max: 10, step: 0.1 },
            { name: 'height', label: 'Height', unit: 'm', min: 0.1, max: 5, step: 0.1 },
            { name: 'depth', label: 'Depth', unit: 'm', min: 0.1, max: 10, step: 0.1 },
          ];
        }

        return [];

      default:
        return [];
    }
  }

  /**
   * Build the panel UI for a specific IFC class
   */
  build(ifcClass) {
    this.currentIfcClass = ifcClass;

    this.inputs = {};

    this.lockButtons = {};

    const params = DrawingParametersPanel.getParametersForType(ifcClass);
    
    if (params.length === 0) {
      this.dom = null;

      return null;
    }

    const toolConfig = AECO_TOOLS.world.drawing.AVAILABLETOOLS[ifcClass];

    const toolName = ifcClass.replace('Ifc', '').replace('Type', '');

    const menu = UIComponents.column().gap('var(--phi-1)');

    menu.setStyles({
      width: '300px',
      position: 'absolute',
      top: 'var(--phi-0-5)',
      left: 'calc(var(--viewport-gizmo-size) + var(--phi-0-5))',
      backgroundColor: 'var(--game-hud)',
      zIndex: 6,
      boxShadow: 'var(--panel-shadow)',
      borderRadius: '6px',
      padding: 'var(--phi-1)',
    });

    const header = UIComponents.row().addClass('centered-vertical');

    header.setStyles({
      borderBottom: '1px solid var(--border-color)',
      paddingBottom: 'var(--phi-0-5)',
      marginBottom: 'var(--phi-0-5)',
    });

    const title = UIComponents.text(`${toolName} Parameters`);

    title.setStyles({ fontWeight: 'bold', fontSize: '14px' });

    header.add(title);

    menu.add(header);

    params.forEach((param) => {
      const row = this._createParameterRow(param);

      menu.add(row);
    });

    this.dom = menu;

    return menu;
  }

  /**
   * Create a single parameter row with input and optional lock button
   */
  _createParameterRow(param) {
    const row = UIComponents.row().gap('var(--phi-0-5)').addClass('centered-vertical');

    row.setStyles({ marginBottom: 'var(--phi-0-5)' });

    const label = UIComponents.text(param.label);

    label.setStyles({ width: '90px', flexShrink: '0' });

    row.add(label);

    const inputContainer = UIComponents.row().setStyles({ flex: '1', gap: 'var(--phi-0-5)' });

    let input;

    const currentValue = AECO_TOOLS.world.drawing.options[param.name];

    if (param.type === 'select') {
      input = UIComponents.select().addClass('hud-input');

      input.setOptions(param.options);

      input.setValue(currentValue || Object.keys(param.options)[0]);

      input.onChange((value) => {
        this._handleInputChange(param.name, value);
      });

      input.setStyles({ width: '100%' });
    } else {
      
      input = UIComponents.number(
        currentValue || param.min,
        param.min,
        param.max,
        param.step
      );

      input.onChange(() => {
        const value = parseFloat(input.getValue());

        this._handleInputChange(param.name, value);
      });

      input.setStyles({ minWidth: '60px', flex: '1' });
    }

    this.inputs[param.name] = input;

    inputContainer.add(input);

    if (param.unit) {
      const unitLabel = UIComponents.span(param.unit);

      unitLabel.setStyles({ width: '20px', textAlign: 'center' });

      inputContainer.add(unitLabel);
    }

    row.add(inputContainer);

    if (param.lockable !== false) {
      const lockBtn = this._createLockButton(param.name);

      this.lockButtons[param.name] = lockBtn;

      row.add(lockBtn);
    }

    return row;
  }

  /**
   * Create a lock toggle button for a parameter
   */
  _createLockButton(paramName) {
    const isLocked = AECO_TOOLS.world.drawing.isParamLocked(paramName);
    
    const btn = UIComponents.button(isLocked ? '🔒' : '🔓');

    btn.setStyles({
      width: '28px',
      height: '28px',
      padding: '0',
      fontSize: '14px',
      cursor: 'pointer',
      backgroundColor: isLocked ? 'var(--accent-color)' : 'transparent',
      border: '1px solid var(--border-color)',
      borderRadius: '4px',
    });

    btn.onClick(() => {
      this._toggleLock(paramName, btn);
    });

    btn.dom.title = isLocked ? 'Unlock parameter (mouse-driven)' : 'Lock parameter (value-driven)';

    return btn;
  }

  /**
   * Toggle lock state for a parameter
   */
  _toggleLock(paramName, btn) {
    const isCurrentlyLocked = AECO_TOOLS.world.drawing.isParamLocked(paramName);

    if (isCurrentlyLocked) {
      
      AECO_TOOLS.world.drawing.unlockParam(paramName);

      btn.setValue('🔓');

      btn.setStyles({ backgroundColor: 'transparent' });

      btn.dom.title = 'Lock parameter (value-driven)';
    } else {
      
      const currentValue = AECO_TOOLS.world.drawing.options[paramName];

      if (currentValue !== undefined) {
        AECO_TOOLS.world.drawing.lockParam(paramName, currentValue);

        btn.setValue('🔒');

        btn.setStyles({ backgroundColor: 'var(--accent-color)' });

        btn.dom.title = 'Unlock parameter (mouse-driven)';
      }
    }

    AECO_TOOLS.world.drawing.refreshPreview();
  }

  /**
   * Handle input value change
   */
  _handleInputChange(paramName, value) {
    
    AECO_TOOLS.world.drawing.setOptions({ [paramName]: value });

    if (AECO_TOOLS.world.drawing.isParamLocked(paramName)) {
      AECO_TOOLS.world.drawing.lockParam(paramName, value);
    }

    AECO_TOOLS.world.drawing.refreshPreview();
  }

  /**
   * Update input values from options (called when options change externally)
   */
  updateValues(options) {
    Object.keys(this.inputs).forEach((paramName) => {
      const input = this.inputs[paramName];

      const value = options[paramName];
      
      if (value !== undefined && input) {
        
        const currentInputValue = input.getValue();

        if (currentInputValue != value) {
          input.setValue(value);
        }
      }
    });
  }

  /**
   * Show the panel
   */
  show(container) {
    if (this.dom && container && !container.contains(this.dom.dom)) {
      container.appendChild(this.dom.dom);
    }
  }

  /**
   * Hide the panel
   */
  hide() {
    if (this.dom && this.dom.dom.parentElement) {
      this.dom.dom.parentElement.removeChild(this.dom.dom);
    }
  }

  /**
   * Dispose the panel
   */
  dispose() {
    this.hide();

    this.dom = null;

    this.inputs = {};

    this.lockButtons = {};
  }
}

export default [TypesUI];
