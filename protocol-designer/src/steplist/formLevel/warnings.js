// @flow
import * as React from 'react'
import { getWellTotalVolume } from '@opentrons/shared-data'
import { i18n } from '../../localization'
import { KnowledgeBaseLink } from '../../components/KnowledgeBaseLink'
import type { FormError } from './errors'
/*******************
 ** Warning Messages **
 ********************/

export type FormWarningType =
  | 'BELOW_PIPETTE_MINIMUM_VOLUME'
  | 'OVER_MAX_WELL_VOLUME'
  | 'BELOW_MIN_DISPOSAL_VOLUME'
  | 'BELOW_MIN_AIR_GAP_VOLUME'

export type FormWarning = {
  ...$Exact<FormError>,
  type: FormWarningType,
}

const belowMinAirGapVolumeWarning = (min: number): FormWarning => ({
  type: 'BELOW_MIN_AIR_GAP_VOLUME',
  title: i18n.t(`alert.form.warning.BELOW_MIN_AIR_GAP_VOLUME.title`, {
    min,
  }),
  body: (
    <React.Fragment>
      {i18n.t(`alert.form.warning.BELOW_MIN_AIR_GAP_VOLUME.body`)}
    </React.Fragment>
  ),
  dependentFields: ['disposalVolume_volume', 'pipette'],
})

const belowPipetteMinVolumeWarning = (min: number): FormWarning => ({
  type: 'BELOW_PIPETTE_MINIMUM_VOLUME',
  title: i18n.t(`alert.form.warning.BELOW_PIPETTE_MINIMUM_VOLUME.title`, {
    min,
  }),
  body: (
    <React.Fragment>
      {i18n.t(`alert.form.warning.BELOW_PIPETTE_MINIMUM_VOLUME.body`)}
    </React.Fragment>
  ),
  dependentFields: ['pipette', 'volume'],
})

const overMaxWellVolumeWarning = (): FormWarning => ({
  type: 'OVER_MAX_WELL_VOLUME',
  title: i18n.t(`alert.form.warning.OVER_MAX_WELL_VOLUME.title`),
  dependentFields: ['dispense_labware', 'dispense_wells', 'volume'],
})

const belowMinDisposalVolumeWarning = (min: number): FormWarning => ({
  type: 'BELOW_MIN_DISPOSAL_VOLUME',
  title: i18n.t(`alert.form.warning.BELOW_MIN_DISPOSAL_VOLUME.title`, {
    min,
  }),
  body: (
    <React.Fragment>
      {i18n.t(`alert.form.warning.BELOW_MIN_DISPOSAL_VOLUME.body`)}
      <KnowledgeBaseLink to="multiDispense">
        {i18n.t(`alert.form.warning.BELOW_MIN_DISPOSAL_VOLUME.link`)}
      </KnowledgeBaseLink>
      .
    </React.Fragment>
  ),
  dependentFields: ['disposalVolume_volume', 'pipette'],
})

export type WarningChecker = mixed => ?FormWarning

/*******************
 ** Warning Checkers **
 ********************/
// TODO: real HydratedFormData type
type HydratedFormData = any

export const belowPipetteMinimumVolume = (
  fields: HydratedFormData
): ?FormWarning => {
  const { pipette, volume } = fields
  if (!(pipette && pipette.spec)) return null
  return volume < pipette.spec.minVolume
    ? belowPipetteMinVolumeWarning(pipette.spec.minVolume)
    : null
}

export const maxDispenseWellVolume = (
  fields: HydratedFormData
): ?FormWarning => {
  const { dispense_labware, dispense_wells, volume } = fields
  if (!dispense_labware || !dispense_wells) return null
  const hasExceeded = dispense_wells.some(well => {
    const maximum = getWellTotalVolume(dispense_labware.def, well)
    return maximum && volume > maximum
  })
  return hasExceeded ? overMaxWellVolumeWarning() : null
}

export const minDisposalVolume = (fields: HydratedFormData): ?FormWarning => {
  const {
    disposalVolume_checkbox,
    disposalVolume_volume,
    pipette,
    path,
  } = fields
  if (!(pipette && pipette.spec) || path !== 'multiDispense') return null
  const isUnselected = !disposalVolume_checkbox || !disposalVolume_volume
  if (isUnselected) return belowMinDisposalVolumeWarning(pipette.spec.minVolume)
  const isBelowMin = disposalVolume_volume < pipette.spec.minVolume
  return isBelowMin
    ? belowMinDisposalVolumeWarning(pipette.spec.minVolume)
    : null
}

// both aspirate and dispense air gap volumes have the same minimums
export const _minAirGapVolume: (
  checkboxField: 'aspirate_airGap_checkbox' | 'dispense_airGap_checkbox',
  volumeField: 'aspirate_airGap_volume' | 'dispense_airGap_volume'
) => HydratedFormData => ?FormWarning = (
  checkboxField,
  volumeField
) => fields => {
  const checkboxValue = fields[checkboxField]
  const volumeValue = fields[volumeField]
  const { pipette } = fields
  if (!checkboxValue || !volumeValue || !pipette || !pipette.spec) return null

  const isBelowMin = Number(volumeValue) < pipette.spec.minVolume
  return isBelowMin ? belowMinAirGapVolumeWarning(pipette.spec.minVolume) : null
}

export const minAspirateAirGapVolume: (
  fields: HydratedFormData
) => ?FormWarning = _minAirGapVolume(
  'aspirate_airGap_checkbox',
  'aspirate_airGap_volume'
)

export const minDispenseAirGapVolume: (
  fields: HydratedFormData
) => ?FormWarning = _minAirGapVolume(
  'dispense_airGap_checkbox',
  'dispense_airGap_volume'
)

/*******************
 **     Helpers    **
 ********************/

type ComposeWarnings = (
  ...warningCheckers: Array<WarningChecker>
) => (formData: mixed) => Array<FormWarning>
export const composeWarnings: ComposeWarnings = (
  ...warningCheckers: Array<WarningChecker>
) => formData =>
  warningCheckers.reduce((acc, checker) => {
    const possibleWarning = checker(formData)
    return possibleWarning ? [...acc, possibleWarning] : acc
  }, [])
