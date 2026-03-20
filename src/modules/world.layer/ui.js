import { Components as UIComponents } from "../../ui/Components/Components.js";

import { BasePanel } from "../../../drawUI/BasePanel.js";

import AECO_tools from "../../tool/index.js";

const NAV = {
  world: "world",
  layer: "layer",
  object: "object",
};

/**
 * Layers UI: data sub-layers plus Three.js objects that live directly under the
 * owner’s scene root but are not a sub-layer’s `.scene` group (lights, loose objects).
 * No separate “Scene — …” row — the scene is the layer.
 */
class LayersUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "LayersModule",
      panelStyles: {
        height: "fit-content",
        maxHeight: "55vh",
        minWidth: "220px",
        overflow: "hidden",
      },

      resizeHandles: ["w", "n", "nw"],
      draggable: true,
      position: "above-left",
      testing: false,
    });

    this.editor = context.editor;

    this.navigableList = null;

    this.listContent = null;

    this.context.addListeners(["layerCreated"]);

    this.draw();

    this.listen(context);

    this.refresh();
  }

  listen(context) {
    context.signals.activeLayerUpdate.add((world) => {
      this.navigableList.setData(this.makeWorldNode(world));
    });

    context.signals.layerCreated.add(() => {
      this.refresh();
    });
  }

  makeWorldNode(world) {
    return { nav: NAV.world, collection: world };
  }

  collectionDisplayName(collection) {
    const n = collection?.name;

    return typeof n === "string" ? n : n?.name || "Unnamed layer";
  }

  isSkippableObject3D(object) {
    if (!object || object.isLine) return true;

    if (object.isHelperGroup || object.name === "_InstancedMeshes") return true;

    return false;
  }

  /** Sub-layer scene roots under `owner` — already listed as layer rows. */
  layerGroupRootsForOwner(owner) {
    const set = new Set();

    for (const child of owner?.children || []) {
      if (child?.scene) set.add(child.scene);
    }

    return set;
  }

  /** Scene children of `parent3d` that are not sub-layer roots (orphans under this layer). */
  orphanSceneChildren(owner, parent3d) {
    const skip = this.layerGroupRootsForOwner(owner);

    return (parent3d?.children || []).filter(
      (c) => !this.isSkippableObject3D(c) && !skip.has(c),
    );
  }

  /** Sub-layers first, then objects sitting on the owner’s scene root. */
  childrenForCollectionOwner(owner) {
    const out = [];

    for (const c of owner?.children || []) {
      out.push({ nav: NAV.layer, collection: c });
    }

    for (const object of this.orphanSceneChildren(owner, owner?.scene)) {
      out.push({ nav: NAV.object, object, owner });
    }

    return out;
  }

  getNavChildren(node) {
    if (!node) return [];

    if (node.nav === NAV.world) {
      return this.childrenForCollectionOwner(node.collection);
    }

    if (node.nav === NAV.layer) {
      return this.childrenForCollectionOwner(node.collection);
    }

    if (node.nav === NAV.object) {
      return this.orphanSceneChildren(node.owner, node.object).map((object) => ({
        nav: NAV.object,
        object,
        owner: node.owner,
      }));
    }

    return [];
  }

  getNavLabel(node) {
    if (!node) return "";

    if (node.nav === NAV.world) return "World";

    if (node.nav === NAV.layer) return this.collectionDisplayName(node.collection);

    if (node.nav === NAV.object) {
      return node.object?.name || `Object ${node.object?.id ?? ""}`;
    }

    return "";
  }

  draw() {
    this.clearPanel();

    const headerRow = this.createHeader("Layers", "layers");

    this.header.add(headerRow);

    const renderNavItem = (node, list) => {
      const item = UIComponents.div();

      item.addClass("LayerItem");

      const children = this.getNavChildren(node);

      if (node.nav === NAV.layer && node.collection?.active) {
        item.addClass("active");
      }

      const label = UIComponents.text(this.getNavLabel(node));

      label.addClass("LayerItem-name");

      item.add(label);

      if (children.length > 0) {
        item.add(UIComponents.text(`(${children.length})`));

        const arrow = UIComponents.operator("arrow_right_alt");

        arrow.onClick((event) => {
          event.stopPropagation();

          list.navigateTo(node);
        });

        item.add(arrow);
      }

      item.onClick(() => {
        if (node.nav === NAV.layer) {
          this.operators.execute(
            "world.activate_layer",
            this.context,
            node.collection.GlobalId,
          );

          return;
        }

        if (node.nav === NAV.object && node.object && this.editor) {
          this.editor.select(node.object);

          this.editor.signals?.objectSelected?.dispatch(node.object);
        }
      });

      return item;
    };

    this.navigableList = UIComponents.navigableList({
      icon: "layers",
      emptyMessage: "Nothing here",
      getChildren: (n) => this.getNavChildren(n),
      getLabel: (n) => this.getNavLabel(n),
      getTitle: (n) => this.getNavLabel(n),
      renderItem: renderNavItem,
    });

    this.listContent = this.navigableList.getElement();

    this.listContent.addClass("LayersPanel-content");

    this.content.add(this.listContent);
  }

  refresh() {
    const world = AECO_tools.world.layer.World;

    if (world) {
      this.navigableList.setData(this.makeWorldNode(world));
    }
  }
}

export { LayersUI };
