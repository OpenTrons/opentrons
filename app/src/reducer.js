// @flow
// interface state
import {combineReducers} from 'redux'
import {routerReducer} from 'react-router-redux'

// robot state
import {NAME as ROBOT_NAME, reducer as robotReducer} from './robot'

// api state
import {reducer as httpApiReducer} from './http-api-client'

// app shell state
import {shellReducer} from './shell'

// config state
import {configReducer} from './config'

export default combineReducers({
  [ROBOT_NAME]: robotReducer,
  api: httpApiReducer,
  config: configReducer,
  shell: shellReducer,
  router: routerReducer
})
