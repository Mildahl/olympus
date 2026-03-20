# Editors & editor support

Main editor and related UI/support components. No central registry — structure is fixed.

| Name | Path | Description |
|------|------|-------------|
| Editor | `src/context/world/Editor.js` | Main editor class: scene, camera, signals, history, loader, storage. |
| EditorControls | `src/context/world/EditorControls.js` | Viewport controls used by the editor. |
| Sidebar | `src/context/world/editor/Sidebar.js` | Main sidebar container and panel registration. |
| Sidebar (Scene) | `src/context/world/editor/Sidebar.Scene.js` | Scene hierarchy panel. |
| Sidebar (Properties) | `src/context/world/editor/Sidebar.Properties.js` | Object properties panel. |
| Sidebar (Project) | `src/context/world/editor/Sidebar.Project.js` | Project / assets panel. |
| Sidebar (Material) | `src/context/world/editor/Sidebar.Material.js` | Material editing panel. |
| Sidebar (Geometry) | `src/context/world/editor/Sidebar.Geometry.js` | Geometry editing panel. |
| Sidebar (Settings) | `src/context/world/editor/Sidebar.Settings.js` | Editor settings panel. |
| Sidebar (Script) | `src/context/world/editor/Sidebar.Script.js` | Script attachment panel. |
| Config | `src/context/world/editor/Config.js` | Editor configuration. |
| Loader | `src/context/world/editor/Loader.js` | Asset loading. |
| History | `src/context/world/editor/History.js` | Undo/redo history. |
| Storage | `src/context/world/editor/Storage.js` | Editor storage/persistence. |
| NavigationController | `src/context/world/editor/NavigationController.js` | Fly/drive navigation. |
| ScriptEditorWindow | `src/modules/code.scripting/ScriptEditorWindow.js` | Script editor window (module). |
| MonacoEditor | `src/tool/code/MonacoEditor/MonacoEditor.js` | Monaco-based code editor tool. |
| CodeEditorTool | `src/tool/code/CodeEditorTool.js` | Code editor tool. |
| NodeEditorTool | `src/tool/code/NodeEditorTool.js` | Node editor tool. |
