// @flow
import * as React from 'react'
import {
  FlatButton,
  PrimaryButton,
  FormGroup,
  DropdownField,
  CheckboxField,
  InputField,
  RadioGroup
} from '@opentrons/components'

import FormSection from './FormSection'
import styles from './StepEditForm.css'
import type {FormData, FormSectionNames, FormSectionState} from '../steplist/types' // TODO import from index.js

import {formConnectorFactory} from '../utils'

type Options = Array<{
  name: string,
  value: string
}>

export type Props = {
  // ingredientOptions: Options,
  pipetteOptions: Options,
  labwareOptions: Options,
  formSectionCollapse: FormSectionState,
  onCancel: (event: SyntheticEvent<>) => void,
  onSave: (event: SyntheticEvent<>) => void,
  onToggleFormSection: (section: FormSectionNames) => any => void,
  handleChange: (accessor: string) => (event: SyntheticEvent<HTMLInputElement> | SyntheticEvent<HTMLSelectElement>) => void,
  formData: FormData, // TODO: make sure flow will give clear warning if you put transfer field in pause form, etc
  canSave: boolean
  /* TODO Ian 2018-01-24 **type** the different forms for different stepTypes,
    this obj reflects the form selector's return values */
}

export default function StepEditForm (props: Props) {
  const formConnector = formConnectorFactory(props.handleChange, props.formData)

  const buttonRow = <div className={styles.button_row}>
    <FlatButton onClick={e => console.log('TODO: "MORE OPTIONS".')}>MORE OPTIONS</FlatButton>
    <PrimaryButton onClick={props.onCancel}>CANCEL</PrimaryButton>
    <PrimaryButton disabled={!props.canSave} onClick={props.onSave}>SAVE</PrimaryButton>
  </div>

  if (props.formData.stepType === 'pause') {
    return (
      <div className={styles.form}>
        <div className={styles.row_wrapper}>
          <div className={styles.column_1_2}>
            <RadioGroup options={[{name: 'Pause for an amount of time', value: 'true'}]}
              {...formConnector('pause-for-amount-of-time')} />
            <InputField units='hr' {...formConnector('pause-hour')} />
            <InputField units='m' {...formConnector('pause-minute')} />
            <InputField units='s' {...formConnector('pause-second')} />
          </div>
          <div className={styles.column_1_2}>
            <RadioGroup options={[{name: 'Pause until told to resume', value: 'false'}]}
              {...formConnector('pause-for-amount-of-time')} />
            <FormGroup label='Message to display'>
              <InputField {...formConnector('pause-message')} />
            </FormGroup>
          </div>
        </div>
        {buttonRow}
      </div>
    )
  }

  if (props.formData.stepType === 'transfer' || props.formData.stepType === 'consolidate') {
    return (
      <div className={styles.form}>
        <FormSection title='Aspirate'
          onCollapseToggle={props.onToggleFormSection('aspirate')}
          collapsed={props.formSectionCollapse.aspirate}
        >
          <div className={styles.top_row}>
            <FormGroup label='Labware:'>
              <DropdownField options={props.labwareOptions} {...formConnector('aspirate--labware')} />
            </FormGroup>
            <FormGroup label='Wells:'>
              <InputField placeholder='eg "A1,A2,B1,B2"' {...formConnector('aspirate--wells')} />
            </FormGroup>
            <FormGroup label='Pipette:'>
              <DropdownField options={props.pipetteOptions} {...formConnector('aspirate--pipette')} />
            </FormGroup>
            {props.formData.stepType === 'consolidate' && <FormGroup label='Volume:'>
              <InputField placeholder='20' units='μL' {...formConnector('aspirate--volume')} />
            </FormGroup>}
          </div>

          <div className={styles.row_wrapper}>
            <div className={styles.column_1_2}>
              <FormGroup label='TECHNIQUE'>
                <CheckboxField label='Pre-wet tip' {...formConnector('aspirate--pre-wet-tip')} />
                <CheckboxField label='Touch tip' {...formConnector('aspirate--touch-tip')} />
                <div className={styles.field_row}>
                  <CheckboxField label='Air gap' {...formConnector('aspirate--air-gap--checkbox')} />
                  <InputField units='μL' {...formConnector('aspirate--air-gap--volume')} />
                </div>
                <div className={styles.field_row}>
                  <CheckboxField label='Mix' {...formConnector('aspirate--mix--checkbox')} />
                  <InputField units='μL' {...formConnector('aspirate--mix--volume')} />
                  <InputField units='Times' {...formConnector('aspirate--mix--time')} />
                </div>
                <div className={styles.field_row}>
                  <CheckboxField label='Disposal volume' className={styles.column_2_3}
                    {...formConnector('aspirate--disposal-vol--checkbox')} />
                  <InputField units='μL' {...formConnector('aspirate--disposal-vol--volume')} />
                </div>
              </FormGroup>
            </div>

            <div className={styles.column_1_2}>
              <FormGroup label='WELL ORDER'>
                (WellSelectionWidget here)
              </FormGroup>

              <FormGroup label='CHANGE TIP'>
                <RadioGroup
                  inline
                  {...formConnector('aspirate--change-tip')}
                  options={[
                    {name: 'Always', value: 'always'},
                    {name: 'Once', value: 'once'},
                    {name: 'Never', value: 'never'}
                  ]}
                />
              </FormGroup>

              <FormGroup label='FLOW RATE'>
                (Flow rate SliderInput here)
              </FormGroup>
            </div>
          </div>

        </FormSection>

        <FormSection title='Dispense'
          onCollapseToggle={props.onToggleFormSection('dispense')}
          collapsed={props.formSectionCollapse.dispense}
        >
          <div className={styles.top_row}>
            <FormGroup label='Labware:'>
              <DropdownField options={props.labwareOptions} {...formConnector('dispense--labware')} />
            </FormGroup>
            <FormGroup label='Wells:'>
              <InputField placeholder='eg "A1,A2,B1,B2"' {...formConnector('dispense--wells')} />
            </FormGroup>
            {props.formData.stepType === 'transfer' && <FormGroup label='Volume:'>
              <InputField placeholder='20' units='μL' {...formConnector('dispense--volume')} />
            </FormGroup>}
          </div>

          <div className={styles.row_wrapper}>
            <div className={styles.column_1_2}>
              <FormGroup label='TECHNIQUE'>
                <div className={styles.field_row}>
                  <CheckboxField label='Mix' {...formConnector('dispense--mix--checkbox')} />
                  <InputField units='μL' {...formConnector('dispense--mix--volume')} />
                  <InputField units='Times' {...formConnector('dispense--mix--times')} />
                </div>
                <div className={styles.field_row}>
                  <CheckboxField label='Delay' {...formConnector('dispense--delay--checkbox')} />
                  <InputField units='m' {...formConnector('dispense--delay-minutes')} />
                  <InputField units='s' {...formConnector('dispense--delay-seconds')} />
                </div>
                <div className={styles.field_row}>
                  <CheckboxField label='Blow out' {...formConnector('dispense--blowout--checkbox')} />
                  <DropdownField className={styles.column_2_3}
                    options={props.labwareOptions}
                    {...formConnector('dispense--blowout--labware')}
                  />
                </div>
              </FormGroup>
            </div>

            <div className={styles.column_1_2}>
              {props.formData.stepType === 'transfer' && <FormGroup label='WELL ORDER'>
                (WellSelectionWidget here)
              </FormGroup>}

              <FormGroup label='FLOW RATE'>
                (Flow rate SliderInput here)
              </FormGroup>
            </div>
          </div>

        </FormSection>

        {buttonRow}
      </div>
    )
  }

  return (
    <div className={styles.form}>
      <div>Todo: support {props.formData.stepType} step</div>
    </div>
  )
}
