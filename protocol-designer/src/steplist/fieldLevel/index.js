// @flow
import get from 'lodash/get'
import {
  requiredField,
  minimumWellCount,
  composeErrors
} from './errors'
import {
  castToNumber,
  onlyPositiveNumbers,
  onlyIntegers,
  defaultTo,
  composeProcessors,
  type valueProcessor
} from './processing'
import type {StepFieldName} from './types'

export type {
  StepFieldName
}

const DEFAULT_CHANGE_TIP_OPTION: 'always' = 'always'

const StepFieldHelperMap: {[StepFieldName]: {getErrors?: (mixed) => Array<string>, processValue?: valueProcessor}} = {
  'change-tip': {processValue: defaultTo(DEFAULT_CHANGE_TIP_OPTION)},
  'dispense--delay-minutes': {processValue: composeProcessors(castToNumber, defaultTo(0))},
  'dispense--delay-seconds': {processValue: composeProcessors(castToNumber, defaultTo(0))},
  'labware': {getErrors: composeErrors(requiredField)},
  'pause-hour': {processValue: composeProcessors(castToNumber, onlyPositiveNumbers, onlyIntegers)},
  'pause-minute': {processValue: composeProcessors(castToNumber, onlyPositiveNumbers, onlyIntegers)},
  'pause-second': {processValue: composeProcessors(castToNumber, onlyPositiveNumbers, onlyIntegers)},
  'pipette': {getErrors: composeErrors(requiredField)},
  'times': {getErrors: composeErrors(requiredField), processValue: composeProcessors(castToNumber, onlyPositiveNumbers, onlyIntegers, defaultTo(0))},
  'volume': {getErrors: composeErrors(requiredField), processValue: composeProcessors(castToNumber, onlyPositiveNumbers, defaultTo(0))},
  'wells': {getErrors: composeErrors(minimumWellCount(1)), processValue: defaultTo([])}
}

export const getFieldErrors = (name: StepFieldName, value: mixed): Array<string> => {
  const fieldErrorGetter: (mixed) => Array<string> = get(StepFieldHelperMap, `${name}.getErrors`)
  const errors: Array<string> = fieldErrorGetter ? fieldErrorGetter(value) : []
  return errors
}

export const processField = (name: StepFieldName, value: mixed): ?mixed => {
  const fieldProcessor = get(StepFieldHelperMap, `${name}.processValue`)
  return fieldProcessor ? fieldProcessor(value) : value
}
