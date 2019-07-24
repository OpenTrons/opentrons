// @flow
// labware library entry
import * as React from 'react'
import ReactDom from 'react-dom'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import App from './components/App'
import LabwareCreator from './labware-creator'

import './public-path'
import './styles.global.css'

const $root = document.getElementById('root')

if (!$root) {
  throw new Error('fatal: #root not found')
}

ReactDom.render(
  <BrowserRouter>
    <Switch>
      <Route path="/create" component={LabwareCreator} />
      <Route component={App} />
    </Switch>
  </BrowserRouter>,
  $root
)
