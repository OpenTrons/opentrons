// @flow
import * as React from 'react'
import { InputField } from '@opentrons/components'
import type { StepFieldName } from '../../../steplist/fieldLevel'
import type { FocusHandlers } from '../types'
import StepField from './FieldConnector'

type TextFieldProps = {
  className?: string,
  name: StepFieldName,
} & FocusHandlers
const TextField = (
  props: TextFieldProps & React.ElementProps<typeof InputField>
) => {
  const {
    name,
    focusedField,
    dirtyFields,
    onFieldFocus,
    onFieldBlur,
    ...inputProps
  } = props
  return (
    <StepField
      name={name}
      focusedField={focusedField}
      dirtyFields={dirtyFields}
      render={({ value, updateValue, errorToShow, hoverTooltipHandlers }) => (
        <InputField
          {...inputProps}
          error={errorToShow}
          onBlur={() => {
            onFieldBlur(name)
          }}
          onFocus={() => {
            onFieldFocus(name)
          }}
          onChange={(e: SyntheticInputEvent<*>) =>
            updateValue(e.currentTarget.value)
          }
          value={value ? String(value) : null}
        />
      )}
    />
  )
}

export default TextField
