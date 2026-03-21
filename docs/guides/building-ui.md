# Building UI

This guide covers how to create user interface components in Olympus using the UIComponents factory and DrawUI primitives.

## UIComponents Factory

The `Components` class (aliased as `UIComponents`) provides factory methods for creating UI elements:

```javascript
import { UIComponents } from "aeco";

// Or import directly from drawUI
import { DrawUI } from "../../drawUI/index.js";
```

## Basic Elements

### Containers

```javascript
// Div container
const container = UIComponents.div();
container.setClass("my-container");
container.setStyle("padding", "16px");

// Row (flex horizontal)
const row = UIComponents.row();
row.gap("8px");  // Add gap between children

// Column (flex vertical)
const column = UIComponents.column();
```

### Text

```javascript
// Plain text
const text = UIComponents.text("Hello World");

// Headings
const h1 = UIComponents.h1("Title");
const h2 = UIComponents.h2("Subtitle");
const h3 = UIComponents.h3("Section");

// Paragraph
const para = UIComponents.paragraph("Body text goes here...");

// Small text
const small = UIComponents.smallText("Fine print");

// Markdown (requires Showdown loaded)
const md = UIComponents.markdown("**Bold** and *italic*");
```

### Inputs

```javascript
// Text input
const input = UIComponents.input();
input.setValue("default text");
input.onChange((value) => console.log(value));

// Number input
const num = UIComponents.number(0);
num.setRange(0, 100);
num.onChange((value) => console.log(value));

// Integer input
const int = UIComponents.integer(1);

// Textarea
const textarea = UIComponents.textarea();
textarea.setValue("Multi-line\ntext");

// Checkbox
const checkbox = UIComponents.checkbox(false);
checkbox.onChange((checked) => console.log(checked));

// Select dropdown
const select = UIComponents.select();
select.setOptions(["Option 1", "Option 2", "Option 3"]);
select.onChange((value) => console.log(value));

// Date picker
const date = UIComponents.date(new Date());

// Color picker
const color = UIComponents.color();
color.setValue("#ff6600");
```

### Buttons

```javascript
// Basic button
const button = UIComponents.button("Click Me");
button.onClick(() => console.log("Clicked!"));

// Icon button
const icon = UIComponents.icon("settings");
icon.onClick(() => console.log("Settings clicked"));

// Operator button (icon with Operator styling)
const op = UIComponents.operator("add");
op.onClick(() => executeOperator());
```

### Visual Elements

```javascript
// Icon (Material Symbols)
const icon = UIComponents.icon("home");

// Image
const img = UIComponents.image("/path/to/image.png", { 
    width: "100px", 
    height: "100px" 
});

// SVG
const svg = UIComponents.svg("/path/to/icon.svg");

// Divider (horizontal rule)
const divider = UIComponents.divider();

// Spacer (vertical)
const spacer = UIComponents.spacer("16px");

// Horizontal spacer
const hspacer = UIComponents.hspacer("8px");

// Progress bar
const progress = UIComponents.progress(50); // 50%
progress.setValue(75);

// Spinner (loading indicator)
const spinner = UIComponents.spinner({ text: "Loading..." });
```

## Panels and Containers

### Floating Panel

Draggable panel with minimize/maximize:

```javascript
const panel = UIComponents.floatingPanel({
    title: "My Panel",
    icon: "info",
    startMinimized: false,
    closable: true,
    resizable: true
});

panel.setContent(UIComponents.text("Panel content"));
panel.setPosition({ top: 100, left: 100 });

document.body.appendChild(panel.dom);
```

### Collapsible Panel

Panel that collapses to a badge:

```javascript
const panel = UIComponents.collapsiblePanel({
    title: "Notifications",
    icon: "notifications",
    position: { top: "10px", right: "10px" },
    badgeCount: 5
});

panel.setContent(notificationList);
```

### Collapsible Section

Section with expandable content:

```javascript
const section = UIComponents.collapsibleSection({
    title: "Advanced Options",
    icon: "settings",
    collapsed: true  // Start collapsed
});

section.add(UIComponents.checkbox(false));
section.add(UIComponents.text("Enable feature X"));
```

### Tabbed Panel

Multiple tabs with content:

```javascript
const tabs = UIComponents.tabbedPanel();

tabs.addTab("general", "General", generalContent);
tabs.addTab("advanced", "Advanced", advancedContent);
tabs.addTab("about", "About", aboutContent);

tabs.select("general");
```

### Base Panel

Simple container panel:

```javascript
const panel = UIComponents.basePanel({
    title: "Properties"
});

panel.add(UIComponents.text("Content here"));
```

## Complex Components

### Navigable List

Hierarchical list with navigation:

```javascript
const list = UIComponents.navigableList({
    onItemClick: (item) => console.log("Selected:", item),
    getLabel: (item) => item.name,
    getChildren: (item) => item.children || [],
    getTitle: (item) => item.name,
    emptyMessage: "No items found"
});

// Set hierarchical data
list.setData({
    name: "Root",
    children: [
        { name: "Item 1", children: [] },
        { name: "Item 2", children: [
            { name: "Sub-item 2.1", children: [] }
        ]}
    ]
});

container.add(list.getElement());
```

### Reorderable List

Drag-to-reorder list:

```javascript
const items = ["Item 1", "Item 2", "Item 3"];

const list = UIComponents.reorderableList(items, (newOrder) => {
    console.log("New order:", newOrder);
});

container.add(list);
```

### Spreadsheet

Data grid with editing:

```javascript
const sheet = UIComponents.spreadsheet({
    data: [
        ["Name", "Value"],
        ["Item 1", 100],
        ["Item 2", 200]
    ],
    columnConfig: [
        { header: "Name", type: "text" },
        { header: "Value", type: "number" }
    ],
    height: "300px",
    width: "100%"
});

container.add(sheet.getElement());
```

### Gantt Chart

Project timeline visualization:

```javascript
const gantt = UIComponents.gantt(context, {
    tasks: [
        {
            id: 1,
            name: "Task 1",
            start: new Date("2025-01-01"),
            end: new Date("2025-01-15"),
            progress: 50
        }
    ]
});

container.add(gantt);
```

## Styling

### Inline Styles

```javascript
const element = UIComponents.div();
element.setStyle("backgroundColor", "#333");
element.setStyle("padding", "16px");
element.setStyle("borderRadius", "8px");

// Multiple styles
element.setStyle("display", "flex");
element.setStyle("gap", "8px");
element.setStyle("alignItems", "center");
```

### CSS Classes

```javascript
element.setClass("my-custom-class");
element.addClass("another-class");
element.removeClass("my-custom-class");
```

### Element Properties

```javascript
element.setId("unique-id");
element.setWidth("200px");
element.setHeight("100px");
element.setDisplay("flex");
element.setMargin("8px");
```

## Building a Complete UI Panel

Here's a complete example of an addon UI:

```javascript
import { UIComponents } from "aeco";

class MyAddonUI {
    constructor({ context, operators }) {
        this.context = context;
        this.operators = operators;
        
        this.panel = this.createPanel();
        this.registerPanel();
        this.setupSignals();
    }

    createPanel() {
        const panel = UIComponents.div();
        panel.setStyle("padding", "16px");
        panel.setStyle("display", "flex");
        panel.setStyle("flexDirection", "column");
        panel.setStyle("gap", "12px");

        // Header
        const header = UIComponents.row();
        header.setStyle("justifyContent", "space-between");
        header.setStyle("alignItems", "center");
        
        const title = UIComponents.h3("My Addon");
        const refreshBtn = UIComponents.icon("refresh");
        refreshBtn.setStyle("cursor", "pointer");
        refreshBtn.onClick(() => this.refresh());
        
        header.add(title);
        header.add(refreshBtn);
        panel.add(header);

        // Status section
        const statusSection = UIComponents.collapsibleSection({
            title: "Status",
            collapsed: false
        });
        
        this.statusText = UIComponents.text("Ready");
        statusSection.add(this.statusText);
        panel.add(statusSection);

        // Actions section
        const actionsSection = UIComponents.collapsibleSection({
            title: "Actions",
            collapsed: false
        });
        
        const actionRow = UIComponents.row();
        actionRow.gap("8px");
        
        const runBtn = UIComponents.button("Run");
        runBtn.onClick(() => {
            this.operators.execute("myaddon.run", this.context);
        });
        
        const clearBtn = UIComponents.button("Clear");
        clearBtn.onClick(() => {
            this.operators.execute("myaddon.clear", this.context);
        });
        
        actionRow.add(runBtn);
        actionRow.add(clearBtn);
        actionsSection.add(actionRow);
        panel.add(actionsSection);

        // Settings section
        const settingsSection = UIComponents.collapsibleSection({
            title: "Settings",
            collapsed: true
        });
        
        const autoRunRow = UIComponents.row();
        autoRunRow.setStyle("alignItems", "center");
        autoRunRow.gap("8px");
        
        const autoRunCheckbox = UIComponents.checkbox(false);
        autoRunCheckbox.onChange((checked) => {
            this.context.myAddon.autoRun = checked;
        });
        
        autoRunRow.add(autoRunCheckbox);
        autoRunRow.add(UIComponents.text("Auto-run on load"));
        settingsSection.add(autoRunRow);
        panel.add(settingsSection);

        return panel;
    }

    registerPanel() {
        const editor = this.context.editor;
        const layoutManager = editor ? editor.layoutManager : null;
        if (layoutManager) {
            layoutManager.addTab('right', 'myaddon', 'My Addon', this.panel);
        }
    }

    setupSignals() {
        const statusSignal = this.context.signals.myAddonStatusChanged;
        if (statusSignal) {
            statusSignal.add((data) => {
                this.statusText.setValue(data.status);
            });
        }
    }

    refresh() {
        this.operators.execute("myaddon.refresh", this.context);
    }

    destroy() {
        const editor = this.context.editor;
        const layoutManager = editor ? editor.layoutManager : null;
        if (layoutManager) {
            layoutManager.removeTab('right', 'myaddon');
        }
    }
}

export default MyAddonUI;
```

## Workspace side panels (`TabPanel`)

For UI that lives in the **left, right, or bottom** workspace tabs, use **`TabPanel`** (`import { TabPanel } from "../../drawUI/TabPanel.js"` or `DrawUI.tabPanel(...)`) with `context`, `tabId`, `tabLabel`, and usually `moduleId` so the world toolbar toggle is wired automatically. Set **`floatable: true`** to show **undock on the workspace tab label** (not inside the panel).

Floating tool windows that should be able to **dock** into a workspace tab again can be created with **`UIComponents.floatingPanel({ context, workspaceTabId, workspaceTabLabel, title, icon, ... })`**.

Details: [Using LayoutManager — TabPanel and floating workspace tabs](using-layoutmanager.md#tabpanel-and-floating-workspace-tabs), [UIComponents API — Panels](../api/ui/components.md#panels).

## DrawUI Low-Level API

For more control, use DrawUI primitives directly:

```javascript
import { 
    UIDiv, 
    UIRow, 
    UIButton, 
    UIText, 
    UIIcon,
    UIInput,
    UICheckbox 
} from "../../drawUI/ui.js";

// Same API but direct class usage
const div = new UIDiv();
const row = new UIRow();
const btn = new UIButton("Click");
```

## Best Practices

1. **Use UIComponents factory** — Cleaner syntax, future-proof
2. **Organize with sections** — Group related controls in collapsible sections  
3. **Add tooltips** — Help users understand functionality
4. **Handle cleanup** — Implement `destroy()` to remove panels and listeners
5. **Use signals** — Keep UI reactive to state changes
6. **Consistent spacing** — Use gap and padding for visual rhythm

## Related Documentation

- [Using LayoutManager](using-layoutmanager.md) — Panel and tab management
- [Writing Operators](writing-operators.md) — Create operators for UI actions
- [API: UIComponents](../api/ui/components.md) — Complete component reference
