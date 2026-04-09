import { SidebarSettings } from './Sidebar.Settings.js';

import { Components as UIComponents, BasePanel, TabPanel, makeDraggable } from '../../../ui/Components/Components.js';

import { SidebarProperties } from './Sidebar.Properties.js';

import Paths from '../../../utils/paths.js';

/**
 * 3D / scene + renderer settings as a BasePanel, toggled from the AppSettings sidebar node
 */
class ThreeDSettingsPanel extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      id: 'ThreeDSettingsPanel',
      parentId: 'AppSettings',
      panelStyles: {
        minWidth: '280px',
        width: 'min(400px, 92vw)',
        maxHeight: '75vh',
      },
      resizeHandles: ['w', 's', 'sw'],
      draggable: false,
      position: 'below-left',
      testing: false,
    });

    const title =
      context.strings.getKey('sidebar/3d-settings') || '3D Settings';

    const headerRow = this.createHeader(title, 'view_in_ar');

    this.header.add(headerRow);

    makeDraggable(this.panel.dom, headerRow.dom);

    this.draw();

  }

  draw() {

    const editor = this.context.editor;

    if (!editor) return false;

    const settings = SidebarSettings(editor);

    const internalTabs = UIComponents.tabbedPanel();

    internalTabs.addTab('threejs', 'Three.js', settings);

    internalTabs.select('threejs');

    internalTabs.setStyle('display', ['flex']);

    internalTabs.setStyle('flex-direction', ['column']);

    internalTabs.setStyle('flex', ['1']);

    internalTabs.setStyle('min-height', ['0']);

    internalTabs.setStyle('overflow', ['hidden']);

    this.content.add(internalTabs);
    
    this.context.ui.model.registerChild(this.parentId, this.constructor.name, internalTabs);

    return internalTabs;
  }
}

class ThreeJSProperties {
  constructor({ context, operators }) {
    

    this.draw(context, operators);
  }

  draw(context, operators ) {

    const window = UIComponents.floatingPanel({
      context,
      title: "Three.JS Meta",
      icon: "info",
      minimizedImageSrc: Paths.data("resources/images/three.png"),
      workspaceTabId: "properties",
      workspaceTabLabel: "Properties",
      startMinimized: true,
    });

    window.setContent(new SidebarProperties({ context, operators }));

  }
}

export { ThreeDSettingsPanel as Sidebar, ThreeJSProperties as Properties };
