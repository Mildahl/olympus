# API Reference

This section provides complete API documentation for the Olympus/AECO library.

## Organization

The API is organized by layer:

### Core APIs
Namespaced functions for high-level operations:
- **World** — Scene and world management
- **Viewpoint** — Camera viewpoints and positions
- **Layer** — Layer system management
- **BIM** — Building Information Model operations
- **Navigation** — Navigation modes and controls
- **Spatial** — Spatial queries and operations
- **Measure** — Measurement tools
- **SectionBox** — Section box controls
- **Theme** — Theme and color management
- **Scripting** — Script execution
- **Terminal** — Terminal interface

### UI APIs
- [UIComponents](ui/components.md) — Component factory methods (`floatingPanel`, `tabbedPanel`, …)
- [LayoutManager](ui/layoutmanager.md) — Workspace tabs, resize, persistence, tab-strip float hooks
- **`TabPanel`** — `drawUI/TabPanel.js` / `DrawUI.tabPanel()` (documented under [UIComponents → Panels](ui/components.md#panels) and [Using LayoutManager](../guides/using-layoutmanager.md))

### Operators
- [Operators](operators/index.md) — Operator base class and registry

### Modules
- [ModuleRegistry](modules/index.md) — Module registration system

## Import Patterns

```javascript
// Main AECO class
import { AECO } from "aeco";

// Core APIs
import { Core } from "aeco";
// Access: Core.World, Core.Viewpoint, Core.BIM, etc.

// Operators
import { Operator, operators } from "aeco";

// Tools
import { tools } from "aeco";

// UIComponents (wrapped)
import { UIComponents } from "aeco";

// DrawUI (direct)
import { DrawUI } from "../../drawUI/index.js";
```

## Conventions

### Function Signatures

Functions are documented with:
```
functionName(param1: Type, param2?: Type): ReturnType
```

- `param` — Required parameter
- `param?` — Optional parameter
- `param = default` — Parameter with default value

### Parameter Tables

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | — | Required parameter |
| `options` | object | `{}` | Optional config object |
| `options.flag` | boolean | `true` | Nested option |

### Return Values

```javascript
// Returns object with status
{ status: "FINISHED", data: ... }

// Returns boolean
true | false

// Returns element
UIDiv | HTMLElement | null
```

## Public vs Private

Public API:
- Functions and methods without underscore prefix
- Exported from module index files
- Documented here

Private/Internal:
- Functions starting with `_` (e.g., `_setupLayout`)
- Not documented, may change without notice

## Version Compatibility

API version follows semantic versioning:
- **Major** — Breaking changes
- **Minor** — New features, backward compatible
- **Patch** — Bug fixes

Check `package.json` for current version.

## Quick Links

### Getting Started
- [Installation](../getting-started/installation.md)
- [HelloWorld Tutorial](../getting-started/helloworld-tutorial.md)
- [First Addon](../getting-started/first-addon.md)

### Guides
- [Writing Operators](../guides/writing-operators.md)
- [Building UI](../guides/building-ui.md)
- [Using LayoutManager](../guides/using-layoutmanager.md)

### Reference
- [UIComponents](ui/components.md)
- [LayoutManager](ui/layoutmanager.md)
- [Operators](operators/index.md)
