import * as React from 'react'
import { useSelector } from 'react-redux'
import { Switch, Route, Redirect } from 'react-router-dom'
import { css } from 'styled-components'

import {
  Box,
  POSITION_RELATIVE,
  COLORS,
  OVERFLOW_AUTO,
  useIdle,
  useScrolling,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'

import { BackButton } from '../atoms/buttons'
import { SleepScreen } from '../organisms/OnDeviceDisplay/SleepScreen'
import { ToasterOven } from '../organisms/ToasterOven'
import { ConnectViaEthernet } from '../pages/OnDeviceDisplay/ConnectViaEthernet'
import { ConnectViaUSB } from '../pages/OnDeviceDisplay/ConnectViaUSB'
import { ConnectViaWifi } from '../pages/OnDeviceDisplay/ConnectViaWifi'
import { NameRobot } from '../pages/OnDeviceDisplay/NameRobot'
import { NetworkSetupMenu } from '../pages/OnDeviceDisplay/NetworkSetupMenu'
import { ProtocolSetup } from '../pages/OnDeviceDisplay/ProtocolSetup'
import { TempODDMenu } from '../pages/OnDeviceDisplay/TempODDMenu'
import { RobotDashboard } from '../pages/OnDeviceDisplay/RobotDashboard'
import { RobotSettingsDashboard } from '../pages/OnDeviceDisplay/RobotSettingsDashboard'
import { ProtocolDashboard } from '../pages/OnDeviceDisplay/ProtocolDashboard'
import { ProtocolDetails } from '../pages/OnDeviceDisplay/ProtocolDetails'
import { RunningProtocol } from '../pages/OnDeviceDisplay/RunningProtocol'
import { RunSummary } from '../pages/OnDeviceDisplay/RunSummary'
import { UpdateRobot } from '../pages/OnDeviceDisplay/UpdateRobot'
import { InstrumentsDashboard } from '../pages/OnDeviceDisplay/InstrumentsDashboard'
import { InstrumentDetail } from '../pages/OnDeviceDisplay/InstrumentDetail'
import { Welcome } from '../pages/OnDeviceDisplay/Welcome'
import { PortalRoot as ModalPortalRoot } from './portal'
import { getOnDeviceDisplaySettings } from '../redux/config'
import { SLEEP_NEVER_MS } from './constants'

import type { RouteProps } from './types'

export const onDeviceDisplayRoutes: RouteProps[] = [
  {
    Component: Welcome,
    exact: true,
    name: 'Welcome',
    path: '/welcome',
  },
  {
    Component: TempODDMenu,
    exact: true,
    name: 'Temp ODD Menu',
    path: '/menu',
  },
  {
    Component: RobotDashboard,
    exact: true,
    name: 'Robot Dashboard',
    path: '/dashboard',
  },
  {
    Component: NetworkSetupMenu,
    exact: true,
    name: 'Network setup menu',
    path: '/network-setup',
  },
  {
    Component: ConnectViaWifi,
    exact: true,
    name: 'Select Network',
    path: '/network-setup/wifi',
  },
  {
    Component: ConnectViaEthernet,
    exact: true,
    name: 'Connect via Ethernet',
    path: '/network-setup/ethernet',
  },
  {
    Component: ConnectViaUSB,
    exact: true,
    name: 'Connect via USB',
    path: '/network-setup/usb',
  },
  {
    Component: ProtocolDashboard,
    exact: true,
    name: 'All Protocols',
    navLinkTo: '/protocols',
    path: '/protocols',
  },
  // insert protocol sub-routes
  {
    Component: ProtocolDetails,
    exact: true,
    name: 'Protocol Details',
    path: '/protocols/:protocolId',
  },
  // expect to change or add additional route params
  {
    Component: ProtocolSetup,
    exact: true,
    name: 'Protocol Setup',
    path: '/protocols/:runId/setup',
  },
  {
    Component: RunningProtocol,
    exact: true,
    name: 'Protocol Run',
    path: '/protocols/:runId/run',
  },
  {
    Component: RunSummary,
    exact: true,
    name: 'Protocol Run Summary',
    path: '/protocols/:runId/summary',
  },
  {
    Component: InstrumentsDashboard,
    exact: true,
    name: 'Instruments',
    navLinkTo: '/instruments',
    path: '/instruments',
  },
  {
    Component: InstrumentDetail,
    exact: true,
    name: 'Instrument Detail',
    path: '/instruments/:mount',
  },
  // insert attach instruments sub-routes
  {
    Component: RobotSettingsDashboard,
    exact: true,
    name: 'Settings',
    navLinkTo: '/robot-settings',
    path: '/robot-settings',
  },
  // insert robot settings sub-routes
  {
    Component: () => (
      <>
        <BackButton />
        <Box>factory reset</Box>
      </>
    ),
    exact: true,
    name: 'Factory Reset',
    path: '/robot-settings/factory-reset',
  },
  {
    Component: NameRobot,
    exact: true,
    name: 'Rename Robot',
    path: '/robot-settings/rename-robot',
  },
  {
    Component: UpdateRobot,
    exact: true,
    name: 'Update Robot',
    path: '/robot-settings/update-robot',
  },
  {
    Component: () => (
      <>
        <BackButton />
        <Box>app settings</Box>
      </>
    ),
    exact: true,
    name: 'App Settings',
    path: '/app-settings',
  },
]

const onDeviceDisplayEvents: Array<keyof DocumentEventMap> = [
  'mousedown',
  'click',
  'scroll',
]

export const OnDeviceDisplayApp = (): JSX.Element => {
  const { sleepMs, unfinishedUnboxingFlowRoute } = useSelector(
    getOnDeviceDisplaySettings
  )
  const targetPath =
    unfinishedUnboxingFlowRoute != null
      ? unfinishedUnboxingFlowRoute
      : '/dashboard'
  const sleepTime = sleepMs != null ? sleepMs : SLEEP_NEVER_MS
  const options = {
    events: onDeviceDisplayEvents,
    initialState: false,
  }
  const isIdle = useIdle(sleepTime, options)
  const scrollRef = React.useRef(null)
  const isScrolling = useScrolling(scrollRef)

  const TOUCH_SCREEN_STYLE = css`
    position: ${POSITION_RELATIVE};
    width: 100%;
    height: 100%;
    background-color: ${COLORS.white};
    overflow-y: ${OVERFLOW_AUTO};

    &::-webkit-scrollbar {
      display: ${isScrolling ? undefined : 'none'};
      width: 0.75rem;
    }

    &::-webkit-scrollbar-track {
      margin-top: 170px;
      margin-bottom: 170px;
    }

    &::-webkit-scrollbar-thumb {
      background: ${COLORS.darkBlack40};
      border-radius: 11px;
    }
  `

  return (
    <ApiHostProvider hostname="localhost">
      <Box width="100%">
        {Boolean(isIdle) ? (
          <SleepScreen />
        ) : (
          <ToasterOven>
            <Switch>
              {onDeviceDisplayRoutes.map(
                ({ Component, exact, path }: RouteProps) => {
                  return (
                    <Route key={path} exact={exact} path={path}>
                      <Box css={TOUCH_SCREEN_STYLE} ref={scrollRef}>
                        <ModalPortalRoot />
                        <Component />
                      </Box>
                    </Route>
                  )
                }
              )}
              <Redirect exact from="/" to={targetPath} />
            </Switch>
          </ToasterOven>
        )}
      </Box>
    </ApiHostProvider>
  )
}
