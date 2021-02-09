// @flow
import * as React from 'react'
import cx from 'classnames'

import { i18n } from '../../../../localization'
import { FormGroup } from '@opentrons/components'
import { ConditionalOnField, ToggleRowField, TextField } from '../../fields'
import styles from '../../StepEditForm.css'

import type { FieldPropsByName } from '../../types'

type Props = {|
  propsForFields: FieldPropsByName,
  isEndingHold?: boolean,
|}

export const StateFields = (props: Props): React.Node => {
  const { isEndingHold, propsForFields } = props

  // Append 'Hold' to field names if component is used for an ending hold in a TC profile
  const blockActiveName = isEndingHold ? 'blockIsActiveHold' : 'blockIsActive'
  const blockTempName = isEndingHold ? 'blockTargetTempHold' : 'blockTargetTemp'
  const lidActiveName = isEndingHold ? 'lidIsActiveHold' : 'lidIsActive'
  const lidTempName = isEndingHold ? 'lidTargetTempHold' : 'lidTargetTemp'
  const lidOpenName = isEndingHold ? 'lidOpenHold' : 'lidOpen'

  return (
    <div className={styles.form_row}>
      <FormGroup
        label={i18n.t(
          'form.step_edit_form.field.thermocyclerState.block.label'
        )}
        className={styles.toggle_form_group}
      >
        <div className={styles.toggle_row}>
          <ToggleRowField
            name={blockActiveName}
            offLabel={i18n.t(
              'form.step_edit_form.field.thermocyclerState.block.toggleOff'
            )}
            onLabel={i18n.t(
              'form.step_edit_form.field.thermocyclerState.block.toggleOn'
            )}
          />
          <ConditionalOnField
            name={blockActiveName}
            condition={val => val === true}
          >
            <TextField
              {...propsForFields[blockTempName]}
              className={cx(
                styles.small_field,
                styles.toggle_temperature_field
              )}
              units={i18n.t('application.units.degrees')}
            />
          </ConditionalOnField>
        </div>
      </FormGroup>

      <FormGroup
        label={i18n.t('form.step_edit_form.field.thermocyclerState.lid.label')}
        className={styles.toggle_form_group}
      >
        <div className={styles.toggle_row}>
          <ToggleRowField
            name={lidActiveName}
            offLabel={i18n.t(
              'form.step_edit_form.field.thermocyclerState.lid.toggleOff'
            )}
            onLabel={i18n.t(
              'form.step_edit_form.field.thermocyclerState.lid.toggleOn'
            )}
          />
          <ConditionalOnField
            name={lidActiveName}
            condition={val => val === true}
          >
            <TextField
              {...propsForFields[lidTempName]}
              className={cx(
                styles.small_field,
                styles.toggle_temperature_field
              )}
              units={i18n.t('application.units.degrees')}
            />
          </ConditionalOnField>
        </div>
      </FormGroup>

      <FormGroup
        label={i18n.t(
          'form.step_edit_form.field.thermocyclerState.lidPosition.label'
        )}
        className={styles.toggle_form_group}
      >
        <ToggleRowField
          name={lidOpenName}
          offLabel={i18n.t(
            'form.step_edit_form.field.thermocyclerState.lidPosition.toggleOff'
          )}
          onLabel={i18n.t(
            'form.step_edit_form.field.thermocyclerState.lidPosition.toggleOn'
          )}
        />
      </FormGroup>
    </div>
  )
}
