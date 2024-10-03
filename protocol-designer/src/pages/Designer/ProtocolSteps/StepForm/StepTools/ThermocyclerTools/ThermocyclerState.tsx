import { useTranslation } from 'react-i18next'
import {
  Flex,
  DIRECTION_COLUMN,
  SPACING,
  StyledText,
} from '@opentrons/components'

import {
  ToggleExpandStepFormField,
  ToggleStepFormField,
} from '../../../../../../molecules'

import type { FormData } from '../../../../../../form-types'
import type { FieldPropsByName } from '../../types'

interface ThermocyclerStateProps {
  title: string
  formData: FormData
  propsForFields: FieldPropsByName
  isHold?: boolean
}

export function ThermocyclerState(props: ThermocyclerStateProps): JSX.Element {
  const { title, propsForFields, formData, isHold = false } = props
  const { i18n, t } = useTranslation(['application', 'form'])

  const {
    blockFieldActive,
    lidFieldActive,
    blockTempField,
    lidTempField,
    lidPositionField,
  } = isHold
    ? {
        blockFieldActive: 'blockIsActiveHold',
        lidFieldActive: 'lidIsActiveHold',
        blockTempField: 'blockTargetTempHold',
        lidTempField: 'lidTargetTempHold',
        lidPositionField: 'lidOpenHold',
      }
    : {
        blockFieldActive: 'blockIsActive',
        lidFieldActive: 'lidIsActive',
        blockTempField: 'blockTargetTemp',
        lidTempField: 'lidTargetTemp',
        lidPositionField: 'lidOpen',
      }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      padding={SPACING.spacing16}
    >
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {i18n.format(title, 'capitalize')}
        </StyledText>
      </Flex>
      <ToggleExpandStepFormField
        {...propsForFields[blockTempField]}
        toggleValue={propsForFields[blockFieldActive].value}
        toggleUpdateValue={propsForFields[blockFieldActive].updateValue}
        title={t('form:step_edit_form.field.thermocyclerState.block.engage')}
        fieldTitle={i18n.format(t('stepType.temperature'), 'capitalize')}
        units={t('units.degrees')}
        isSelected={formData[blockFieldActive] === true}
        onLabel={t('form:step_edit_form.field.heaterShaker.shaker.toggleOn')}
        offLabel={t('form:step_edit_form.field.heaterShaker.shaker.toggleOff')}
      />
      <ToggleExpandStepFormField
        {...propsForFields[lidTempField]}
        toggleValue={propsForFields[lidFieldActive].value}
        toggleUpdateValue={propsForFields[lidFieldActive].updateValue}
        title={t('form:step_edit_form.field.thermocyclerState.lid.engage')}
        fieldTitle={i18n.format(t('stepType.temperature'), 'capitalize')}
        units={t('units.degrees')}
        isSelected={formData[lidFieldActive] === true}
        onLabel={t(
          'form:step_edit_form.field.thermocyclerState.lidPosition.toggleOn'
        )}
        offLabel={t(
          'form:step_edit_form.field.thermocyclerState.lidPosition.toggleOff'
        )}
      />
      <ToggleStepFormField
        isDisabled={propsForFields[lidPositionField].disabled}
        title={t(
          'form:step_edit_form.field.thermocyclerState.lidPosition.label'
        )}
        isSelected={propsForFields[lidPositionField].value === true}
        onLabel={t(
          'form:step_edit_form.field.thermocyclerState.lidPosition.toggleOn'
        )}
        offLabel={t(
          'form:step_edit_form.field.thermocyclerState.lidPosition.toggleOff'
        )}
        toggleUpdateValue={propsForFields[lidPositionField].updateValue}
        toggleValue={propsForFields[lidPositionField].value}
        tooltipContent={
          propsForFields[lidPositionField].disabled
            ? propsForFields[lidPositionField].tooltipContent ?? null
            : null
        }
      />
    </Flex>
  )
}
