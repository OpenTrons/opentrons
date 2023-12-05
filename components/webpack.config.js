'use strict'

const path = require('path')
const webpackMerge = require('webpack-merge')
const { baseConfig } = require('@opentrons/webpack-config')

const ENTRY_INDEX = path.join(__dirname, 'src/index.ts')
const OUTPUT_PATH = path.join(__dirname, 'lib')

module.exports = async () =>
  webpackMerge(baseConfig, {
    entry: { index: ENTRY_INDEX },
    output: {
      path: OUTPUT_PATH,
      filename: 'opentrons-components.js',
      library: '@opentrons/components',
      libraryTarget: 'umd',
    },
  })
