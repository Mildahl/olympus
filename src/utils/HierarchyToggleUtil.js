export class HierarchyToggleUtil {
  constructor() {
    this.expanded = new Set();
  }

  toggleNode(id) {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);

      console.log("Collaps node:", id);
    } else {
      this.expanded.add(id);

      console.log("Expand node:", id);
    }
  }

  expandNode(id) {
    console.log("node added to expanded list:", id);

    this.expanded.add(id);
  }

  isExpanded(id) {
    return this.expanded.has(id);
  }

  expandAll(nodes) {
    const collectIds = (items) => {
      let ids = [];

      items.forEach(item => {
        ids.push(item.id);

        if (item.children && item.children.length > 0) {
          ids = ids.concat(collectIds(item.children));
        }
      });

      return ids;
    };

    this.expanded = new Set(collectIds(nodes));
  }

  collapseAll() {
    this.expanded.clear();
  }

  expandToLevel(nodes, level) {
    this.expanded.clear();

    const expandRecursive = (items, currentLevel) => {
      if (currentLevel >= level) return;

      items.forEach(item => {
        this.expanded.add(item.id);

        if (item.children && item.children.length > 0) {
          expandRecursive(item.children, currentLevel + 1);
        }
      });
    };

    expandRecursive(nodes, 0);
  }
}