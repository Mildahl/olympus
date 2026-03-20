import JsWorker from './JsWorker.js';

class JSSandboxTool {

    static async start() {
        return await JsWorker.startJsWorker();
    }

    static async execute(code) {
        return await JsWorker.execute(code);
    }

    static dispose() {
        JsWorker.dispose();
    }
}

export default JSSandboxTool;