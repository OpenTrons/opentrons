import * as React from 'react'
import { useEstopQuery } from '@opentrons/react-api-client'
import {
  ALIGN_CENTER,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
} from '@opentrons/components'

import { DeviceDetailsDeckConfiguration } from '../../../organisms/DeviceDetailsDeckConfiguration'
import { RobotOverview } from '../../../organisms/Devices/RobotOverview'
import { InstrumentsAndModules } from '../../../organisms/Devices/InstrumentsAndModules'
import { RecentProtocolRuns } from '../../../organisms/Devices/RecentProtocolRuns'
import { EstopBanner } from '../../../organisms/Devices/EstopBanner'
import { DISENGAGED, useEstopContext } from '../../../organisms/EmergencyStop'
import { useIsOT3 } from '../../../organisms/Devices/hooks'
import { useFeatureFlag } from '../../../redux/config'

interface DeviceDetailsComponentProps {
  robotName: string
}

export function DeviceDetailsComponent({
  robotName,
}: DeviceDetailsComponentProps): JSX.Element {
  const isOT3 = useIsOT3(robotName)
  const { data: estopStatus, error: estopError } = useEstopQuery({
    enabled: isOT3,
  })
  const { isEmergencyStopModalDismissed } = useEstopContext()
  const enableDeckConfiguration = useFeatureFlag('enableDeckConfiguration')

  return (
    <Box
      minWidth="36rem"
      height="max-content"
      paddingX={SPACING.spacing16}
      paddingTop={SPACING.spacing16}
      paddingBottom={SPACING.spacing48}
    >
      {isOT3 &&
      estopStatus?.data.status !== DISENGAGED &&
      estopError == null &&
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
      {isOT3 && enableDeckConfiguration ? (
        <DeviceDetailsDeckConfiguration robotName={robotName} />
      ) : null}
      <RecentProtocolRuns robotName={robotName} />
    </Box>
  )
}
