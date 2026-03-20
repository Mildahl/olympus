import { BasePanel } from "../../../drawUI/BasePanel.js";

/**
 * NotificationsUI - UI for managing notifications using BasePanel
 */
class InformationUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "NotificationsModule",
      panelStyles: {
        height: "fit-content",
        maxHeight: "60vh",
        minWidth: "320px",
        maxWidth: "400px",
        overflow: "hidden"
      },
      resizeHandles: ['e', 's'],
      position: 'below',
      draggable: true,
      testing:false
    });

    this.firstDisplay = true;
  }

}

export { InformationUI };