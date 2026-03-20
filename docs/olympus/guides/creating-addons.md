# Creating addons

Addons are modules that use the same contract as core modules. They are registered and activated by the app so they can add operators and UI.

## Module shape

An addon is a **module definition** object (default export) with:

| Field | Description |
|-------|-------------|
| `id` | Unique string (e.g. `course.experiences`, `addon.navigation`). |
| `name` | Display name. |
| `description` | Optional short description. |
| `version` | Optional (e.g. `1.0.0`). |
| `dependsOn` | Optional array of module IDs that must be active first. |
| `operators` | Array of Operator classes (with `operatorName`, `operatorLabel`, `operatorOptions`). |
| `ui` | Optional array of UI classes. Each is instantiated with `{ context, operators }` when the module is activated. |

Example (from GameExperience):

```js
// addons/experiences/module.js
import CourseOperators from './operators.js';
import CourseExperiencesUI from './ui.js';

export default {
  id: 'course.experiences',
  name: 'Demo Module',
  description: 'Demo experiences and welcome screen',
  version: '1.0.0',
  dependsOn: [],
  operators: CourseOperators,
  ui: CourseExperiencesUI
};
```

## Registering addons

1. **Export a list of addons** from your app (e.g. `addons/index.js`):

```js
import CourseExperience from './experiences/module.js';
import NavigationModule from './navigation/module.js';

export const ADDONS = [
  { module: CourseExperience, active: true },
  { module: NavigationModule, active: false }
];
```

2. **Pass addons into `createUI`:**

```js
simulation.createUI({
  config: AECOConfiguration,
  container: document.body,
  addons: { ADDONS, Listeners: listeners }  // or just { ADDONS }
});
```

3. **What the app does** (in `aeco.js`):
   - For each addon with `active !== false`, it calls **`moduleRegistry.register(addon.module)`**.
   - It registers each addon’s operators with **`this.ops.add(op)`**.
   - It calls **`moduleRegistry.activate(moduleDef.id, { context, operators: this.ops })`**, which instantiates the module’s UI classes with `{ context, operators }`.

So: add your module definition to the `ADDONS` array, set `active: true`, and pass `addons` into `createUI`. No change to core Olympus code is required.

## Operators in addons

Each operator class must extend **`Operator`** from `olympus/operators/Operator.js` and set:

- **`static operatorName`** — unique string (e.g. `addon.course.enable_globe_demo`).
- **`static operatorLabel`** — optional display name.
- **`static operatorOptions`** — e.g. `["REGISTER"]` so the operator is registered by name.

Implement **`execute(context, ...args)`** (and optionally `poll()`, `undo()`). Inside `execute`, use **Core** or **simulation.tools** as needed, then return e.g. `{ status: "FINISHED" }`.

## UI in addons

Your `ui` export can be a single class or an array of classes. Each class is instantiated with one argument: `{ context, operators }`. The instance can build DOM, subscribe to signals, and call `operators.execute(...)` when the user acts. If the instance has a **`destroy()`** method, it is called when the module is deactivated.

## Example: GameExperience addons

The **GameExperience** example (`examples/GameExperience`) shows addons in practice:

- **`addons/index.js`** — exports `ADDONS` with e.g. Course Experience and Navigation modules.
- **`addons/experiences/module.js`** — module definition with operators and UI.
- **`addons/experiences/operators.js`** — operator classes used by the module.
- **`addons/experiences/ui.js`** — UI class that receives `{ context, operators }`.

Use this as a reference when building your own addon (new folder under `addons/`, a `module.js`, `operators.js`, and optionally `ui.js`).

See [Getting started](getting-started.md) for how to run HelloWorld and GameExperience.
