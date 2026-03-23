import { SidebarSettings } from './Sidebar.Settings.js';

import { BasePanel } from '../../../../drawUI/BasePanel.js';

import { Components as UIComponents } from '../../../ui/Components/Components.js';

import { makeDraggable } from '../../../../drawUI/utils/panelResizer.js';

import { SidebarProperties } from './Sidebar.Properties.js';

import { TabPanel } from '../../../../drawUI/TabPanel.js';

/**
 * 3D / scene + renderer settings as a BasePanel, toggled from the AppSettings sidebar node
 * (see `moduleId: "settings"` with `id: "AppSettings"` in UI config).
 * Application tabs (General, Navigation, etc.) are registered on `context.ui.sidebarSettingsTabbedPanel`
 * by the settings module.
 *
 * Call `ensureBuilt()` after `new UI(...)` and before module UI loads — see `AECO.createUI`.
 */
class ThreeDSettingsPanel extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
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

    this._built = false;

    const title =
      context.strings.getKey('sidebar/3d-settings') || '3D Settings';

    const headerRow = this.createHeader(title, 'view_in_ar');

    this.header.add(headerRow);

    makeDraggable(this.panel.dom, headerRow.dom);

    context.ui.threeDSettingsPanel = this;
  }

  /**
   * @returns {boolean} true if the inner tab strip (incl. Three.js tab) is ready
   */
  ensureBuilt() {
    if (this._built) return true;

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

    this.context.ui.sidebarSettingsTabbedPanel = internalTabs;

    this._built = true;

    return true;
  }

  onShow() {
    this.ensureBuilt();
  }
}

class ThreeJSProperties extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: 'right',
      tabId: 'properties',
      tabLabel: 'Properties',
      icon: 'properties',
      title: 'Properties',
      showHeader: false,
      floatable: true,
      panelStyles: {
        minWidth: '240px',
      },
      autoShow: true,
    });

    this.draw(context, operators);
  }

  draw(context, operators ) {
    const properties = new SidebarProperties({ context, operators })

    this.content.add(properties);

  }
}

export { ThreeDSettingsPanel as Sidebar, ThreeJSProperties as Properties };
