# Core API\n\nOlympus Core is a single object exported from `src/core/index.js`. Each namespace provides functions used by operators and the app.\n\n## Init

| Function |
|----------|
| `storeEditor` |

## Notification

| Function |
|----------|
| `newNotification` |
| `markNotificationRead` |
| `markAllNotificationsRead` |
| `removeNotification` |
| `clearAllNotifications` |

## World

| Function |
|----------|
| `initWorld` |
| `createWorldStructure` |
| `createNode` |
| `getWorldStructure` |
| `getLayerGroup` |
| `getLayerCollection` |
| `getLayer` |
| `resetWorld` |

## Scripting

| Function |
|----------|
| `enableJavaScript` |
| `enablePython` |
| `enableViewerAPI` |
| `enableMonacoEditor` |
| `runCode` |
| `runPythonCode` |
| `runJavaScriptCode` |
| `newScript` |
| `openScript` |
| `enableBIM` |
| `createScriptEditor` |
| `saveScript` |
| `refreshScript` |
| `runScript` |
| `renameScript` |
| `colorizeDom` |
| `minimizeAllEditorPanels` |
| `maximizeEditorPanel` |
| `activateScript` |
| `getScriptCode` |

## Terminal

| Function |
|----------|
| `newTerminal` |
| `openTerminal` |
| `executeTerminalCommand` |
| `clearTerminal` |
| `setTerminalLanguage` |
| `renameTerminal` |

## Layer

| Function |
|----------|
| `activateLayer` |
| `setActive` |
| `getLayerByName` |
| `createLayer` |
| `removeLayer` |
| `setLayerVisibility` |
| `getAllLayers` |
| `collectLayers` |

## Viewpoint

| Function |
|----------|
| `create` |
| `remove` |
| `rename` |
| `updatePosition` |
| `updateTarget` |
| `activate` |
| `updateFromEditor` |
| `setVisibility` |
| `toggleVisibility` |
| `navigateBack` |
| `navigateForward` |
| `clearHistory` |
| `importJSON` |
| `exportJSON` |

## AnimationPath

| Function |
|----------|
| `create` |
| `remove` |
| `rename` |
| `activate` |
| `setVisibility` |
| `toggleVisibility` |
| `play` |
| `stop` |
| `addViewpoint` |
| `removeViewpoint` |
| `moveViewpoint` |
| `updateSettings` |
| `setPathColor` |
| `setMarkerColor` |
| `setTargetColor` |
| `createTemplate` |
| `updateViewpointSettings` |

## Measure

| Function |
|----------|
| `activateMeasure` |
| `deactivateMeasure` |
| `toggleMeasure` |
| `addMeasurePoint` |
| `completeMeasurement` |
| `clearMeasurements` |
| `removeMeasurement` |
| `getAllMeasurements` |
| `getMeasureState` |
| `setMeasureUnits` |
| `exportMeasurements` |
| `importMeasurements` |

## SectionBox

| Function |
|----------|
| `activateSectionBox` |
| `deactivateSectionBox` |
| `toggleSectionBox` |
| `setSectionBoxBounds` |
| `fitSectionBoxToSelection` |
| `fitSectionBoxToAll` |
| `resetSectionBox` |
| `setSectionBoxVisibility` |
| `getSectionBoxState` |
| `getSectionBoxBounds` |
| `expandSectionBox` |

## Navigation

| Function |
|----------|
| `resolveSceneObject` |
| `resolveModeOptions` |
| `setNavigationMode` |
| `toggleFlyMode` |
| `toggleDriveMode` |
| `setOrbitMode` |
| `getNavigationMode` |
| `setNavigationSpeed` |
| `resetCamera` |
| `fitCameraToSelection` |
| `fitCameraToAll` |

## Spatial

| Function |
|----------|
| `openSpatialManager` |
| `enableEditingForLayer` |
| `refreshSpatialManager` |
| `collapseAllNodes` |
| `expandAllNodes` |
| `expandToLevel` |
| `selectObject` |
| `deselectAll` |
| `getSelection` |
| `hideObject` |
| `showObject` |
| `toggleObjectVisibility` |
| `isolateSelection` |
| `collectIds` |
| `showAll` |
| `moveObject` |
| `focusOnObject` |

## Theme

| Function |
|----------|
| `applyTheme` |
| `whichHalfDay` |
| `changeTheme` |
| `changeThemeColors` |
| `getCurrentTheme` |
| `getThemeColors` |
| `getAvailableThemes` |
| `registerTheme` |
| `getCSSVariable` |
| `setCSSVariable` |

## BIM

| Function |
|----------|
| `setActiveBIMModel` |
| `loadBIMModelFromPath` |
| `loadBIMModelFromBlob` |
| `newBIMModel` |
| `deleteBIMModel` |
| `saveBIMModelToFile` |
| `loadGeometryData` |
| `createWall` |
| `createWindow` |
| `createDoor` |
| `refreshElementGeometry` |
| `deleteElement` |
| `addIfcElementToScene` |
| `removeIfcElementFromScene` |

## Configurator

| Function |
|----------|
| `loadTemplates` |
| `chooseAvatar` |
| `getConfiguration` |
| `updateUIConfiguration` |
| `updateAppConfiguration` |
| `saveConfiguration` |
| `resetConfiguration` |
| `getActiveModules` |
| `enableModule` |
| `disableModule` |
| `getJobRoles` |
| `applyJobRole` |

## Scheduling

| Function |
|----------|
| `add_work_schedule` |
| `enable_editing_workschedule_tasks` |
| `remove_work_schedule` |
| `add_work_plan` |
| `remove_work_plan` |
| `enable_editing_work_plan` |
| `disable_editing_work_plan` |
| `enable_editing_work_schedules` |

