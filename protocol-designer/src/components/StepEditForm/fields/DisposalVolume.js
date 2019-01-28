// @flow
import * as React from 'react'
import {FormGroup, CheckboxField} from '@opentrons/components'
import cx from 'classnames'

import styles from '../StepEditForm.css'
import type {FocusHandlers} from '../index'

import StepField from './FieldConnector'
import TextField from './Text'
import BlowoutLocationField from './BlowoutLocation'

type DisposalVolumeFieldProps = {focusHandlers: FocusHandlers}
const DisposalVolumeField = (props: DisposalVolumeFieldProps) => (
  <FormGroup label='Multi-Dispense Options:'>
    <StepField
      name="aspirate_disposalVol_checkbox"
      render={({value, updateValue}) => (
        <React.Fragment>
          <div className={cx(styles.checkbox_row, styles.multi_dispense_options)}>
            <CheckboxField
              label="Disposal Volume"
              value={!!value}
              className={styles.checkbox_field}
              onChange={(e: SyntheticInputEvent<*>) => updateValue(!value)} />
            {
              value
                ? (
                  <div>
                    <TextField
                      name="aspirate_disposalVol_volume"
                      units="μL"
                      className={cx(styles.small_field, styles.orphan_field)}
                      {...props.focusHandlers} />
                  </div>
                )
                : null
            }
          </div>
          {
            value
              ? (
                <div className={styles.checkbox_row}>
                  <div className={styles.sub_select_label}>Blowout</div>
                  <BlowoutLocationField
                    name="blowout_location"
                    className={cx(styles.medium_field, styles.orphan_field)}
                    includeSourceWell
                    {...props.focusHandlers} />
                </div>
              )
              : null
          }
        </React.Fragment>
      )} />
  </FormGroup>
)

export default DisposalVolumeField
