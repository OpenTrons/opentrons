import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  COLORS,
  TYPOGRAPHY,
} from '@opentrons/components'
import { StatusLabel } from '../../atoms/StatusLabel'
import { StyledText } from '../../atoms/text'
import type { TemperatureStatus } from '../../redux/modules/api-types'

interface TemperatureModuleProps {
  moduleStatus: TemperatureStatus
  targetTemp: number | null
  currentTemp: number
}

export const TemperatureModuleData = (
  props: TemperatureModuleProps
): JSX.Element | null => {
  const { moduleStatus, targetTemp, currentTemp } = props
  const { t } = useTranslation('device_details')

  let backgroundColor: string = COLORS.grey35
  let iconColor: string = COLORS.grey50Enabled
  let textColor
  let pulse
  switch (moduleStatus) {
    case 'idle': {
      backgroundColor = COLORS.grey35
      iconColor = COLORS.grey50Enabled
      textColor = COLORS.darkBlackEnabled
      break
    }
    case 'holding at target': {
<<<<<<< HEAD
      backgroundColor = COLORS.blue30
      iconColor = COLORS.blue50
=======
      backgroundColor = COLORS.medBlue
      iconColor = COLORS.blueEnabled
>>>>>>> 2524ab95c98ff696e637a42d46ea6a893c63f735
      break
    }
    case 'cooling':
    case 'heating': {
<<<<<<< HEAD
      backgroundColor = COLORS.blue30
=======
      backgroundColor = COLORS.medBlue
>>>>>>> 2524ab95c98ff696e637a42d46ea6a893c63f735
      pulse = true
      break
    }
  }

  return (
    <>
      <StatusLabel
        status={moduleStatus}
        backgroundColor={backgroundColor}
        iconColor={iconColor}
        textColor={textColor}
        pulse={pulse}
      />
      <Flex
        fontSize={TYPOGRAPHY.fontSizeCaption}
        flexDirection={DIRECTION_COLUMN}
        data-testid="temp_module_data"
      >
        <StyledText marginBottom={SPACING.spacing2}>
          {t(targetTemp == null ? 'na_temp' : 'target_temp', {
            temp: targetTemp,
          })}
        </StyledText>
        <StyledText>{t('current_temp', { temp: currentTemp })}</StyledText>
      </Flex>
    </>
  )
}
