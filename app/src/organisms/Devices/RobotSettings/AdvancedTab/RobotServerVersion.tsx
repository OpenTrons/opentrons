import * as React from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  Box,
  SPACING,
  TYPOGRAPHY,
  COLORS,
  Link,
  JUSTIFY_FLEX_END,
} from '@opentrons/components'
import { useRobot } from '../../hooks'
import { StyledText } from '../../../../atoms/text'
import { getRobotApiVersion } from '../../../../redux/discovery'
import { getBuildrootUpdateDisplayInfo } from '../../../../redux/buildroot'

import type { State } from '../../../../redux/types'
import { UpdateRobotBanner } from '../../../UpdateRobotBanner'

interface RobotServerVersionProps {
  robotName: string
}

const GITHUB_LINK =
  'https://github.com/Opentrons/opentrons/blob/edge/app-shell/build/release-notes.md'

export function RobotServerVersion({
  robotName,
}: RobotServerVersionProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const robot = useRobot(robotName)
  const { autoUpdateAction } = useSelector((state: State) => {
    return getBuildrootUpdateDisplayInfo(state, robotName)
  })
  const robotServerVersion =
    robot?.status != null ? getRobotApiVersion(robot) : null

  return (
    <>
      {autoUpdateAction !== 'reinstall' ? (
        <Box marginBottom={SPACING.spacing4} width="100%">
          <UpdateRobotBanner robotName={robotName} />
        </Box>
      ) : (
        // TODO: add reinstall option
        <Flex justifyContent={JUSTIFY_FLEX_END}>
          <StyledText as="label" color={COLORS.darkGreyEnabled}>
            {t('robot_server_versions_status')}
          </StyledText>
        </Flex>
      )}
      <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Box width="70%">
          <StyledText
            as="h3"
            css={TYPOGRAPHY.h3SemiBold}
            paddingBottom={SPACING.spacing3}
            id="AdvancedSettings_RobotServerVersion"
          >
            {t('robot_server_versions')}
          </StyledText>
          <StyledText as="p" paddingBottom={SPACING.spacing2}>
            {robotServerVersion != null
              ? `v${robotServerVersion}`
              : t('robot_settings_advanced_unknown')}
          </StyledText>
          <StyledText as="p">
            {t('robot_server_versions_description')}
            <Link
              external
              href={GITHUB_LINK}
              id="AdvancedSettings_GitHubLink"
            >{` ${t('github')}`}</Link>
          </StyledText>
        </Box>
      </Flex>
    </>
  )
}
