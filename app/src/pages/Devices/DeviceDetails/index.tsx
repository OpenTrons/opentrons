import * as React from 'react'
import { useSelector } from 'react-redux'
import { Redirect, useParams } from 'react-router-dom'

import {
  Box,
  Flex,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  SPACING,
  COLORS,
} from '@opentrons/components'
import { ApiHostProvider, useEstopQuery } from '@opentrons/react-api-client'

import { useRobot, useSyncRobotClock } from '../../../organisms/Devices/hooks'
import { InstrumentsAndModules } from '../../../organisms/Devices/InstrumentsAndModules'
import { RecentProtocolRuns } from '../../../organisms/Devices/RecentProtocolRuns'
import { RobotOverview } from '../../../organisms/Devices/RobotOverview'
import { EstopBanner } from '../../../organisms/Devices/EstopBanner'
import { getScanning, OPENTRONS_USB } from '../../../redux/discovery'
import { appShellRequestor } from '../../../redux/shell/remote'
import { DISENGAGED, useEstopContext } from '../../../organisms/EmergencyStop'

import type { DesktopRouteParams } from '../../../App/types'

const ESTOP_STATUS_REFETCH_INTERVAL = 10000

export function DeviceDetails(): JSX.Element | null {
  const { robotName } = useParams<DesktopRouteParams>()
  const robot = useRobot(robotName)
  const isScanning = useSelector(getScanning)

  useSyncRobotClock(robotName)

  if (robot == null && isScanning) return null

  return robot != null ? (
    // TODO(bh, 2023-05-31): substitute wrapped AppApiHostProvider that registers/authorizes
    <ApiHostProvider
      key={robot.name}
      hostname={robot.ip ?? null}
      requestor={robot?.ip === OPENTRONS_USB ? appShellRequestor : undefined}
    >
      <RenderDeviceDetails robotName={robotName} />
    </ApiHostProvider>
  ) : (
    <Redirect to="/devices" />
  )
}

interface RenderDeviceDetailsProps {
  robotName: string
}

function RenderDeviceDetails({
  robotName,
}: RenderDeviceDetailsProps): JSX.Element {
  const { data: estopStatus } = useEstopQuery({
    refetchInterval: ESTOP_STATUS_REFETCH_INTERVAL,
  })
  const { isEmergencyStopModalDismissed } = useEstopContext()

  return (
    <Box
      minWidth="36rem"
      height="max-content"
      paddingX={SPACING.spacing16}
      paddingTop={SPACING.spacing16}
      paddingBottom={SPACING.spacing48}
    >
      {estopStatus?.data.status !== DISENGAGED &&
      isEmergencyStopModalDismissed ? (
        <Flex marginBottom={SPACING.spacing16}>
          <EstopBanner status={estopStatus?.data.status} />
        </Flex>
      ) : null}
      <Flex
        alignItems={ALIGN_CENTER}
        backgroundColor={COLORS.white}
        border={`1px solid ${String(COLORS.medGreyEnabled)}`}
        borderRadius="3px"
        flexDirection={DIRECTION_COLUMN}
        marginBottom={SPACING.spacing16}
        paddingX={SPACING.spacing16}
        paddingBottom={SPACING.spacing4}
        width="100%"
      >
        <RobotOverview robotName={robotName} />
        <InstrumentsAndModules robotName={robotName} />
      </Flex>
      <RecentProtocolRuns robotName={robotName} />
    </Box>
  )
}
