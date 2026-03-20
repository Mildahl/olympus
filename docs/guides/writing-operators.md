# Writing Operators

Operators are the command pattern implementation in Olympus. They encapsulate actions that modify application state, support undo/redo, and can be executed from anywhere in the application.

## Operator Basics

Every operator extends the base `Operator` class:

```javascript
import { Operator } from "aeco";

class MyOperator extends Operator {
    static operatorName = "namespace.action_name";
    static operatorLabel = "Human Readable Label";
    static operatorOptions = ["REGISTER"];

    constructor(context, input = {}) {
        super(context, input);
        // Store input parameters
        this.myParam = input.myParam ?? 'default';
    }

    poll() {
        // Return true if operator can run
        return true;
    }

    execute() {
        // Perform the action
        return { status: "FINISHED" };
    }

    undo() {
        // Reverse the action (optional)
    }
}
```

## Static Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `operatorName` | string | Yes | Unique identifier using `namespace.action` format |
| `operatorLabel` | string | Yes | Human-readable label for UI |
| `operatorOptions` | string[] | Yes | Operator behavior flags |

### Operator Options

| Option | Description |
|--------|-------------|
| `REGISTER` | Register in the operator registry. Required for `execute()` to work |
| `UNDO` | Enable undo support. You must implement `undo()` method |
| `SKIP_HISTORY` | Don't add to history stack. Use for read-only or ephemeral operations |

```javascript
// Example combinations
static operatorOptions = ["REGISTER"];           // Basic, no undo
static operatorOptions = ["REGISTER", "UNDO"];   // With undo support
static operatorOptions = ["REGISTER", "SKIP_HISTORY"]; // No history tracking
```

## Instance Properties

The base class provides these properties:

| Property | Type | Description |
|----------|------|-------------|
| `this.context` | Context | Application context with state, signals, editor |
| `this.input` | object | Input parameters passed to constructor |
| `this.id` | string | Unique instance ID (set after execution) |
| `this.name` | string | Copied from `operatorLabel` |
| `this.options` | string[] | Copied from `operatorOptions` |
| `this.inMemory` | boolean | Whether restored from history |
| `this.updatable` | boolean | Whether can be updated in-place |

## Methods

### poll()

Called before `execute()`. Return `false` to cancel execution.

```javascript
poll() {
    // Check preconditions
    if (!this.context.selectedObject) {
        console.warn("No object selected");
        return false;
    }
    return true;
}
```

Common poll checks:
- Required objects exist
- User has permissions
- Application is in valid state

### execute()

Performs the operator's action. Must return a result object.

```javascript
execute() {
    // Do the work
    const result = this.doSomething();
    
    // Return status and any data
    return { 
        status: "FINISHED",
        data: result
    };
}
```

Return statuses:

| Status | Description |
|--------|-------------|
| `FINISHED` | Completed successfully |
| `CANCELLED` | Aborted (e.g., user cancelled dialog) |
| `RUNNING` | Still in progress (for async operations) |

### undo()

Reverses the action. Required if using `UNDO` option.

```javascript
undo() {
    // Restore previous state
    this.context.counter.value = this.previousValue;
    
    // Dispatch signals to update UI
    this.context.signals.counterChanged.dispatch({
        value: this.context.counter.value
    });
}
```

Important:
- Store state needed for undo in `execute()`
- Dispatch signals to notify UI of changes

### toJSON() / fromJSON()

Serialize/deserialize operator state for history persistence.

```javascript
toJSON() {
    const output = {
        type: this.type,
        id: this.id,
        name: this.name,
        // Add your custom state
        previousValue: this.previousValue,
        newValue: this.newValue
    };
    return output;
}

fromJSON(json) {
    this.inMemory = true;
    this.type = json.type;
    this.id = json.id;
    this.name = json.name;
    this.previousValue = json.previousValue;
    this.newValue = json.newValue;
}
```

## Executing Operators

Execute operators via the `operators` object:

```javascript
import { operators } from "aeco";

// Execute with context only
operators.execute("namespace.action", context);

// Execute with input parameters
operators.execute("namespace.action", context, { 
    param1: "value1",
    param2: 42
});

// Async execution
const result = await operators.execute("namespace.async_action", context);
```

From UI classes:

```javascript
class MyUI {
    constructor({ context, operators }) {
        this.context = context;
        this.operators = operators;
        
        // Execute operator on button click
        button.onClick(() => {
            this.operators.execute("my.action", this.context);
        });
    }
}
```

## Signals

Operators typically dispatch signals to notify the UI of state changes:

```javascript
// Define signals for your addon
const SIGNALS = [
    "myAddonStateChanged",
    "myAddonItemAdded",
    "myAddonItemRemoved"
];

class InitMyAddon extends Operator {
    constructor(context, input = {}) {
        super(context, input);
        // Register signals once
        this.context.addListeners(SIGNALS);
    }
    
    execute() {
        // ... do work ...
        
        // Dispatch signal
        this.context.signals.myAddonStateChanged.dispatch({ 
            data: this.result 
        });
        
        return { status: "FINISHED" };
    }
}
```

## Async Operators

For operations involving network requests or heavy computation:

```javascript
class LoadDataOperator extends Operator {
    static operatorName = "data.load";
    static operatorLabel = "Load Data";
    static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

    async execute() {
        try {
            // Show loading state
            this.context.signals.loadingStarted.dispatch();
            
            // Async operation
            const response = await fetch('/api/data');
            const data = await response.json();
            
            // Update context
            this.context.data = data;
            
            // Notify UI
            this.context.signals.dataLoaded.dispatch({ data });
            
            return { status: "FINISHED", data };
        } catch (error) {
            console.error("Load failed:", error);
            return { status: "CANCELLED", error };
        } finally {
            this.context.signals.loadingEnded.dispatch();
        }
    }
}
```

## Complete Example

A full-featured operator with undo support:

```javascript
import { Operator } from "aeco";

class RenameObjectOperator extends Operator {
    static operatorName = "object.rename";
    static operatorLabel = "Rename Object";
    static operatorOptions = ["REGISTER", "UNDO"];

    constructor(context, input = {}) {
        super(context, input);
        
        // Validate required input
        if (!input.objectId) {
            throw new Error("objectId is required");
        }
        
        this.objectId = input.objectId;
        this.newName = input.name ?? "Unnamed";
        this.previousName = null;
    }

    poll() {
        // Check object exists
        const obj = this.context.objects.get(this.objectId);
        if (!obj) {
            console.warn(`Object ${this.objectId} not found`);
            return false;
        }
        return true;
    }

    execute() {
        const obj = this.context.objects.get(this.objectId);
        
        // Store for undo
        this.previousName = obj.name;
        
        // Apply change
        obj.name = this.newName;
        
        // Dispatch signal
        this.context.signals.objectRenamed.dispatch({
            id: this.objectId,
            name: this.newName,
            previousName: this.previousName
        });
        
        return { 
            status: "FINISHED",
            object: obj
        };
    }

    undo() {
        const obj = this.context.objects.get(this.objectId);
        if (obj) {
            obj.name = this.previousName;
            
            this.context.signals.objectRenamed.dispatch({
                id: this.objectId,
                name: this.previousName,
                previousName: this.newName
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

export default [RenameObjectOperator];
```

## Best Practices

1. **Single Responsibility**: Each operator does one thing well
2. **Validate Early**: Check preconditions in `poll()` before `execute()`
3. **Store Undo State**: Save what you need to reverse the action
4. **Dispatch Signals**: Always notify UI of state changes
5. **Handle Errors**: Catch exceptions and return appropriate status
6. **Use Namespaces**: Group related operators: `object.rename`, `object.delete`
7. **Document Parameters**: Describe expected input parameters

## Related Documentation

- [First Addon](../getting-started/first-addon.md) — Create a complete addon with operators
- [Building UI](building-ui.md) — Create UI that uses operators
- [API: Operators](../api/operators/index.md) — Operator API reference
