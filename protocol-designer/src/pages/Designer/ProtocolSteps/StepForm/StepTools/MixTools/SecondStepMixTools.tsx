import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Divider,
  Flex,
  SPACING,
  StyledText,
  Tabs,
} from '@opentrons/components'

import {
  BlowoutLocationField,
  BlowoutOffsetField,
  FlowRateField,
  PositionField,
  WellsOrderField,
} from '../../PipetteFields'

import {
  CheckboxExpandStepFormField,
  InputStepFormField,
} from '../../../../../../components/molecules'
import {
  getBlowoutLocationOptionsForForm,
  getFormLevelError,
  getLabwareFieldForPositioningField,
} from '../../utils'

import type { Dispatch, SetStateAction } from 'react'
import type { FieldPropsByName, LiquidHandlingTab } from '../../types'
import type { ErrorMappedToField } from '../../utils'
import type { FormData } from '../../../../../../form-types'

interface SecondStepMixToolsProps {
  propsForFields: FieldPropsByName
  formData: FormData
  mappedErrorsToField: ErrorMappedToField
  tab: LiquidHandlingTab
  setTab: Dispatch<SetStateAction<LiquidHandlingTab>>
}

// ToDo (kk:03/24/2025) component name might be changed
export function SecondStepMixTools({
  propsForFields,
  formData,
  mappedErrorsToField,
  tab,
  setTab,
}: SecondStepMixToolsProps): JSX.Element {
  const { t, i18n } = useTranslation(['application', 'form'])

  const aspirateTab = {
    text: i18n.format(t('aspirate'), 'capitalize'),
    isActive: tab === 'aspirate',
    onClick: () => {
      setTab('aspirate')
    },
  }
  const dispenseTab = {
    text: i18n.format(t('dispense'), 'capitalize'),

    isActive: tab === 'dispense',
    onClick: () => {
      setTab('dispense')
    },
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="100%"
      paddingY={SPACING.spacing16}
      gridGap={SPACING.spacing12}
    >
      <Flex padding={`0 ${SPACING.spacing16}`}>
        <Tabs tabs={[aspirateTab, dispenseTab]} />
      </Flex>
      <Divider marginY="0" />
      <FlowRateField
        key={`${tab}_flowRate`}
        {...propsForFields[`${tab}_flowRate`]}
        pipetteId={formData.pipette}
        flowRateType={tab}
        volume={propsForFields.volume?.value ?? 0}
        tiprack={propsForFields.tipRack.value}
      />
      <Divider marginY="0" />
      {tab === 'aspirate' ? (
        <>
          <WellsOrderField
            prefix={tab}
            updateFirstWellOrder={
              propsForFields.mix_wellOrder_first.updateValue
            }
            updateSecondWellOrder={
              propsForFields.mix_wellOrder_second.updateValue
            }
            firstValue={formData.mix_wellOrder_first}
            secondValue={formData.mix_wellOrder_second}
            firstName="mix_wellOrder_first"
            secondName="mix_wellOrder_second"
          />
          <Divider marginY="0" />
          <PositionField
            prefix="mix"
            propsForFields={propsForFields}
            zField="mix_mmFromBottom"
            xField="mix_x_position"
            yField="mix_y_position"
            labwareId={
              formData[getLabwareFieldForPositioningField('mix_mmFromBottom')]
            }
          />
          <Divider marginY="0" />
        </>
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`0 ${SPACING.spacing16}`}
        gridGap={SPACING.spacing8}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('protocol_steps:advanced_settings')}
        </StyledText>
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.delay.label'),
            'capitalize'
          )}
          testId="delay_checkbox"
          checkboxValue={propsForFields[`${tab}_delay_checkbox`].value}
          isChecked={propsForFields[`${tab}_delay_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_delay_checkbox`].updateValue
          }
          tooltipText={
            propsForFields[`${tab}_delay_checkbox`].tooltipContent ?? null
          }
        >
          {formData[`${tab}_delay_checkbox`] === true ? (
            <InputStepFormField
              showTooltip={false}
              padding="0"
              title={t('protocol_steps:delay_duration')}
              {...propsForFields[`${tab}_delay_seconds`]}
              units={t('application:units.seconds')}
              errorToShow={getFormLevelError(
                `${tab}_delay_checkbox`,
                mappedErrorsToField
              )}
            />
          ) : null}
        </CheckboxExpandStepFormField>
        {tab === 'dispense' ? (
          <>
            <CheckboxExpandStepFormField
              title={i18n.format(
                t('form:step_edit_form.field.blowout.label'),
                'capitalize'
              )}
              testId="blowout_checkbox"
              checkboxValue={propsForFields.blowout_checkbox.value}
              isChecked={propsForFields.blowout_checkbox.value === true}
              checkboxUpdateValue={propsForFields.blowout_checkbox.updateValue}
              tooltipText={
                propsForFields.blowout_checkbox.tooltipContent ?? null
              }
            >
              {formData.blowout_checkbox === true ? (
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing6}
                >
                  <BlowoutLocationField
                    {...propsForFields.blowout_location}
                    options={getBlowoutLocationOptionsForForm({
                      stepType: formData.stepType,
                    })}
                    errorToShow={getFormLevelError(
                      'blowout_location',
                      mappedErrorsToField
                    )}
                    padding="0"
                  />
                  <FlowRateField
                    key="blowout_flowRate"
                    {...propsForFields.blowout_flowRate}
                    pipetteId={formData.pipette}
                    flowRateType="blowout"
                    volume={propsForFields.volume?.value ?? 0}
                    tiprack={propsForFields.tipRack.value}
                    padding="0"
                  />
                  <BlowoutOffsetField
                    {...propsForFields.blowout_z_offset}
                    destLabwareId={propsForFields.labware.value}
                    blowoutLabwareId={propsForFields.blowout_location.value}
                  />
                </Flex>
              ) : null}
            </CheckboxExpandStepFormField>
            <CheckboxExpandStepFormField
              title={i18n.format(
                t('form:step_edit_form.field.touchTip.label'),
                'capitalize'
              )}
              testId="touchTip_checkbox"
              checkboxValue={propsForFields.mix_touchTip_checkbox.value}
              isChecked={propsForFields.mix_touchTip_checkbox.value === true}
              checkboxUpdateValue={
                propsForFields.mix_touchTip_checkbox.updateValue
              }
              tooltipText={
                propsForFields.mix_touchTip_checkbox.tooltipContent ?? null
              }
            >
              {formData.mix_touchTip_checkbox === true ? (
                <PositionField
                  prefix={tab}
                  propsForFields={propsForFields}
                  zField="mix_touchTip_mmFromTop"
                  labwareId={
                    formData[
                      getLabwareFieldForPositioningField(
                        'mix_touchTip_mmFromTop'
                      )
                    ]
                  }
                />
              ) : null}
            </CheckboxExpandStepFormField>
          </>
        ) : null}
      </Flex>
    </Flex>
  )
}
