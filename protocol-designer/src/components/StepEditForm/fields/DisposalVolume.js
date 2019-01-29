// @flow
import * as React from 'react'
import {FormGroup, CheckboxField, type DropdownOption, DropdownField} from '@opentrons/components'
import {connect} from 'react-redux'
import cx from 'classnames'

import {SOURCE_WELL_BLOWOUT_DESTINATION} from '../../../step-generation/utils'
import {selectors as stepFormSelectors} from '../../../step-forms'
import type {BaseState} from '../../../types'
import styles from '../StepEditForm.css'
import type {FocusHandlers} from '../types'

import FieldConnector from './FieldConnector'
import TextField from './Text'

type SP = {disposalDestinationOptions: Array<DropdownOption>}

type Props = SP & {focusHandlers: FocusHandlers}

const DisposalVolumeField = (props: Props) => (
  <FormGroup label='Multi-Dispense Options:'>
    <FieldConnector
      name="disposalVolume_checkbox"
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
                      name="disposalVolume_volume"
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
                  <FieldConnector
                    name="blowout_location"
                    focusedField={props.focusHandlers.focusedField}
                    dirtyFields={props.focusHandlers.dirtyFields}
                    render={({value, updateValue}) => (
                      <DropdownField
                        className={cx(styles.medium_field, styles.orphan_field)}
                        options={props.disposalDestinationOptions}
                        onBlur={() => { props.focusHandlers.onFieldBlur('blowout_location') }}
                        onFocus={() => { props.focusHandlers.onFieldFocus('blowout_location') }}
                        value={value ? String(value) : null}
                        onChange={(e: SyntheticEvent<HTMLSelectElement>) => { updateValue(e.currentTarget.value) } } />
                    )} />
                </div>
              )
              : null
          }
        </React.Fragment>
      )} />
  </FormGroup>
)

const mapSTP = (state: BaseState): SP => ({
  disposalDestinationOptions: [
    ...stepFormSelectors.getDisposalLabwareOptions(state),
    {name: 'Source Well', value: SOURCE_WELL_BLOWOUT_DESTINATION},
  ],
})

export default connect(mapSTP)(DisposalVolumeField)
