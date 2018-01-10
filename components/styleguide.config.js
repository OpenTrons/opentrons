'use strict'

const path = require('path')

// TODO(mc, 2017-12-22): Create common webpack config
const {babel, localCss} = require('../app/webpack/rules')

module.exports = {
  webpackConfig: {
    module: {
      rules: [babel, localCss]
    }
  },
  showUsage: true,
  showCode: true,
  // TODO(mc, 2017-12-22): generate these sections automatically by walking src
  sections: [
    {
      name: 'Buttons',
      components: 'src/buttons/[A-Z]*.js'
    },
    {
      name: 'Icons',
      components: 'src/icons/[A-Z]*.js'
    },
    {
      name: 'Lists',
      components: 'src/lists/[A-Z]*.js'
    }
  ],
  getComponentPathLine (componentPath) {
    const name = path.basename(componentPath, '.js')

    return `import {${name}} from '@opentrons/components'`
  }
}
