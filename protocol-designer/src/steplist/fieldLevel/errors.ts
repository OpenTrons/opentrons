import isArray from 'lodash/isArray'

/*******************
 ** Error Messages **
 ********************/
// TODO: reconcile difference between returning error string and key
export type FieldError =
  | 'BAD_TIME_HMS'
  | 'BAD_TIME_MS'
  | 'REQUIRED'
  | 'UNDER_WELL_MINIMUM'
  | 'NON_ZERO'
  | 'UNDER_RANGE_MINIMUM'
  | 'OVER_RANGE_MAXIMUM'
  | 'NOT_A_REAL_NUMBER'
  | 'OUTSIDE_OF_RANGE'
const FIELD_ERRORS: Record<FieldError, string> = {
  BAD_TIME_HMS: 'Must be a valid time (hh:mm:ss)',
  BAD_TIME_MS: 'Must be a valid time (mm:ss)',
  REQUIRED: 'This field is required',
  UNDER_WELL_MINIMUM: 'or more wells are required',
  NON_ZERO: 'Must be greater than zero',
  UNDER_RANGE_MINIMUM: 'Min is',
  OVER_RANGE_MAXIMUM: 'Max is',
  NOT_A_REAL_NUMBER: 'Must be a number',
  OUTSIDE_OF_RANGE: 'Must be between',
}
// TODO: test these

/*******************
 ** Error Checkers **
 ********************/
export type ErrorChecker = (value: unknown) => string | null
export const requiredField: ErrorChecker = (value: unknown) =>
  !value ? FIELD_ERRORS.REQUIRED : null
export const isTimeFormat: ErrorChecker = (value: unknown): string | null => {
  const timeRegex = new RegExp(/^\d{1,2}:(?:[0-5]?\d):(?:[0-5]?\d)$/g)
  return (typeof value === 'string' && timeRegex.test(value)) || !value
    ? null
    : FIELD_ERRORS.BAD_TIME_HMS
}
export const isTimeFormatMinutesSeconds: ErrorChecker = (
  value: unknown
): string | null => {
  const timeRegex = new RegExp(/^\d+:[0-5]?\d$/g)
  return (typeof value === 'string' && timeRegex.test(value)) || !value
    ? null
    : FIELD_ERRORS.BAD_TIME_MS
}
export const nonZero: ErrorChecker = (value: unknown) =>
  value && Number(value) === 0 ? FIELD_ERRORS.NON_ZERO : null
export const minimumWellCount = (minimum: number): ErrorChecker => (
  wells: unknown
): string | null =>
  isArray(wells) && wells.length < minimum
    ? `${minimum} ${FIELD_ERRORS.UNDER_WELL_MINIMUM}`
    : null
export const minFieldValue = (minimum: number): ErrorChecker => (
  value: unknown
): string | null =>
  !value || Number(value) >= minimum
    ? null
    : `${FIELD_ERRORS.UNDER_RANGE_MINIMUM} ${minimum}`
export const maxFieldValue = (maximum: number): ErrorChecker => (
  value: unknown
): string | null =>
  !value || Number(value) <= maximum
    ? null
    : `${FIELD_ERRORS.OVER_RANGE_MAXIMUM} ${maximum}`
export const temperatureRangeFieldValue = (
  minimum: number,
  maximum: number
): ErrorChecker => (value: unknown): string | null =>
  !value || (Number(value) <= maximum && Number(value) >= minimum)
    ? null
    : `${FIELD_ERRORS.OUTSIDE_OF_RANGE} ${minimum} and ${maximum} °C`
export const realNumber: ErrorChecker = (value: unknown) =>
  isNaN(Number(value)) ? FIELD_ERRORS.NOT_A_REAL_NUMBER : null

/*******************
 **     Helpers    **
 ********************/
type ComposeErrors = (
  ...errorCheckers: ErrorChecker[]
) => (value: unknown) => string[]

export const composeErrors: ComposeErrors = (
  ...errorCheckers: ErrorChecker[]
) => value =>
  errorCheckers.reduce<string[]>((accumulatedErrors, errorChecker) => {
    const possibleError = errorChecker(value)
    return possibleError
      ? [...accumulatedErrors, possibleError]
      : accumulatedErrors
  }, [])
