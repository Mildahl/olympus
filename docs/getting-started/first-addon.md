# Build Your First Addon

This tutorial guides you through creating a custom addon module from scratch. By the end, you'll have a working addon with an operator and UI panel.

## What You'll Build

A simple "Counter" addon that:
- Displays a counter value in a side panel
- Has buttons to increment/decrement
- Persists the count using operators

## Prerequisites

- Completed [HelloWorld Tutorial](helloworld-tutorial.md)
- Basic JavaScript knowledge
- Understanding of [Project Structure](project-structure.md)

## Step 1: Create the Addon Folder

Create a new folder for your addon:

```
examples/HelloWorld/
└── addons/
    └── counter/
        ├── module.js      # Module definition
        ├── operators.js   # Operator classes
        └── ui.js          # UI component
```

## Step 2: Define the Module

Create `addons/counter/module.js`:

```javascript
import CounterOperators from './operators.js';
import CounterUI from './ui.js';

export default {
    id: 'addon.counter',
    name: 'Counter Addon',
    description: 'A simple counter demonstration addon',
    version: '1.0.0',
    dependsOn: [],              // No dependencies
    operators: CounterOperators,
    ui: CounterUI
};
```

### Module Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (use `addon.` prefix) |
| `name` | string | Display name |
| `description` | string | What the addon does |
| `version` | string | Semantic version |
| `dependsOn` | string[] | Module IDs this depends on |
| `operators` | Operator[] | Array of operator classes |
| `ui` | class\|class[] | UI class(es) to instantiate |

## Step 3: Create the Operators

Create `addons/counter/operators.js`:

```javascript
import { Operator } from "aeco";

// Define signal names this addon uses
const SIGNALS = [
    "counterChanged"
];

/**
 * Initialize the counter addon
 */
class InitCounter extends Operator {
    static operatorName = "counter.init";
    static operatorLabel = "Initialize Counter";
    static operatorOptions = ["REGISTER"];

    constructor(context, input = {}) {
        super(context, input);
        this.initialValue = input.value ?? 0;
        
        // Register signals for this addon
        this.context.addListeners(SIGNALS);
    }

    poll() {
        return true;  // Always allowed to run
    }

    execute() {
        // Initialize counter state on context
        this.context.counter = this.context.counter || {};
        this.context.counter.value = this.initialValue;
        
        // Dispatch signal to notify UI
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });

        return { status: "FINISHED" };
    }
}

/**
 * Increment the counter
 */
class IncrementCounter extends Operator {
    static operatorName = "counter.increment";
    static operatorLabel = "Increment Counter";
    static operatorOptions = ["REGISTER", "UNDO"];

    constructor(context, input = {}) {
        super(context, input);
        this.amount = input.amount ?? 1;
        this.previousValue = null;
    }

    poll() {
        // Only run if counter is initialized
        return this.context.counter !== undefined;
    }

    execute() {
        // Store previous value for undo
        this.previousValue = this.context.counter.value;
        
        // Update the counter
        this.context.counter.value += this.amount;
        
        // Dispatch signal
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });

        return { 
            status: "FINISHED",
            value: this.context.counter.value
        };
    }

    undo() {
        // Restore previous value
        this.context.counter.value = this.previousValue;
        
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });
    }
}

/**
 * Decrement the counter
 */
class DecrementCounter extends Operator {
    static operatorName = "counter.decrement";
    static operatorLabel = "Decrement Counter";
    static operatorOptions = ["REGISTER", "UNDO"];

    constructor(context, input = {}) {
        super(context, input);
        this.amount = input.amount ?? 1;
        this.previousValue = null;
    }

    poll() {
        return this.context.counter !== undefined;
    }

    execute() {
        this.previousValue = this.context.counter.value;
        this.context.counter.value -= this.amount;
        
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });

        return { 
            status: "FINISHED",
            value: this.context.counter.value
        };
    }

    undo() {
        this.context.counter.value = this.previousValue;
        
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });
    }
}

/**
 * Reset counter to zero
 */
class ResetCounter extends Operator {
    static operatorName = "counter.reset";
    static operatorLabel = "Reset Counter";
    static operatorOptions = ["REGISTER", "UNDO"];

    constructor(context, input = {}) {
        super(context, input);
        this.previousValue = null;
    }

    poll() {
        return this.context.counter !== undefined;
    }

    execute() {
        this.previousValue = this.context.counter.value;
        this.context.counter.value = 0;
        
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });

        return { status: "FINISHED" };
    }

    undo() {
        this.context.counter.value = this.previousValue;
        
        this.context.signals.counterChanged.dispatch({
            value: this.context.counter.value
        });
    }
}

// Export all operators as an array
export default [
    InitCounter,
    IncrementCounter,
    DecrementCounter,
    ResetCounter
];
```

### Operator Options

| Option | Description |
|--------|-------------|
| `REGISTER` | Register in the operator registry (required for execute) |
| `UNDO` | Enable undo support - requires implementing `undo()` |
| `SKIP_HISTORY` | Don't add to history stack |

## Step 4: Create the UI

Create `addons/counter/ui.js`:

```javascript
import { DrawUI } from "../../../../drawUI/index.js";

class CounterUI {
    constructor({ context, operators }) {
        this.context = context;
        this.operators = operators;
        
        // Create the panel
        this.panel = this.createPanel();
        
        // Initialize the counter
        this.operators.execute("counter.init", context, { value: 0 });
        
        // Subscribe to counter changes
        this.context.signals.counterChanged.add((data) => {
            this.updateDisplay(data.value);
        });
        
        // Register this panel with the layout
        this.registerPanel();
    }

    createPanel() {
        const panel = DrawUI.div();
        panel.setClass("counter-panel");
        panel.setStyle("padding", "16px");

        // Title
        const title = DrawUI.text("Counter");
        title.setStyle("fontSize", "18px");
        title.setStyle("fontWeight", "bold");
        title.setStyle("marginBottom", "16px");
        panel.add(title);

        // Counter display
        this.display = DrawUI.text("0");
        this.display.setStyle("fontSize", "48px");
        this.display.setStyle("textAlign", "center");
        this.display.setStyle("padding", "20px");
        this.display.setStyle("fontFamily", "monospace");
        panel.add(this.display);

        // Button row
        const buttonRow = DrawUI.row();
        buttonRow.setStyle("gap", "8px");
        buttonRow.setStyle("marginTop", "16px");

        // Decrement button
        const decrementBtn = DrawUI.button("-");
        decrementBtn.setStyle("flex", "1");
        decrementBtn.setStyle("padding", "12px");
        decrementBtn.setStyle("fontSize", "24px");
        decrementBtn.onClick(() => {
            this.operators.execute("counter.decrement", this.context);
        });
        buttonRow.add(decrementBtn);

        // Reset button
        const resetBtn = DrawUI.button("Reset");
        resetBtn.setStyle("flex", "1");
        resetBtn.setStyle("padding", "12px");
        resetBtn.onClick(() => {
            this.operators.execute("counter.reset", this.context);
        });
        buttonRow.add(resetBtn);

        // Increment button
        const incrementBtn = DrawUI.button("+");
        incrementBtn.setStyle("flex", "1");
        incrementBtn.setStyle("padding", "12px");
        incrementBtn.setStyle("fontSize", "24px");
        incrementBtn.onClick(() => {
            this.operators.execute("counter.increment", this.context);
        });
        buttonRow.add(incrementBtn);

        panel.add(buttonRow);

        return panel;
    }

    updateDisplay(value) {
        this.display.setValue(String(value));
    }

    registerPanel() {
        // Add tab to right panel using LayoutManager
        const layoutManager = this.context.editor?.layoutManager;
        if (layoutManager) {
            layoutManager.addTab(
                'right',           // position
                'counter',         // id
                'Counter',         // label
                this.panel,        // content
                { open: true }     // options
            );
        }
    }

    // Called when addon is deactivated
    destroy() {
        const layoutManager = this.context.editor?.layoutManager;
        if (layoutManager) {
            layoutManager.removeTab('right', 'counter');
        }
    }
}

export default CounterUI;
```

## Step 5: Export Your Addon

Create `addons/index.js`:

```javascript
import CounterModule from './counter/module.js';

export const ADDONS = [
    { module: CounterModule, active: true }
];
```

## Step 6: Register in app.js

Update `app.js` to load your addon:

```javascript
import { DrawUI } from "./../../drawUI/index.js";

const splash = DrawUI.splash({ imageUrl: '/external/ifc/splash.png', text: 'Initializing...' });
splash.show(document.body);
splash.setText('Creating UI...');

import { AECO } from "aeco";
import { AECOConfiguration } from "./configuration/config.js";

// Import your addons
import { ADDONS } from "./addons/index.js";

const simulation = new AECO();
const context = simulation.context;

// Pre-register addon signals (must be done before createUI)
const addonSignals = [
    "counterChanged"
];

simulation.createUI({ 
    config: AECOConfiguration, 
    container: document.body,
    addons: { 
        ADDONS, 
        Listeners: addonSignals 
    }
});

simulation.moduleRegistry.logActiveModulesAndUI();

splash.hide();

export default simulation;
```

## Step 7: Test Your Addon

1. Start the server: `npm run serve`
2. Open `http://localhost:3000/examples/HelloWorld/`
3. You should see a "Counter" tab in the right panel
4. Click +/- buttons to change the counter
5. Try Ctrl+Z to undo!

## Understanding the Flow

```
┌──────────────────────────────────────────────────────────┐
│                        app.js                             │
│  • Imports ADDONS                                         │
│  • Pre-registers signals                                  │
│  • Calls createUI({ addons: { ADDONS, Listeners } })     │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   Module Registry                         │
│  • Registers addon operators                              │
│  • Instantiates addon UI with { context, operators }     │
└──────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
┌──────────────────────┐         ┌──────────────────────┐
│      Operators       │         │         UI           │
│  • counter.init      │         │  • Panel with buttons│
│  • counter.increment │◄────────│  • Signal listeners  │
│  • counter.decrement │ execute │  • Display update    │
│  • counter.reset     │         │                      │
└──────────────────────┘         └──────────────────────┘
          │                                   ▲
          │ dispatch signals                  │
          └───────────────────────────────────┘
```

## Common Patterns

### Storing Addon Data

Use localStorage for persistence:

```javascript
// In operators.js
function loadStore() {
    const stored = localStorage.getItem('counter-addon');
    return stored ? JSON.parse(stored) : { value: 0 };
}

function saveStore(store) {
    localStorage.setItem('counter-addon', JSON.stringify(store));
}
```

### Multiple UI Components

Register multiple UI classes:

```javascript
// module.js
export default {
    id: 'addon.counter',
    // ...
    ui: [CounterUI, CounterToolbarUI, CounterSettingsUI]
};
```

### Dependencies

Declare dependencies on other modules:

```javascript
export default {
    id: 'addon.myfeature',
    dependsOn: ['world.layer', 'bim.model'],
    // ...
};
```

## Next Steps

- [Writing Operators](../guides/writing-operators.md) — Deep dive into operators
- [Building UI](../guides/building-ui.md) — UI component patterns
- [Using LayoutManager](../guides/using-layoutmanager.md) — Layout system
- [Addons Example](../examples/addons/overview.md) — Study real addons
