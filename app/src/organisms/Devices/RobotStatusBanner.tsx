import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  Flex,
  Icon,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  SIZE_1,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  COLORS,
} from '@opentrons/components'

import { TertiaryButton } from '../../atoms/buttons'
import { StyledText } from '../../atoms/text'
import { useCurrentRunId } from '../../organisms/ProtocolUpload/hooks'
import { useCurrentRunStatus } from '../../organisms/RunTimeControl/hooks'
import { useProtocolDetailsForRun } from './hooks'

import type { DiscoveredRobot } from '../../redux/discovery/types'

type RobotStatusBannerProps = Pick<DiscoveredRobot, 'name' | 'local'>

export function RobotStatusBanner(props: RobotStatusBannerProps): JSX.Element {
  const { name, local } = props
  const { t } = useTranslation(['devices_landing', 'run_details'])

  const currentRunId = useCurrentRunId()
  const currentRunStatus = useCurrentRunStatus()
  const { displayName } = useProtocolDetailsForRun(currentRunId)

  const RunningProtocolBanner = (): JSX.Element | null =>
    currentRunId != null ? (
      <Flex alignItems={ALIGN_CENTER}>
        <StyledText
          as="label"
          paddingRight={SPACING.spacing3}
          css={{ 'overflow-wrap': 'anywhere' }}
        >
          {`${displayName}; ${t(`run_details:status_${currentRunStatus}`)}`}
        </StyledText>
        <Link
          to={`/devices/${name}/protocol-runs/${currentRunId}/run-log`}
          id={`RobotStatusBanner_${name}_goToRun`}
        >
          <TertiaryButton>{t('go_to_run')}</TertiaryButton>
        </Link>
      </Flex>
    ) : null

  return (
    <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
      {/* robot_model can be seen in the health response, but only for "connectable" robots.
    Probably best to leave as "OT-2" for now */}
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText
          as="h6"
          color={COLORS.darkGreyEnabled}
          paddingBottom={SPACING.spacing1}
          id={`RobotStatusBanner_${name}_robotModel`}
        >
          OT-2
        </StyledText>
        <Flex alignItems={ALIGN_CENTER} paddingBottom={SPACING.spacing4}>
          <Flex alignItems={ALIGN_CENTER}>
            <StyledText
              as="h3"
              marginRight={SPACING.spacing3}
              id={`RobotStatusBanner_${name}_robotName`}
              css={{ 'overflow-wrap': 'anywhere' }}
            >
              {name}
            </StyledText>
            <Icon
              // local boolean corresponds to a wired usb connection
              name={local ? 'usb' : 'wifi'}
              size={SIZE_1}
              marginRight={SPACING.spacing3}
            />
          </Flex>
        </Flex>
      </Flex>
      <RunningProtocolBanner />
    </Flex>
  )
}
