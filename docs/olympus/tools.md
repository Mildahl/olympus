# Tools

Tools are low-level capabilities (scene, model, scripting, BIM, etc.) exposed on `simulation.tools`. They are used by Core, operators, and UI. The registry is defined in `src/tool/index.js`.

## World / viewer

| Key | Class | Path |
|-----|-------|------|
| `configurator` | ConfiguratorTool | `src/tool/configurator/ConfiguratorTool.js` |
| `layer` | LayerTool | `src/tool/layer/LayerTool.js` |
| `scene` | SceneTool | `src/tool/viewer/SceneTool.js` |
| `model` | ModelTool | `src/tool/model/model.js` |
| `drawing` | DrawingTool | `src/tool/model/drawing.js` |
| `slicer` | SliceTool | `src/tool/viewer/SliceTool.js` |
| `markup` | MarkupTool | `src/tool/viewer/MarkupTool.js` |
| `placement` | PlacementTool | `src/tool/model/placement.js` |
| `notification` | NotificationTool | `src/tool/viewer/NotificationTool.js` |
| `viewpoint` | ViewpointTool | `src/tool/viewer/ViewpointTool.js` |
| `animationPath` | AnimationPathTool | `src/tool/viewer/AnimationPathTool.js` |
| `navigate` | null | — |
| `gizmo` | null | — |
| `cursor` | null | — |
| `measure` | MeasureTool | `src/tool/viewer/MeasureTool.js` |
| `sectionBox` | SectionBoxTool | `src/tool/viewer/SectionBoxTool.js` |

## Code

| Key | Class | Path |
|-----|-------|------|
| `pyWorker` | PythonSandbox | `src/tool/pyodide/Python.js` |
| `js` | JSSandboxTool | `src/tool/js/JsSandbox.js` |
| `editor` | CodeEditorTool | `src/tool/code/CodeEditorTool.js` |
| `nodes` | NodeEditorTool | `src/tool/code/NodeEditorTool.js` |

## BIM

| Key | Class | Path |
|-----|-------|------|
| `project` | ProjectTool | `src/tool/bim/project.js` |
| `geometry` | GeometryTool | `src/tool/bim/geometry.js` |
| `attribute` | AttributeTool | `src/tool/bim/attribute.js` |
| `pset` | PsetTool | `src/tool/bim/pset.js` |
| `sequence` | SequenceTool | `src/tool/bim/sequence.js` |
| `types` | TypeTool | `src/tool/bim/type.js` |
| `modeling` | BIMModelingTool | `src/tool/bim/modeling.js` |

## IFC

| Key | Class | Path |
|-----|-------|------|
| `ifc` | IfcTool | `src/tool/bim/ifc.js` |
