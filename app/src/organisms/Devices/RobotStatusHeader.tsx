import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useHistory } from 'react-router-dom'

import { useProtocolQuery, useRunQuery } from '@opentrons/react-api-client'
import { RUN_STATUS_IDLE } from '@opentrons/api-client'
import {
  Btn,
  Flex,
  Icon,
  useHoverTooltip,
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
  truncateString,
} from '@opentrons/components'

import { QuaternaryButton } from '../../atoms/buttons'
import { StyledText } from '../../atoms/text'
import { Tooltip } from '../../atoms/Tooltip'
import { useCurrentRunId } from '../../organisms/ProtocolUpload/hooks'
import { useCurrentRunStatus } from '../../organisms/RunTimeControl/hooks'

import type { StyleProps } from '@opentrons/components'
import type { DiscoveredRobot } from '../../redux/discovery/types'

type RobotStatusHeaderProps = StyleProps &
  Pick<DiscoveredRobot, 'name' | 'local'> & {
    robotModel: string | null
  }

export function RobotStatusHeader(props: RobotStatusHeaderProps): JSX.Element {
  const { name, local, robotModel, ...styleProps } = props
  const { t } = useTranslation([
    'devices_landing',
    'device_settings',
    'run_details',
  ])
  const history = useHistory()
  const [targetProps, tooltipProps] = useHoverTooltip()

  const currentRunId = useCurrentRunId()
  const currentRunStatus = useCurrentRunStatus()
  const { data: runRecord } = useRunQuery(currentRunId, { staleTime: Infinity })
  const protocolId = runRecord?.data?.protocolId ?? null
  const { data: protocolRecord } = useProtocolQuery(protocolId, {
    staleTime: Infinity,
  })
  const displayName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name

  const runningProtocolBanner: JSX.Element | null =
    currentRunId != null && currentRunStatus != null && displayName != null ? (
      <Flex alignItems={ALIGN_CENTER} onClick={e => e.stopPropagation()}>
        <StyledText
          as="label"
          paddingRight={SPACING.spacing8}
          overflowWrap="anywhere"
        >
          {`${truncateString(displayName, 80, 65)}; ${t(
            `run_details:status_${currentRunStatus}`
          )}`}
        </StyledText>
        <Link
          to={`/devices/${name}/protocol-runs/${currentRunId}/${
            currentRunStatus === RUN_STATUS_IDLE ? 'setup' : 'run-preview'
          }`}
          id={`RobotStatusHeader_${String(name)}_goToRun`}
        >
          <QuaternaryButton>{t('go_to_run')}</QuaternaryButton>
        </Link>
      </Flex>
    ) : null

  return (
    <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} {...styleProps}>
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText
          as="h6"
          color={COLORS.darkGreyEnabled}
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          paddingBottom={SPACING.spacing2}
          id={`RobotStatusHeader_${String(name)}_robotModel`}
        >
          {robotModel}
        </StyledText>
        <Flex alignItems={ALIGN_CENTER}>
          <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
            <StyledText
              as="h3"
              id={`RobotStatusHeader_${String(name)}_robotName`}
              overflowWrap="anywhere"
            >
              {name}
            </StyledText>
            <Btn
              {...targetProps}
              marginRight={SPACING.spacing8}
              onClick={() =>
                history.push(`/devices/${name}/robot-settings/networking`)
              }
            >
              <Icon
                // local boolean corresponds to a wired usb connection for OT-2
                // TODO(bh, 2022-10-19): for OT-3, determine what robot data looks like for wired usb and ethernet connections
                name={local != null && local ? 'usb' : 'wifi'}
                color={COLORS.darkGreyEnabled}
                size="1.25rem"
              />
            </Btn>
            <Tooltip tooltipProps={tooltipProps} width="auto">
              {local != null && local
                ? t('device_settings:wired_usb')
                : t('device_settings:wifi')}
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
      {runningProtocolBanner}
    </Flex>
  )
}
