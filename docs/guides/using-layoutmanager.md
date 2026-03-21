# Using LayoutManager

LayoutManager controls the application's workspace layout — left, right, and bottom workspaces with tabs, resizable dividers, and state persistence.

## Overview

```
┌────────────────────────────────────────────────────────────┐
│                        HeaderBar                            │
├──────────┬─────────────────────────────────┬───────────────┤
│          │                                 │               │
│   Left   │                                 │     Right     │
│Workspace │           Viewport              │  Workspace    │
│  (tabs)  │                                 │    (tabs)     │
│          │                                 │               │
├──────────┴─────────────────────────────────┴───────────────┤
│                   Bottom Workspace (tabs)                   │
└────────────────────────────────────────────────────────────┘
```

## Accessing LayoutManager

```javascript
// Olympus / AECO host
const layoutManager = context.layoutManager;

// Other embeddings may use editor
const editor = context.editor;
const layoutManagerFromEditor = editor ? editor.layoutManager : null;
```

## Configuration

LayoutManager accepts these config options:

```javascript
const config = {
    leftWorkspaceWidth: 300,      // Default left workspace width (px)
    rightWorkspaceWidth: 300,     // Default right workspace width (px)
    bottomWorkspaceHeight: 200,   // Default bottom workspace height (px)
    minPanelSize: 100,        // Minimum workspace size (px)
    resizerSize: 4,           // Resizer handle width (px)
    storageKey: 'aeco-layout-state'  // LocalStorage key
};
```

## Tab Management

### Adding Tabs

```javascript
// Add a tab to the right workspace
layoutManager.addTab('right', 'settings', 'Settings', settingsContent);

// Add to left workspace without opening
layoutManager.addTab('left', 'tree', 'Tree View', treeContent, { 
    open: false 
});

// Add tab that won't replace existing
layoutManager.addTab('bottom', 'logs', 'Logs', logsContent, { 
    replace: false 
});

// Tab with “undock” control on the tab label (pairs with TabPanel floatable or registerTabFloatHandler)
layoutManager.addTab('left', 'my-tool', 'My tool', panel, { floatable: true, open: false });
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `position` | `'left'` \| `'right'` \| `'bottom'` | Workspace position |
| `id` | string | Unique tab identifier |
| `label` | string | Display text in tab header |
| `content` | HTMLElement \| UIElement | Tab content |
| `options.open` | boolean | Open workspace after adding (default: true) |
| `options.replace` | boolean | Replace existing tab with same ID (default: true) |
| `options.floatable` | boolean | Show undock icon on the tab strip (default: false) |

`ensureTab(...)` accepts the same options; it only adds the tab if it is missing (defaults: `open: false`, `replace: false`).

### Removing Tabs

```javascript
// Remove a tab
layoutManager.removeTab('right', 'settings');

// Remove and close workspace if empty
layoutManager.removeTab('bottom', 'logs', { closeIfEmpty: true });

// Clear all tabs from a workspace
layoutManager.clearTabs('left');
layoutManager.clearTabs('bottom', false);  // Keep workspace open
```

### Selecting Tabs

```javascript
// Select a tab (opens workspace by default)
layoutManager.selectTab('right', 'properties');

// Select without opening
layoutManager.selectTab('left', 'tree', { open: false });
```

### Toggling Tabs

Toggle is ideal for toolbar buttons:

```javascript
// If workspace is open with this tab selected, closes workspace
// Otherwise, selects tab and opens workspace
layoutManager.toggleTab('right', 'settings');
```

### Querying Tabs

```javascript
// Check if tab exists
if (layoutManager.hasTab('right', 'settings')) {
    // Tab exists
}

// Check if tab is selected
if (layoutManager.isTabSelected('right', 'settings')) {
    // Settings tab is active
}

// Get selected tab ID
const activeTab = layoutManager.getSelectedTabId('right');

// Get all tab IDs in a workspace
const tabIds = layoutManager.getTabIds('left');
// ['tree', 'favorites', 'recent']

// Get tab content element
const content = layoutManager.getTabContent('right', 'settings');
```

### Updating Tab Labels

```javascript
// Update label (e.g., show count)
layoutManager.setTabLabel('left', 'items', `Items (${itemCount})`);
```

## TabPanel and floating workspace tabs

For most modules, use **`TabPanel`** (`drawUI/TabPanel.js` or `DrawUI.tabPanel(options)`) instead of hand-rolling `div` shells and `ensureTab`:

- Pass **`context`**, **`position`**, **`tabId`**, **`tabLabel`**, **`title`**, **`icon`**
- Set **`moduleId`** (or **`toggleElementId`**) so the world toolbar can toggle the tab via `bindToggleForModule`
- Set **`floatable: true`** to show an **open-in-new** control on the **workspace tab label** (not inside the panel body). That detaches content into a `FloatingPanel` with dock targets wired to the same tab id.

```javascript
import { TabPanel } from './drawUI/TabPanel.js';

this._tabPanel = new TabPanel({
  context,
  operators,
  position: 'left',
  tabId: 'my-module-panel',
  tabLabel: 'My panel',
  title: 'My panel',
  icon: 'extension',
  moduleId: 'my.module',
  floatable: true,
});
this.content = this._tabPanel.content;
// … add UI to this.content, then rely on ensureTab via moduleId
```

Advanced: **`layoutManager.registerTabFloatHandler(position, tabId, () => { … })`** if you implement float yourself while still using `floatable: true` on `addTab`.

## Workspace Control

### Opening and Closing

```javascript
// Open a workspace
layoutManager.openWorkspace('right');

// Close a workspace
layoutManager.closeWorkspace('left');

// Check if workspace is open
if (layoutManager.isWorkspaceOpen('bottom')) {
    // Bottom workspace is open
}
```

### Resizing

```javascript
// Get current size (width for left/right, height for bottom)
const rightW = layoutManager.getWorkspaceSize('right');
const bottomH = layoutManager.getWorkspaceSize('bottom');

// Set size
layoutManager.setWorkspaceSize('left', 400);
layoutManager.setWorkspaceSize('bottom', 250);
```

## Binding UI Elements

Bind toolbar buttons to toggle workspaces:

```javascript
// Bind by element ID
const cleanup = layoutManager.bindToggle('settingsButton', 'right', 'settings');

// Bind by element reference
const btn = document.getElementById('treeButton');
layoutManager.bindToggle(btn, 'left', 'tree');

// Later, to unbind:
cleanup();
```

This creates bidirectional binding:
- Clicking element toggles the tab
- Element gets 'Active' class when tab is open and selected

## Signals

LayoutManager emits these signals:

| Signal | Payload | Description |
|--------|---------|-------------|
| `layoutTabChanged` | `{ position, id }` | Tab selection changed |
| `layoutTabAdded` | `{ position, id }` | Tab was added |
| `layoutTabRemoved` | `{ position, id }` | Tab was removed |
| `layoutWorkspaceChanged` | `{ position, open }` | Workspace opened/closed |

```javascript
// Listen to tab changes
context.signals.layoutTabChanged.add((data) => {
    console.log(`Tab changed: ${data.position} -> ${data.id}`);
});

// Listen to workspace changes
context.signals.layoutWorkspaceChanged.add((data) => {
    console.log(`Workspace ${data.position} is now ${data.open ? 'open' : 'closed'}`);
});
```

## State persistence

- **Open/closed** and **sizes** for each workspace are saved to `localStorage` (`storageKey`, default `aeco-layout-state`) whenever the user toggles or resizes panels.
- **Which tab was selected** in each workspace is saved **only if** the user enabled **Save my settings** (Welcome or Settings → `config.app.Settings.persistSettings`).

After registration, LayoutManager reapplies saved tab selection (with short delayed retries) so async modules can add tabs after load. You can call **`layoutManager.restoreWorkspaceTabSelections()`** again if your tabs appear very late.

```javascript
// Internal persistence hooks exist on the instance; prefer normal UI interaction.
layoutManager.resetLayout(); // resets layout + stored tab selection for workspaces
```

## Keyboard Shortcuts

Default shortcuts (configurable):
- `Ctrl+B` — Toggle left workspace
- `Ctrl+Alt+B` — Toggle right workspace  
- `Ctrl+J` — Toggle bottom workspace

## Complete Example

Addon UI that integrates with LayoutManager:

```javascript
import { UIComponents } from "aeco";

class MyAddonUI {
    constructor({ context, operators }) {
        this.context = context;
        this.operators = operators;
        this.layoutManager = context.layoutManager;
        
        this.mainPanel = this.createMainPanel();
        this.outputPanel = this.createOutputPanel();
        
        this.registerWorkspaces();
        this.setupToolbarButton();
    }

    createMainPanel() {
        const panel = UIComponents.div();
        panel.setStyle("padding", "16px");
        
        const title = UIComponents.h3("My Addon");
        panel.add(title);
        
        const runBtn = UIComponents.button("Run Analysis");
        runBtn.onClick(() => {
            this.operators.execute("myaddon.analyze", this.context);
        });
        panel.add(runBtn);
        
        return panel;
    }

    createOutputPanel() {
        const panel = UIComponents.div();
        panel.setStyle("padding", "8px");
        panel.setStyle("fontFamily", "monospace");
        
        this.outputLog = UIComponents.div();
        panel.add(this.outputLog);
        
        return panel;
    }

    registerWorkspaces() {
        // Main controls in right workspace
        this.layoutManager.addTab(
            'right', 
            'myaddon-main', 
            'My Addon', 
            this.mainPanel,
            { open: false }
        );
        
        // Output in bottom workspace
        this.layoutManager.addTab(
            'bottom', 
            'myaddon-output', 
            'Output', 
            this.outputPanel,
            { open: false }
        );
    }

    setupToolbarButton() {
        // Find or create toolbar button
        const toolbar = document.getElementById('ViewportTools');
        if (!toolbar) return;
        
        const btn = UIComponents.icon("science");
        btn.setId("myaddon-toolbar-btn");
        btn.setStyle("cursor", "pointer");
        toolbar.appendChild(btn.dom);
        
        // Bind to toggle main workspace
        this.cleanupBind = this.layoutManager.bindToggle(
            btn.dom, 
            'right', 
            'myaddon-main'
        );
    }

    logOutput(message) {
        const line = UIComponents.text(message);
        line.setStyle("padding", "4px 0");
        this.outputLog.add(line);
        
        // Open output workspace to show results
        this.layoutManager.selectTab('bottom', 'myaddon-output');
    }

    destroy() {
        // Remove tabs
        this.layoutManager.removeTab('right', 'myaddon-main');
        this.layoutManager.removeTab('bottom', 'myaddon-output');
        
        // Remove toolbar button
        const btn = document.getElementById('myaddon-toolbar-btn');
        btn?.remove();
        
        // Cleanup binding
        this.cleanupBind?.();
    }
}

export default MyAddonUI;
```

## API Reference

### Constructor

```javascript
new LayoutManager(options?: LayoutManagerConfig)
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `init(containerId)` | this | Initialize with container element |
| `setContext(context)` | this | Set application context |
| `registerTabbedWorkspaces(workspaces)` | this | Register UI workspace references |
| `addTab(position, id, label, content, options?)` | boolean | Add a tab |
| `removeTab(position, id, options?)` | boolean | Remove a tab |
| `selectTab(position, id, options?)` | boolean | Select a tab |
| `toggleTab(position, id)` | boolean | Toggle a tab |
| `hasTab(position, id)` | boolean | Check if tab exists |
| `isTabSelected(position, id)` | boolean | Check if tab is selected |
| `getTabIds(position)` | string[] | Get all tab IDs |
| `getSelectedTabId(position)` | string\|null | Get selected tab ID |
| `getTabContent(position, id)` | HTMLElement\|null | Get tab content |
| `setTabLabel(position, id, label)` | boolean | Update tab label |
| `clearTabs(position, closeWorkspace?)` | boolean | Remove all tabs |
| `openWorkspace(position)` | void | Open a workspace |
| `closeWorkspace(position)` | void | Close a workspace |
| `isWorkspaceOpen(position)` | boolean | Check if workspace is open |
| `getWorkspaceWidth(position)` | number | Get workspace width |
| `setWorkspaceWidth(position, width)` | void | Set workspace width |
| `getWorkspaceHeight(position)` | number | Get workspace height |
| `setWorkspaceHeight(position, height)` | void | Set workspace height |
| `bindToggle(element, position, tabId)` | Function | Bind element to toggle tab |
| `bindToggleForModule(moduleId, position, tabId, options?)` | Function | Like `bindToggle` using World `moduleId` |
| `ensureTab(position, id, label, content, options?)` | boolean | Add tab if missing |
| `registerTabFloatHandler(position, tabId, fn)` | Function | Cleanup fn; tab-strip float |
| `invokeTabFloat(position, tabId)` | void | Invoke registered float handler |
| `restoreWorkspaceTabSelections()` | this | Re-apply saved active tabs |
| `getWorkspaceSize(position)` | number | Width or height in px |
| `setWorkspaceSize(position, size)` | this | Set width or height |
| `resetLayout()` | this | Reset layout state |

## Related Documentation

- [Building UI](building-ui.md) — Create UI components to put in workspaces
- [First Addon](../getting-started/first-addon.md) — Complete addon tutorial
- [API: LayoutManager](../api/ui/layoutmanager.md) — Full API reference
