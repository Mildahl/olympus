# Why is aeco.js so big?

- **Output bundle:** ~1058 KiB (production minified). **Sum of `olympus/**/*.js` on disk:** ~2239 KiB. So the bundle is *smaller* than the raw source; the build is compressing as expected.

- **Why the script total was wrong:** Webpack’s stats list one “module” that is the **entire concatenated chunk** (~1539 KiB unminified). If you sum every row, you add that chunk plus every source module again → double count. So we now exclude that one row and report: output size from assets, sum of source modules (excl. chunk), and sum of `olympus/*.js` on disk.

- **Cause of size:** Single entry, no code splitting. `olympus/index.js` pulls in the full app (~230 modules). Dependencies (Three, Monaco, etc.) are already external.

---

## Which files are actually big?

The script above lists every module by **parsed size**. The single largest “module” in the list is the **entry chunk** (`olympus/index.js` at ~1540 KiB), which is the whole bundle; ignore that for “which file is big.” The next entries are real files:

| Size (KiB) | File |
|-----------:|------|
| **110.9** | `olympus/ui/language/Strings.js` — locale/i18n strings |
| **92.6** | `olympus/tool/model/model.js` — model tool |
| **84.7** | `olympus/ui/Components/Components.js` — shared UI (panels, markdown, etc.) |
| **63.3** | `olympus/ui/Components/Nodes.js` — node editor UI |
| **57.1** | `olympus/ui/base/ui.js` — base UI elements |
| **41.3** | `olympus/context/world/editor/NavigationController.js` |
| **41.3** | `olympus/tool/model/animate/InteractiveObject.js` |
| **38.6** | `olympus/tool/model/drawing.js` |
| **35.1** | `olympus/modules/world.animationPath/ui.js` |
| **33.0** | `olympus/tool/viewer/SceneTool.js` |
| **32.3** | `olympus/modules/bim.sequence/ui.js` |
| **31.2** | `olympus/ui/utils/markdownEnhancements.js` |
| **31.0** | `olympus/modules/world.measure/operators.js` |
| **29.6** | `olympus/modules/bim.attribute/ui.js` |
| … | Many more in the 10–28 KiB range (Viewport, Editor, tools, other module UIs) |

So the bulk is **shared UI** (Components, base/ui, Nodes, markdown), **tools** (model, drawing, viewer), **context** (NavigationController, Editor, Viewport), and **a few module UIs** (world.animationPath, bim.sequence, world.measure, bim.attribute). Most module files are small; the big ones are mostly UI/operators, not “just text.”

**To make the initial load lighter:**

1. **Code-splitting** – Split by feature (e.g. code.scripting, bim.*, viewer tools) using dynamic `import()` so only core + current view load first.
2. **Lazy modules** – Load heavy module UIs only when the module is activated (e.g. `import('./modules/code.scripting/ui.js')` when the user opens scripting).
3. **Optional externals** – If you ever `import` highlight.js or jsgantt-improved in Olympus, add them to webpack `externals` and load them via vendor scripts so they don’t bloat the bundle.
