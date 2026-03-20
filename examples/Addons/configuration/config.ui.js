/**
 * User Interface Configuration
 * 
 * This file defines the World component structure for the AECO application UI.
 * Customize this to change the layout, menus, toolbars, and module placement.
 */

const viewportToolbar = [
  {
    id: "ViewportMeasureTools",
    name: "Measure Tools",
    icon: "straighten",
    type: "Tool",
    priority: 1,
    moduleId: "world.measure",
    children: [],
  },
];
const ViewportComponents = [
  {
    id: "ViewportGizmo",
    name: "Viewport Gizmo",
    type: "Gizmo",
    priority: 1,
    children: [],
  },
  {
    id: "NavigationToolbar",
    name: "Navigation Toolbar",
    type: "HorizontalToolBar",
    priority: 1,
    children: [],
  },
  {
    id: "ViewportToolBar",
    name: "Viewport ToolBar",
    type: "ToolBar",
    priority: 2,
    children: viewportToolbar,
  },
];

const configMenu = [
  {
    id: "FullScreenToggle",
    name: "Full Screen Toggle",
    type: "Operator",
    icon: "fullscreen",
    active: false,
    disabled: true,
    priority: 3,
    children: [],
  },
];

const exampleContext = [
  {
    id: "Identity",
    name: "Identity",
    type: "ContextModules",
    priority: 1,
    moduleId: "bim.attribute",
    children: [],
  },
  {
    id: "BIMModeling",
    name: "Objects",
    type: "ContextModules",
    disabled: true,
    priority: 3,
    children: [],
    moduleId: "bim.model",
  },
  {
    id: "Geolocation",
    name: "Location",
    type: "ContextModules",
    disabled: true,
    priority: 2,
    children: [],
    moduleId: "bim.geolocation",
  }
];

const HeaderBar = [
  {
    id: "Controls",
    name: "Controls",
    type: "HeaderModule",
    priority: 1,
    children: [],
  },
  {
    id: "ContextMenu",
    name: "Context Menu",
    type: "Modules",
    priority: 2,
    children: exampleContext,
  },
];

const CoreModules = [
  {
    id: "LayersModule",
    name: "Layers Module",
    icon: "layers",
    type: "Module",
    priority: 2,
    moduleId: "world.layer",
  },
];

const addons = [
  {
      id: "NotificationsModule",
      name: "Notifications Module",
      needsCount: true,
      icon: "notifications",
      type: "Module",
      priority: 1,
  },
  {
    id: "ViewpointModule",
    name: "Viewpoint Module",
    type: "Module",
    icon: "camera_alt",
    priority: 2,
    moduleId: "world.viewpoints",
  },
  {
    id: "AnimatorModule",
    name: "Animator Module",
    type: "Module",
    icon: "play_circle",
    priority: 3,
    moduleId: "world.animationPath",
  },
]

const SideBar = [
  {
    id: "AddonsMenu",
    name: "Addons Menu",
    type: "Modules",
    priority: 2,
    children: addons,
  },
  {
    id: "ModulesMenu",
    name: "Modules Menu",
    type: "Modules",
    priority: 3,
    children: CoreModules,
  },
];

const JobConfiguration = [
  {
    id: "JobsMenu",
    name: "Jobs Menu",
    icon: "work",
    type: "Tool",
    priority: 1,
    children: [],
  },
  {
    id: "ModuleConfiguration",
    name: "Modules Configuration",
    type: "MoTooldule",
    icon: "tune",
    priority: 2,
    moduleId: "settings",
    children: [],
  },
];

/**
 * WorldComponent - The root UI configuration object
 * 
 * This defines the entire UI structure including:
 * - Viewport and its tools
 * - Sidebar menus
 * - Header bar with context menus
 * - Configuration menus
 * - Window manager
 */
export const WorldComponent = {
  id: "World",
  name: "World",
  type: "World",
  priority: 0,
  style: {
    position: "absolute",
    top: "0px",
    left: "0px",
    width: "100vw",
    height: "100vh",
  },
  children: [
    {
      id: 'Loader',
      name: 'Loader',
      type: 'PlaceHolder',
      priority: 4,
    },
    {
      id: "Configurator",
      name: "Configuration Menu",
      type: "Modules",
      priority: 1,
      children: [],//configMenu
    },
    {
      id: "Information",
      name: "Information",
      icon: "info",
      children: [],
      type: "Operator",
      priority: 1,
    },
    {
      id: 'BottomWorkspace',
      name: 'Bottom Workspace',
      type: 'Body',
      priority: 5,
    },
    {
      id: 'SideWorkspaceLeft',
      name: 'Side Workspace Left',
      type: 'Body',
      priority: 6,
    },
    {
      id: 'SideWorkspaceRight',
      name: 'Side Workspace Right',
      type: 'Body',
      priority: 7,
    },
    {
      id: "Viewport",
      name: "Viewport",
      type: "Body",
      children: [{
      id: "SideBar",
      name: "World Menu",
      children: SideBar,
      type: "Modules",
      priority: 3,
    }],
    },
    {
      id: "ViewportSnapTools",
      name: "Snap Tools",
      icon: "target",
      type: "IndependentModule",
      priority: 1,
      moduleId: "world.snap",
      children: [],
    },

    {
      id: "HeaderBar",
      name: "Header Bar",
      children: HeaderBar,
      type: "Modules",
      priority: 4,
    },
    {
      id: "Windows",
      name: "Windows Center",
      type: "WindowManager",
      priority: 6,
      children: [],
    },
    ...ViewportComponents
  ],
};
