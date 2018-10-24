// @flow
import * as React from 'react'
import get from 'lodash/get'
import {InputField, CheckboxField, DropdownField} from '@opentrons/components'
import {FormTableRow} from './FormTable'

import type {WifiAuthField} from '../../../http-api-client'

type Props = {
  field: WifiAuthField,
  value: string,
  showPassword: boolean,
  onChange: (*) => mixed,
  toggleShowPassword: (name: string) => mixed,
  errors: {
    [string]: string,
  },
  touched: {
    [string]: boolean,
  },
  onBlur: (SyntheticFocusEvent<*>) => mixed,
}

export const CONNECT_FIELD_ID_PREFIX = '__ConnectForm__'

export default function ConnectFormField (props: Props) {
  const {
    value,
    showPassword,
    onChange,
    toggleShowPassword,
    onBlur,
    touched,
    errors,
  } = props
  const {name, displayName, type, required} = props.field
  const id = `${CONNECT_FIELD_ID_PREFIX}${name}`
  const label = required ? `* ${displayName}:` : `${displayName}:`
  let input = null

  if (type === 'string' || type === 'password') {
    const inputType = type === 'string' || showPassword ? 'text' : 'password'
    input = (
      <InputField
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={onChange}
        error={get(touched, name) && get(errors, name)}
        onBlur={onBlur}
      />
    )
  } else if (type === 'file') {
    input = (
      <DropdownField
        disabled
        id={id}
        name={name}
        onChange={onChange}
        options={[{name: 'Certificates not yet supported', value: ''}]}
      />
    )
  }

  const inputRow = (
    <FormTableRow label={label} labelFor={id}>
      {input}
    </FormTableRow>
  )

  // render "showPassword" checkbox if type === 'password'
  if (type === 'password') {
    return (
      <React.Fragment>
        {inputRow}
        <FormTableRow>
          <CheckboxField
            name="Show password"
            label="Show password"
            value={showPassword}
            onChange={() => toggleShowPassword(name)}
          />
        </FormTableRow>
      </React.Fragment>
    )
  }

  return inputRow
}
