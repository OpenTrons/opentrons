'use strict'

const path = require('path')
const webpack = require('webpack')
const webpackMerge = require('webpack-merge')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin')

const {DEV_MODE, baseConfig} = require('@opentrons/webpack-config')
const {productName: title, description, author} = require('./package.json')

const PROTOCOL_DESIGNER_ENV_VAR_PREFIX = 'OT_PD_'

// TODO: BC: 2018-02-21 remove hardcoded semver version and replace
// with string from package.json version inserted at build time
// Also remove all OT_PD_VERSION env vars, the version should always
// be gleaned from the package.json

// const gitInfo = gitDescribeSync()
const OT_PD_VERSION = '1.1.0' // gitInfo && gitInfo.raw
const OT_PD_BUILD_DATE = new Date().toUTCString()

const JS_ENTRY = path.join(__dirname, 'src/index.js')
const HTML_ENTRY = path.join(__dirname, 'src/index.hbs')

const passThruEnvVars = Object.keys(process.env)
  .filter(v => v.startsWith(PROTOCOL_DESIGNER_ENV_VAR_PREFIX))
  .concat(['NODE_ENV'])

const envVarsWithDefaults = {OT_PD_VERSION, OT_PD_BUILD_DATE}

const envVars = passThruEnvVars.reduce(
  (acc, envVar) => ({[envVar]: '', ...acc}),
  {...envVarsWithDefaults}
)

console.log(`PD version: ${OT_PD_VERSION || 'UNKNOWN!'}`)

module.exports = webpackMerge(baseConfig, {
  entry: [JS_ENTRY],

  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: DEV_MODE ? '' : './',
  },

  plugins: [
    new webpack.EnvironmentPlugin(envVars),
    new HtmlWebpackPlugin({title, description, author, template: HTML_ENTRY}),
    new ScriptExtHtmlWebpackPlugin({defaultAttribute: 'defer'}),
  ],
})
