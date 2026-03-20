# LayoutManager API

LayoutManager controls the application's panel layout with tabs, resizable panels, and state persistence.

## Import

```javascript
// Access via context
const layoutManager = context.editor.layoutManager;

// Or from simulation
const layoutManager = simulation.editor.layoutManager;
```

## Types

### LayoutPosition

```typescript
type LayoutPosition = 'left' | 'right' | 'bottom';
```

### LayoutManagerConfig

```typescript
interface LayoutManagerConfig {
    leftWorkspaceWidth?: number;     // Default: 300
    rightWorkspaceWidth?: number;    // Default: 300
    bottomWorkspaceHeight?: number;  // Default: 200
    minPanelSize?: number;       // Default: 100
    resizerSize?: number;        // Default: 4
    storageKey?: string;         // Default: 'aeco-layout-state'
}
```

### AddTabOptions

```typescript
interface AddTabOptions {
    open?: boolean;      // Default: true - Open panel after adding
    replace?: boolean;   // Default: true - Replace existing tab with same ID
}
```

### RemoveTabOptions

```typescript
interface RemoveTabOptions {
    closeIfEmpty?: boolean;  // Default: false - Close panel if no tabs remain
}
```

### SelectTabOptions

```typescript
interface SelectTabOptions {
    open?: boolean;  // Default: true - Open panel when selecting
}
```

## Constructor

```javascript
new LayoutManager(options?: LayoutManagerConfig)
```

Creates a new LayoutManager instance.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | LayoutManagerConfig | Configuration options |

**Example:**
```javascript
const layoutManager = new LayoutManager({
    leftWorkspaceWidth: 350,
    rightWorkspaceWidth: 400,
    bottomWorkspaceHeight: 250,
    minPanelSize: 150
});
```

## Initialization Methods

### init(containerId)

Initialize LayoutManager with a container element.

```javascript
layoutManager.init(containerId?: string): LayoutManager
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `containerId` | string | `'World'` | ID of container element |

**Returns:** `this` for chaining

---

### setContext(context)

Set the application context for signal dispatching.

```javascript
layoutManager.setContext(context: Context): LayoutManager
```

**Returns:** `this` for chaining

Registers these signals on the context:
- `layoutTabChanged`
- `layoutTabAdded`
- `layoutTabRemoved`
- `layoutWorkspaceChanged`

---

### registerTabbedWorkspaces(tabbedWorkspaces)

Register tabbed workspace references created by the UI.

```javascript
layoutManager.registerTabbedWorkspaces(tabbedWorkspaces: {
    left?: TabbedPanel,
    right?: TabbedPanel,
    bottom?: TabbedPanel
}): LayoutManager
```

**Returns:** `this` for chaining

## Tab Management

### addTab(position, id, label, content, options)

Add a tab to a layout panel.

```javascript
layoutManager.addTab(
    position: LayoutPosition,
    id: string,
    label: string,
    content: HTMLElement | UIElement,
    options?: AddTabOptions
): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | LayoutPosition | Workspace position |
| `id` | string | Unique tab identifier |
| `label` | string | Display text in tab header |
| `content` | HTMLElement \| {dom: HTMLElement} | Tab content |
| `options.open` | boolean | Open workspace after adding (default: true) |
| `options.replace` | boolean | Replace existing tab with same ID (default: true) |

**Returns:** `true` if tab was added, `false` otherwise

**Emits:** `layoutTabAdded` with `{ position, id }`

**Example:**
```javascript
const content = UIComponents.div();
content.add(UIComponents.text("Hello World"));

layoutManager.addTab('right', 'my-panel', 'My Panel', content);

// Add without opening
layoutManager.addTab('left', 'tree', 'Tree', treeContent, { open: false });
```

---

### removeTab(position, id, options)

Remove a tab from a layout panel.

```javascript
layoutManager.removeTab(
    position: LayoutPosition,
    id: string,
    options?: RemoveTabOptions
): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | LayoutPosition | Workspace position |
| `id` | string | Tab identifier |
| `options.closeIfEmpty` | boolean | Close workspace if no tabs remain (default: false) |

**Returns:** `true` if removed, `false` otherwise

**Emits:** `layoutTabRemoved` with `{ position, id }`

---

### selectTab(position, id, options)

Select (activate) a tab in a layout panel.

```javascript
layoutManager.selectTab(
    position: LayoutPosition,
    id: string,
    options?: SelectTabOptions
): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | LayoutPosition | Workspace position |
| `id` | string | Tab identifier |
| `options.open` | boolean | Open workspace if closed (default: true) |

**Returns:** `true` if selected, `false` otherwise

**Emits:** `layoutTabChanged` with `{ position, id }`

---

### toggleTab(position, id)

Toggle a tab's visibility. If workspace is open and tab is selected, closes workspace. Otherwise, selects tab and opens workspace.

```javascript
layoutManager.toggleTab(position: LayoutPosition, id: string): boolean
```

**Returns:** `true`

**Example:**
```javascript
// Good for toolbar toggle buttons
settingsButton.onClick(() => {
    layoutManager.toggleTab('right', 'settings');
});
```

---

### hasTab(position, id)

Check if a tab exists.

```javascript
layoutManager.hasTab(position: LayoutPosition, id: string): boolean
```

---

### isTabSelected(position, id)

Check if a tab is currently selected.

```javascript
layoutManager.isTabSelected(position: LayoutPosition, id: string): boolean
```

---

### getTabIds(position)

Get all tab IDs in a workspace.

```javascript
layoutManager.getTabIds(position: LayoutPosition): string[]
```

**Example:**
```javascript
const tabs = layoutManager.getTabIds('right');
// ['settings', 'properties', 'inspector']
```

---

### getSelectedTabId(position)

Get the currently selected tab ID.

```javascript
layoutManager.getSelectedTabId(position: LayoutPosition): string | null
```

---

### clearTabs(position, closeWorkspace)

Remove all tabs from a workspace.

```javascript
layoutManager.clearTabs(position: LayoutPosition, closeWorkspace?: boolean): boolean
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `position` | LayoutPosition | — | Workspace position |
| `closeWorkspace` | boolean | `true` | Close workspace after clearing |

---

### setTabLabel(position, id, label)

Update a tab's label text.

```javascript
layoutManager.setTabLabel(position: LayoutPosition, id: string, label: string): boolean
```

**Example:**
```javascript
// Show item count in label
layoutManager.setTabLabel('left', 'items', `Items (${count})`);
```

---

### getTabContent(position, id)

Get the content element of a tab.

```javascript
layoutManager.getTabContent(position: LayoutPosition, id: string): HTMLElement | null
```

## Workspace Control

### openWorkspace(position)

Open a workspace.

```javascript
layoutManager.openWorkspace(position: LayoutPosition): void
```

**Emits:** `layoutWorkspaceChanged` with `{ position, open: true }`

---

### closeWorkspace(position)

Close a workspace.

```javascript
layoutManager.closeWorkspace(position: LayoutPosition): void
```

**Emits:** `layoutWorkspaceChanged` with `{ position, open: false }`

---

### isWorkspaceOpen(position)

Check if a workspace is open.

```javascript
layoutManager.isWorkspaceOpen(position: LayoutPosition): boolean
```

---

### getWorkspaceWidth(position)

Get current workspace width.

```javascript
layoutManager.getWorkspaceWidth(position: 'left' | 'right'): number
```

---

### setWorkspaceWidth(position, width)

Set workspace width.

```javascript
layoutManager.setWorkspaceWidth(position: 'left' | 'right', width: number): void
```

---

### getWorkspaceHeight(position)

Get current workspace height.

```javascript
layoutManager.getWorkspaceHeight(position: 'bottom'): number
```

---

### setWorkspaceHeight(position, height)

Set workspace height.

```javascript
layoutManager.setWorkspaceHeight(position: 'bottom', height: number): void
```

## Element Binding

### bindToggle(elementOrId, position, tabId)

Bind a DOM element to toggle a specific tab.

```javascript
layoutManager.bindToggle(
    elementOrId: string | HTMLElement,
    position: LayoutPosition,
    tabId: string
): Function | null
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `elementOrId` | string \| HTMLElement | Element or its ID |
| `position` | LayoutPosition | Workspace position |
| `tabId` | string | Tab identifier |

**Returns:** Cleanup function to unbind, or `null` if element not found

Creates bidirectional binding:
- Clicking element toggles the tab
- Element's 'Active' class syncs with tab state

**Example:**
```javascript
// Bind by ID
const unbind = layoutManager.bindToggle('sidebarBtn', 'right', 'settings');

// Bind by element
const btn = document.getElementById('treeBtn');
layoutManager.bindToggle(btn, 'left', 'tree');

// Later, to unbind
unbind();
```

## Signals

LayoutManager emits signals through the context:

| Signal | Payload | When |
|--------|---------|------|
| `layoutTabChanged` | `{ position: string, id: string }` | Tab selection changes |
| `layoutTabAdded` | `{ position: string, id: string }` | Tab is added |
| `layoutTabRemoved` | `{ position: string, id: string }` | Tab is removed |
| `layoutWorkspaceChanged` | `{ position: string, open: boolean }` | Workspace opens/closes |

**Example:**
```javascript
context.signals.layoutTabChanged.add((data) => {
    console.log(`Tab changed in ${data.position}: ${data.id}`);
});

context.signals.layoutWorkspaceChanged.add((data) => {
    if (data.position === 'bottom' && data.open) {
        // Bottom workspace opened
    }
});
```

## State Persistence

LayoutManager automatically persists state to localStorage:

- Workspace open/closed states
- Workspace sizes (width/height)
- Selected tabs per workspace

State is saved using the `storageKey` from config (default: `'aeco-layout-state'`).

## Keyboard Shortcuts

Default shortcuts (can be configured):

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle left workspace |
| `Ctrl+Alt+B` | Toggle right workspace |
| `Ctrl+J` | Toggle bottom workspace |

## Complete Example

```javascript
import { UIComponents } from "aeco";

class MyAddonUI {
    constructor({ context, operators }) {
        this.context = context;
        this.layoutManager = context.editor.layoutManager;
        
        // Create panel content
        this.panel = this.createPanel();
        
        // Register with layout
        this.layoutManager.addTab(
            'right',
            'myaddon',
            'My Addon',
            this.panel,
            { open: false }
        );
        
        // Create toolbar button
        this.setupToolbar();
        
        // Listen to layout changes
        this.context.signals.layoutTabChanged.add(this.onTabChange.bind(this));
    }
    
    createPanel() {
        const panel = UIComponents.div();
        panel.setStyle("padding", "16px");
        panel.add(UIComponents.h3("My Addon"));
        panel.add(UIComponents.text("Content here..."));
        return panel;
    }
    
    setupToolbar() {
        const toolbar = document.getElementById('ViewportTools');
        const btn = UIComponents.icon("extension");
        btn.dom.id = "myaddon-btn";
        toolbar?.appendChild(btn.dom);
        
        this.unbindToggle = this.layoutManager.bindToggle(
            btn.dom,
            'right',
            'myaddon'
        );
    }
    
    onTabChange(data) {
        if (data.position === 'right' && data.id === 'myaddon') {
            this.onWorkspaceActivated();
        }
    }
    
    onWorkspaceActivated() {
        // Workspace became active
    }
    
    destroy() {
        this.layoutManager.removeTab('right', 'myaddon');
        document.getElementById('myaddon-btn')?.remove();
        this.unbindToggle?.();
    }
}
```

## Related

- [Using LayoutManager Guide](../guides/using-layoutmanager.md)
- [UIComponents API](components.md)
- [Building UI Guide](../guides/building-ui.md)
