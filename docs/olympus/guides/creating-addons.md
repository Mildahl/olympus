# Creating addons

Addons are modules that use the same contract as core modules. They are registered and activated by the app so they can add operators and UI.

## Module shape

An addon is a **module definition** object (default export) with:

| Field | Description |
|-------|-------------|
| `id` | Unique string (e.g. `addon.hardhat`, `addon.mycompany.feature`). |
| `name` | Display name. |
| `description` | Optional short description. |
| `version` | Optional (e.g. `1.0.0`). |
| `dependsOn` | Optional array of module IDs that must be active first. |
| `operators` | Array of Operator classes (with `operatorName`, `operatorLabel`, `operatorOptions`). |
| `ui` | Optional UI class or array of classes. Each is instantiated with `{ context, operators }` when the module is activated. |

Example (from **`examples/Addons`** — Hard Hat addon):

```js
// addons/hard-hat/module.js
import HardHatOperators from './operators.js';
import HardHatUI from './ui.js';

export default {
    id: 'addon.hardhat',
    name: 'Hard Hat Addon',
    description: 'Construction site lifting schedule management.',
    version: '2.0.0',
    dependsOn: [],
    operators: HardHatOperators,
    ui: HardHatUI
};
```

## Registering addons

1. **Export a list of addons** from your app (e.g. **`examples/Addons/addons/index.js`**):

```js
import HartHatModule from './hard-hat/module.js';

export const ADDONS = [
    { module: HartHatModule, active: true }
];
```

Add more entries to the array for each addon module you ship.

2. **Pass addons into `createUI`:**

```js
simulation.createUI({
  config: AECOConfiguration,
  container: document.body,
  addons: { ADDONS, Listeners: listeners }
});
```

3. **What the app does** (in `src/aeco.js`):
   - For each addon with `active !== false`, it calls **`moduleRegistry.register(addon.module)`**.
   - It registers each addon’s operators with **`this.ops.add(op)`**.
   - It calls **`moduleRegistry.activate(moduleDef.id, { context, operators: this.ops })`**, which instantiates the module’s UI classes with `{ context, operators }`.

So: add your module definition to the `ADDONS` array, set `active: true`, and pass `addons` into `createUI`. No change to core library code is required.

## Operators in addons

Each operator class must extend **`Operator`** from `src/operators/Operator.js` and set:

- **`static operatorName`** — unique string (e.g. `hardhat.enable` in the Hard Hat addon).
- **`static operatorLabel`** — optional display name.
- **`static operatorOptions`** — e.g. `["REGISTER"]` so the operator is registered by name.

Implement **`execute()`** (and optionally **`poll()`**, **`undo()`**). Use **Core**, **`context`**, or **`simulation.tools`** as needed, then return e.g. `{ status: "FINISHED" }`.

## UI in addons

Your `ui` export can be a single class or an array of classes. Each class is instantiated with one argument: `{ context, operators }`. The instance can build DOM, subscribe to signals, and call `operators.execute(...)` when the user acts. If the instance has a **`destroy()`** method, it is called when the module is deactivated.

## Reference: Addons example

The **Addons** example (**`examples/Addons`**) is the in-repo host for custom addons:

- **`addons/index.js`** — exports `ADDONS` (currently the Hard Hat module).
- **`addons/hard-hat/module.js`** — module definition with operators and UI.
- **`addons/hard-hat/operators.js`** — operator classes.
- **`addons/hard-hat/ui.js`** — UI class that receives `{ context, operators }`.

Add a new folder under **`addons/`** with `module.js`, `operators.js`, and `ui.js` as needed, then import it from **`addons/index.js`**.

See [Getting started](getting-started.md) for running **HelloWorld** and **Addons**.
