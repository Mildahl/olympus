# Operators

Operators are invoked with `operators.execute(operatorName, context, ...args)`. Only operators from active modules are registered.

This page is a **table of contents** by module. Use the links below to jump to the operator list for each module in [Modules](modules.md).

## By module

| Module | Operators |
|--------|----------|
| [World](modules.md#module-world) | 8 |
| [Configurator](modules.md#module-configurator) | 2 |
| [World information](modules.md#module-world-information) | 1 |
| [Navigation](modules.md#module-world-navigation) | 3 |
| [Theme](modules.md#module-theme) | 2 |
| [Settings](modules.md#module-settings) | 3 |
| [World Notifications](modules.md#module-world-notification) | 5 |
| [World Layers](modules.md#module-world-layer) | 3 |
| [World Spatial](modules.md#module-world-spatial) | 7 |
| [World Viewpoints](modules.md#module-world-viewpoints) | 15 |
| [World Animation Path](modules.md#module-world-animationPath) | 16 |
| [Measure Tools](modules.md#module-world-measure) | 13 |
| [Section Box](modules.md#module-world-sectionbox) | 12 |
| [Snapping](modules.md#module-world-snap) | 4 |
| [History](modules.md#module-world-history) | 4 |
| [Tiles](modules.md#module-tiles) | 5 |
| [Scripting](modules.md#module-code-scripting) | 17 |
| [Terminal](modules.md#module-code-terminal) | 6 |
| [BIM Project](modules.md#module-bim-project) | 6 |
| [BIM Attribute](modules.md#module-bim-attribute) | 3 |
| [BIM Property Sets](modules.md#module-bim-pset) | 4 |
| [BIM Construction Sequencing](modules.md#module-bim-sequence) | 19 |
| [Modeling tools](modules.md#module-bim-model) | 10 |

---

## Flat reference

| Operator | Label | Module | Options |
|----------|-------|--------|--------|
| `world.create_world_layers` | Operator CreateWorld | [`world`](modules.md#module-world) | REGISTER |
| `viewer.focus_on_selection` | Focus on Selection | [`world`](modules.md#module-world) | — |
| `viewer.isolate_elements` | Isolate Elements | [`world`](modules.md#module-world) | — |
| `viewer.unisolate_elements` | Unisolate Elements (Undo Isolation) | [`world`](modules.md#module-world) | — |
| `viewer.show_all_elements` | Show All Elements | [`world`](modules.md#module-world) | — |
| `viewer.select_all` | Select All | [`world`](modules.md#module-world) | — |
| `viewer.deselect_all` | Deselect All | [`world`](modules.md#module-world) | — |
| `viewer.set_view` | Set View | [`world`](modules.md#module-world) | — |
| `configurator.chose_avatar` | Choose Avatar | [`configurator`](modules.md#module-configurator) | REGISTER |
| `configurator.load_templates` | Load Templates | [`configurator`](modules.md#module-configurator) | REGISTER |
| `world.new_notification` | New Notification | [`world.information`](modules.md#module-world-information) | REGISTER |
| `navigation.toggle_fly_mode` | Toggle Fly Mode | [`world.navigation`](modules.md#module-world-navigation) | REGISTER |
| `navigation.toggle_drive_mode` | Toggle Drive Mode | [`world.navigation`](modules.md#module-world-navigation) | REGISTER |
| `navigation.set_mode` | Set Navigation Mode | [`world.navigation`](modules.md#module-world-navigation) | REGISTER |
| `theme.change_to` | Change Theme | [`theme`](modules.md#module-theme) | REGISTER |
| `theme.change_to_colors` | Change Theme Colors | [`theme`](modules.md#module-theme) | REGISTER |
| `theme.change_to` | Change Theme | [`settings`](modules.md#module-settings) | REGISTER |
| `theme.change_to_colors` | Change Theme Colors | [`settings`](modules.md#module-settings) | REGISTER |
| `navigation.change_settings` | Change Navigation Settings | [`settings`](modules.md#module-settings) | REGISTER |
| `world.new_notification` | New Notification | [`world.notification`](modules.md#module-world-notification) | REGISTER |
| `world.mark_notification_read` | Mark Notification Read | [`world.notification`](modules.md#module-world-notification) | REGISTER |
| `world.mark_all_notifications_read` | Mark All Notifications Read | [`world.notification`](modules.md#module-world-notification) | REGISTER |
| `world.remove_notification` | Remove Notification | [`world.notification`](modules.md#module-world-notification) | REGISTER |
| `world.clear_all_notifications` | Clear All Notifications | [`world.notification`](modules.md#module-world-notification) | REGISTER |
| `world.activate_layer` | Activate Layer | [`world.layer`](modules.md#module-world-layer) | REGISTER |
| `world.get_layer_by_name` | Get Layer By Name | [`world.layer`](modules.md#module-world-layer) | REGISTER |
| `world.create_root_layer` | Create World Layer | [`world.layer`](modules.md#module-world-layer) | REGISTER |
| `spatial.open` | Open Spatial Manager | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `spatial.enable_editing` | Enable Spatial Editing | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `spatial.refresh` | Refresh Spatial Manager | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `spatial.collapse_all` | Collapse All Spatial Tree | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `spatial.expand_all` | Expand Spatial Tree | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `spatial.move_object` | Move Object | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `spatial.select` | Select Object in Spatial Tree | [`world.spatial`](modules.md#module-world-spatial) | REGISTER |
| `viewpoint.create` | Create Viewpoint | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.remove` | Remove Viewpoint | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.rename` | Rename Viewpoint | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.update_position` | Update Viewpoint Camera Position | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.update_target` | Update Viewpoint Camera Target | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.update_from_editor` | Update Viewpoint From Current View | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.activate` | Activate Viewpoint | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.navigate_back` | Navigate Back | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.navigate_forward` | Navigate Forward | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.clear_history` | Clear Navigation History | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.get` | Get Viewpoint | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.get_by_name` | Get Viewpoint By Name | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.export` | Export Viewpoints | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.import` | Import Viewpoints | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `viewpoint.toggle_visibility` | Toggle Viewpoint Visibility | [`world.viewpoints`](modules.md#module-world-viewpoints) | REGISTER |
| `animationPath.create` | Create Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.remove` | Remove Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.rename` | Rename Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.activate` | Activate Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.toggle_visibility` | Toggle Animation Path Visibility | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.play` | Play Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.stop` | Stop Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.add_viewpoint` | Add Viewpoint to Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.remove_viewpoint` | Remove Viewpoint from Animation Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.move_viewpoint` | Move Viewpoint in Path | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.update_settings` | Update Animation Settings | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.set_path_color` | Set Path Color | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.set_marker_color` | Set Marker Color | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.set_target_color` | Set Target Color | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.create_template` | Create Animation Path Template | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `animationPath.update_viewpoint_settings` | Update Viewpoint Settings | [`world.animationPath`](modules.md#module-world-animationPath) | REGISTER |
| `world.measure.toggle` | Toggle Measure Tool | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.activate` | Activate Measure Tool | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.deactivate` | Deactivate Measure Tool | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.set_mode` | Set Measure Mode | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.create_distance` | Create Distance Measurement | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.create_angle` | Create Angle Measurement | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.create_area` | Create Area Measurement | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.create_perpendicular` | Create Perpendicular Measurement | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.clear_all` | Clear All Measurements | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.delete_last` | Delete Last Measurement | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.delete` | Delete Measurement | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.export` | Export Measurements | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.measure.get_measurements` | Get Measurements | [`world.measure`](modules.md#module-world-measure) | REGISTER |
| `world.sectionbox.toggle` | Toggle Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.activate` | Activate Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.deactivate` | Deactivate Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.reset` | Reset Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.fit_selection` | Fit Section Box to Selection | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.fit_all` | Fit Section Box to All | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.set_box` | Set Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.export` | Export Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.import` | Import Section Box | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.toggle_visibility` | Toggle Section Box Visibility | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.toggle_clipping` | Toggle Section Box Clipping | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.sectionbox.set_gizmo_mode` | Set Section Box Gizmo Mode | [`world.sectionbox`](modules.md#module-world-sectionbox) | REGISTER |
| `world.snap.set_option` | Set Snap Option | [`world.snap`](modules.md#module-world-snap) | REGISTER |
| `world.snap.get_options` | Get Snap Options | [`world.snap`](modules.md#module-world-snap) | REGISTER |
| `world.snap.toggle_enabled` | Toggle Snap Enabled | [`world.snap`](modules.md#module-world-snap) | REGISTER |
| `world.snap.toggle_menu` | Toggle Snap Menu | [`world.snap`](modules.md#module-world-snap) | REGISTER |
| `history.undo` | Undo | [`world.history`](modules.md#module-world-history) | REGISTER, SKIP_HISTORY |
| `history.redo` | Redo | [`world.history`](modules.md#module-world-history) | REGISTER, SKIP_HISTORY |
| `history.clear` | Clear History | [`world.history`](modules.md#module-world-history) | REGISTER, SKIP_HISTORY |
| `history.go_to_state` | Go To History State | [`world.history`](modules.md#module-world-history) | REGISTER, SKIP_HISTORY |
| `tiles.load_tileset` | tiles.load_tileset | [`tiles`](modules.md#module-tiles) | REGISTER |
| `tiles.load_cesium_ion` | tiles.load_cesium_ion | [`tiles`](modules.md#module-tiles) | REGISTER |
| `tiles.remove_tileset` | tiles.remove_tileset | [`tiles`](modules.md#module-tiles) | REGISTER |
| `tiles.set_quality` | tiles.set_quality | [`tiles`](modules.md#module-tiles) | REGISTER |
| `tiles.toggle_debug` | tiles.toggle_debug | [`tiles`](modules.md#module-tiles) | REGISTER |
| `code.enable_python` | Enable Python | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.enable_javascript` | Enable JavaScript | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.enable_bim` | Enable BIM | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.enable_viewer_api` | Enable Viewer API | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.run_python` | Run Python Code | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.run_javascript` | Run JavaScript | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.run_code` | Run Code | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.new_script` | New Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.show_editor` | Show Code Editor | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.open_script` | Open Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.save_script` | Save Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.update_script` | Update Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.run_script` | Run Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.rename_script` | Rename Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.switch_script` | Switch Script | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.close_script_tab` | Close Script Tab | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `code.create_template_scripts` | Create Template Scripts | [`code.scripting`](modules.md#module-code-scripting) | REGISTER |
| `terminal.new` | New Terminal | [`code.terminal`](modules.md#module-code-terminal) | REGISTER |
| `terminal.open` | Open Terminal | [`code.terminal`](modules.md#module-code-terminal) | REGISTER |
| `terminal.execute` | Execute Terminal Command | [`code.terminal`](modules.md#module-code-terminal) | REGISTER |
| `terminal.clear` | Clear Terminal | [`code.terminal`](modules.md#module-code-terminal) | REGISTER |
| `terminal.set_language` | Set Terminal Language | [`code.terminal`](modules.md#module-code-terminal) | REGISTER |
| `terminal.rename` | Rename Terminal | [`code.terminal`](modules.md#module-code-terminal) | REGISTER |
| `bim.load_model_from_path` | Load BIM Model from Path | [`bim.project`](modules.md#module-bim-project) | REGISTER |
| `bim.set_active_model` | Set Active BIM Model | [`bim.project`](modules.md#module-bim-project) | REGISTER |
| `bim.edit_project_name` | Edit Project Name | [`bim.project`](modules.md#module-bim-project) | REGISTER |
| `bim.save_ifc` | Save IFC Model | [`bim.project`](modules.md#module-bim-project) | REGISTER |
| `bim.load_geometry_data` | Load Geometry Data | [`bim.project`](modules.md#module-bim-project) | REGISTER |
| `bim.new_model` | Create BIM | [`bim.project`](modules.md#module-bim-project) | REGISTER |
| `bim.enable_bim_selection` | Enable BIM Selection | [`bim.attribute`](modules.md#module-bim-attribute) | REGISTER |
| `bim.enable_editing_attributes` | Enable Editing Attributes | [`bim.attribute`](modules.md#module-bim-attribute) | REGISTER |
| `bim.edit_attributes` | Edit Attributes | [`bim.attribute`](modules.md#module-bim-attribute) | REGISTER |
| `bim.edit_property_set` | Edit Property Set | [`bim.pset`](modules.md#module-bim-pset) | REGISTER |
| `bim.edit_quantity_set` | Edit Quantity Set | [`bim.pset`](modules.md#module-bim-pset) | REGISTER |
| `bim.load_properties` | Load Properties | [`bim.pset`](modules.md#module-bim-pset) | REGISTER |
| `bim.calculate_quantities` | Calculate Quantities | [`bim.pset`](modules.md#module-bim-pset) | REGISTER |
| `bim.add_work_schedule` | Add Work Schedule | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.remove_work_schedule` | Remove Work Schedule | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.list_work_schedules` | List Work Schedules | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.enable_editing_work_schedules` | Enable Editing Work Schedule | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.enable_editing_work_schedule_tasks` | Enable Editing Tasks | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.switch_view` | Switch Schedule View | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.select_task` | Select Schedule Task | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.deselect_task` | Deselect Schedule Task | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.expand_node_path` | Expand Node Path | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.test` | Test Scheduler | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.load_animation_data` | Load Animation Data | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.get_elements_at_date` | Get Elements At Date | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.get_schedule_date_range` | Get Schedule Date Range | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.play_animation` | Play Animation | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.pause_animation` | Pause Animation | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.stop_animation` | Stop Animation | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.set_animation_date` | Set Animation Date | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.set_animation_color_scheme` | Set Animation Color Scheme | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.wire_animation_schedule` | Wire Animation to Schedule | [`bim.sequence`](modules.md#module-bim-sequence) | REGISTER |
| `bim.set_active_type` | Operator Template | [`bim.model`](modules.md#module-bim-model) | REGISTER |
| `bim.create_space` | Create Space | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.vertical_layer` | Horizontal Construction | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.profiled_construction` | Profiled Construction | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.new_occurence` | New Occurence | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.horizontal_layer` | Horizontal Layer | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.create_window` | Create Window | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.create_door` | Create Door | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
| `bim.refresh_element` | Refresh Element Geometry | [`bim.model`](modules.md#module-bim-model) | REGISTER |
| `bim.delete_element` | Delete Element | [`bim.model`](modules.md#module-bim-model) | REGISTER, UNDO |
