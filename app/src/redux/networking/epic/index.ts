import type { Epic } from '../../types'
import { disconnectEpic } from './disconnectEpic'
import { fetchEapOptionsEpic } from './fetchEapOptionsEpic'
import { fetchWifiKeysEpic } from './fetchWifiKeysEpic'
import { postWifiKeysEpic } from './postWifiKeysEpic'
import { statusEpic } from './statusEpic'
import { wifiConfigureEpic } from './wifiConfigureEpic'
import { wifiListEpic } from './wifiListEpic'
import { combineEpics } from 'redux-observable'

export const networkingEpic: Epic = combineEpics<Epic>(
  fetchEapOptionsEpic,
  fetchWifiKeysEpic,
  postWifiKeysEpic,
  statusEpic,
  wifiConfigureEpic,
  wifiListEpic,
  disconnectEpic
)
