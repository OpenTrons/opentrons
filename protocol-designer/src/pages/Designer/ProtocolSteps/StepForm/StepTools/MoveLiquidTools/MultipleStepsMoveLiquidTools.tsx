import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Divider,
  Flex,
  Icon,
  ListItem,
  SPACING,
  StyledText,
  Tabs,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import { getTrashOrLabware } from '@opentrons/step-generation'

import {
  BlowoutLocationField,
  BlowoutOffsetField,
  DisposalField,
  FlowRateField,
  PositionField,
  WellsOrderField,
} from '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/PipetteFields'
import { getEnableLiquidClasses } from '/protocol-designer/feature-flags/selectors'
import {
  CheckboxExpandStepFormField,
  InputStepFormField,
  ToggleStepFormField,
} from '/protocol-designer/molecules'
import {
  getAdditionalEquipmentEntities,
  getLabwareEntities,
} from '/protocol-designer/step-forms/selectors'
import {
  getBlowoutLocationOptionsForForm,
  getFormErrorsMappedToField,
  getFormLevelError,
  getLabwareFieldForPositioningField,
} from '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/utils'

import type { Dispatch, SetStateAction } from 'react'
import type {
  FieldPropsByName,
  LiquidHandlingTab,
} from '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/types'
import type { FormData, StepFieldName } from '/protocol-designer/form-types'
import type { StepFormErrors } from '/protocol-designer/steplist'

const addPrefix = (prefix: string) => (fieldName: string): StepFieldName =>
  `${prefix}_${fieldName}`

interface MultipleStepsMoveLiquidToolsProps {
  propsForFields: FieldPropsByName
  formData: FormData
  tab: LiquidHandlingTab
  setTab: Dispatch<SetStateAction<LiquidHandlingTab>>
  setShowFormErrors?: Dispatch<SetStateAction<boolean>>
  visibleFormErrors: StepFormErrors
}

export const MultipleStepsMoveLiquidTools = ({
  propsForFields,
  formData,
  tab,
  setTab,
  setShowFormErrors,
  visibleFormErrors,
}: MultipleStepsMoveLiquidToolsProps): JSX.Element => {
  const { t, i18n } = useTranslation(['protocol_steps', 'form', 'tooltip'])
  const [targetProps, tooltipProps] = useHoverTooltip()
  const labwares = useSelector(getLabwareEntities)
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)

  const addFieldNamePrefix = addPrefix(tab)
  const isWasteChuteSelected =
    propsForFields.dispense_labware?.value != null
      ? additionalEquipmentEntities[
          String(propsForFields.dispense_labware.value)
        ]?.name === 'wasteChute'
      : false
  const isTrashBinSelected =
    propsForFields.dispense_labware?.value != null
      ? additionalEquipmentEntities[
          String(propsForFields.dispense_labware.value)
        ]?.name === 'trashBin'
      : false
  const destinationLabwareType =
    formData.dispense_labware != null
      ? getTrashOrLabware(
          labwares,
          additionalEquipmentEntities,
          formData.dispense_labware as string
        )
      : null
  const isDestinationTrash =
    destinationLabwareType != null
      ? ['trashBin', 'wasteChute'].includes(destinationLabwareType)
      : false
  const dispenseMixDisabledTooltipText = t(
    `tooltip:step_fields.moveLiquid.disabled.${
      isDestinationTrash ? 'dispense_mix_checkbox' : 'dispense_mix_checkbox_2'
    }`
  )

  const aspirateTab = {
    text: t('aspirate'),
    isActive: tab === 'aspirate',
    onClick: () => {
      setTab('aspirate')
      setShowFormErrors?.(false)
    },
  }
  const dispenseTab = {
    text: t('dispense'),
    isActive: tab === 'dispense',
    onClick: () => {
      setTab('dispense')
      setShowFormErrors?.(false)
    },
  }

  const hideWellOrderField =
    tab === 'dispense' && (isWasteChuteSelected || isTrashBinSelected)

  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

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
        key={`${addFieldNamePrefix('flowRate')}_flowRateField`}
        {...propsForFields[addFieldNamePrefix('flowRate')]}
        pipetteId={formData.pipette}
        flowRateType={tab}
        volume={propsForFields.volume?.value ?? 0}
        tiprack={propsForFields.tipRack.value}
        showTooltip={false}
      />
      <Divider marginY="0" />
      {hideWellOrderField ? null : (
        <WellsOrderField
          prefix={tab}
          updateFirstWellOrder={
            propsForFields[addFieldNamePrefix('wellOrder_first')].updateValue
          }
          updateSecondWellOrder={
            propsForFields[addFieldNamePrefix('wellOrder_second')].updateValue
          }
          firstValue={formData[addFieldNamePrefix('wellOrder_first')]}
          secondValue={formData[addFieldNamePrefix('wellOrder_second')]}
          firstName={addFieldNamePrefix('wellOrder_first')}
          secondName={addFieldNamePrefix('wellOrder_second')}
        />
      )}
      <Divider marginY="0" />
      <PositionField
        prefix={tab}
        propsForFields={propsForFields}
        zField={`${tab}_mmFromBottom`}
        xField={`${tab}_x_position`}
        yField={`${tab}_y_position`}
        labwareId={
          formData[
            getLabwareFieldForPositioningField(
              addFieldNamePrefix('mmFromBottom')
            )
          ]
        }
      />
      {enableLiquidClasses ? (
        <>
          <Divider marginY="0" />
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            padding={`0 ${SPACING.spacing16}`}
          >
            <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
              >
                {t('protocol_steps:submerge')}
              </StyledText>
              <Flex {...targetProps}>
                <Icon
                  name="information"
                  size="1rem"
                  color={COLORS.grey60}
                  data-testid="information_icon"
                />
              </Flex>
              <Tooltip tooltipProps={tooltipProps}>
                {t(`tooltip:step_fields.defaults.${tab}_submerge`)}
              </Tooltip>
            </Flex>
            <ListItem type="noActive">
              <Flex
                padding={SPACING.spacing12}
                width="100%"
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing8}
              >
                <InputStepFormField
                  showTooltip={false}
                  padding="0"
                  title={t('protocol_steps:submerge_speed')}
                  {...propsForFields[`${tab}_submerge_speed`]}
                  units={t('application:units.millimeterPerSec')}
                  errorToShow={getFormLevelError(
                    `${tab}_submerge_speed`,
                    mappedErrorsToField
                  )}
                />
                <InputStepFormField
                  showTooltip={false}
                  padding="0"
                  title={t('protocol_steps:delay_duration')}
                  {...propsForFields[`${tab}_submerge_delay_seconds`]}
                  units={t('application:units.seconds')}
                  errorToShow={getFormLevelError(
                    `${tab}_submerge_delay_seconds`,
                    mappedErrorsToField
                  )}
                />
              </Flex>
            </ListItem>
          </Flex>
        </>
      ) : null}
      <Divider marginY="0" />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        padding={`0 ${SPACING.spacing16}`}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('protocol_steps:advanced_settings')}
        </StyledText>
        {tab === 'aspirate' ? (
          <ToggleStepFormField
            title={i18n.format(
              t('form:step_edit_form.field.preWetTip.label'),
              'capitalize'
            )}
            toggleValue={propsForFields.preWetTip.value}
            isSelected={propsForFields.preWetTip.value === true}
            toggleUpdateValue={propsForFields.preWetTip.updateValue}
            toggleElement="checkbox"
            tooltipContent={propsForFields.preWetTip.tooltipContent ?? null}
          />
        ) : null}
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.mix.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_mix_checkbox`].value}
          isChecked={propsForFields[`${tab}_mix_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_mix_checkbox`].updateValue
          }
          tooltipText={
            tab === 'dispense'
              ? dispenseMixDisabledTooltipText
              : propsForFields.aspirate_mix_checkbox.tooltipContent
          }
          disabled={
            tab === 'dispense'
              ? isDestinationTrash || formData.path === 'multiDispense'
              : formData.path === 'multiAspirate'
          }
        >
          {formData[`${tab}_mix_checkbox`] === true ? (
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing6}
              width="100^"
            >
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:mix_volume')}
                {...propsForFields[`${tab}_mix_volume`]}
                units={t('application:units.microliter')}
                errorToShow={getFormLevelError(
                  `${tab}_mix_volume`,
                  mappedErrorsToField
                )}
              />
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:mix_times')}
                {...propsForFields[`${tab}_mix_times`]}
                units={t('application:units.times')}
                errorToShow={getFormLevelError(
                  `${tab}_mix_times`,
                  mappedErrorsToField
                )}
              />
            </Flex>
          ) : null}
        </CheckboxExpandStepFormField>
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.delay.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_delay_checkbox`].value}
          isChecked={propsForFields[`${tab}_delay_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_delay_checkbox`].updateValue
          }
          tooltipText={propsForFields[`${tab}_delay_checkbox`].tooltipContent}
        >
          {formData[`${tab}_delay_checkbox`] === true ? (
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing6}
              width="100^"
            >
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:delay_duration')}
                {...propsForFields[`${tab}_delay_seconds`]}
                units={t('application:units.seconds')}
                errorToShow={getFormLevelError(
                  `${tab}_delay_seconds`,
                  mappedErrorsToField
                )}
              />
              <PositionField
                prefix={tab}
                propsForFields={propsForFields}
                zField={`${tab}_delay_mmFromBottom`}
                labwareId={
                  formData[
                    getLabwareFieldForPositioningField(
                      addFieldNamePrefix('delay_mmFromBottom')
                    )
                  ]
                }
              />
            </Flex>
          ) : null}
        </CheckboxExpandStepFormField>
        {tab === 'dispense' ? (
          <CheckboxExpandStepFormField
            title={i18n.format(
              t('form:step_edit_form.field.blowout.label'),
              'capitalize'
            )}
            checkboxValue={propsForFields.blowout_checkbox.value}
            isChecked={propsForFields.blowout_checkbox.value === true}
            checkboxUpdateValue={propsForFields.blowout_checkbox.updateValue}
            tooltipText={propsForFields.blowout_checkbox.tooltipContent}
            disabled={
              formData.path === 'multiDispense' &&
              formData.disposalVolume_checkbox
            }
          >
            {formData.blowout_checkbox === true ? (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing6}
                width="100^"
              >
                <BlowoutLocationField
                  {...propsForFields.blowout_location}
                  options={getBlowoutLocationOptionsForForm({
                    path: formData.path,
                    stepType: formData.stepType,
                  })}
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
                  sourceLabwareId={propsForFields.aspirate_labware.value}
                  destLabwareId={propsForFields.dispense_labware.value}
                  blowoutLabwareId={propsForFields.blowout_location.value}
                />
              </Flex>
            ) : null}
          </CheckboxExpandStepFormField>
        ) : null}
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.touchTip.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_touchTip_checkbox`].value}
          isChecked={propsForFields[`${tab}_touchTip_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_touchTip_checkbox`].updateValue
          }
          tooltipText={
            propsForFields[`${tab}_touchTip_checkbox`].tooltipContent
          }
        >
          {formData[`${tab}_touchTip_checkbox`] === true ? (
            <PositionField
              prefix={tab}
              propsForFields={propsForFields}
              zField={`${tab}_touchTip_mmFromTop`}
              labwareId={
                formData[
                  getLabwareFieldForPositioningField(
                    addFieldNamePrefix('touchTip_mmFromTop')
                  )
                ]
              }
            />
          ) : null}
        </CheckboxExpandStepFormField>
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.airGap.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_airGap_checkbox`].value}
          isChecked={propsForFields[`${tab}_airGap_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_airGap_checkbox`].updateValue
          }
          tooltipText={propsForFields[`${tab}_airGap_checkbox`].tooltipContent}
        >
          {formData[`${tab}_airGap_checkbox`] === true ? (
            <InputStepFormField
              showTooltip={false}
              padding="0"
              title={t('protocol_steps:air_gap_volume')}
              {...propsForFields[`${tab}_airGap_volume`]}
              units={t('application:units.microliter')}
              errorToShow={getFormLevelError(
                `${tab}_airGap_volume`,
                mappedErrorsToField
              )}
            />
          ) : null}
        </CheckboxExpandStepFormField>
        {formData.path === 'multiDispense' && tab === 'dispense' && (
          <DisposalField
            aspirate_airGap_checkbox={formData.aspirate_airGap_checkbox}
            aspirate_airGap_volume={formData.aspirate_airGap_volume}
            path={formData.path}
            pipette={formData.pipette}
            propsForFields={propsForFields}
            stepType={formData.stepType}
            volume={formData.volume}
          />
        )}
      </Flex>
    </Flex>
  )
}
