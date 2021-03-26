import * as React from 'react'
import cx from 'classnames'
import find from 'lodash/find'

import { Select } from './Select'
import styles from './SelectField.css'

import type { SelectProps } from './Select'

export interface SelectFieldProps {
  /** optional HTML id for container */
  id?: SelectProps['id']
  /** field name */
  name: NonNullable<SelectProps['name']>
  /** react-Select option, usually label, value */
  options: NonNullable<SelectProps['options']>
  /** currently selected value */
  value: string | null | undefined
  /** disable the select */
  disabled?: SelectProps['isDisabled']
  /** optional placeholder  */
  placeholder?: SelectProps['placeholder']
  /** menuPosition prop to send to react-select */
  menuPosition?: SelectProps['menuPosition']
  /** render function for the option label passed to react-select */
  formatOptionLabel?: SelectProps['formatOptionLabel']
  /** optional className */
  className?: string
  /** optional caption. hidden when `error` is given */
  caption?: React.ReactNode
  /** if included, use error style and display error instead of caption */
  error?: string | null | undefined
  /** change handler called with (name, value) */
  onValueChange?: (name: string, value: string) => unknown
  /** blur handler called with (name) */
  onLoseFocus?: (name: string) => unknown
}

export function SelectField(props: SelectFieldProps): JSX.Element {
  const {
    id,
    name,
    options,
    disabled,
    placeholder,
    menuPosition,
    formatOptionLabel,
    className,
    error,
    onValueChange,
    onLoseFocus,
  } = props
  // @ts-expect-error(mc, 2021-03-19): resolve this error
  const allOptions = options.flatMap(og => og.options || [og])
  const value = find(allOptions, opt => opt.value === props.value) || null
  const caption = error || props.caption
  const captionCx = cx(styles.select_caption, { [styles.error]: error })
  const fieldCx = cx(styles.select_field, { [styles.error]: error }, className)

  return (
    <div>
      <Select
        className={fieldCx}
        id={id}
        name={name}
        options={options}
        value={value}
        isDisabled={disabled}
        placeholder={placeholder}
        menuPosition={menuPosition}
        formatOptionLabel={formatOptionLabel}
        onChange={opt => onValueChange && onValueChange(name, opt?.value || '')}
        onBlur={() => onLoseFocus && onLoseFocus(name)}
      />
      {caption && <p className={captionCx}>{caption}</p>}
    </div>
  )
}
