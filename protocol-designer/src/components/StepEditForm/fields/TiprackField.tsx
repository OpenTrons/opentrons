import * as React from 'react'
import { connect } from 'react-redux'
import { FormGroup, DropdownField, Options } from '@opentrons/components'
import { selectors as uiLabwareSelectors } from '../../../ui/labware'
import { i18n } from '../../../localization'
import styles from '../StepEditForm.css'

import type { BaseState } from '../../../types'
import type { FieldProps } from '../types'

interface SP {
  options: Options
}
type Props = FieldProps & SP

const TiprackFieldSTP = (state: BaseState): SP => ({
  options: uiLabwareSelectors.getTiprackOptions(state),
})

export const TiprackField = connect(TiprackFieldSTP)((props: Props) => {
  return (
    <FormGroup
      label={i18n.t('form.step_edit_form.tipRack')}
      className={styles.large_field}
    >
      <DropdownField
        options={props.options}
        name={props.name}
        value={String(props.options[0].value)}
        onBlur={props.onFieldBlur}
        onFocus={props.onFieldFocus}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          props.updateValue(e.currentTarget.value)
        }}
      />
    </FormGroup>
  )
})
