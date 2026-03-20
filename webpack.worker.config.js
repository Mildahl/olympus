/**
 * Builds the Pyodide worker as a single self-contained ES module.
 * Run this before the main webpack build so dist/pyodide.worker.js exists
 * and the main bundle does not need to emit a worker chunk (avoids
 * worker chunk keeping unconverted import statements under outputModule).
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/tool/pyodide/pyodide.worker.js',
  output: {
    filename: 'pyodide.worker.js',
    path: path.resolve(__dirname, 'dist'),
    module: true,
    chunkFormat: 'module',
  },
  mode: 'production',
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: ['.js'],
  },
  // No externals: bundle all worker_*.js and worker_core etc. into one file.
  // Pyodide is loaded at runtime via dynamic import(/* webpackIgnore */ url) in worker_core.js.
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
  performance: {
    hints: false,
  },
};
