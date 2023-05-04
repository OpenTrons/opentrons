import { StepFieldName } from '../../../form-types'
import { i18n } from '../../../localization'
import styles from '../StepEditForm.css'
import { FieldPropsByName } from '../types'
import { CheckboxRowField } from './CheckboxRowField'
import { TextField } from './TextField'
import { TipPositionField } from './TipPositionField'
import * as React from 'react'

export interface DelayFieldProps {
  checkboxFieldName: StepFieldName // TODO(IL, 2021-03-03): strictly, could be DelayCheckboxFields!
  labwareId?: string | null
  propsForFields: FieldPropsByName
  secondsFieldName: StepFieldName // TODO(IL, 2021-03-03): strictly, could be DelaySecondFields!
  tipPositionFieldName?: StepFieldName // TODO(IL, 2021-03-03): strictly, could be TipOffsetFields!
}

export const DelayFields = (props: DelayFieldProps): JSX.Element => {
  const {
    checkboxFieldName,
    secondsFieldName,
    tipPositionFieldName,
    propsForFields,
    labwareId,
  } = props

  return (
    <CheckboxRowField
      {...propsForFields[checkboxFieldName]}
      label={i18n.t('form.step_edit_form.field.delay.label')}
      className={styles.small_field}
    >
      <TextField
        {...propsForFields[secondsFieldName]}
        className={styles.small_field}
        units={i18n.t('application.units.seconds')}
      />
      {tipPositionFieldName && (
        <TipPositionField
          {...propsForFields[tipPositionFieldName]}
          labwareId={labwareId}
        />
      )}
    </CheckboxRowField>
  )
}
