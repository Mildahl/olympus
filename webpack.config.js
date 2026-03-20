import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export default {
  entry: './src/index.js',
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
  },
  module: {
    rules: [
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
      if (/^three\/addons\//.test(request)) {
        return callback(null, request);
      }

      if (/^three\/examples\/jsm\//.test(request)) {
        return callback(null, request);
      }

      if (request === 'three-gpu-pathtracer') {
        return callback(null, 'three-gpu-pathtracer');
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