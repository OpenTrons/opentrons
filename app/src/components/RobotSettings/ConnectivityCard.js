// @flow
// RobotSettings card for wifi status
import * as React from 'react'
import {connect} from 'react-redux'

import {startDiscovery} from '../../discovery'
import {
  fetchWifiList,
  configureWifi,
  clearConfigureWifiResponse,
  makeGetRobotWifiList,
  makeGetRobotWifiConfigure,
  type RobotWifiList,
  type RobotWifiConfigure,
} from '../../http-api-client'

import {RefreshCard, LabeledValue} from '@opentrons/components'
import {CardContentFull} from '../layout'
import WifiConnectForm from './WifiConnectForm'
import WifiConnectModal from './WifiConnectModal'

import type {State, Dispatch} from '../../types'
import type {ViewableRobot} from '../../discovery'

type OwnProps = {robot: ViewableRobot}

type StateProps = {|
  listRequest: RobotWifiList,
  configureRequest: RobotWifiConfigure,
|}

type DispatchProps = {|
  fetchList: () => mixed,
  configure: (?string, ?string) => mixed,
  clearSuccessfulConfigure: () => mixed,
  clearFailedConfigure: () => mixed,
|}

type Props = {
  ...$Exact<OwnProps>,
  ...StateProps,
  ...DispatchProps,
}

const TITLE = 'Connectivity'
const CONNECTED_BY_LABEL = 'Connected by'

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(ConnectivityCard)

function ConnectivityCard (props: Props) {
  const {
    fetchList,
    clearSuccessfulConfigure,
    clearFailedConfigure,
    configure,
    robot: {ip, local, name},
    listRequest: {
      inProgress: listInProgress,
      response: listResponse,
    },
    configureRequest: {
      inProgress: configInProgress,
      response: configResponse,
      error: configError,
    },
  } = props

  const list = (listResponse && listResponse.list) || []

  const active = list.find((network) => network.active)
  const activeSsid = active && active.ssid
  const connectedBy = local
    ? 'USB'
    : `${activeSsid || ''} (WiFi)`

  const listOptions = list.map(({active, ssid}) => ({
    name: active ? `${ssid} *` : ssid,
    value: ssid,
  }))

  return (
    <React.Fragment>
      <RefreshCard
        watch={name}
        refresh={fetchList}
        refreshing={listInProgress || configInProgress}
        title={TITLE}
        column
      >
        <CardContentFull>
          <LabeledValue
            label={CONNECTED_BY_LABEL}
            value={`${connectedBy} - ${ip}`}
          />
          <WifiConnectForm
            key={name}
            disabled={configInProgress}
            activeSsid={activeSsid}
            networks={listOptions}
            onSubmit={configure}
          />
        </CardContentFull>
      </RefreshCard>
      {(!!configError || !!configResponse) && (
        <WifiConnectModal
          error={configError}
          response={configResponse}
          close={(configError
            ? clearFailedConfigure
            : clearSuccessfulConfigure
          )}
        />
      )}
    </React.Fragment>
  )
}

function makeMapStateToProps () {
  const getWifiList = makeGetRobotWifiList()
  const getWifiConfigure = makeGetRobotWifiConfigure()

  return (state: State, ownProps: OwnProps): StateProps => ({
    listRequest: getWifiList(state, ownProps.robot),
    configureRequest: getWifiConfigure(state, ownProps.robot),
  })
}

function mapDispatchToProps (
  dispatch: Dispatch,
  ownProps: OwnProps
): DispatchProps {
  const {robot} = ownProps
  const fetchList = () => dispatch(fetchWifiList(robot))
  const configure = (ssid, psk) => dispatch(configureWifi(robot, ssid, psk))

  // TODO(mc, 2018-02-26): handle refreshing the list and kicking off dispatch
  //   more elegantly and closer to the configure response
  const clearConfigureAction = clearConfigureWifiResponse(robot)
  const clearFailedConfigure = () => dispatch(clearConfigureAction)
  const clearSuccessfulConfigure = () => fetchList()
    .then(() => dispatch(startDiscovery()))
    .then(() => dispatch(clearConfigureAction))

  return {
    fetchList,
    configure,
    clearSuccessfulConfigure,
    clearFailedConfigure,
  }
}
