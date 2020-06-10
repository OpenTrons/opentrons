// @flow
// app configuration and settings
// TODO(mc, 2020-01-31): this module is high-importance and needs unit tests
import Store from 'electron-store'
import get from 'lodash/get'
import mergeOptions from 'merge-options'
import yargsParser from 'yargs-parser'

import { UI_INITIALIZED } from '@opentrons/app/src/shell/actions'
import * as Cfg from '@opentrons/app/src/config'

import { createLogger } from '../log'
import { DEFAULTS, migrate } from './migrate'
import { shouldUpdate, getNextValue } from './update'

import type { Action, Dispatch } from '../types'
import type { Config } from './types'

export type * from './types'

// make sure all arguments are included in production
const argv =
  'defaultApp' in process ? process.argv.slice(2) : process.argv.slice(1)

const PARSE_ARGS_OPTS = {
  envPrefix: 'OT_APP',
  configuration: {
    'negation-prefix': 'disable_',
  },
}

// lazy load store, overrides, and log because of config/log interdependency
let _store
let _over
let _log
const store = () => {
  if (_store == null) {
    // perform store migration if loading for the first time
    _store = new Store({ defaults: DEFAULTS })
    _store.store = migrate(_store.store)
  }
  return _store
}
const overrides = () => _over || (_over = yargsParser(argv, PARSE_ARGS_OPTS))
const log = () => _log || (_log = createLogger('config'))

// initialize and register the config module with dispatches from the UI
export function registerConfig(dispatch: Dispatch): Action => void {
  return function handleIncomingAction(action: Action) {
    if (action.type === UI_INITIALIZED) {
      dispatch(Cfg.configInitialized(getFullConfig()))
    } else if (
      action.type === Cfg.UPDATE_VALUE ||
      action.type === Cfg.RESET_VALUE ||
      action.type === Cfg.TOGGLE_VALUE ||
      action.type === Cfg.ADD_UNIQUE_VALUE ||
      action.type === Cfg.SUBTRACT_VALUE
    ) {
      const { path } = action.payload

      if (shouldUpdate(path, overrides())) {
        const nextValue = getNextValue(action, getFullConfig())

        log().debug('Updating config', { path, nextValue })
        store().set(path, nextValue)
        dispatch(Cfg.configValueUpdated(path, nextValue))
      } else {
        log().debug(`config path in overrides; not updating`, { path })
      }
    }
  }
}

export function getStore(): Config {
  return store().store
}

export function getOverrides(path?: string): mixed {
  return get(overrides(), path)
}

// TODO(mc, 2010-07-01): getConfig with path parameter can't be typed
// Remove the path parameter
export function getConfig(path?: string): any {
  const result = store().get(path)
  const over = get(overrides(), path)

  if (over != null) {
    if (typeof result === 'object' && result != null) {
      return mergeOptions(result, over)
    }

    return over
  }

  return result
}

export function getFullConfig(): Config {
  return getConfig()
}

export function handleConfigChange(
  path: string,
  changeHandler: (newValue: any, oldValue: any) => mixed
) {
  store().onDidChange(path, changeHandler)
}
