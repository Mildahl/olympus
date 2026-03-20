# Operators API

The operator system implements the command pattern for executing actions, supporting undo/redo, and maintaining history.

## Import

```javascript
import { Operator, operators } from "aeco";
```

## Operator Base Class

All operators extend the `Operator` base class.

### Static Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `operatorName` | string | Yes | Unique identifier (e.g., `'namespace.action'`) |
| `operatorLabel` | string | Yes | Human-readable label for UI |
| `operatorOptions` | string[] | Yes | Behavior flags |

### Operator Options

| Option | Description |
|--------|-------------|
| `REGISTER` | Register in the operator registry. Required for execution |
| `UNDO` | Enable undo support. Requires implementing `undo()` method |
| `SKIP_HISTORY` | Don't add to undo/redo history stack |

### Constructor

```javascript
new Operator(context: Context, input?: object)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | Context | Application context |
| `input` | object | Input parameters |

### Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `context` | Context | Application context |
| `input` | object | Input parameters passed to constructor |
| `id` | string \| null | Unique instance ID (set after execution) |
| `name` | string | Copied from `operatorLabel` |
| `type` | string | Copied from `operatorName` |
| `options` | string[] | Copied from `operatorOptions` |
| `inMemory` | boolean | Whether restored from history |
| `updatable` | boolean | Whether can be updated in-place |

### Methods

#### poll()

```javascript
poll(): boolean
```

Called before `execute()`. Return `false` to cancel execution.

**Returns:** `true` if operator should execute, `false` to cancel

---

#### execute()

```javascript
execute(): OperatorResult | Promise<OperatorResult>
```

Performs the operator's action.

**Returns:** Result object with status

```typescript
interface OperatorResult {
    status: 'FINISHED' | 'CANCELLED' | 'RUNNING';
    [key: string]: any;  // Additional result data
}
```

| Status | Description |
|--------|-------------|
| `FINISHED` | Completed successfully |
| `CANCELLED` | Aborted (e.g., validation failed, user cancelled) |
| `RUNNING` | Still in progress (for async operations) |

---

#### undo()

```javascript
undo(): void
```

Reverses the action. Required when using `UNDO` option.

---

#### toJSON()

```javascript
toJSON(): object
```

Serializes operator state for history persistence.

**Returns:** Plain object with operator state

---

#### fromJSON(json)

```javascript
fromJSON(json: object): void
```

Deserializes operator state from history.

| Parameter | Type | Description |
|-----------|------|-------------|
| `json` | object | Serialized state from `toJSON()` |

## Operators Registry

The `operators` object manages operator registration and execution.

### Properties

#### registry

```javascript
operators.registry: OperatorRegistry
```

Access to the underlying registry for advanced usage.

### Methods

#### add(operatorClass)

Register an operator class.

```javascript
operators.add(operatorClass: typeof Operator): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `operatorClass` | typeof Operator | Operator class with `REGISTER` option |

**Note:** Only registers if `operatorOptions` includes `REGISTER`.

---

#### remove(operatorClass)

Unregister an operator class.

```javascript
operators.remove(operatorClass: typeof Operator): void
```

---

#### execute(idname, context, ...args)

Execute an operator by its identifier.

```javascript
operators.execute(
    idname: string,
    context: Context,
    ...args: any[]
): OperatorResult | Promise<OperatorResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `idname` | string | Operator identifier (e.g., `'theme.change_to_light'`) |
| `context` | Context | Application context |
| `...args` | any[] | Arguments passed to operator constructor |

**Returns:** Execution result with status

**Throws:** `Error` if operator not found

**Example:**
```javascript
// Basic execution
const result = operators.execute('world.create_node', context);

// With parameters
const result = await operators.execute('bim.load_model', context, {
    url: '/models/building.ifc',
    name: 'My Building'
});
```

---

#### registerModuleOperators(moduleDefinitions, activeIds)

Register operators from multiple module definitions.

```javascript
operators.registerModuleOperators(
    moduleDefinitions: ModuleDefinition[],
    activeIds: string[]
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `moduleDefinitions` | ModuleDefinition[] | Array of module definitions |
| `activeIds` | string[] | IDs of modules to register |

## Creating an Operator

### Basic Operator

```javascript
import { Operator } from "aeco";

class MyOperator extends Operator {
    static operatorName = "myaddon.do_something";
    static operatorLabel = "Do Something";
    static operatorOptions = ["REGISTER"];

    constructor(context, input = {}) {
        super(context, input);
        this.value = input.value ?? 'default';
    }

    poll() {
        // Check preconditions
        if (!this.context.ready) {
            return false;
        }
        return true;
    }

    execute() {
        // Perform action
        console.log("Doing something with:", this.value);
        
        return { status: "FINISHED" };
    }
}

export default [MyOperator];
```

### Operator with Undo

```javascript
class RenameOperator extends Operator {
    static operatorName = "object.rename";
    static operatorLabel = "Rename Object";
    static operatorOptions = ["REGISTER", "UNDO"];

    constructor(context, input = {}) {
        super(context, input);
        this.objectId = input.objectId;
        this.newName = input.name;
        this.previousName = null;
    }

    poll() {
        const obj = this.context.objects.get(this.objectId);
        return obj !== undefined;
    }

    execute() {
        const obj = this.context.objects.get(this.objectId);
        
        // Store for undo
        this.previousName = obj.name;
        
        // Apply change
        obj.name = this.newName;
        
        // Notify UI
        this.context.signals.objectRenamed.dispatch({
            id: this.objectId,
            name: this.newName
        });
        
        return { status: "FINISHED", object: obj };
    }

    undo() {
        const obj = this.context.objects.get(this.objectId);
        if (obj) {
            obj.name = this.previousName;
            this.context.signals.objectRenamed.dispatch({
                id: this.objectId,
                name: this.previousName
            });
        }
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            name: this.name,
            objectId: this.objectId,
            newName: this.newName,
            previousName: this.previousName
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        this.objectId = json.objectId;
        this.newName = json.newName;
        this.previousName = json.previousName;
    }
}
```

### Async Operator

```javascript
class LoadDataOperator extends Operator {
    static operatorName = "data.load";
    static operatorLabel = "Load Data";
    static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

    constructor(context, input = {}) {
        super(context, input);
        this.url = input.url;
    }

    poll() {
        return this.url !== undefined;
    }

    async execute() {
        try {
            this.context.signals.loadingStarted.dispatch();
            
            const response = await fetch(this.url);
            const data = await response.json();
            
            this.context.data = data;
            this.context.signals.dataLoaded.dispatch({ data });
            
            return { status: "FINISHED", data };
        } catch (error) {
            console.error("Load failed:", error);
            return { status: "CANCELLED", error: error.message };
        } finally {
            this.context.signals.loadingEnded.dispatch();
        }
    }
}
```

## Execution Flow

```
operators.execute('namespace.action', context, args)
    │
    ▼
┌─────────────────────────────────────┐
│  1. Get OperatorClass from registry │
│     (throws if not found)           │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  2. Create operator instance        │
│     new OperatorClass(context, args)│
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  3. Call poll()                     │
│     If false → return CANCELLED     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  4. Check SKIP_HISTORY option       │
│     If true → execute() directly    │
│     If false → via editor.execute() │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  5. Call execute()                  │
│     Return result                   │
└─────────────────────────────────────┘
```

## Built-in Operators

### Theme Operators
- `theme.change_to_light` — Switch to light theme
- `theme.change_to_dark` — Switch to dark theme
- `theme.change_colors` — Update theme colors

### World Operators
- `world.create_node` — Create a world node
- `world.remove_node` — Remove a world node
- `world.create_world_layers` — Initialize default layers

### Viewpoint Operators
- `viewpoint.create` — Create a viewpoint
- `viewpoint.remove` — Remove a viewpoint
- `viewpoint.activate` — Activate a viewpoint
- `viewpoint.rename` — Rename a viewpoint

### BIM Operators
- `bim.load_model` — Load an IFC model
- `bim.remove_model` — Remove a model
- `bim.create_wall` — Create a wall element

### Layer Operators
- `layer.create` — Create a layer
- `layer.remove` — Remove a layer
- `layer.toggle_visibility` — Toggle layer visibility

### History Operators
- `history.undo` — Undo last action
- `history.redo` — Redo last undone action
- `history.clear` — Clear history

## Best Practices

1. **Naming Convention**: Use `namespace.action_name` format
2. **Single Responsibility**: Each operator does one thing
3. **Validate in poll()**: Check preconditions before execute
4. **Store Undo State**: Save what's needed to reverse the action
5. **Dispatch Signals**: Notify UI of state changes
6. **Handle Errors**: Return CANCELLED status on failure
7. **Use SKIP_HISTORY**: For read-only or transient operations

## Related

- [Writing Operators Guide](../guides/writing-operators.md)
- [First Addon](../getting-started/first-addon.md)
- [Building UI](../guides/building-ui.md)
