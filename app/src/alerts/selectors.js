// @flow
import { createSelector } from 'reselect'
import without from 'lodash/without'

import { getConfig } from '../config'

import type { State } from '../types'
import type { AlertId } from './types'

export const getActiveAlerts: (
  state: State
) => $ReadOnlyArray<AlertId> = createSelector(
  getConfig,
  state => state.alerts,
  (config, alerts) => {
    return without(alerts.active, ...alerts.ignored, ...config.alerts.ignored)
  }
)
