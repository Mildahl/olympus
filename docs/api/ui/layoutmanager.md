# LayoutManager API

LayoutManager controls the application's panel layout with tabs, resizable panels, and state persistence.

## Import

```javascript
// Olympus / AECO host: LayoutManager is on context
const layoutManager = context.layoutManager;

// Some embeddings may expose it on the editor
const editor = context.editor;
const layoutManager = editor ? editor.layoutManager : null;
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

Used by `addTab` and `ensureTab`.

```typescript
interface AddTabOptions {
    open?: boolean;       // Default: true — open workspace after adding
    replace?: boolean;    // Default: true — replace existing tab with same ID
    floatable?: boolean;  // Default: false — show “undock” on the workspace tab label
}
```

When `floatable` is `true`, the tab row shows a small control (e.g. open-in-new) that calls any handler registered with `registerTabFloatHandler` for that `position` + tab `id`. The built-in `TabPanel` class registers this handler automatically when its `floatable` option is set.

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

Also assigns each workspace panel `_layoutManager` and `_layoutWorkspacePosition` so low-level tab UI (e.g. `UITabbedPanel`) can invoke floating behavior.

---

### ensureTab(position, id, label, content, options)

Idempotent: adds the tab only if it does not already exist. Accepts the same `AddTabOptions` as `addTab` (including `floatable`).

```javascript
layoutManager.ensureTab(
    position: LayoutPosition,
    id: string,
    label: string,
    content: HTMLElement | UIElement,
    options?: AddTabOptions
): boolean
```

Default options: `open: false`, `replace: false`.

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
| `options.floatable` | boolean | Tab-strip undock control (default: false) |

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

Update a tab's visible title. For composite tabs (label + optional float icon), only the `.Tab-label` text is updated.

```javascript
layoutManager.setTabLabel(position: LayoutPosition, id: string, label: string): boolean
```

**Example:**
```javascript
// Show item count in label
layoutManager.setTabLabel('left', 'items', `Items (${count})`);
```

---

### registerTabFloatHandler(position, tabId, fn)

Register the callback invoked when the user activates the float control on a **floatable** workspace tab (same `position` and `id` as `addTab`).

```javascript
layoutManager.registerTabFloatHandler(
    position: LayoutPosition,
    tabId: string,
    fn: () => void
): () => void
```

**Returns:** A cleanup function that removes this handler.

`TabPanel` registers this for you when `floatable: true`. Use directly only for custom panels that are not `TabPanel` but still use `floatable` tabs.

---

### invokeTabFloat(position, tabId)

Calls the handler registered with `registerTabFloatHandler`, if any. Normally used from workspace tab UI, not application code.

```javascript
layoutManager.invokeTabFloat(position: LayoutPosition, tabId: string): void
```

---

### restoreWorkspaceTabSelections()

Re-applies saved active tab IDs per workspace from layout state (see [State persistence](#state-persistence)). Called automatically after workspaces register; you can call it again if your module adds tabs asynchronously.

```javascript
layoutManager.restoreWorkspaceTabSelections(): LayoutManager
```

**Returns:** `this` for chaining

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

### getWorkspaceSize(position)

Get the current width (left/right) or height (bottom) in pixels.

```javascript
layoutManager.getWorkspaceSize(position: LayoutPosition): number
```

---

### setWorkspaceSize(position, size)

Set workspace width (`left` / `right`) or height (`bottom`). Values below the configured minimum are clamped.

```javascript
layoutManager.setWorkspaceSize(position: LayoutPosition, size: number): LayoutManager
```

---

### resetLayout()

Reset open/closed state, default sizes, and stored per-workspace **selected tab IDs** to defaults, then persist.

```javascript
layoutManager.resetLayout(): LayoutManager
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

- Clicking the element toggles the tab  
- The element’s `Active` class stays in sync with tab/workspace state  

**Example:**

```javascript
const unbind = layoutManager.bindToggle('sidebarBtn', 'right', 'settings');
const btn = document.getElementById('treeBtn');
layoutManager.bindToggle(btn, 'left', 'tree');
unbind();
```

---

### bindToggleForModule(moduleId, position, tabId, options?)

Same behavior as `bindToggle`, but resolves the toggle element id from the World UI config for `moduleId`, unless `options.toggleElementId` is provided.

```javascript
layoutManager.bindToggleForModule(
    moduleId: string,
    position: LayoutPosition,
    tabId: string,
    options?: { toggleElementId?: string }
): Function | null
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

## State persistence

LayoutManager saves layout state to `localStorage` under `storageKey` (default: `'aeco-layout-state'`).

**Always persisted** when the user resizes or toggles workspaces:

- Open/closed state for left, right, and bottom workspaces  
- Workspace sizes (left/right width, bottom height)

**Persisted only when the user has enabled “Save my settings”** in Welcome or Settings (`config.app.Settings.persistSettings === true`):

- Last **selected tab id** for each workspace (`workspaceSelected`)

On load, grid state is restored from storage; tab selection is re-applied when workspaces are registered (and briefly retried so async modules can add tabs first).

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
        this.layoutManager = context.layoutManager;
        
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
- [UIComponents API](components.md) — `floatingPanel`, `tabbedPanel`
- [Building UI Guide](../guides/building-ui.md)
- `drawUI/TabPanel.js` / `DrawUI.tabPanel()` — workspace-integrated panels with optional tab-strip float
