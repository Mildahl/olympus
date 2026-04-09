export { AECO, operators, tools, context, default } from "./types/aeco.js";

export const Core: Record<string, unknown>;

export const UIComponents: Record<string, unknown>;

export const dataStore: unknown;

export const moduleRegistry: unknown;

export class Operator {
  constructor(context: import("./types/aeco.js").AECOContext);

  static operatorName: string;

  static operatorLabel?: string;

  static operatorOptions?: string[];

  poll(): boolean;

  execute(...arguments_: unknown[]): Promise<unknown> | unknown;
}

export const Olympus: Readonly<{
  AECO: typeof import("./types/aeco.js").AECO;
  Core: Record<string, unknown>;
  tools: import("./types/aeco.js").Tools;
  context: import("./types/aeco.js").AECOContext;
  UIComponents: Record<string, unknown>;
  operators: import("./types/aeco.js").Operators;
  dataStore: unknown;
  moduleRegistry: unknown;
}>;
