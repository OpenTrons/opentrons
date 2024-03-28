import * as React from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ToggleButton } from '../../../../atoms/buttons'
import { updateSetting } from '../../../../redux/robot-settings'

import type { Dispatch } from '../../../../redux/types'
import type { RobotSettingsField } from '../../../../redux/robot-settings/types'
interface UseOlderProtocolProps {
  settings: RobotSettingsField | undefined
  robotName: string
  isRobotBusy: boolean
}

export function UseOlderProtocol({
  settings,
  robotName,
  isRobotBusy,
}: UseOlderProtocolProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'disableFastProtocolUpload'

  const handleClick: React.MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginBottom={SPACING.spacing16}
    >
      <Box width="70%">
        <StyledText
          css={TYPOGRAPHY.pSemiBold}
          paddingBottom={SPACING.spacing4}
          id="AdvancedSettings_showLink"
        >
          {t('use_older_protocol_analysis_method')}
        </StyledText>
        <StyledText as="p">
          {t('use_older_protocol_analysis_method_description')}
        </StyledText>
      </Box>
      <ToggleButton
        label="use_older_protocol_analysis_method"
        toggledOn={settings?.value === true}
        onClick={handleClick}
        id="RobotSettings_useOlderProtocolToggleButton"
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
