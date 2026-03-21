# UIComponents API

The `Components` class (exported as `UIComponents`) provides factory methods for creating UI elements.

## Import

```javascript
import { UIComponents } from "aeco";

// Or directly from source
import { Components } from "./src/ui/Components/Components.js";

// Or via DrawUI
import { DrawUI } from "./drawUI/index.js";
```

## Basic Elements

### div()

Creates a div container element.

```javascript
UIComponents.div(): UIDiv
```

**Example:**
```javascript
const container = UIComponents.div();
container.setClass("my-container");
container.setStyle("padding", "16px");
```

---

### row()

Creates a flex row container (horizontal layout).

```javascript
UIComponents.row(): UIRow
```

**Example:**
```javascript
const row = UIComponents.row();
row.gap("8px");
row.add(UIComponents.button("A"));
row.add(UIComponents.button("B"));
```

---

### column()

Creates a column layout container (vertical layout).

```javascript
UIComponents.column(): UIDiv
```

---

### span(text)

Creates a span element.

```javascript
UIComponents.span(text?: string): UISpan
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | `""` | Text content |

---

### spacer(size)

Creates a vertical spacer.

```javascript
UIComponents.spacer(size?: string): UIDiv
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | string | `"8px"` | Spacer height |

---

### hspacer(size)

Creates a horizontal spacer.

```javascript
UIComponents.hspacer(size?: string): UISpan
```

---

### divider()

Creates a horizontal rule divider.

```javascript
UIComponents.divider(): UIHorizontalRule
```

---

### lineBreak()

Creates a line break element.

```javascript
UIComponents.lineBreak(): UIBreak
```

## Text Elements

### text(text)

Creates a text element.

```javascript
UIComponents.text(text?: string): UIText
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | `""` | Text content |

---

### smallText(text)

Creates a smaller text element.

```javascript
UIComponents.smallText(text?: string): UISmallText
```

---

### h1(text) / h2(text) / h3(text) / h4(text) / h5(text) / h6(text)

Creates heading elements.

```javascript
UIComponents.h1(text?: string): UIH1
UIComponents.h2(text?: string): UIH2
UIComponents.h3(text?: string): UIH3
UIComponents.h4(text?: string): UIH4
UIComponents.h5(text?: string): UIH5
UIComponents.h6(text?: string): UIH6
```

---

### paragraph(text)

Creates a paragraph element.

```javascript
UIComponents.paragraph(text?: string): UIParagraph
```

---

### title(text)

Creates a title element with `ws-section-title` class.

```javascript
UIComponents.title(text?: string): UIText
```

---

### disclaimer(text)

Creates a disclaimer text element.

```javascript
UIComponents.disclaimer(text?: string): UIText
```

---

### markdown(text, options)

Renders markdown text to HTML. Requires Showdown library to be loaded.

```javascript
UIComponents.markdown(text?: string, options?: object): UIDiv
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | `""` | Markdown content |
| `options.highlightCallback` | function | `null` | Code highlighting callback |

**Example:**
```javascript
const md = UIComponents.markdown(`
# Heading
**Bold** and *italic* text.

\`\`\`javascript
const x = 1;
\`\`\`
`);
```

## Input Elements

### button(text)

Creates a button element.

```javascript
UIComponents.button(text?: string): UIButton
```

**Example:**
```javascript
const btn = UIComponents.button("Click Me");
btn.onClick(() => console.log("Clicked!"));
```

---

### input()

Creates a text input.

```javascript
UIComponents.input(): UIInput
```

**Example:**
```javascript
const input = UIComponents.input();
input.setValue("default");
input.onChange((value) => console.log(value));
```

---

### textarea()

Creates a textarea element.

```javascript
UIComponents.textarea(): UITextArea
```

---

### number(value)

Creates a number input.

```javascript
UIComponents.number(value?: number): UINumber
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | number | `0` | Initial value |

---

### integer(value)

Creates an integer input.

```javascript
UIComponents.integer(value?: number): UIInteger
```

---

### checkbox(checked)

Creates a checkbox.

```javascript
UIComponents.checkbox(checked?: boolean): UICheckbox
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | boolean | `false` | Initial checked state |

**Example:**
```javascript
const cb = UIComponents.checkbox(true);
cb.onChange((checked) => console.log(checked));
```

---

### select()

Creates a select dropdown.

```javascript
UIComponents.select(): UISelect
```

**Example:**
```javascript
const select = UIComponents.select();
select.setOptions(["Option 1", "Option 2", "Option 3"]);
select.setValue("Option 2");
select.onChange((value) => console.log(value));
```

---

### date(date)

Creates a date picker.

```javascript
UIComponents.date(date?: Date): UIDatePicker
```

---

### color()

Creates a color picker.

```javascript
UIComponents.color(): UIColor
```

## Visual Elements

### icon(name)

Creates a Material Symbols icon.

```javascript
UIComponents.icon(name?: string): UIIcon
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | `""` | Material icon name |

**Example:**
```javascript
const icon = UIComponents.icon("settings");
icon.onClick(() => openSettings());
```

Common icons: `home`, `settings`, `close`, `menu`, `add`, `remove`, `edit`, `delete`, `search`, `refresh`, `info`, `warning`, `check`, `arrow_back`, `arrow_forward`

---

### operator(name)

Creates an operator button (icon with Operator styling).

```javascript
UIComponents.operator(name?: string): UIDiv
```

---

### image(path, size)

Creates an image element.

```javascript
UIComponents.image(path?: string, size?: {width: string, height: string}): UIImage
```

**Example:**
```javascript
const img = UIComponents.image("/path/to/image.png", {
    width: "100px",
    height: "100px"
});
```

---

### svg(path, size)

Creates an SVG element that loads from path.

```javascript
UIComponents.svg(path?: string, size?: {width: string, height: string}): UISVG
```

---

### link(text, path, icon, external)

Creates a link element.

```javascript
UIComponents.link(text?: string, path?: string, icon?: string, external?: boolean): UILink
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | `""` | Link text |
| `path` | string | `""` | Link URL |
| `icon` | string | — | Optional icon name |
| `external` | boolean | `true` | Open in new tab |

---

### progress(value)

Creates a progress bar.

```javascript
UIComponents.progress(value?: number): UIProgress
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | number | `0` | Progress value (0-100) |

---

### spinner(options)

Creates a loading spinner.

```javascript
UIComponents.spinner(options?: {text: string}): UISpinner
```

---

### tooltip(text, options)

Creates a tooltip element.

```javascript
UIComponents.tooltip(text?: string, options?: object): UITooltip
```

---

### badge(text)

Creates a badge element.

```javascript
UIComponents.badge(text?: string): UIText
```

---

### kbd(key)

Creates a keyboard key element.

```javascript
UIComponents.kbd(key?: string): UISpan
```

## Panels

### panel()

Creates a basic panel container.

```javascript
UIComponents.panel(): UIPanel
```

---

### card()

Creates a card element (panel with Kanban-card class).

```javascript
UIComponents.card(): UIPanel
```

---

### basePanel(options)

Creates a basic panel container.

```javascript
UIComponents.basePanel(options?: object): BasePanel
```

---

### floatingPanel(options)

Creates a draggable floating panel with minimize/maximize.

```javascript
UIComponents.floatingPanel(options?: FloatingPanelOptions): FloatingPanel
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | — | Panel title |
| `icon` | string | — | Material icon name |
| `startMinimized` | boolean | `false` | Start minimized |
| `closable` | boolean | `true` | Show close button |
| `resizable` | boolean | `true` | Allow resizing |
| `context` | object | — | App context; used with `workspaceTabId` to resolve `layoutManager` |
| `layoutManager` | object | — | Explicit layout manager (overrides `context.layoutManager`) |
| `workspaceTabId` | string | — | With a layout manager: pin buttons dock into this workspace tab id |
| `workspaceTabLabel` | string | — | Tab label when docking (defaults to `title` or id) |
| `dock` | object | — | Optional `{ left?, bottom?, right? }` handlers `(panel) => void` to override default dock behavior |

When `workspaceTabId` and a layout manager are provided, the header pin controls move the panel body into the left/right/bottom workspace as that tab. Undock is the **workspace tab** open-in-new control (same as `TabPanel` with `floatable: true`), not a row inside the panel body.

**Example:**
```javascript
const panel = UIComponents.floatingPanel({
    title: "Inspector",
    icon: "info",
    context,
    workspaceTabId: "my.addon.inspector",
    workspaceTabLabel: "Inspector",
});
panel.setContent(contentElement);
document.getElementById("Windows")?.appendChild(panel.dom);
```

---

### tabPanel(options) — DrawUI

Workspace-integrated panel with optional **tab-strip float**. Not on `UIComponents`; use **`DrawUI.tabPanel`** from the drawUI bundle or import `TabPanel` from `drawUI/TabPanel.js`.

```javascript
DrawUI.tabPanel(options?: TabPanelOptions): TabPanel
```

| Option | Type | Description |
|--------|------|-------------|
| `context` | object | Required for `layoutManager` |
| `position` | `'left'` \| `'right'` \| `'bottom'` | Workspace |
| `tabId` | string | Unique tab id |
| `tabLabel` | string | Tab title in strip |
| `title` | string | In-panel header title |
| `icon` | string | Material icon (header) |
| `moduleId` | string | World module id for toolbar toggle (`bindToggleForModule`) |
| `toggleElementId` | string | Explicit toggle element id |
| `floatable` | boolean | Undock control on the **workspace tab label** |
| `showHeader` | boolean | Inner panel header (default `true`) |
| `autoShow` | boolean | Call `show()` on construct |

See [Using LayoutManager](../../guides/using-layoutmanager.md#tabpanel-and-floating-workspace-tabs).

---

### collapsiblePanel(options)

Creates a panel that collapses to a badge.

```javascript
UIComponents.collapsiblePanel(options?: CollapsiblePanelOptions): CollapsiblePanel
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | — | Panel title |
| `icon` | string | — | Material icon name |
| `position` | object | — | Position with top/bottom/left/right |
| `badgeCount` | number | `null` | Badge count for notifications |

---

### collapsibleSection(options)

Creates a collapsible section.

```javascript
UIComponents.collapsibleSection(options?: object): CollapsibleSection
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | — | Section title |
| `icon` | string | — | Section icon |
| `collapsed` | boolean | `false` | Start collapsed |
| `className` | string | — | CSS class name |

**Example:**
```javascript
const section = UIComponents.collapsibleSection({
    title: "Advanced Settings",
    collapsed: true
});
section.add(UIComponents.checkbox(false));
section.add(UIComponents.text("Enable feature"));
```

---

### tabbedPanel()

Creates a tabbed panel container.

```javascript
UIComponents.tabbedPanel(): UITabbedPanel
```

**Example:**
```javascript
const tabs = UIComponents.tabbedPanel();
tabs.addTab("general", "General", generalContent);
tabs.addTab("advanced", "Advanced", advancedContent);
tabs.select("general");
```

Optional fifth argument to `addTab` (used when driving tabs via `LayoutManager.addTab`): `{ floatable: true }` adds a tab-strip undock control. Prefer **`TabPanel` + `floatable`** for app modules so float handlers register automatically.

## Complex Components

### list()

Creates a listbox container.

```javascript
UIComponents.list(): UIListbox
```

---

### listItem(text)

Creates a list item.

```javascript
UIComponents.listItem(text?: string): ListboxItem
```

---

### reorderableList(items, onReorder)

Creates a drag-to-reorder list.

```javascript
UIComponents.reorderableList(items?: array, onReorder?: function): UIElement
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `items` | array | `[]` | Initial items |
| `onReorder` | function | `null` | Callback when reordered |

---

### navigableList(options)

Creates a hierarchical navigable list.

```javascript
UIComponents.navigableList(options?: NavigableListOptions): NavigableList
```

| Option | Type | Description |
|--------|------|-------------|
| `onItemClick` | function | Callback when item clicked `(item, list) => void` |
| `onNavigate` | function | Callback on navigation `(item, direction) => void` |
| `renderItem` | function | Custom item renderer `(item, list) => UIElement` |
| `getChildren` | function | Get children from item `(item) => array` |
| `getLabel` | function | Get label from item `(item) => string` |
| `getTitle` | function | Get title from item `(item) => string` |
| `emptyMessage` | string | Message when no items |

**Example:**
```javascript
const list = UIComponents.navigableList({
    onItemClick: (item) => selectItem(item),
    getLabel: (item) => item.name,
    getChildren: (item) => item.children || []
});
list.setData(treeData);
container.add(list.getElement());
```

**Methods:**
- `setData(data)` — Set root data
- `navigateTo(item)` — Navigate to child
- `navigateBack()` — Go back
- `refresh()` — Refresh display
- `getElement()` — Get DOM element

---

### spreadsheet(options)

Creates a data grid with editing.

```javascript
UIComponents.spreadsheet(options: SpreadsheetOptions): SpreadsheetUIComponent
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | array | — | Initial data (2D array) |
| `columnConfig` | array | — | Column configuration |
| `columnNameMapper` | function | — | Map column names |
| `height` | string | `"100%"` | Container height |
| `width` | string | `"100%"` | Container width |

**Example:**
```javascript
const sheet = UIComponents.spreadsheet({
    data: [
        ["Name", "Value"],
        ["Item 1", 100]
    ],
    columnConfig: [
        { header: "Name", type: "text" },
        { header: "Value", type: "number" }
    ]
});
```

---

### gantt(context, tasksData, options?)

Renders a Gantt chart.

```javascript
UIComponents.gantt(
  context: Context,
  tasksData: object,
  options?: {
    operators?: { execute: Function },
    onTaskRowClick?: (taskId: string | number) => void,
    shouldRunSelectTaskOnRowClick?: () => boolean
  }
): UIDiv
```

Optional `options`:

- **`onTaskRowClick`** — If provided, row clicks invoke this with the task id instead of the default operator path (host can implement clear-then-select or other behavior).
- **`operators`** — Used for default row-click handling (`bim.select_task`) when `onTaskRowClick` is omitted.
- **`shouldRunSelectTaskOnRowClick`** — When `onTaskRowClick` is omitted, row clicks run the operator only if this returns `true` when provided; if omitted, row clicks run whenever `operators` is available.

---

### nodes(nodes)

Creates a node editor component.

```javascript
UIComponents.nodes(nodes: object): Nodes
```

---

### splitContainer(direction, children)

Creates a split container for resizable layouts.

```javascript
UIComponents.splitContainer(direction: 'horizontal' | 'vertical', children?: array): UIDiv
```

## Utility Functions

### center(component)

Adds centered class to a component.

```javascript
UIComponents.center(component: UIElement): UIElement
```

---

### handle(type)

Creates a drag handle element.

```javascript
UIComponents.handle(type?: string): HTMLSpanElement
```

---

### instructionLine(keyText, description)

Creates a keyboard instruction line.

```javascript
UIComponents.instructionLine(keyText: string, description: string): UIRow
```

---

### instructionPanel(title, iconName, instructions)

Creates an instruction panel with keyboard shortcuts.

```javascript
UIComponents.instructionPanel(title: string, iconName: string, instructions: array): UIDiv
```

**Example:**
```javascript
const panel = UIComponents.instructionPanel("Navigation", "keyboard", [
    { key: "W", desc: "Move forward" },
    { key: "S", desc: "Move backward" }
]);
```

## UIElement Methods

All UIComponents return objects with these common methods:

| Method | Description |
|--------|-------------|
| `add(child)` | Add a child element |
| `remove(child)` | Remove a child element |
| `clear()` | Remove all children |
| `setId(id)` | Set element ID |
| `setClass(className)` | Set CSS class |
| `addClass(className)` | Add CSS class |
| `removeClass(className)` | Remove CSS class |
| `setStyle(property, value)` | Set inline style |
| `setDisplay(value)` | Set display style |
| `setWidth(value)` | Set width |
| `setHeight(value)` | Set height |
| `setMargin(value)` | Set margin |
| `onClick(callback)` | Add click handler |
| `onChange(callback)` | Add change handler |
| `setValue(value)` | Set element value |
| `getValue()` | Get element value |

## Related

- [Building UI Guide](../guides/building-ui.md)
- [LayoutManager API](layoutmanager.md)
- [First Addon](../getting-started/first-addon.md)
