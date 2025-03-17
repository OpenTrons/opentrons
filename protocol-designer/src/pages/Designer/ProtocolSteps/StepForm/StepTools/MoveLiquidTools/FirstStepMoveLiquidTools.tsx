import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { Flex, Divider, DIRECTION_COLUMN, SPACING } from '@opentrons/components'
import {
  getAdditionalEquipmentEntities,
  getLabwareEntities,
  getPipetteEntities,
} from '../../../../../../step-forms/selectors'
import { getFormErrorsMappedToField, getFormLevelError } from '../../utils'
import {
  getEnablePartialTipSupport,
  getEnableReturnTip,
} from '../../../../../../feature-flags/selectors'

import {
  ChangeTipField,
  DropTipField,
  LabwareField,
  PartialTipField,
  PathField,
  PickUpTipField,
  PipetteField,
  TiprackField,
  TipWellSelectionField,
  VolumeField,
  WellSelectionField,
} from '../../PipetteFields'

import type { FieldPropsByName } from '../../types'
import type { FormData } from '../../../../../../form-types'
import type { StepFormErrors } from '../../../../../../steplist'

interface FirstStepMoveLiquidToolsProps {
  propsForFields: FieldPropsByName
  formData: FormData
  visibleFormErrors: StepFormErrors
}

export function FirstStepMoveLiquidTools({
  propsForFields,
  formData,
  visibleFormErrors,
}: FirstStepMoveLiquidToolsProps): JSX.Element {
  const { t } = useTranslation('protocol_steps')
  const labwares = useSelector(getLabwareEntities)
  const pipettes = useSelector(getPipetteEntities)
  const enablePartialTip = useSelector(getEnablePartialTipSupport)
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const enableReturnTip = useSelector(getEnableReturnTip)

  const { pipette, tipRack } = propsForFields
  const is96Channel =
    pipette.value != null && pipettes[String(pipette.value)].name === 'p1000_96'
  const is8Channel =
    propsForFields.pipette.value != null &&
    pipettes[String(propsForFields.pipette.value)].spec.channels === 8
  const userSelectedDropTipLocation =
    labwares[String(propsForFields.dropTip_location.value)] != null
  const userSelectedPickUpTipLocation =
    labwares[String(propsForFields.pickUpTip_location.value)] != null
  const isDisposalLocation =
    additionalEquipmentEntities[String(propsForFields.dispense_labware.value)]
      ?.name === 'wasteChute' ||
    additionalEquipmentEntities[String(propsForFields.dispense_labware.value)]
      ?.name === 'trashBin'
  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      paddingY={SPACING.spacing16}
    >
      <PipetteField {...propsForFields.pipette} />
      {propsForFields.pipette.value != null &&
      (is96Channel || (is8Channel && enablePartialTip)) ? (
        <>
          <Divider marginY="0" />
          <PartialTipField
            {...propsForFields.nozzles}
            pipetteSpecs={pipettes[String(propsForFields.pipette.value)]?.spec}
          />
        </>
      ) : null}
      <Divider marginY="0" />
      <TiprackField {...tipRack} pipetteId={pipette.value} />
      <Divider marginY="0" />
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
        <LabwareField
          {...propsForFields.aspirate_labware}
          errorToShow={getFormLevelError(
            'aspirate_labware',
            mappedErrorsToField
          )}
        />
        <WellSelectionField
          {...propsForFields.aspirate_wells}
          labwareId={
            typeof propsForFields.aspirate_labware.value === 'string'
              ? propsForFields.aspirate_labware.value
              : null
          }
          pipetteId={formData.pipette}
          nozzles={
            typeof propsForFields.nozzles.value === 'string'
              ? propsForFields.nozzles.value
              : null
          }
          hasFormError={
            visibleFormErrors?.some(error =>
              error.dependentFields.includes('aspirate_wells')
            ) ?? false
          }
          errorToShow={getFormLevelError('aspirate_wells', mappedErrorsToField)}
        />
      </Flex>
      <Divider marginY="0" />
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
        <LabwareField
          {...propsForFields.dispense_labware}
          errorToShow={getFormLevelError(
            'dispense_labware',
            mappedErrorsToField
          )}
        />
        {isDisposalLocation ? null : (
          <WellSelectionField
            {...propsForFields.dispense_wells}
            labwareId={String(propsForFields.dispense_labware.value)}
            pipetteId={formData.pipette}
            nozzles={
              typeof propsForFields.nozzles.value === 'string'
                ? propsForFields.nozzles.value
                : null
            }
            hasFormError={
              visibleFormErrors?.some(error =>
                error.dependentFields.includes('dispense_wells')
              ) ?? false
            }
            errorToShow={getFormLevelError(
              'dispense_wells',
              mappedErrorsToField
            )}
          />
        )}
      </Flex>
      <Divider marginY="0" />
      <VolumeField
        {...propsForFields.volume}
        errorToShow={getFormLevelError('volume', mappedErrorsToField)}
      />
      <Divider marginY="0" />
      <PathField
        {...propsForFields.path}
        aspirate_airGap_checkbox={formData.aspirate_airGap_checkbox}
        aspirate_airGap_volume={formData.aspirate_airGap_volume}
        aspirate_wells={formData.aspirate_wells}
        changeTip={formData.changeTip}
        dispense_wells={formData.dispense_wells}
        pipette={formData.pipette}
        volume={formData.volume}
        tipRack={formData.tipRack}
        isDisposalLocation={isDisposalLocation}
        title={t('pipette_path')}
      />
      <Divider marginY="0" />
      <ChangeTipField
        {...propsForFields.changeTip}
        aspirateWells={formData.aspirate_wells}
        dispenseWells={formData.dispense_wells}
        path={formData.path}
        stepType={formData.stepType}
        isDisposalLocation={isDisposalLocation}
        tooltipContent={null}
      />
      {enableReturnTip ? (
        <>
          <Divider marginY="0" />
          <PickUpTipField {...propsForFields.pickUpTip_location} />
          {userSelectedPickUpTipLocation ? (
            <>
              <TipWellSelectionField
                {...propsForFields.pickUpTip_wellNames}
                nozzles={
                  typeof propsForFields.nozzles.value === 'string'
                    ? propsForFields.nozzles.value
                    : null
                }
                labwareId={propsForFields.pickUpTip_location.value}
                pipetteId={propsForFields.pipette.value}
              />
            </>
          ) : null}
        </>
      ) : null}
      <Divider marginY="0" />
      <DropTipField
        {...propsForFields.dropTip_location}
        tooltipContent={null}
      />
      {userSelectedDropTipLocation && enableReturnTip ? (
        <>
          <Divider marginY="0" />
          <TipWellSelectionField
            {...propsForFields.dropTip_wellNames}
            nozzles={
              typeof propsForFields.nozzles.value === 'string'
                ? propsForFields.nozzles.value
                : null
            }
            labwareId={propsForFields.dropTip_location.value}
            pipetteId={propsForFields.pipette.value}
          />
        </>
      ) : null}
    </Flex>
  )
}
