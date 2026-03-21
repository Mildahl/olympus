export class HierarchyToggleUtil {
  constructor() {
    this.expanded = new Set();
  }

  toggleNode(id) {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
  }

  expandNode(id) {
    this.expanded.add(id);
  }

  isExpanded(id) {
    return this.expanded.has(id);
  }

  expandAll(nodes) {
    const nextExpanded = new Set();

    if (!Array.isArray(nodes)) {
      this.expanded = nextExpanded;

      return;
    }

    nodes.forEach((node) => {
      if (!node) {
        return;
      }

      const nodeId = node.id;

      if (nodeId === undefined || nodeId === null) {
        return;
      }

      nextExpanded.add(nodeId);
    });

    this.expanded = nextExpanded;
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