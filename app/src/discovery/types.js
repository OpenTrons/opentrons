// @flow

import type { Service } from '@opentrons/discovery-client'

export type ConnectableStatus = 'connectable'
export type ReachableStatus = 'reachable'
export type UnreachableStatus = 'unreachable'

export type RestartStatus = 'pending' | 'down'

// service with a known IP address
export type ResolvedRobot = {
  ...$Exact<Service>,
  ip: $NonMaybeType<$PropertyType<Service, 'ip'>>,
  local: $NonMaybeType<$PropertyType<Service, 'local'>>,
  ok: $NonMaybeType<$PropertyType<Service, 'ok'>>,
  serverOk: $NonMaybeType<$PropertyType<Service, 'serverOk'>>,
  displayName: string,
  restartStatus: ?RestartStatus,
}

// fully connectable robot
export type Robot = {
  ...$Exact<ResolvedRobot>,
  ok: true,
  health: $NonMaybeType<$PropertyType<Service, 'health'>>,
  status: ConnectableStatus,
  connected: boolean,
}

// robot with a known IP (i.e. advertising over mDNS) but unconnectable
export type ReachableRobot = {
  ...$Exact<ResolvedRobot>,
  ok: false,
  status: ReachableStatus,
}

// robot with an unknown IP
export type UnreachableRobot = {
  ...$Exact<Service>,
  displayName: string,
  status: UnreachableStatus,
}

export type ViewableRobot = Robot | ReachableRobot

export type AnyRobot = Robot | ReachableRobot | UnreachableRobot

export type StartDiscoveryAction = {|
  type: 'discovery:START',
  payload: {| timeout: number | null |},
  meta: {| shell: true |},
|}

export type FinishDiscoveryAction = {|
  type: 'discovery:FINISH',
  meta: {| shell: true |},
|}

export type UpdateListAction = {|
  type: 'discovery:UPDATE_LIST',
  payload: {| robots: Array<Service> |},
|}

export type RemoveRobotAction = {|
  type: 'discovery:REMOVE',
  payload: {| robotName: string |},
  meta: {| shell: true |},
|}

export type DiscoveryAction =
  | StartDiscoveryAction
  | FinishDiscoveryAction
  | UpdateListAction
  | RemoveRobotAction
