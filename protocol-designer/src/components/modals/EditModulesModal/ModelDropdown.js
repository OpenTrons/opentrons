// @flow
import * as React from 'react'
import { useField } from 'formik'
import { DropdownField } from '@opentrons/components'

type ModelDropdownProps = {|
  fieldName: string,
  tabIndex: number,
  options: Array<{|
    name: string,
    value: string,
    disabled?: boolean,
  |}>,
|}
export const ModelDropdown = (props: ModelDropdownProps): React.Node => {
  const { fieldName, options, tabIndex } = props
  const [field, meta] = useField(fieldName)
  return (
    <DropdownField
      tabIndex={tabIndex}
      options={options}
      name={fieldName}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={meta.touched && meta.error ? meta.error : null}
    />
  )
}
