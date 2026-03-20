import { Operator } from "../../operators/Operator.js";

class Template extends Operator {
  static operatorName = "world.template";

  static operatorLabel = "Operator Template";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;

    this.mode = "full";
  }

  poll() {
    return this.context;
  }

  execute() {

    const editor = this.context.editor;
    return { status: "FINISHED" };
  }
}
export default [Template];