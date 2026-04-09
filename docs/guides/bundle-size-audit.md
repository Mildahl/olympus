# Olympus Bundle Size Audit

> Audit date: April 2026
> Webpack 5.103.0 · Node 18+ · ESM output (`outputModule: true`)

---

## Current State

| Metric | Value |
|---|---|
| **src/ total** | 2.56 MB (364 JS files) |
| **dist/index.js (production, minified)** | **1.47 MB** |
| **dist/index.js (development, unminified)** | 3.14 MB |
| **dist/index.js.map** | 4.41 MB (source map) |
| **dist/pyodide.worker.js** | 31.5 KB |
| **dist/index.js gzipped** | **337 KB** |
| **Total modules bundled** | 338 (332 concatenated + 6 cacheable) |

The **3.2 MB** that appears on disk is the **development build** (unminified). A production build (`npm run build`) produces **1.47 MB** minified. Both modes bundle the **entire source tree** into a single file — no code splitting occurs.

---

## Bundle Composition (dev mode, by directory)

| Source | Size | Files | Notes |
|---|---|---|---|
| `src/modules/` | 880 KB | 104 | All 28 core modules, always bundled |
| `src/tool/` | 457 KB | 32 | All tools (viewer, model, BIM, code) |
| `src/context/` | 445 KB | 95 | Editor (330 KB), Viewport, world utils |
| `src/ui/` | 401 KB | 21 | Components, Strings.js (114 KB), UIHelper |
| `drawUI/` | 268 KB | 14 | UI primitive library (imported by src/) |
| `src/core/` | 155 KB | 23 | Core module definitions (llm.chat, bim, etc.) |
| `src/data/` | 49 KB | 15 | Data/BIM collections |
| `src/*.js` | ~20 KB | 1 | index.js entry (AECO class + public exports) |
| `src/configuration/` | 18 KB | 6 | Config presets and defaults |
| `src/utils/` | 9 KB | 5 | Path helpers, formatting |
| `src/operators/` | 6 KB | 5 | Operator framework |

---

## Root Causes

### 1. `dynamicImportMode: 'eager'` — All Code in One Chunk

**Impact: CRITICAL** · Affects entire bundle

In `webpack.config.js`:

```js
module: {
  parser: {
    javascript: {
      dynamicImportMode: 'eager',  // ← forces ALL import() into main bundle
    },
  },
},
optimization: {
  splitChunks: false,     // ← no chunk splitting at all
  runtimeChunk: false,
},
```

This webpack setting converts every `import()` call in the codebase into a synchronous eager require, packing everything into a single `index.js`. Combined with `splitChunks: false`, **no code splitting can occur at all**.

The only exception: `src/ui/index.js` uses `/* webpackMode: "lazy" */` comment override for its dynamic component loading — but `dynamicImportMode: 'eager'` overrides even that (the UI directory is the only separate chunk reference seen in webpack output).

**Why it exists**: Likely added to avoid worker/chunk loading issues with `outputModule: true` (ES module chunks). The `chunkFormat: 'module'` experiment can cause issues with dynamic chunk loading in some environments.

**Fix**: Remove `dynamicImportMode: 'eager'` and `splitChunks: false`. Allow webpack to naturally split code at `import()` boundaries. This alone could split the bundle into a core chunk (~400-500 KB) and lazy chunks for modules, tools, and UI.

---

### 2. All 28 Core Modules Imported Eagerly

**Impact: ~880 KB** (dev) of module definitions always bundled

`src/modules/index.js` statically imports every core module at the top level:

```js
import configuratorModule from "./configurator/module.js";
import themeModule from "./theme/module.js";
import navigationModule from "./navigation/module.js";
import llmChatModule from "./llm.chat/module.js";
import bimSequenceModule from "./bim.sequence/module.js";
// ... 23 more static imports ...

const allCoreModuleDefinitions = [ /* all 28 modules */ ];

export function registerAllCoreModules(registry) {
  for (const definition of allCoreModuleDefinitions) {
    registry.register(definition);
  }
}
```

This means even if a host app only uses 3 modules, all 28 are bundled:

| Module Group | Size (dev) | Count |
|---|---|---|
| `llm.chat` (UI + bimAdapter + generated map) | 175 KB | 4 files |
| `bim.sequence` (Gantt, scheduling) | 89 KB | 5 files |
| `bim.analytics` | 63 KB | 4 files |
| `navigation` | 55 KB | 3 files |
| `world.animationPath` | 49 KB | 3 files |
| `code.scripting` | 48 KB | 4 files |
| `world.sectionbox` | 44 KB | 3 files |
| `bim.model` | 43 KB | 3 files |
| Other 20 modules | ~314 KB | ~75 files |

**Fix**: Convert `registerAllCoreModules` to a dynamic registry. Module definitions should use `import()` so webpack can split them into separate chunks. Only the module metadata (id, dependencies, description) needs to be in the main bundle; the actual module code (`ui.js`, `operators.js`, `bimAdapter.js`) can be lazy.

---

### 3. All Tools Imported at Parse Time

**Impact: ~457 KB** (dev) of tool implementations always bundled

`src/tool/index.js` statically imports all 18+ tools and wires them into a `Tools` class:

```js
import ModelTool from './model/model.js';           // 92 KB alone
import PythonSandbox from './pyodide/pyodide.js';   // Pyodide bootstrap
import MeasureTool from './viewer/MeasureTool.js';   // 29 KB
import SceneTool from './viewer/SceneTool.js';       // 32 KB
// ... all others ...

class Tools {
  constructor() {
    this.world = { model: ModelTool, scene: SceneTool, /* ... */ };
    this.bim = { ifc: IfcTool, project: ProjectTool, /* ... */ };
    this.code = { pyWorker: PythonSandbox, editor: CodeEditorTool };
  }
}
```

Tree-shaking cannot help here because every tool is referenced via class property assignment.

**Top offenders in `src/tool/`:**

| File | Size | Purpose |
|---|---|---|
| `model/model.js` | 92 KB | Construction equipment factories (cranes, trucks, drones) |
| `model/animate/InteractiveObject.js` | 41 KB | Animation helpers |
| `model/drawing.js` | 37 KB | Drawing/annotation tool |
| `viewer/SceneTool.js` | 32 KB | Scene management |
| `viewer/MeasureTool.js` | 29 KB | Measurement tool |
| `viewer/AnimationPathTool.js` | 25 KB | Animation path tool |
| `viewer/SectionBoxTool.js` | 24 KB | Section box tool |

**Fix**: Split tools into two tiers:
- **Core tools** (always needed): Scene, notification, layer → keep in main bundle
- **Feature tools** (module-gated): Measure, projection, BIM, model, code → lazy-load when the corresponding module activates

---

### 4. Strings.js — All 6 Language Packs Bundled

**Impact: 114 KB** source (significant after minification)

`src/ui/language/Strings.js` contains inline translation tables for 6 languages: `fa`, `en`, `fr`, `zh`, `ja`, `ko`. It's imported at parse time via `src/context/index.js`:

```js
import {Strings} from "../ui/language/Strings.js";
// ...
this.strings = new Strings({ language: 'en' });
```

Even if the app only uses English, all 6 languages (~2,547 lines) are bundled and parsed.

**Fix**: Split each language into a separate JSON file. Load only the active language on demand:

```
src/ui/language/
  en.json    (~20 KB)
  fa.json
  fr.json
  zh.json
  ja.json
  ko.json
  Strings.js (~2 KB loader)
```

---

### 5. drawUI/ Fully Bundled (268 KB)

**Impact: 268 KB** of UI primitives always included

`drawUI/` is a standalone UI component library (42 components) imported from ~20+ locations in `src/`. Key contributors:

| File | Size | Purpose |
|---|---|---|
| `drawUI/ui.js` | 64 KB | All 30+ base UI primitives (UIText, UIPanel, UIButton, etc.) |
| `drawUI/utils/markdownEnhancements.js` | 65 KB | Rich markdown rendering, callouts, quizzes |
| `drawUI/index.js` | 37 KB | Barrel re-export + sanitization utilities |
| `drawUI/BasePanel.js` | 22 KB | Base panel component |
| `drawUI/FloatingPanel.js` | 22 KB | Floating window component |
| `drawUI/TabPanel.js` | 19 KB | Tabbed panel component |

**`markdownEnhancements.js` (65 KB)** is notable: it imports `quizEnhancer.js` (7 KB) and `xmlreader.js` (3 KB), pulling in markdown rendering, quiz interactivity, and XML visualization. This is almost certainly not needed in every build.

**Fix**: 
- Only the lightweight UI primitives (`UIDiv`, `UIRow`, `UIText`, `UIButton`) are truly used everywhere. The heavier components (`FloatingPanel`, `TabPanel`, `markdownEnhancements`) should be lazy-loaded.
- `markdownEnhancements.js` should be loaded only when the LLM chat or documentation modules activate.

---

### 6. `src/context/world/editor/` — 330 KB of Editor Code

**Impact: 330 KB** (88 files) bundled at parse time

This includes the entire 3D editor infrastructure:
- Sidebar geometry editors (Box, Sphere, Cylinder, etc. — ~12 files)
- NavigationController (49 KB)
- Editor.js (29 KB)
- Sidebar.Object.js (25 KB)
- History, Config, Storage, Loader
- UI viewer elements and gizmos

All imported via `src/index.js`:

```js
import { Editor } from "./context/world/Editor.js";
import { Viewport } from "./context/world/Viewport.js";
import { Sidebar, Properties } from "./context/world/editor/Sidebar.js";
import { OrientationGizmo } from "./context/world/editor/ui/ViewerElements/gizmo/OrientationGizmo.js";
```

These are only needed after `createUI()` is called, but they're imported at module parse time.

**Fix**: Move these imports into the `createUI()` method body using dynamic `import()`.

---

### 7. `operatorSignatureMap.generated.js` — 26 KB of Static Metadata

**Impact: 26 KB**

Auto-generated file with 183 operator signatures, used only by the LLM chat module's `bimAdapter.js`. It's only needed when the AI chat feature is active.

**Fix**: Either:
- Generate at runtime from `operators.registry` (eliminating the file entirely), or
- Move into the `llm.chat` module and lazy-load with it

---

### 8. Source Map Always Generated

**Impact: 4.41 MB** disk space (not transferred to users unless configured)

`devtool: 'source-map'` in `webpack.config.js` generates a full source map even in production. This doubles the dist/ disk footprint but doesn't affect network transfer unless the server sends `.map` files.

**Fix**: Consider `devtool: 'hidden-source-map'` for production, or omit for release builds. The source map itself is not the bundle size issue, but it inflates the perceived `dist/` size.

---

## Prioritized Recommendations

### Phase 1: Quick Wins (no architecture changes)

| Change | Estimated Savings | Effort |
|---|---|---|
| Remove `dynamicImportMode: 'eager'` + enable `splitChunks` | Enables all other optimizations | Low |
| Move `Strings.js` languages to separate JSON files | ~90 KB (5 of 6 languages) | Low |
| Lazy-load `markdownEnhancements.js` in drawUI | ~75 KB (markdown + quiz + xml) | Low |
| Make `operatorSignatureMap.generated.js` load-on-demand | ~26 KB | Low |

### Phase 2: Module On-Demand Loading

| Change | Estimated Savings | Effort |
|---|---|---|
| Convert `registerAllCoreModules` to lazy registration | ~600-700 KB moved to chunks | Medium |
| Split `src/tool/index.js` into core vs feature tiers | ~300 KB moved to chunks | Medium |
| Defer Editor/Viewport/Sidebar imports to `createUI()` | ~200 KB moved to chunks | Medium |

### Phase 3: Architecture Improvements

| Change | Estimated Savings | Effort |
|---|---|---|
| Extract `drawUI/` as external/separate entry point | Decouples UI library lifecycle | High |
| Split `model.js` (92 KB) into per-equipment files | Fine-grained loading | Medium |
| Generate operator signatures at runtime | Eliminates generated file | Medium |

---

## Estimated Impact

If Phase 1 + Phase 2 are implemented, the **initial main chunk** would shrink from ~1.47 MB to an estimated **300-500 KB** (minified), with the remaining code loaded on-demand as modules activate. The gzipped initial payload would drop from ~337 KB to ~**80-120 KB**.

---

## How to Verify

```bash
# Production build (current baseline)
npx webpack --mode production

# Dev build with module-level stats
npx webpack --mode development --stats-modules-space 100

# Dev build with per-directory sizes
npx webpack --mode development
```

The dev build output shows per-directory groupings that map directly to the analysis above. After making changes, compare the `asset index.js X.XX MiB` line and verify new lazy chunks appear as separate `asset [name].js` entries.
