import { useTranslation } from 'react-i18next'
import { DIRECTION_COLUMN, Divider, Flex, SPACING } from '@opentrons/components'

import { InputStepFormField } from '../../../../../../components/molecules'
import {
  ChangeTipField,
  DropTipField,
  LabwareField,
  PartialTipField,
  PickUpTipField,
  PipetteField,
  TiprackField,
  TipWellSelectionField,
  VolumeField,
  WellSelectionField,
} from '../../PipetteFields'

import { getFormLevelError } from '../../utils'

import type { PipetteEntities } from '@opentrons/step-generation'
import type { FieldPropsByName } from '../../types'
import type { ErrorMappedToField } from '../../utils'
import type { FormData } from '../../../../../../form-types'
import type { StepFormErrors } from '../../../../../../steplist'

interface MixToolFirstStepProps {
  propsForFields: FieldPropsByName
  formData: FormData
  enablePartialTip: boolean
  pipettes: PipetteEntities
  mappedErrorsToField: ErrorMappedToField
  visibleFormErrors: StepFormErrors
  enableReturnTip: boolean
  userSelectedPickUpTipLocation: boolean
  userSelectedDropTipLocation: boolean
}

export function MixToolsFirstStep({
  propsForFields,
  formData,
  enablePartialTip,
  pipettes,
  mappedErrorsToField,
  visibleFormErrors,
  enableReturnTip,
  userSelectedPickUpTipLocation,
  userSelectedDropTipLocation,
}: MixToolFirstStepProps): JSX.Element {
  const { t } = useTranslation(['application', 'form'])
  const is96Channel =
    propsForFields.pipette.value != null &&
    pipettes[String(propsForFields.pipette.value)].spec.channels === 96
  const is8Channel =
    propsForFields.pipette.value != null &&
    pipettes[String(propsForFields.pipette.value)].spec.channels === 8

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      paddingY={SPACING.spacing16}
    >
      <PipetteField {...propsForFields.pipette} />
      {propsForFields.pipette.value != null &&
      (is96Channel || (is8Channel && enablePartialTip)) ? (
        <PartialTipField
          {...propsForFields.nozzles}
          pipetteSpecs={pipettes[String(propsForFields.pipette.value)]?.spec}
        />
      ) : null}
      <Divider marginY="0" />
      <TiprackField
        {...propsForFields.tipRack}
        pipetteId={propsForFields.pipette.value}
      />
      <Divider marginY="0" />
      <LabwareField
        {...propsForFields.labware}
        errorToShow={getFormLevelError('labware', mappedErrorsToField)}
        tooltipContent={null}
      />
      <Divider marginY="0" />
      <WellSelectionField
        {...propsForFields.wells}
        labwareId={formData.labware}
        pipetteId={formData.pipette}
        nozzles={
          typeof propsForFields.nozzles.value === 'string'
            ? propsForFields.nozzles.value
            : null
        }
        hasFormError={
          visibleFormErrors?.some(error =>
            error.dependentFields.includes('wells')
          ) ?? false
        }
        errorToShow={getFormLevelError('wells', mappedErrorsToField)}
      />
      <Divider marginY="0" />
      <VolumeField
        {...propsForFields.volume}
        errorToShow={getFormLevelError('volume', mappedErrorsToField)}
      />
      <Divider marginY="0" />
      <InputStepFormField
        {...propsForFields.times}
        units={t('units.times')}
        title={t('protocol_steps:mix_repetitions')}
        errorToShow={getFormLevelError('times', mappedErrorsToField)}
        showTooltip={false}
      />
      <Divider marginY="0" />
      <ChangeTipField
        {...propsForFields.changeTip}
        aspirateWells={formData.aspirate_wells}
        dispenseWells={formData.dispense_wells}
        path={formData.path}
        stepType={formData.stepType}
        tooltipContent={null}
      />
      {enableReturnTip ? (
        <>
          <PickUpTipField {...propsForFields.pickUpTip_location} />
          {userSelectedPickUpTipLocation ? (
            <>
              <Divider marginY="0" />
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
