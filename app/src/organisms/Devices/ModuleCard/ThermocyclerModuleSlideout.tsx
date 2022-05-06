import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  CELSIUS,
  getModuleDisplayName,
  TEMP_LID_MAX,
  TEMP_LID_MIN,
  TEMP_BLOCK_MAX,
  TEMP_MIN,
} from '@opentrons/shared-data'
import {
  useCreateCommandMutation,
  useCreateLiveCommandMutation,
} from '@opentrons/react-api-client'
import { Slideout } from '../../../atoms/Slideout'
import { InputField } from '../../../atoms/InputField'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  FONT_WEIGHT_REGULAR,
  SPACING,
  Text,
  TYPOGRAPHY,
} from '@opentrons/components'
import { PrimaryButton } from '../../../atoms/Buttons'

import type { ThermocyclerModule } from '../../../redux/modules/types'
import type {
  TCSetTargetBlockTemperatureCreateCommand,
  TCSetTargetLidTemperatureCreateCommand,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/module'

interface ThermocyclerModuleSlideoutProps {
  module: ThermocyclerModule
  onCloseClick: () => unknown
  isExpanded: boolean
  isSecondaryTemp?: boolean
  runId?: string
}

export const ThermocyclerModuleSlideout = (
  props: ThermocyclerModuleSlideoutProps
): JSX.Element | null => {
  const { module, onCloseClick, isExpanded, isSecondaryTemp, runId } = props
  const { t } = useTranslation('device_details')
  const [tempValue, setTempValue] = React.useState<string | null>(null)
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const { createCommand } = useCreateCommandMutation()
  const moduleName = getModuleDisplayName(module.moduleModel)
  const modulePart = isSecondaryTemp ? 'Lid' : 'Block'
  const tempRanges = getTCTempRange(isSecondaryTemp)

  let errorMessage
  if (isSecondaryTemp) {
    errorMessage =
      tempValue != null &&
      (parseInt(tempValue) < TEMP_LID_MIN || parseInt(tempValue) > TEMP_LID_MAX)
        ? t('input_out_of_range')
        : null
  } else {
    errorMessage =
      tempValue != null &&
      (parseInt(tempValue) < TEMP_MIN || parseInt(tempValue) > TEMP_BLOCK_MAX)
        ? t('input_out_of_range')
        : null
  }

  const handleSubmitTemp = (): void => {
    if (tempValue != null) {
      const saveLidCommand: TCSetTargetLidTemperatureCreateCommand = {
        commandType: 'thermocycler/setTargetLidTemperature',
        params: {
          moduleId: module.id,
          temperature: parseInt(tempValue),
        },
      }
      const saveBlockCommand: TCSetTargetBlockTemperatureCreateCommand = {
        commandType: 'thermocycler/setTargetBlockTemperature',
        params: {
          moduleId: module.id,
          temperature: parseInt(tempValue),
          //  TODO(jr, 3/17/22): add volume, which will be provided by PD protocols
        },
      }
      if (runId != null) {
        createCommand({
          runId: runId,
          command: isSecondaryTemp ? saveLidCommand : saveBlockCommand,
        }).catch((e: Error) => {
          console.error(
            `error setting module status with command type ${
              saveLidCommand.commandType ?? saveBlockCommand.commandType
            } and run id ${runId}: ${e.message}`
          )
        })
      } else {
        createLiveCommand({
          command: isSecondaryTemp ? saveLidCommand : saveBlockCommand,
        }).catch((e: Error) => {
          console.error(
            `error setting module status with command type ${
              saveLidCommand.commandType ?? saveBlockCommand.commandType
            }: ${e.message}`
          )
        })
      }
    }
    setTempValue(null)
  }

  return (
    <Slideout
      title={t('tc_set_temperature', { part: modulePart, name: moduleName })}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <PrimaryButton
          onClick={handleSubmitTemp}
          disabled={tempValue === null || errorMessage !== null}
          width="100%"
          data-testid={`ThermocyclerSlideout_btn_${module.serialNumber}`}
        >
          {t('confirm')}
        </PrimaryButton>
      }
    >
      <Text
        fontWeight={FONT_WEIGHT_REGULAR}
        fontSize={TYPOGRAPHY.fontSizeP}
        paddingTop={SPACING.spacing2}
        data-testid={`ThermocyclerSlideout_text_${module.serialNumber}`}
      >
        {t('tc_set_temperature_body', {
          part: modulePart,
          min: tempRanges.min,
          max: tempRanges.max,
        })}
      </Text>
      <Flex
        marginTop={SPACING.spacing4}
        flexDirection={DIRECTION_COLUMN}
        data-testid={`ThermocyclerSlideout_input_field_${module.serialNumber}`}
      >
        <Text
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          fontSize={TYPOGRAPHY.fontSizeH6}
          color={COLORS.darkGrey}
          paddingBottom={SPACING.spacing3}
        >
          {t(isSecondaryTemp ? 'set_lid_temperature' : 'set_block_temperature')}
        </Text>
        <InputField
          data-testid={`${module.moduleModel}_${isSecondaryTemp}`}
          id={`${module.moduleModel}_${isSecondaryTemp}`}
          autoFocus
          units={CELSIUS}
          value={tempValue}
          onChange={e => setTempValue(e.target.value)}
          type="number"
          caption={t('module_status_range', {
            min: tempRanges.min,
            max: tempRanges.max,
            unit: CELSIUS,
          })}
          error={errorMessage}
        />
      </Flex>
    </Slideout>
  )
}

interface TemperatureRanges {
  min: number
  max: number
}

const getTCTempRange = (isSecondaryTemp = false): TemperatureRanges => {
  if (isSecondaryTemp) {
    return { min: TEMP_LID_MIN, max: TEMP_LID_MAX }
  } else {
    return { min: TEMP_MIN, max: TEMP_BLOCK_MAX }
  }
}
