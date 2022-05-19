import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { StatusLabel } from '../../../atoms/StatusLabel'
import {
  Flex,
  Text,
  TEXT_TRANSFORM_UPPERCASE,
  SPACING_2,
  FONT_SIZE_CAPTION,
  FONT_WEIGHT_REGULAR,
  DIRECTION_COLUMN,
  COLORS,
  SPACING,
} from '@opentrons/components'

import type { ThermocyclerStatus } from '../../../redux/modules/api-types'

interface ThermocyclerModuleProps {
  status: ThermocyclerStatus
  currentTemp: number | null
  targetTemp: number | null
  lidTemp: number | null
  lidTarget: number | null
}

const MODULE_STATUS_STYLING = css`
  display: grid;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 800px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

export const ThermocyclerModuleData = (
  props: ThermocyclerModuleProps
): JSX.Element | null => {
  const { status, currentTemp, targetTemp, lidTemp, lidTarget } = props
  const { t } = useTranslation('device_details')

  const getStatusLabelProps = (
    status: string | null
  ): { backgroundColor: string; iconColor: string; textColor: string } => {
    const StatusLabelProps = {
      backgroundColor: COLORS.medGrey,
      iconColor: COLORS.darkGrey,
      textColor: COLORS.bluePressed,
      pulse: false,
    }

    switch (status) {
      case 'idle': {
        StatusLabelProps.backgroundColor = COLORS.medGrey
        StatusLabelProps.iconColor = COLORS.darkGrey
        StatusLabelProps.textColor = COLORS.darkBlack
        break
      }
      case 'holding at target': {
        StatusLabelProps.backgroundColor = COLORS.medBlue
        StatusLabelProps.iconColor = COLORS.blue
        break
      }
      case 'cooling':
      case 'heating': {
        StatusLabelProps.backgroundColor = COLORS.medBlue
        StatusLabelProps.pulse = true
        break
      }
      case 'error': {
        StatusLabelProps.backgroundColor = COLORS.warningBg
        StatusLabelProps.iconColor = COLORS.warning
        StatusLabelProps.textColor = COLORS.warningText
      }
    }
    return StatusLabelProps
  }

  return (
    <Flex css={MODULE_STATUS_STYLING}>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        data-testid={`thermocycler_module_data_lid`}
      >
        <Text
          textTransform={TEXT_TRANSFORM_UPPERCASE}
          color={COLORS.darkGreyEnabled}
          fontWeight={FONT_WEIGHT_REGULAR}
          fontSize={FONT_SIZE_CAPTION}
          marginTop={SPACING_2}
          marginBottom={SPACING.spacing2}
        >
          {t('tc_lid')}
        </Text>
        <Text
          title="lid_target_temp"
          fontSize={FONT_SIZE_CAPTION}
          marginBottom={SPACING.spacing1}
        >
          {t(lidTarget == null ? 'na_temp' : 'target_temp', {
            temp: lidTarget,
          })}
        </Text>
        <Text title="lid_temp" fontSize={FONT_SIZE_CAPTION}>
          {t('current_temp', { temp: lidTemp })}
        </Text>
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        data-testid={`thermocycler_module_data_block`}
      >
        <Text
          textTransform={TEXT_TRANSFORM_UPPERCASE}
          color={COLORS.darkGreyEnabled}
          fontWeight={FONT_WEIGHT_REGULAR}
          fontSize={FONT_SIZE_CAPTION}
          marginTop={SPACING_2}
        >
          {t('tc_block')}
        </Text>
        <StatusLabel status={status} {...getStatusLabelProps(status)} />
        <Text
          title="tc_target_temp"
          fontSize={FONT_SIZE_CAPTION}
          marginBottom={SPACING.spacing1}
        >
          {t(targetTemp == null ? 'na_temp' : 'target_temp', {
            temp: targetTemp,
          })}
        </Text>
        <Text title="tc_current_temp" fontSize={FONT_SIZE_CAPTION}>
          {t('current_temp', { temp: currentTemp })}
        </Text>
      </Flex>
    </Flex>
  )
}
