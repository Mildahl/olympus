import { Operator } from "../../operators/Operator.js";

import AECO_tools from "../../tool/index.js";

import operators from "../../operators/index.js";

import * as BIMCore from "../../core/bim.js";


class BIM_TaskAnalytics extends Operator {

    static operatorName = "bim.task_analytics";

    static operatorLabel = "Task Analytics";

    static operatorOptions = ["REGISTER"];

    constructor( context, scheduleId ) {

        super( context );

        this.context = context;

        this.scheduleId = scheduleId;
    }

    poll() {
      return AECO_tools.code.pyWorker.initialized.bim;
    }

    async execute() {


      return { status: "FINISHED" };

    }
}


export default [ BIM_TaskAnalytics ];