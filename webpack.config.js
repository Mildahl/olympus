import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export default {
  entry: './src/index.js',
  devtool: 'source-map',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    chunkFilename: '[name].js',
    library: {
      type: 'module',
    },
    clean: {
      keep: /pyodide\.worker\.js$|\.d\.ts$/,
    },
  },
  mode: 'production',
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: ['.js', '.css'],
    alias: {
      '@tauri-apps/api/event': path.resolve(__dirname, 'scripts/webpack-tauri-event-stub.js'),
    },
  },
  module: {
    parser: {
      javascript: {
        dynamicImportMode: 'eager',
      },
    },
    rules: [
      {
        test: /[\\/]src[\\/]tool[\\/]js[\\/]js\.worker\.js$/,
        type: 'asset/source',
      },
      {
        test: /\.wasm$/i,
        type: 'asset/resource',
        generator: {
          filename: 'ifc-lite_bg.wasm',
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: [
    { 'three': 'three' },
    { 'three/webgpu': 'three/webgpu' },
    ({ request }, callback) => {
      if (request && request.indexOf('@ifc-lite/') === 0) {
        return callback(null, request);
      }

      if (/^three\/addons\//.test(request)) {
        return callback(null, request);
      }

      if (/^three\/examples\/jsm\//.test(request)) {
        return callback(null, request);
      }

      if (request === 'three-gpu-pathtracer') {
        return callback(null, 'three-gpu-pathtracer');
      }

      if (request === 'three-mesh-bvh') {
        return callback(null, 'three-mesh-bvh');
      }

      callback();
    },
    { '3d-tiles-renderer': '3d-tiles-renderer' },
    { '3d-tiles-renderer/plugins': '3d-tiles-renderer/plugins' },
  ],
  externalsType: 'module',
  performance: {
    hints: false,
  },
  ignoreWarnings: [
    {
      module: /src[\\/]ui[\\/]index\.js$/,
      message: /Critical dependency: the request of a dependency is an expression/,
    },
  ],
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
};