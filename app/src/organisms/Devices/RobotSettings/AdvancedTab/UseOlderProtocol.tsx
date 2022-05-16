import * as React from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  Box,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { StyledText } from '../../../../atoms/text'
import { ToggleButton } from '../../../../atoms/buttons'
import { updateSetting } from '../../../../redux/robot-settings'

import type { Dispatch } from '../../../../redux/types'
import type { RobotSettingsField } from '../../../../redux/robot-settings/types'
interface UseOlderProtocolProps {
  settings: RobotSettingsField | undefined
  robotName: string
}

export function UseOlderProtocol({
  settings,
  robotName,
}: UseOlderProtocolProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'disableFastProtocolUpload'

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginBottom={SPACING.spacing5}
    >
      <Box width="70%">
        <StyledText
          as="h3"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          paddingBottom={SPACING.spacing3}
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
        onClick={() => dispatch(updateSetting(robotName, id, !value))}
        id="RobotSettings_useOlderProtocolToggleButton"
      />
    </Flex>
  )
}
