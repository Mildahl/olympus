import { Operator } from "../../operators/Operator.js";

/**
 * Global snapping state
 */
export const SnapState = {
    snapOptions: {
        snapEnabled: true,
        snapToVertex: true,
        snapToEdge: true,
        snapToFace: true,
        snapToGrid: false, 
        snapThreshold: 0.5,
    }
};

/**
 * Operator to set a snap option
 */
export class SetSnapOption extends Operator {
    static operatorName = "world.snap.set_option";

    static operatorLabel = "Set Snap Option";

    static operatorOptions = ["REGISTER"];

    constructor(context, key, value) {
        super(context);

        this.context = context;

        this.key = key;

        this.value = value;
    }

    poll() {
        return this.context;
    }

    async execute() {
        if (!(this.key in SnapState.snapOptions)) {
            console.warn(`[Snap] Unknown snap option: ${this.key}`);

            return { status: "FINISHED" };
        }

        SnapState.snapOptions[this.key] = this.value;
        if (this.context.signals && this.context.signals.snapOptionChanged) {
            this.context.signals.snapOptionChanged.dispatch({ key: this.key, value: this.value });
        }

        return { status: "FINISHED" };
    }
}

/**
 * Operator to get current snap options
 */
export class GetSnapOptions extends Operator {
    static operatorName = "world.snap.get_options";

    static operatorLabel = "Get Snap Options";

    static operatorOptions = ["REGISTER"];

    constructor(context) {
        super(context);

        this.context = context;
    }

    poll() {
        return this.context;
    }

    async execute() {
        return {
            status: "FINISHED",
            result: { ...SnapState.snapOptions }
        };
    }
}

/**
 * Operator to toggle snap enabled
 */
export class ToggleSnapEnabled extends Operator {
    static operatorName = "world.snap.toggle_enabled";

    static operatorLabel = "Toggle Snap Enabled";

    static operatorOptions = ["REGISTER"];

    constructor(context) {
        super(context);

        this.context = context;
    }

    poll() {
        return this.context;
    }

    async execute() {
        const newValue = !SnapState.snapOptions.snapEnabled;

        SnapState.snapOptions.snapEnabled = newValue;
        if (this.context.signals && this.context.signals.snapOptionChanged) {
            this.context.signals.snapOptionChanged.dispatch({ key: 'snapEnabled', value: newValue });
        }

        return { status: "FINISHED" };
    }
}
export class ToggleSnapMenu extends Operator {
    static operatorName = "world.snap.toggle_menu";

    static operatorLabel = "Toggle Snap Menu";

    static operatorOptions = ["REGISTER"];

    constructor(context) {
        super(context);

        this.context = context;
    }

    poll() {
        return this.context;
    }

    async execute() {
        this.context.signals.toggleSnapMenu.dispatch();

        return { status: "FINISHED" };
    }
}

export default [
    SetSnapOption,
    GetSnapOptions,
    ToggleSnapEnabled,
];