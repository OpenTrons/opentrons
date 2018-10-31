// @flow
import * as React from 'react'
import {connect} from 'react-redux'
import find from 'lodash/find'

import {
  NO_SECURITY,
  WPA_EAP_SECURITY,
  fetchWifiList,
  fetchWifiEapOptions,
  fetchWifiKeys,
  fetchNetworkingStatus,
  addWifiKey,
  configureWifi,
  makeGetRobotWifiList,
  makeGetRobotWifiEapOptions,
  makeGetRobotWifiKeys,
  makeGetRobotWifiConfigure,
  clearConfigureWifiResponse,
} from '../../../http-api-client'

import {startDiscovery} from '../../../discovery'

import {IntervalWrapper, SpinnerModal} from '@opentrons/components'
import {Portal} from '../../portal'
import ConnectModal from './ConnectModal'
import ConnectForm from './ConnectForm'
import SelectSsid from './SelectSsid'
import WifiConnectModal from './WifiConnectModal'

import type {State, Dispatch} from '../../../types'
import type {ViewableRobot} from '../../../discovery'
import type {
  WifiNetworkList,
  WifiSecurityType,
  WifiEapOptionsList,
  WifiKeysList,
  WifiConfigureRequest,
  WifiConfigureResponse,
  ApiRequestError,
} from '../../../http-api-client'

type OP = {robot: ViewableRobot}

type SP = {|
  list: ?WifiNetworkList,
  connectingTo: ?string,
  eapOptions: ?WifiEapOptionsList,
  keys: ?WifiKeysList,
  configError: ?ApiRequestError,
  configResponse: ?WifiConfigureResponse,
|}

type DP = {|
  fetchList: () => mixed,
  fetchEapOptions: () => mixed,
  fetchKeys: () => mixed,
  addKey: (file: File) => mixed,
  configure: WifiConfigureRequest => mixed,
  refresh: () => mixed,
  clearSuccessfulConfigure: () => mixed,
  clearFailedConfigure: () => mixed,
|}

type Props = {...$Exact<OP>, ...SP, ...DP}

type SelectNetworkState = {
  ssid: ?string,
  securityType: ?WifiSecurityType,
  modalOpen: boolean,
}

const LIST_REFRESH_MS = 15000

class SelectNetwork extends React.Component<Props, SelectNetworkState> {
  constructor (props) {
    super(props)
    // prepopulate selected SSID with currently connected network, if any
    this.state = {
      ssid: this.getActiveSsid(),
      securityType: null,
      modalOpen: false,
    }
  }

  setCurrentSsid = (_: string, ssid: ?string) => {
    const network = find(this.props.list, {ssid})
    const securityType = network && network.securityType
    const nextState = {
      ssid,
      securityType,
      modalOpen: securityType !== NO_SECURITY,
    }

    if (ssid && !nextState.modalOpen) {
      this.props.configure({ssid})
    } else if (securityType === WPA_EAP_SECURITY || !securityType) {
      this.props.fetchEapOptions()
      this.props.fetchKeys()
    }

    this.setState(nextState)
  }

  closeConnectForm = () => this.setState({securityType: null, modalOpen: false})

  getActiveSsid (): ?string {
    const activeNetwork = find(this.props.list, 'active')
    return activeNetwork && activeNetwork.ssid
  }

  render () {
    const {
      list,
      connectingTo,
      eapOptions,
      keys,
      fetchList,
      addKey,
      configure,
      configError,
      configResponse,
      clearSuccessfulConfigure,
      clearFailedConfigure,
    } = this.props
    const {ssid, securityType, modalOpen} = this.state

    return (
      <IntervalWrapper refresh={fetchList} interval={LIST_REFRESH_MS}>
        <SelectSsid
          list={list}
          disabled={connectingTo != null}
          onValueChange={this.setCurrentSsid}
        />
        <Portal>
          {connectingTo && (
            <SpinnerModal
              message={`Attempting to connect to network ${connectingTo}`}
              alertOverlay
            />
          )}
          {modalOpen && (
            <ConnectModal
              ssid={ssid}
              securityType={securityType}
              close={this.closeConnectForm}
            >
              <ConnectForm
                ssid={ssid}
                securityType={securityType}
                eapOptions={eapOptions}
                keys={keys}
                configure={configure}
                close={this.closeConnectForm}
                addKey={addKey}
              />
            </ConnectModal>
          )}
          {(!!configError || !!configResponse) && (
            <WifiConnectModal
              error={configError}
              response={configResponse}
              close={
                configError ? clearFailedConfigure : clearSuccessfulConfigure
              }
            />
          )}
        </Portal>
      </IntervalWrapper>
    )
  }
}

function makeMapStateToProps (): (State, OP) => SP {
  const getListCall = makeGetRobotWifiList()
  const getEapCall = makeGetRobotWifiEapOptions()
  const getKeysCall = makeGetRobotWifiKeys()
  const getConfigureCall = makeGetRobotWifiConfigure()

  return (state, ownProps) => {
    const {robot} = ownProps
    const {response: listResponse} = getListCall(state, robot)
    const {response: eapResponse} = getEapCall(state, robot)
    const {response: keysResponse} = getKeysCall(state, robot)
    const {
      request: cfgRequest,
      inProgress: cfgInProgress,
      response: cfgResponse,
      error: cfgError,
    } = getConfigureCall(state, robot)

    return {
      list: listResponse && listResponse.list,
      eapOptions: eapResponse && eapResponse.options,
      keys: keysResponse && keysResponse.keys,
      connectingTo:
        !cfgError && cfgInProgress && cfgRequest ? cfgRequest.ssid : null,
      configResponse: cfgResponse,
      configError: cfgError,
    }
  }
}

function mapDispatchToProps (dispatch: Dispatch, ownProps: OP): DP {
  const {robot} = ownProps
  const refresh = () => {
    dispatch(fetchNetworkingStatus(robot))
    dispatch(fetchWifiList(robot))
  }
  const clearConfigureAction = clearConfigureWifiResponse(robot)
  const clearFailedConfigure = () => dispatch(clearConfigureAction)
  const clearSuccessfulConfigure = () =>
    Promise.resolve()
      .then(refresh)
      .then(() => dispatch(startDiscovery()))
      .then(() => dispatch(clearConfigureAction))

  return {
    fetchList: () => dispatch(fetchWifiList(robot)),
    fetchEapOptions: () => dispatch(fetchWifiEapOptions(robot)),
    fetchKeys: () => dispatch(fetchWifiKeys(robot)),
    addKey: file => dispatch(addWifiKey(robot, file)),
    configure: params => dispatch(configureWifi(robot, params)),
    refresh,
    clearSuccessfulConfigure,
    clearFailedConfigure,
  }
}

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(SelectNetwork)
