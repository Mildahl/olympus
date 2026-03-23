import jsWorkerSource from './js.worker.js';

class JsWorker {

    static worker = null;

    static workerObjectUrl = null;

    static isReady = false;

    static isExecutingScript = false;

    static pendingRequests = new Map();

    static requestId = 0;

    static outputData = { text: "" };
    static onProgress = null;

    static onStdout = null;

    static onStderr = null;

    static async startJsWorker() {
        if (JsWorker.worker) {
            console.warn("JS Worker already started");

            return { status: "already_started" };
        }

        const workerSourceString =
            typeof jsWorkerSource === "string" ? jsWorkerSource : String(jsWorkerSource);

        const workerBlob = new Blob([workerSourceString], { type: "text/javascript" });

        JsWorker.workerObjectUrl = URL.createObjectURL(workerBlob);

        JsWorker.worker = new Worker(JsWorker.workerObjectUrl);

        JsWorker.worker.onmessage = (event) => {
            JsWorker._handleMessage(event.data);
        };

        JsWorker.worker.onerror = (event) => {
            const msg = event.message || event.type;
            const file = event.filename || "(worker script)";
            const line = event.lineno != null ? `:${event.lineno}` : "";
            console.error("JS Worker Error:", msg, "at", file + line);
            if (event.error) console.error(event.error);
        };

        const result = await JsWorker.run_api("startJsWorker", {});

        JsWorker.isReady = true;

        console.log("JS Worker is Ready.", result);

        return result;
    }

    static async execute(code) {
        JsWorker._checkReady();

        JsWorker.isExecutingScript = true;

        JsWorker.outputData = { text: "" };

        try {
            const result = await JsWorker.run_api("execute", { code });

            JsWorker.outputData.text = result.output || '';

            JsWorker.isExecutingScript = false;

            if (result.error) {
                throw new Error(result.error);
            }

            return result.result || JsWorker.outputData.text;
        } catch (error) {
            JsWorker.isExecutingScript = false;

            throw error;
        }
    }

    static _checkReady() {
        if (!JsWorker.isReady) {
            throw new Error("JS Worker not ready");
        }
    }

    static run_api(type, payload = {}) {
        return new Promise((resolve, reject) => {
            const id = ++JsWorker.requestId;

            JsWorker.pendingRequests.set(id, { resolve, reject });

            JsWorker.worker.postMessage({ id, type, payload });
        });
    }

    static _handleMessage(data) {
        
        if (data.type === "stdout") {
            JsWorker.outputData.text += data.output;

            if (JsWorker.onStdout) JsWorker.onStdout(data.output);
        }

        if (data.type === "stderr") {
            JsWorker.outputData.text += data.output;

            if (JsWorker.onStderr) JsWorker.onStderr(data.output);
        }
        const { id, success, result, error } = data;

        if (!id) return;

        const pending = JsWorker.pendingRequests.get(id);

        if (!pending) {
            console.warn("No pending request for id:", id);

            return;
        }

        JsWorker.pendingRequests.delete(id);

        if (success) {
            pending.resolve(result);
        } else {
            pending.reject(new Error(error));
        }
    }

    static dispose() {
        if (JsWorker.worker) {
            JsWorker.worker.terminate();

            JsWorker.worker = null;

            JsWorker.isReady = false;
        }

        if (JsWorker.workerObjectUrl) {
            URL.revokeObjectURL(JsWorker.workerObjectUrl);

            JsWorker.workerObjectUrl = null;
        }
    }
}

export default JsWorker;