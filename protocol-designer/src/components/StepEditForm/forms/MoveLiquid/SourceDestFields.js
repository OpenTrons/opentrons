// @flow
import * as React from 'react'

import type { StepFieldName } from '../../../../steplist/fieldLevel'
import i18n from '../../../../localization'

import type { FocusHandlers } from '../../types'

import {
  TextField,
  CheckboxRowField,
  BlowoutLocationField,
  TipPositionField,
  FlowRateField,
  WellOrderField,
} from '../../fields'

import styles from '../../StepEditForm.css'

type Props = {
  className?: ?string,
  focusHandlers: FocusHandlers,
  prefix: 'aspirate' | 'dispense',
}

const makeAddFieldNamePrefix = (prefix: string) => (
  fieldName: string
): StepFieldName => `${prefix}_${fieldName}`

function SourceDestFields(props: Props) {
  const { className, focusHandlers, prefix } = props
  const addFieldNamePrefix = makeAddFieldNamePrefix(prefix)

  const mixFields = (
    <CheckboxRowField
      name={addFieldNamePrefix('mix_checkbox')}
      label={i18n.t('form.step_edit_form.field.mix.label')}
      className={styles.small_field}
    >
      <TextField
        name={addFieldNamePrefix('mix_volume')}
        units={i18n.t('application.units.microliter')}
        className={styles.small_field}
        {...focusHandlers}
      />
      <TextField
        name={addFieldNamePrefix('mix_times')}
        units={i18n.t('application.units.times')}
        className={styles.small_field}
        {...focusHandlers}
      />
    </CheckboxRowField>
  )

  return (
    <div className={className}>
      <div className={styles.form_row}>
        <FlowRateField
          name={addFieldNamePrefix('flowRate')}
          pipetteFieldName="pipette"
          flowRateType={prefix}
        />
        <TipPositionField fieldName={addFieldNamePrefix('mmFromBottom')} />
        <WellOrderField
          prefix={prefix}
          label={i18n.t('form.step_edit_form.field.well_order.label')}
        />
      </div>

      <div className={styles.checkbox_column}>
        {prefix === 'aspirate' && (
          <React.Fragment>
            <CheckboxRowField
              name="preWetTip"
              label={i18n.t('form.step_edit_form.field.preWetTip.label')}
              className={styles.small_field}
            />
            {mixFields}
            <CheckboxRowField
              disabled
              tooltipComponent={i18n.t('tooltip.not_in_beta')}
              name="aspirate_airGap_checkbox"
              label={i18n.t('form.step_edit_form.field.airGap.label')}
              className={styles.small_field}
            >
              <TextField
                disabled
                name="aspirate_airGap_volume"
                units={i18n.t('application.units.microliter')}
                {...focusHandlers}
              />
            </CheckboxRowField>
          </React.Fragment>
        )}

        {prefix === 'dispense' && mixFields}

        <CheckboxRowField
          name={addFieldNamePrefix('touchTip_checkbox')}
          tooltipComponent={i18n.t(
            `tooltip.step_fields.defaults.${addFieldNamePrefix(
              'touchTip_checkbox'
            )}`
          )}
          label={i18n.t('form.step_edit_form.field.touchTip.label')}
          className={styles.small_field}
        >
          <TipPositionField
            fieldName={addFieldNamePrefix('touchTip_mmFromBottom')}
          />
        </CheckboxRowField>

        {prefix === 'dispense' && (
          <CheckboxRowField
            name="blowout_checkbox"
            label={i18n.t('form.step_edit_form.field.blowout.label')}
            className={styles.small_field}
          >
            <BlowoutLocationField
              name="blowout_location"
              className={styles.full_width}
              {...focusHandlers}
            />
          </CheckboxRowField>
        )}
      </div>
    </div>
  )
}

export default SourceDestFields
