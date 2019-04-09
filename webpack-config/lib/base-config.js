// webpack base config
'use strict'

const path = require('path')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

const rules = require('./rules')
const { DEV_MODE, ENABLE_ANALYZER, DEFAULT_PORT } = require('./env')

module.exports = {
  target: 'web',

  // TODO(mc, 2019-03-12): react-hot-loader@4 no longer needs this entry
  entry: DEV_MODE ? ['react-hot-loader/patch'] : [],

  output: {
    filename: DEV_MODE ? 'bundle.js' : 'bundle.[contenthash].js',
  },

  mode: DEV_MODE ? 'development' : 'production',

  devtool: DEV_MODE ? 'eval-source-map' : 'source-map',

  module: {
    rules: [
      rules.js,
      rules.worker,
      rules.globalCss,
      rules.localCss,
      rules.handlebars,
      rules.fonts,
      rules.images,
    ],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: DEV_MODE ? '[name].css' : '[name].[contenthash].css',
      chunkFilename: DEV_MODE ? '[id].css' : '[id].[contenthash].css',
    }),
    ENABLE_ANALYZER &&
      new BundleAnalyzerPlugin({ analyzerMode: 'server', openAnalyzer: true }),
    ENABLE_ANALYZER &&
      new CircularDependencyPlugin({
        exclude: /node_modules/,
        cwd: path.join(__dirname, '../..'),
      }),
  ].filter(Boolean),

  optimization: {
    minimizer: [
      new TerserPlugin({ cache: true, parallel: true, sourceMap: true }),
      new OptimizeCSSAssetsPlugin({}),
    ],

    splitChunks: {
      cacheGroups: {
        // bundle CSS into one file
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },

  devServer: {
    historyApiFallback: true,
    port: DEFAULT_PORT,
  },
}
