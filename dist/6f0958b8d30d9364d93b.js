
let originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

function overrideConsole() {
    console.log = (...args) => {
        const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';

        self.postMessage({ type: 'stdout', output });

        originalConsole.log(...args);
    };

    console.error = (...args) => {
        const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';

        self.postMessage({ type: 'stderr', output });

        originalConsole.error(...args);
    };

    console.warn = (...args) => {
        const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';

        self.postMessage({ type: 'stderr', output });

        originalConsole.warn(...args);
    };

    console.info = (...args) => {
        const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';

        self.postMessage({ type: 'stdout', output });

        originalConsole.info(...args);
    };
}

self.onmessage = function(event) {
    const { id, type, payload } = event.data;

    if (type === 'startJsWorker') {
        overrideConsole();

        self.postMessage({ id, success: true, result: { status: 'started' } });
    } else if (type === 'execute') {
        try {
            const result = eval(payload.code);

            self.postMessage({ id, success: true, result: { result: String(result) } });
        } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
        }
    }
};