/**
  * @param {AECOContext} context
  * @param {Object} input
  * @constructor
 */

class Operator  {
  static operatorName = "";

  static operatorLabel = "";

  static operatorOptions = ["REGISTER"];

  constructor(context, input = {}) {

		this.inMemory = false;

		this.updatable = false;

    this.id = null;

    this.type = this.operatorName;

    this.name = new.target.operatorLabel;

    this.options = new.target.operatorOptions;

    this.context = context;

    this.input = input;
  }

  poll() {
    return true;
  }

  execute() {
    throw new Error(`execute must be implemented in ${this.constructor.name}`);
  }

  undo() {
    console.warn(`Undo not implemented for ${this.constructor.name}`);
  }
	toJSON() {

		const output = {};

		output.type = this.type;

		output.id = this.id;

		output.name = this.name;

		return output;

	}

	fromJSON( json ) {

		this.inMemory = true;

		this.type = json.type;

		this.id = json.id;

		this.name = json.name;

	}
}

export { Operator };
