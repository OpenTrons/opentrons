import * as React from 'react'
import { getWellTotalVolume } from '@opentrons/shared-data'
import { KnowledgeBaseLink } from '../../components/KnowledgeBaseLink'
import type { FormError } from './errors'
/*******************
 ** Warning Messages **
 ********************/

export type FormWarningType =
  | 'ASPIRATE_TIP_POSITIONED_LOW_IN_TUBE'
  | 'BELOW_MIN_AIR_GAP_VOLUME'
  | 'BELOW_MIN_DISPOSAL_VOLUME'
  | 'BELOW_PIPETTE_MINIMUM_VOLUME'
  | 'DISPENSE_TIP_POSITIONED_LOW_IN_TUBE'
  | 'OVER_MAX_WELL_VOLUME'
  | 'MIX_TIP_POSITIONED_LOW_IN_TUBE'

export type FormWarning = FormError & {
  type: FormWarningType
}

const belowMinAirGapVolumeWarning = (min: number): FormWarning => ({
  type: 'BELOW_MIN_AIR_GAP_VOLUME',
  title: `Air gap volume is below pipette minimum (${min} uL)`,
  body: <>{'Pipettes cannot accurately handle volumes below their minimum.'}</>,
  dependentFields: ['disposalVolume_volume', 'pipette'],
})

const belowPipetteMinVolumeWarning = (min: number): FormWarning => ({
  type: 'BELOW_PIPETTE_MINIMUM_VOLUME',
  title: `Disposal volume is below recommended minimum (${min} uL)`,
  body: (
    <>
      {
        'For accuracy in multi-dispense Transfers we recommend you use a disposal volume of at least the pipette`s minimum. Read more '
      }
    </>
  ),
  dependentFields: ['pipette', 'volume'],
})

const overMaxWellVolumeWarning = (): FormWarning => ({
  type: 'OVER_MAX_WELL_VOLUME',
  title: 'Dispense volume will overflow a destination well',
  dependentFields: ['dispense_labware', 'dispense_wells', 'volume'],
})

const belowMinDisposalVolumeWarning = (min: number): FormWarning => ({
  type: 'BELOW_MIN_DISPOSAL_VOLUME',
  title: `Disposal volume is below recommended minimum (${min} uL)`,
  body: (
    <>
      {
        'For accuracy in multi-dispense Transfers we recommend you use a disposal volume of at least the pipette`s minimum. Read more '
      }
      <KnowledgeBaseLink to="multiDispense">{'here'}</KnowledgeBaseLink>.
    </>
  ),
  dependentFields: ['disposalVolume_volume', 'pipette'],
})

const aspirateTipPositionedLowInTube = (): FormWarning => ({
  type: 'ASPIRATE_TIP_POSITIONED_LOW_IN_TUBE',
  title:
    'The default aspirate height is 1mm from the bottom of the well, which could cause liquid overflow or pipette damage. Edit tip position in advanced settings.',
  dependentFields: ['aspirate_labware'],
})

const dispenseTipPositionedLowInTube = (): FormWarning => ({
  type: 'DISPENSE_TIP_POSITIONED_LOW_IN_TUBE',
  title:
    'The default dispense height is 0.5mm from the bottom of the well, which could cause liquid overflow or pipette damage. Edit tip position in advanced settings.',
  dependentFields: ['dispense_labware'],
})

const mixTipPositionedLowInTube = (): FormWarning => ({
  type: 'MIX_TIP_POSITIONED_LOW_IN_TUBE',
  title:
    'The default mix height is 0.5mm from the bottom of the well, which could cause liquid overflow or pipette damage. Edit tip position in advanced settings.',
  dependentFields: ['labware'],
})

export type WarningChecker = (val: unknown) => FormWarning | null

/*******************
 ** Warning Checkers **
 ********************/
// TODO: real HydratedFormData type
export type HydratedFormData = any

export const aspirateTipPositionInTube = (
  fields: HydratedFormData
): FormWarning | null => {
  const { aspirate_labware, aspirate_mmFromBottom } = fields
  let isTubeRack: boolean = false
  if (aspirate_labware != null) {
    isTubeRack = aspirate_labware.def.metadata.displayCategory === 'tubeRack'
  }
  return isTubeRack && aspirate_mmFromBottom === null
    ? aspirateTipPositionedLowInTube()
    : null
}
export const dispenseTipPositionInTube = (
  fields: HydratedFormData
): FormWarning | null => {
  const { dispense_labware, dispense_mmFromBottom } = fields
  let isTubeRack: boolean = false
  if (dispense_labware != null) {
    isTubeRack =
      // checking that the dispense labware is a labware and not a trash/waste chute
      'def' in dispense_labware
        ? dispense_labware.def.metadata.displayCategory === 'tubeRack'
        : false
  }
  return isTubeRack && dispense_mmFromBottom === null
    ? dispenseTipPositionedLowInTube()
    : null
}
export const mixTipPositionInTube = (
  fields: HydratedFormData
): FormWarning | null => {
  const { labware, mix_mmFromBottom } = fields
  let isTubeRack: boolean = false
  if (labware != null) {
    isTubeRack = labware.def.metadata.displayCategory === 'tubeRack'
  }
  return isTubeRack && mix_mmFromBottom === 0.5
    ? mixTipPositionedLowInTube()
    : null
}
export const belowPipetteMinimumVolume = (
  fields: HydratedFormData
): FormWarning | null => {
  const { pipette, volume } = fields
  if (!(pipette && pipette.spec)) return null
  const liquidSpecs = pipette.spec.liquids
  const minVolume =
    'lowVolumeDefault' in liquidSpecs
      ? liquidSpecs.lowVolumeDefault.minVolume
      : liquidSpecs.default.minVolume
  return volume < minVolume ? belowPipetteMinVolumeWarning(minVolume) : null
}

export const maxDispenseWellVolume = (
  fields: HydratedFormData
): FormWarning | null => {
  const { dispense_labware, dispense_wells, volume } = fields
  if (!dispense_labware || !dispense_wells) return null
  const hasExceeded = dispense_wells.some((well: string) => {
    const maximum =
      'name' in dispense_labware &&
      (dispense_labware.name === 'wasteChute' ||
        dispense_labware.name === 'trashBin')
        ? Infinity // some randomly selected high number since waste chute is huge
        : getWellTotalVolume(dispense_labware.def, well)
    return maximum && volume > maximum
  })
  return hasExceeded ? overMaxWellVolumeWarning() : null
}

export const minDisposalVolume = (
  fields: HydratedFormData
): FormWarning | null => {
  const {
    disposalVolume_checkbox,
    disposalVolume_volume,
    pipette,
    path,
  } = fields
  if (!(pipette && pipette.spec) || path !== 'multiDispense') return null
  const isUnselected = !disposalVolume_checkbox || !disposalVolume_volume
  const liquidSpecs = pipette.spec.liquids
  const minVolume =
    'lowVolumeDefault' in liquidSpecs
      ? liquidSpecs.lowVolumeDefault.minVolume
      : liquidSpecs.default.minVolume
  if (isUnselected) {
    return belowMinDisposalVolumeWarning(minVolume)
  }
  const isBelowMin = disposalVolume_volume < minVolume
  return isBelowMin ? belowMinDisposalVolumeWarning(minVolume) : null
}

// both aspirate and dispense air gap volumes have the same minimums
export const _minAirGapVolume = (
  checkboxField: 'aspirate_airGap_checkbox' | 'dispense_airGap_checkbox',
  volumeField: 'aspirate_airGap_volume' | 'dispense_airGap_volume'
) => (fields: HydratedFormData): FormWarning | null => {
  const checkboxValue = fields[checkboxField]
  const volumeValue = fields[volumeField]
  const { pipette } = fields
  if (!checkboxValue || !volumeValue || !pipette || !pipette.spec) {
    return null
  }
  const liquidSpecs = pipette.spec.liquids
  const minVolume =
    'lowVolumeDefault' in liquidSpecs
      ? liquidSpecs.lowVolumeDefault.minVolume
      : liquidSpecs.default.minVolume
  const isBelowMin = Number(volumeValue) < minVolume
  return isBelowMin ? belowMinAirGapVolumeWarning(minVolume) : null
}

export const minAspirateAirGapVolume: (
  fields: HydratedFormData
) => FormWarning | null = _minAirGapVolume(
  'aspirate_airGap_checkbox',
  'aspirate_airGap_volume'
)

export const minDispenseAirGapVolume: (
  fields: HydratedFormData
) => FormWarning | null = _minAirGapVolume(
  'dispense_airGap_checkbox',
  'dispense_airGap_volume'
)

/*******************
 **     Helpers    **
 ********************/

type ComposeWarnings = (
  ...warningCheckers: WarningChecker[]
) => (formData: unknown) => FormWarning[]
export const composeWarnings: ComposeWarnings = (
  ...warningCheckers: WarningChecker[]
) => formData =>
  warningCheckers.reduce<FormWarning[]>((acc, checker) => {
    const possibleWarning = checker(formData)
    return possibleWarning ? [...acc, possibleWarning] : acc
  }, [])
