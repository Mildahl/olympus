import path from 'path';

import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export default (environment, argv) => {
  const development = argv.mode === 'development';

  return {
  entry: {
    index: './src/index.js',
    'olympus-styles': './src/olympus-styles.js',
  },
  mode: argv.mode || 'production',
  devtool: development ? 'source-map' : false,
  output: {
    filename: (pathData) => {
      if (pathData.chunk.name === 'olympus-styles') return 'olympus-styles.js';
      return 'index.js';
    },
    path: path.resolve(__dirname, 'dist'),
    chunkFilename: '[name].js',
    library: {
      type: 'module',
    },
    clean: {
      keep: /^pytools(\/|$)|pyodide\.worker\.js$|\.d\.ts$/,
    },
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: ['.js', '.css'],
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
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              url: true,
              sourceMap: development,
            },
          },
        ],
        sideEffects: true,
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
    minimizer: [
      '...',
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'olympus.css',
    }),
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap('RemoveCssEntryStub', () => {
          const stub = path.resolve(compiler.options.output.path, 'olympus-styles.js');
          import('fs').then(fs => { try { fs.unlinkSync(stub); } catch {} });
        });
      },
    },
  ],
  };
};