# Modules\n\nCore modules are registered in `src/modules/index.js` and activated via `moduleRegistry`. Each module can expose operators and UI. The table below is a **table of contents** — use it to jump to each module.\n\n## Table of contents

| Id | Name | Description | Version | Depends on | Operators |
|----|------|-------------|---------|------------|----------|
| `world` | [World](#module-world) | Core 3D viewport and world structure management | 1.0.0 | — | 8 |
| `configurator` | [Configurator](#module-configurator) | Application configuration and template management | 1.0.0 | — | 2 |
| `world.information` | [World information](#module-world-information) | Information display capabilities within the world context. | 1.0.0 | world | 1 |
| `world.navigation` | [Navigation](#module-world-navigation) | Viewport navigation controls (orbit, fly, drive) | 1.0.0 | world | 3 |
| `theme` | [Theme](#module-theme) | Visual theme and color scheme management | 1.0.0 | — | 2 |
| `settings` | [Settings](#module-settings) | General application settings panel | 1.0.0 | theme, world.navigation | 3 |
| `world.notification` | [World Notifications](#module-world-notification) | In-app notification system | 1.0.0 | world | 5 |
| `world.layer` | [World Layers](#module-world-layer) | Layer management for world structure | 1.0.0 | world | 3 |
| `world.spatial` | [World Spatial](#module-world-spatial) | Spatial structure and hierarchy management | 1.0.0 | world, world.layer | 7 |
| `world.viewpoints` | [World Viewpoints](#module-world-viewpoints) | Camera viewpoint management and snapshots | 1.0.0 | world | 15 |
| `world.animationPath` | [World Animation Path](#module-world-animationPath) | Camera animation path creation and playback | 1.0.0 | world, world.viewpoints | 16 |
| `world.measure` | [Measure Tools](#module-world-measure) | Professional measurement tools for 3D viewport with snap support | 1.0.0 | world | 13 |
| `world.sectionbox` | [Section Box](#module-world-sectionbox) | Interactive section box tool for 3D clipping and analysis | 1.0.0 | world | 12 |
| `world.snap` | [Snapping](#module-world-snap) | Global snapping settings and utilities for the application | 1.0.0 | — | 4 |
| `world.history` | [History](#module-world-history) | Undo/redo history management with visual timeline | 1.0.0 | world | 4 |
| `tiles` | [Tiles](#module-tiles) | 3D Tiles loading and rendering | 1.0.0 | world | 5 |
| `code.scripting` | [Scripting](#module-code-scripting) | Python and JavaScript script editor and execution | 1.0.0 | world | 17 |
| `code.terminal` | [Terminal](#module-code-terminal) | Interactive Python and JavaScript terminal sessions | 1.0.0 | world, code.scripting | 6 |
| `bim.project` | [BIM Project](#module-bim-project) | BIM project management and templates | 1.0.0 | world, code.scripting | 6 |
| `bim.attribute` | [BIM Attribute](#module-bim-attribute) | IFC attribute viewing and editing | 1.0.0 | bim.project | 3 |
| `bim.pset` | [BIM Property Sets](#module-bim-pset) | IFC property set and quantity set viewing and editing | 1.0.0 | bim.project | 4 |
| `bim.sequence` | [BIM Construction Sequencing](#module-bim-sequence) | IFC 4D scheduling and timeline management | 1.0.0 | bim.project | 19 |
| `bim.model` | [Modeling tools](#module-bim-model) | BIM modeling tools and operations | 1.0.0 | bim.project | 10 |

---

## World {#module-world}

**Id:** `world`  
**Version:** 1.0.0  

Core 3D viewport and world structure management

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.create_world_layers` | Operator CreateWorld | REGISTER |
| `viewer.focus_on_selection` | Focus on Selection | — |
| `viewer.isolate_elements` | Isolate Elements | — |
| `viewer.unisolate_elements` | Unisolate Elements (Undo Isolation) | — |
| `viewer.show_all_elements` | Show All Elements | — |
| `viewer.select_all` | Select All | — |
| `viewer.deselect_all` | Deselect All | — |
| `viewer.set_view` | Set View | — |

## Configurator {#module-configurator}

**Id:** `configurator`  
**Version:** 1.0.0  

Application configuration and template management

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `configurator.chose_avatar` | Choose Avatar | REGISTER |
| `configurator.load_templates` | Load Templates | REGISTER |

## World information {#module-world-information}

**Id:** `world.information`  
**Version:** 1.0.0  
**Depends on:** `world`  

Information display capabilities within the world context.

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.new_notification` | New Notification | REGISTER |

## Navigation {#module-world-navigation}

**Id:** `world.navigation`  
**Version:** 1.0.0  
**Depends on:** `world`  

Viewport navigation controls (orbit, fly, drive)

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `navigation.toggle_fly_mode` | Toggle Fly Mode | REGISTER |
| `navigation.toggle_drive_mode` | Toggle Drive Mode | REGISTER |
| `navigation.set_mode` | Set Navigation Mode | REGISTER |

## Theme {#module-theme}

**Id:** `theme`  
**Version:** 1.0.0  

Visual theme and color scheme management

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `theme.change_to` | Change Theme | REGISTER |
| `theme.change_to_colors` | Change Theme Colors | REGISTER |

## Settings {#module-settings}

**Id:** `settings`  
**Version:** 1.0.0  
**Depends on:** `theme`, `world.navigation`  

General application settings panel

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `theme.change_to` | Change Theme | REGISTER |
| `theme.change_to_colors` | Change Theme Colors | REGISTER |
| `navigation.change_settings` | Change Navigation Settings | REGISTER |

## World Notifications {#module-world-notification}

**Id:** `world.notification`  
**Version:** 1.0.0  
**Depends on:** `world`  

In-app notification system

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.new_notification` | New Notification | REGISTER |
| `world.mark_notification_read` | Mark Notification Read | REGISTER |
| `world.mark_all_notifications_read` | Mark All Notifications Read | REGISTER |
| `world.remove_notification` | Remove Notification | REGISTER |
| `world.clear_all_notifications` | Clear All Notifications | REGISTER |

## World Layers {#module-world-layer}

**Id:** `world.layer`  
**Version:** 1.0.0  
**Depends on:** `world`  

Layer management for world structure

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.activate_layer` | Activate Layer | REGISTER |
| `world.get_layer_by_name` | Get Layer By Name | REGISTER |
| `world.create_root_layer` | Create World Layer | REGISTER |

## World Spatial {#module-world-spatial}

**Id:** `world.spatial`  
**Version:** 1.0.0  
**Depends on:** `world`, `world.layer`  

Spatial structure and hierarchy management

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `spatial.open` | Open Spatial Manager | REGISTER |
| `spatial.enable_editing` | Enable Spatial Editing | REGISTER |
| `spatial.refresh` | Refresh Spatial Manager | REGISTER |
| `spatial.collapse_all` | Collapse All Spatial Tree | REGISTER |
| `spatial.expand_all` | Expand Spatial Tree | REGISTER |
| `spatial.move_object` | Move Object | REGISTER |
| `spatial.select` | Select Object in Spatial Tree | REGISTER |

## World Viewpoints {#module-world-viewpoints}

**Id:** `world.viewpoints`  
**Version:** 1.0.0  
**Depends on:** `world`  

Camera viewpoint management and snapshots

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `viewpoint.create` | Create Viewpoint | REGISTER |
| `viewpoint.remove` | Remove Viewpoint | REGISTER |
| `viewpoint.rename` | Rename Viewpoint | REGISTER |
| `viewpoint.update_position` | Update Viewpoint Camera Position | REGISTER |
| `viewpoint.update_target` | Update Viewpoint Camera Target | REGISTER |
| `viewpoint.update_from_editor` | Update Viewpoint From Current View | REGISTER |
| `viewpoint.activate` | Activate Viewpoint | REGISTER |
| `viewpoint.navigate_back` | Navigate Back | REGISTER |
| `viewpoint.navigate_forward` | Navigate Forward | REGISTER |
| `viewpoint.clear_history` | Clear Navigation History | REGISTER |
| `viewpoint.get` | Get Viewpoint | REGISTER |
| `viewpoint.get_by_name` | Get Viewpoint By Name | REGISTER |
| `viewpoint.export` | Export Viewpoints | REGISTER |
| `viewpoint.import` | Import Viewpoints | REGISTER |
| `viewpoint.toggle_visibility` | Toggle Viewpoint Visibility | REGISTER |

## World Animation Path {#module-world-animationPath}

**Id:** `world.animationPath`  
**Version:** 1.0.0  
**Depends on:** `world`, `world.viewpoints`  

Camera animation path creation and playback

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `animationPath.create` | Create Animation Path | REGISTER |
| `animationPath.remove` | Remove Animation Path | REGISTER |
| `animationPath.rename` | Rename Animation Path | REGISTER |
| `animationPath.activate` | Activate Animation Path | REGISTER |
| `animationPath.toggle_visibility` | Toggle Animation Path Visibility | REGISTER |
| `animationPath.play` | Play Animation Path | REGISTER |
| `animationPath.stop` | Stop Animation Path | REGISTER |
| `animationPath.add_viewpoint` | Add Viewpoint to Animation Path | REGISTER |
| `animationPath.remove_viewpoint` | Remove Viewpoint from Animation Path | REGISTER |
| `animationPath.move_viewpoint` | Move Viewpoint in Path | REGISTER |
| `animationPath.update_settings` | Update Animation Settings | REGISTER |
| `animationPath.set_path_color` | Set Path Color | REGISTER |
| `animationPath.set_marker_color` | Set Marker Color | REGISTER |
| `animationPath.set_target_color` | Set Target Color | REGISTER |
| `animationPath.create_template` | Create Animation Path Template | REGISTER |
| `animationPath.update_viewpoint_settings` | Update Viewpoint Settings | REGISTER |

## Measure Tools {#module-world-measure}

**Id:** `world.measure`  
**Version:** 1.0.0  
**Depends on:** `world`  

Professional measurement tools for 3D viewport with snap support

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.measure.toggle` | Toggle Measure Tool | REGISTER |
| `world.measure.activate` | Activate Measure Tool | REGISTER |
| `world.measure.deactivate` | Deactivate Measure Tool | REGISTER |
| `world.measure.set_mode` | Set Measure Mode | REGISTER |
| `world.measure.create_distance` | Create Distance Measurement | REGISTER |
| `world.measure.create_angle` | Create Angle Measurement | REGISTER |
| `world.measure.create_area` | Create Area Measurement | REGISTER |
| `world.measure.create_perpendicular` | Create Perpendicular Measurement | REGISTER |
| `world.measure.clear_all` | Clear All Measurements | REGISTER |
| `world.measure.delete_last` | Delete Last Measurement | REGISTER |
| `world.measure.delete` | Delete Measurement | REGISTER |
| `world.measure.export` | Export Measurements | REGISTER |
| `world.measure.get_measurements` | Get Measurements | REGISTER |

## Section Box {#module-world-sectionbox}

**Id:** `world.sectionbox`  
**Version:** 1.0.0  
**Depends on:** `world`  

Interactive section box tool for 3D clipping and analysis

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.sectionbox.toggle` | Toggle Section Box | REGISTER |
| `world.sectionbox.activate` | Activate Section Box | REGISTER |
| `world.sectionbox.deactivate` | Deactivate Section Box | REGISTER |
| `world.sectionbox.reset` | Reset Section Box | REGISTER |
| `world.sectionbox.fit_selection` | Fit Section Box to Selection | REGISTER |
| `world.sectionbox.fit_all` | Fit Section Box to All | REGISTER |
| `world.sectionbox.set_box` | Set Section Box | REGISTER |
| `world.sectionbox.export` | Export Section Box | REGISTER |
| `world.sectionbox.import` | Import Section Box | REGISTER |
| `world.sectionbox.toggle_visibility` | Toggle Section Box Visibility | REGISTER |
| `world.sectionbox.toggle_clipping` | Toggle Section Box Clipping | REGISTER |
| `world.sectionbox.set_gizmo_mode` | Set Section Box Gizmo Mode | REGISTER |

## Snapping {#module-world-snap}

**Id:** `world.snap`  
**Version:** 1.0.0  

Global snapping settings and utilities for the application

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `world.snap.set_option` | Set Snap Option | REGISTER |
| `world.snap.get_options` | Get Snap Options | REGISTER |
| `world.snap.toggle_enabled` | Toggle Snap Enabled | REGISTER |
| `world.snap.toggle_menu` | Toggle Snap Menu | REGISTER |

## History {#module-world-history}

**Id:** `world.history`  
**Version:** 1.0.0  
**Depends on:** `world`  

Undo/redo history management with visual timeline

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `history.undo` | Undo | REGISTER, SKIP_HISTORY |
| `history.redo` | Redo | REGISTER, SKIP_HISTORY |
| `history.clear` | Clear History | REGISTER, SKIP_HISTORY |
| `history.go_to_state` | Go To History State | REGISTER, SKIP_HISTORY |

## Tiles {#module-tiles}

**Id:** `tiles`  
**Version:** 1.0.0  
**Depends on:** `world`  

3D Tiles loading and rendering

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `tiles.load_tileset` | tiles.load_tileset | REGISTER |
| `tiles.load_cesium_ion` | tiles.load_cesium_ion | REGISTER |
| `tiles.remove_tileset` | tiles.remove_tileset | REGISTER |
| `tiles.set_quality` | tiles.set_quality | REGISTER |
| `tiles.toggle_debug` | tiles.toggle_debug | REGISTER |

## Scripting {#module-code-scripting}

**Id:** `code.scripting`  
**Version:** 1.0.0  
**Depends on:** `world`  

Python and JavaScript script editor and execution

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `code.enable_python` | Enable Python | REGISTER |
| `code.enable_javascript` | Enable JavaScript | REGISTER |
| `code.enable_bim` | Enable BIM | REGISTER |
| `code.enable_viewer_api` | Enable Viewer API | REGISTER |
| `code.run_python` | Run Python Code | REGISTER |
| `code.run_javascript` | Run JavaScript | REGISTER |
| `code.run_code` | Run Code | REGISTER |
| `code.new_script` | New Script | REGISTER |
| `code.show_editor` | Show Code Editor | REGISTER |
| `code.open_script` | Open Script | REGISTER |
| `code.save_script` | Save Script | REGISTER |
| `code.update_script` | Update Script | REGISTER |
| `code.run_script` | Run Script | REGISTER |
| `code.rename_script` | Rename Script | REGISTER |
| `code.switch_script` | Switch Script | REGISTER |
| `code.close_script_tab` | Close Script Tab | REGISTER |
| `code.create_template_scripts` | Create Template Scripts | REGISTER |

## Terminal {#module-code-terminal}

**Id:** `code.terminal`  
**Version:** 1.0.0  
**Depends on:** `world`, `code.scripting`  

Interactive Python and JavaScript terminal sessions

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `terminal.new` | New Terminal | REGISTER |
| `terminal.open` | Open Terminal | REGISTER |
| `terminal.execute` | Execute Terminal Command | REGISTER |
| `terminal.clear` | Clear Terminal | REGISTER |
| `terminal.set_language` | Set Terminal Language | REGISTER |
| `terminal.rename` | Rename Terminal | REGISTER |

## BIM Project {#module-bim-project}

**Id:** `bim.project`  
**Version:** 1.0.0  
**Depends on:** `world`, `code.scripting`  

BIM project management and templates

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `bim.load_model_from_path` | Load BIM Model from Path | REGISTER |
| `bim.set_active_model` | Set Active BIM Model | REGISTER |
| `bim.edit_project_name` | Edit Project Name | REGISTER |
| `bim.save_ifc` | Save IFC Model | REGISTER |
| `bim.load_geometry_data` | Load Geometry Data | REGISTER |
| `bim.new_model` | Create BIM | REGISTER |

## BIM Attribute {#module-bim-attribute}

**Id:** `bim.attribute`  
**Version:** 1.0.0  
**Depends on:** `bim.project`  

IFC attribute viewing and editing

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `bim.enable_bim_selection` | Enable BIM Selection | REGISTER |
| `bim.enable_editing_attributes` | Enable Editing Attributes | REGISTER |
| `bim.edit_attributes` | Edit Attributes | REGISTER |

## BIM Property Sets {#module-bim-pset}

**Id:** `bim.pset`  
**Version:** 1.0.0  
**Depends on:** `bim.project`  

IFC property set and quantity set viewing and editing

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `bim.edit_property_set` | Edit Property Set | REGISTER |
| `bim.edit_quantity_set` | Edit Quantity Set | REGISTER |
| `bim.load_properties` | Load Properties | REGISTER |
| `bim.calculate_quantities` | Calculate Quantities | REGISTER |

## BIM Construction Sequencing {#module-bim-sequence}

**Id:** `bim.sequence`  
**Version:** 1.0.0  
**Depends on:** `bim.project`  

IFC 4D scheduling and timeline management

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `bim.add_work_schedule` | Add Work Schedule | REGISTER |
| `bim.remove_work_schedule` | Remove Work Schedule | REGISTER |
| `bim.list_work_schedules` | List Work Schedules | REGISTER |
| `bim.enable_editing_work_schedules` | Enable Editing Work Schedule | REGISTER |
| `bim.enable_editing_work_schedule_tasks` | Enable Editing Tasks | REGISTER |
| `bim.switch_view` | Switch Schedule View | REGISTER |
| `bim.select_task` | Select Schedule Task | REGISTER |
| `bim.deselect_task` | Deselect Schedule Task | REGISTER |
| `bim.expand_node_path` | Expand Node Path | REGISTER |
| `bim.test` | Test Scheduler | REGISTER |
| `bim.load_animation_data` | Load Animation Data | REGISTER |
| `bim.get_elements_at_date` | Get Elements At Date | REGISTER |
| `bim.get_schedule_date_range` | Get Schedule Date Range | REGISTER |
| `bim.play_animation` | Play Animation | REGISTER |
| `bim.pause_animation` | Pause Animation | REGISTER |
| `bim.stop_animation` | Stop Animation | REGISTER |
| `bim.set_animation_date` | Set Animation Date | REGISTER |
| `bim.set_animation_color_scheme` | Set Animation Color Scheme | REGISTER |
| `bim.wire_animation_schedule` | Wire Animation to Schedule | REGISTER |

## Modeling tools {#module-bim-model}

**Id:** `bim.model`  
**Version:** 1.0.0  
**Depends on:** `bim.project`  

BIM modeling tools and operations

### Operators

| Operator | Label | Options |
|----------|-------|--------|
| `bim.set_active_type` | Operator Template | REGISTER |
| `bim.create_space` | Create Space | REGISTER, UNDO |
| `bim.vertical_layer` | Horizontal Construction | REGISTER, UNDO |
| `bim.profiled_construction` | Profiled Construction | REGISTER, UNDO |
| `bim.new_occurence` | New Occurence | REGISTER, UNDO |
| `bim.horizontal_layer` | Horizontal Layer | REGISTER, UNDO |
| `bim.create_window` | Create Window | REGISTER, UNDO |
| `bim.create_door` | Create Door | REGISTER, UNDO |
| `bim.refresh_element` | Refresh Element Geometry | REGISTER |
| `bim.delete_element` | Delete Element | REGISTER, UNDO |

