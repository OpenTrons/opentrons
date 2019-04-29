// @flow
// resources epics and instance state reducer
import { combineReducers } from 'redux'
import { combineEpics } from 'redux-observable'
import { healthReducer, healthEpic } from './health'
import { modulesReducer, modulesEpic } from './modules'

import type { ApiAction } from '../types'

export * from './health'
export * from './modules'

export const resourcesReducer = combineReducers<_, ApiAction>({
  health: healthReducer,
  modules: modulesReducer,
})

export const robotApiEpic = combineEpics(healthEpic, modulesEpic)
