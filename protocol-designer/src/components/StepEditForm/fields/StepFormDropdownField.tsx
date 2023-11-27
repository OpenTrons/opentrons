import * as React from 'react'
import { useSelector } from 'react-redux'
import { DropdownField, Options } from '@opentrons/components'
import cx from 'classnames'
import { StepFieldName } from '../../../steplist/fieldLevel'
import { getWasteChuteOption } from '../../../ui/labware/selectors'
import styles from '../StepEditForm.css'
import type { FieldProps } from '../types'

export interface StepFormDropdownProps extends FieldProps {
  options: Options
  name: StepFieldName
  className?: string
}

export const StepFormDropdown = (props: StepFormDropdownProps): JSX.Element => {
  const {
    options,
    name,
    className,
    onFieldBlur,
    onFieldFocus,
    value,
    updateValue,
    errorToShow,
  } = props
  const wasteChuteOption = useSelector(getWasteChuteOption)
  const fullOptions =
    wasteChuteOption != null && name === 'dispense_labware'
      ? [...options, wasteChuteOption]
      : options

  // TODO: BC abstract e.currentTarget.value inside onChange with fn like onChangeValue of type (value: unknown) => {}
  // blank out the dropdown if labware id does not exist
  const availableOptionIds = fullOptions.map(opt => opt.value)
  // @ts-expect-error (ce, 2021-06-21) unknown not assignable to string
  const fieldValue = availableOptionIds.includes(value) ? String(value) : null

  return (
    <DropdownField
      name={name}
      error={errorToShow}
      className={cx(styles.large_field, className)}
      options={fullOptions}
      onBlur={onFieldBlur}
      onFocus={onFieldFocus}
      value={fieldValue}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
        updateValue(e.currentTarget.value)
      }}
    />
  )
}
