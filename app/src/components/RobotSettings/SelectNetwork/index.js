// @flow
import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import last from 'lodash/last'

import {
  useDispatchApiRequest,
  getRequestById,
  dismissRequest,
  PENDING,
  SUCCESS,
  FAILURE,
} from '../../../robot-api'
import * as Networking from '../../../networking'
import {
  NO_SECURITY,
  WPA_EAP_SECURITY,
  fetchWifiEapOptions,
  fetchWifiKeys,
  configureWifi,
  addWifiKey,
  clearConfigureWifiResponse,
} from '../../../http-api-client'
import { getConfig } from '../../../config'

import { startDiscovery } from '../../../discovery'
import { chainActions } from '../../../util'

import { IntervalWrapper } from '@opentrons/components'
import { SelectSsid } from './SelectSsid'
import { SelectNetworkModal } from './SelectNetworkModal'
import { ConnectModal } from './ConnectModal'
import { DisconnectModal } from './DisconnectModal'
import { JoinOtherModal } from './JoinOtherModal'

import {
  LIST_REFRESH_MS,
  DISCONNECT_WIFI_VALUE,
  JOIN_OTHER_VALUE,
  CONNECT,
  NETWORKING_TYPE,
  DISCONNECT,
  JOIN_OTHER,
} from './constants'

import { useStateSelectNetwork, stateSelector } from './hooks'
import { getActiveSsid, getSecurityType, hasSecurityType } from './utils'

import type { State } from '../../../types'
import type { RequestState } from '../../../robot-api/types'
import type { ViewableRobot } from '../../../discovery/types'
import type { PostWifiDisconnectAction } from '../../../networking/types'
import { NetworkingActionType } from './types'

type SelectNetworkProps = {| robot: ViewableRobot |}

export const SelectNetwork = ({ robot }: SelectNetworkProps) => {
  const {
    list,
    eapOptions,
    keys,
    connectingTo,
    configRequest,
    configResponse,
    configError,
  } = useSelector((state: State) => stateSelector(state, robot))

  const [
    currentAction,
    setCurrentAction,
  ] = React.useState<NetworkingActionType>(null)

  // const showConfig = configRequest && !!(configError || configResponse)

  const [
    ssid,
    setSsid,
    previousSsid,
    setPreviousSsid,
    networkingType,
    setNetworkingType,
    securityType,
    setSecurityType,
    modalOpen,
    setModalOpen,
  ] = useStateSelectNetwork(list)

  // TODO(isk, 2/27/20): remove the feature flag and version check
  const enableWifiDisconnect = useSelector((state: State) =>
    Boolean(getConfig(state)?.devInternal?.enableWifiDisconnect)
  )

  const hasCorrectVersion = Networking.getRobotSuportsDisconnect(robot)
  const showWifiDisconnect =
    Boolean(ssid) && (enableWifiDisconnect || hasCorrectVersion)

  // const handleDisconnectWifiSuccess = React.useCallback(() => {
  //   setSsid(null)
  //   setPreviousSsid(null)
  //   setNetworkingType(CONNECT)
  //   setSecurityType(null)
  // }, [setSsid, setPreviousSsid, setNetworkingType, setSecurityType])

  // const [
  //   dispatchApi,
  //   requestIds,
  // ] = useDispatchApiRequest<PostWifiDisconnectAction>()

  // const latestRequestId = last(requestIds)

  // const disconnectRequest: RequestState | null = useSelector<
  //   State,
  //   RequestState | null
  // >(state => getRequestById(state, latestRequestId))

  // const status = disconnectRequest && disconnectRequest.status
  // const error =
  //   disconnectRequest && disconnectRequest.error && disconnectRequest.error
  // const response =
  //   disconnectRequest &&
  //   disconnectRequest.response &&
  //   disconnectRequest.response

  // const pending = status === PENDING
  // const failure = status === FAILURE

  // React.useEffect(() => {
  //   if (status === SUCCESS) {
  //     handleDisconnectWifiSuccess()
  //   }
  // }, [status, handleDisconnectWifiSuccess])

  // const dispatch = useDispatch()
  // const dispatchRefresh = () => dispatch(Networking.fetchWifiList(robot.name))
  // const dispatchConfigure = params => {
  //   return dispatch(
  //     chainActions(
  //       configureWifi(robot, params),
  //       startDiscovery(),
  //       Networking.fetchWifiList(robot.name)
  //     )
  //   )
  // }

  // const handleValueChange = (ssidValue: string) => {
  //   const isJoinOrDisconnect =
  //     ssidValue === JOIN_OTHER_VALUE || ssidValue === DISCONNECT_WIFI_VALUE

  //   const currentSsid = isJoinOrDisconnect ? null : ssidValue
  //   const currentPreviousSsid = ssid
  //   const currentNetworkingType = NETWORKING_TYPE[ssidValue] || CONNECT
  //   const currentSecurityType = getSecurityType(list, ssidValue)
  //   const currentModalOpen = hasSecurityType(currentSecurityType, NO_SECURITY)

  //   const canFetchEapOptions =
  //     hasSecurityType(securityType, WPA_EAP_SECURITY) || !securityType
  //   if (currentModalOpen) {
  //     dispatchConfigure({ ssid: ssidValue })
  //   } else if (canFetchEapOptions) {
  //     dispatch(fetchWifiEapOptions(robot))
  //     dispatch(fetchWifiKeys(robot))
  //   }

  //   setSsid(currentSsid)
  //   setPreviousSsid(currentPreviousSsid)
  //   setNetworkingType(currentNetworkingType)
  //   setSecurityType(currentSecurityType)
  //   setModalOpen(!currentModalOpen)
  // }

  // const handleCancel = () => {
  //   const currentSecurityType = getSecurityType(list, previousSsid)
  //   setSsid(previousSsid)
  //   setPreviousSsid(null)
  //   setNetworkingType(CONNECT)
  //   setSecurityType(currentSecurityType)
  //   setModalOpen(false)
  // }

  // const handleDisconnectWifi = () => {
  //   if (previousSsid) {
  //     dispatchApi(Networking.postWifiDisconnect(robot.name, previousSsid))
  //     setModalOpen(false)
  //   }
  // }

  return (
    <>
      <SelectSsid
        list={list}
        value={getActiveSsid(list)}
        disabled={connectingTo != null}
        onConnect={() => setCurrentAction(CONNECT)}
        onJoinOther={() => setCurrentAction(JOIN_OTHER)}
        onDisconnect={() => setCurrentAction(DISCONNECT)}
        showWifiDisconnect={showWifiDisconnect}
      />
      {currentAction === CONNECT && <ConnectModal />}
      {currentAction === DISCONNECT && <DisconnectModal />}
      {currentAction === JOIN_OTHER && <JoinOtherModal />}
    </>
  )

  // TODO: (isk: 2/27/20): Refactor this SelectNetworkModal and handlers
  // return (
  //   <IntervalWrapper refresh={dispatchRefresh} interval={LIST_REFRESH_MS}>
  //     <SelectSsid
  //       list={list || []}
  //       value={getActiveSsid(list)}
  //       disabled={connectingTo != null}
  //       onValueChange={handleValueChange}
  //       showWifiDisconnect={showWifiDisconnect}
  //     />
  //     <SelectNetworkModal
  //       addKey={(file: File) => dispatch(addWifiKey(robot, file))}
  //       close={
  //         showConfig
  //           ? dispatch(clearConfigureWifiResponse(robot))
  //           : () => dispatch(dismissRequest(latestRequestId))
  //       }
  //       onDisconnectWifi={handleDisconnectWifi}
  //       onCancel={handleCancel}
  //       {...{
  //         connectingTo,
  //         pending,
  //         failure,
  //         modalOpen,
  //         ssid,
  //         previousSsid,
  //         networkingType,
  //         securityType,
  //         eapOptions,
  //         keys,
  //         dispatchConfigure,
  //         configRequest,
  //         configError,
  //         configResponse,
  //         response,
  //         error,
  //       }}
  //     />
  //   </IntervalWrapper>
  // )
}
