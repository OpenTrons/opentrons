// @flow
import * as React from 'react'
import { getWellRatio } from '../utils'
import { canPipetteUseLabware } from '@opentrons/shared-data'
import type { StepFieldName } from '../../form-types'

/*******************
 ** Error Messages **
 ********************/
export type FormErrorKey =
  | 'INCOMPATIBLE_ASPIRATE_LABWARE'
  | 'INCOMPATIBLE_DISPENSE_LABWARE'
  | 'INCOMPATIBLE_LABWARE'
  | 'WELL_RATIO_MOVE_LIQUID'
  | 'PAUSE_TYPE_REQUIRED'
  | 'TIME_PARAM_REQUIRED'

export type FormError = {
  title: string,
  body?: React.Node,
  dependentFields: Array<StepFieldName>,
}

const FORM_ERRORS: { [FormErrorKey]: FormError } = {
  INCOMPATIBLE_ASPIRATE_LABWARE: {
    title: 'Selected aspirate labware is incompatible with selected pipette',
    dependentFields: ['aspirate_labware', 'pipette'],
  },
  INCOMPATIBLE_DISPENSE_LABWARE: {
    title: 'Selected dispense labware is incompatible with selected pipette',
    dependentFields: ['dispense_labware', 'pipette'],
  },
  INCOMPATIBLE_LABWARE: {
    title: 'Selected labware is incompatible with selected pipette',
    dependentFields: ['labware', 'pipette'],
  },
  PAUSE_TYPE_REQUIRED: {
    title: 'Must either pause for amount of time, or until told to resume',
    dependentFields: ['pauseForAmountOfTime'],
  },
  TIME_PARAM_REQUIRED: {
    title: 'Must include hours, minutes, or seconds',
    dependentFields: [
      'pauseForAmountOfTime',
      'pauseHour',
      'pauseMinute',
      'pauseSecond',
    ],
  },
  WELL_RATIO_MOVE_LIQUID: {
    title: 'Well selection must be 1 to many, many to 1, or N to N',
    dependentFields: ['aspirate_wells', 'dispense_wells'],
  },
}
export type FormErrorChecker = mixed => ?FormError

// TODO: test these
/*******************
 ** Error Checkers **
 ********************/

// TODO: real HydratedFormData type
type HydratedFormData = any

export const incompatibleLabware = (fields: HydratedFormData): ?FormError => {
  const { labware, pipette } = fields
  if (!labware || !pipette) return null
  return !canPipetteUseLabware(pipette.name, labware.type)
    ? FORM_ERRORS.INCOMPATIBLE_LABWARE
    : null
}

export const incompatibleDispenseLabware = (
  fields: HydratedFormData
): ?FormError => {
  const { dispense_labware, pipette } = fields
  if (!dispense_labware || !pipette) return null
  return !canPipetteUseLabware(pipette.name, dispense_labware.type)
    ? FORM_ERRORS.INCOMPATIBLE_DISPENSE_LABWARE
    : null
}

export const incompatibleAspirateLabware = (
  fields: HydratedFormData
): ?FormError => {
  const { aspirate_labware, pipette } = fields
  if (!aspirate_labware || !pipette) return null
  return !canPipetteUseLabware(pipette.name, aspirate_labware.type)
    ? FORM_ERRORS.INCOMPATIBLE_ASPIRATE_LABWARE
    : null
}

export const pauseForTimeOrUntilTold = (
  fields: HydratedFormData
): ?FormError => {
  const { pauseForAmountOfTime, pauseHour, pauseMinute, pauseSecond } = fields
  if (pauseForAmountOfTime === 'true') {
    // user selected pause for amount of time
    const hours = parseFloat(pauseHour) || 0
    const minutes = parseFloat(pauseMinute) || 0
    const seconds = parseFloat(pauseSecond) || 0
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    return totalSeconds <= 0 ? FORM_ERRORS.TIME_PARAM_REQUIRED : null
  } else if (pauseForAmountOfTime === 'false') {
    // user selected pause until resume
    return null
  } else {
    // user selected neither pause until resume nor pause for amount of time
    return FORM_ERRORS.PAUSE_TYPE_REQUIRED
  }
}

export const wellRatioMoveLiquid = (fields: HydratedFormData): ?FormError => {
  const { aspirate_wells, dispense_wells } = fields
  if (!aspirate_wells || !dispense_wells) return null
  return getWellRatio(aspirate_wells, dispense_wells)
    ? null
    : FORM_ERRORS.WELL_RATIO_MOVE_LIQUID
}

/*******************
 **     Helpers    **
 ********************/

export const composeErrors = (...errorCheckers: Array<FormErrorChecker>) => (
  value: mixed
): Array<FormError> =>
  errorCheckers.reduce((acc, errorChecker) => {
    const possibleError = errorChecker(value)
    return possibleError ? [...acc, possibleError] : acc
  }, [])
